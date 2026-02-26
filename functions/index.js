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
};

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

    // ── Fetch page HTML ──────────────────────────────────────────────────
    let html;
    try {
      const res = await fetch(parsedUrl.href, {
        headers: FETCH_HEADERS,
        signal: AbortSignal.timeout(20000),
        redirect: 'follow',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      html = await res.text();
    } catch (err) {
      throw new HttpsError('internal', `Fetch failed: ${err.message}`);
    }

    // ── Parse with jsdom + Readability ───────────────────────────────────
    const dom = new JSDOM(html, { url: parsedUrl.href });
    const doc = dom.window.document;
    const og = getOgMeta(doc);

    const reader = new Readability(doc);
    const article = reader.parse();

    if (!article) {
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
    const content = sanitizeHtml(article.content, {
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

    const wordCount = (article.textContent || '').trim().split(/\s+/).length;

    return {
      title:             article.title  || og.title,
      excerpt:           og.excerpt     || article.excerpt || '',
      heroImage:         og.heroImage,
      content,
      wordCount,
      estimatedReadTime: Math.max(1, Math.round(wordCount / 200)),
      authors:           article.byline ? [article.byline] : [],
      domain:            getDomain(parsedUrl),
      fetchStatus:       'fetched',
    };
  }
);
