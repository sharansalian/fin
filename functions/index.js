/**
 * Firebase Cloud Function — fetchArticle
 *
 * Server-side article fetcher. Replaces all CORS proxies.
 * Called as an authenticated Firebase callable from the client.
 *
 * Requires Blaze (pay-as-you-go) plan for external HTTP requests.
 * Deploy: firebase deploy --only functions
 */

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { JSDOM } = require('jsdom');
const { Readability } = require('@mozilla/readability');
const sanitizeHtml = require('sanitize-html');

const ALLOWED_TAGS = [
  'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li', 'blockquote', 'pre', 'code',
  'strong', 'em', 'b', 'i', 'u', 's',
  'a', 'img', 'figure', 'figcaption',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'br', 'hr', 'div', 'span',
];

const FETCH_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
    'AppleWebKit/537.36 (KHTML, like Gecko) ' +
    'Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Cache-Control': 'no-cache',
  'Referer': 'https://www.google.com/',
};

// Ordered list of CSS selectors tried when Readability returns null
const FALLBACK_SELECTORS = [
  'article',
  '[role="main"]',
  'main',
  '[itemprop="articleBody"]',
  '.post-content',
  '.entry-content',
  '.article-body',
  '.article-content',
  '.story-body',
  '.post-body',
  '.blog-content',
  '.content-body',
  '#content',
];

const fallbackExtract = (doc) => {
  // Remove obvious noise before scanning
  ['nav', 'header', 'footer', 'aside', '.sidebar', '.comments', '.related',
   'script', 'style', 'noscript'].forEach((sel) => {
    doc.querySelectorAll(sel).forEach((el) => el.remove());
  });
  for (const sel of FALLBACK_SELECTORS) {
    const el = doc.querySelector(sel);
    if (el && el.textContent.trim().length > 200) return el.innerHTML;
  }
  return null;
};

const TWITTER_HOSTS = new Set(['twitter.com', 'x.com']);

const getDomain = (urlObj) => urlObj.hostname.replace('www.', '');

const getOgMeta = (doc) => {
  const get = (sel) => doc.querySelector(sel)?.getAttribute('content') || '';
  return {
    title:
      get('meta[property="og:title"]') ||
      get('meta[name="twitter:title"]') ||
      doc.title || '',
    excerpt:
      get('meta[property="og:description"]') ||
      get('meta[name="description"]') ||
      get('meta[name="twitter:description"]') || '',
    heroImage:
      get('meta[property="og:image"]') ||
      get('meta[name="twitter:image"]') || '',
  };
};

exports.fetchArticle = onCall(
  {
    cors: true,
    timeoutSeconds: 30,
    memory: '512MiB',
    region: 'us-central1',
  },
  async (request) => {
    // Auth guard — only signed-in users can trigger server-side fetches
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be signed in');
    }

    const { url } = request.data;
    if (!url || typeof url !== 'string') {
      throw new HttpsError('invalid-argument', 'url is required');
    }

    // Validate URL
    let parsedUrl;
    try {
      parsedUrl = new URL(url);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error('bad protocol');
      }
    } catch {
      throw new HttpsError('invalid-argument', 'Invalid URL');
    }

    // ── Twitter / X — use oEmbed (content is JS-rendered, can't scrape) ──
    const host = parsedUrl.hostname.replace('www.', '');
    if (TWITTER_HOSTS.has(host)) {
      const oembedUrl =
        `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}&omit_script=true`;
      try {
        const res = await fetch(oembedUrl, { signal: AbortSignal.timeout(10000) });
        if (!res.ok) throw new Error(`oEmbed HTTP ${res.status}`);
        const oembed = await res.json();
        const rawHtml = oembed.html || '';
        const content = sanitizeHtml(rawHtml, {
          allowedTags: [...ALLOWED_TAGS, 'blockquote'],
          allowedAttributes: { a: ['href', 'title', 'target', 'rel'], blockquote: ['class'], '*': ['class'] },
        });
        return {
          title:             `Tweet by ${oembed.author_name}`,
          excerpt:           '',
          heroImage:         '',
          content,
          wordCount:         0,
          estimatedReadTime: 1,
          authors:           [oembed.author_name],
          domain:            host,
          fetchStatus:       'fetched',
        };
      } catch (err) {
        throw new HttpsError('internal', `Twitter oEmbed failed: ${err.message}`);
      }
    }

    // ── Fetch page HTML (with Wayback Machine fallback for IP-blocked sites) ──
    let html;
    try {
      const res = await fetch(parsedUrl.href, {
        headers: FETCH_HEADERS,
        signal: AbortSignal.timeout(20000),
        redirect: 'follow',
      });

      if (res.ok) {
        html = await res.text();
      } else if ([403, 429, 503].includes(res.status)) {
        // Cloud IPs are often blocked — try the latest Wayback Machine snapshot
        const waybackApi = `https://archive.org/wayback/available?url=${encodeURIComponent(parsedUrl.href)}`;
        const wbMeta = await fetch(waybackApi, { signal: AbortSignal.timeout(10000) });
        if (!wbMeta.ok) throw new Error(`HTTP ${res.status}`);
        const wbData = await wbMeta.json();
        const snapshot = wbData?.archived_snapshots?.closest;
        if (!snapshot?.available || !snapshot?.url) throw new Error(`HTTP ${res.status}`);
        const wbRes = await fetch(snapshot.url, {
          headers: FETCH_HEADERS,
          signal: AbortSignal.timeout(20000),
          redirect: 'follow',
        });
        if (!wbRes.ok) throw new Error(`HTTP ${res.status}`);
        html = await wbRes.text();
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (err) {
      throw new HttpsError('internal', `Fetch failed: ${err.message}`);
    }

    // ── Parse with jsdom + Readability ───────────────────────────────────
    const dom = new JSDOM(html, { url: parsedUrl.href });
    const doc = dom.window.document;
    const og = getOgMeta(doc);

    const reader = new Readability(doc.cloneNode(true));
    const article = reader.parse();

    // ── Fallback: manual extraction when Readability returns null ────────
    let rawContent = article?.content ?? null;
    if (!rawContent) {
      rawContent = fallbackExtract(doc);
    }

    if (!rawContent) {
      // Return OG metadata at minimum even if article body can't be extracted
      return {
        title: og.title,
        excerpt: og.excerpt,
        heroImage: og.heroImage,
        content: '',
        wordCount: 0,
        estimatedReadTime: 0,
        authors: [],
        domain: getDomain(parsedUrl),
        fetchStatus: 'failed',
      };
    }

    // ── Sanitize HTML ────────────────────────────────────────────────────
    const content = sanitizeHtml(rawContent, {
      allowedTags: ALLOWED_TAGS,
      allowedAttributes: {
        a:   ['href', 'title'],
        img: ['src', 'alt', 'title'],
        '*': ['class'],
      },
      // Force all links to open in new tab
      transformTags: {
        a: (tagName, attribs) => ({
          tagName,
          attribs: { ...attribs, target: '_blank', rel: 'noopener noreferrer' },
        }),
      },
    });

    const wordCount = (article?.textContent || rawContent.replace(/<[^>]+>/g, '') || '').trim().split(/\s+/).length;

    return {
      title:             article?.title || og.title,
      excerpt:           og.excerpt     || article?.excerpt || '',
      heroImage:         og.heroImage,
      content,
      wordCount,
      estimatedReadTime: Math.max(1, Math.round(wordCount / 200)),
      authors:           article?.byline ? [article.byline] : [],
      domain:            getDomain(parsedUrl),
      fetchStatus:       'fetched',
    };
  }
);
