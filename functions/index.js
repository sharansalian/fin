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
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');

// Firebase Admin — initialised once
if (!admin.apps.length) admin.initializeApp();

// Secret: GITHUB_TOKEN must be set via:
//   firebase functions:secrets:set GITHUB_TOKEN
// Then redeploy functions.
const GITHUB_TOKEN = defineSecret('GITHUB_TOKEN');

// Admin email — only this user can approve/reject requests
const ADMIN_EMAIL = 'sharansalian.business@gmail.com';
const GITHUB_REPO = 'sharansalian/pocket';
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
const YOUTUBE_HOSTS = new Set(['youtube.com', 'youtu.be', 'm.youtube.com']);

const getDomain = (urlObj) => urlObj.hostname.replace('www.', '');

const getYouTubeVideoId = (urlObj) => {
  const host = urlObj.hostname.replace('www.', '');
  if (host === 'youtu.be') return urlObj.pathname.slice(1).split('?')[0] || null;
  if (host === 'youtube.com' || host === 'm.youtube.com') {
    if (urlObj.pathname.startsWith('/shorts/')) return urlObj.pathname.split('/')[2] || null;
    return urlObj.searchParams.get('v') || null;
  }
  return null;
};

const parseTranscriptJson3 = (data) => {
  const segments = [];
  for (const event of data.events || []) {
    if (!event.segs) continue;
    const start = event.tStartMs / 1000;
    const text = event.segs
      .map((s) => s.utf8 || '')
      .join('')
      .replace(/\n/g, ' ')
      .trim();
    if (text) segments.push({ start, text });
  }
  return segments;
};

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
        // Detect X.com error embeds — oEmbed returns HTTP 200 but the HTML
        // contains an error message instead of the tweet content.
        const plainText = rawHtml.replace(/<[^>]+>/g, '').trim();
        if (
          plainText.length < 30 ||
          plainText.toLowerCase().includes('something went wrong') ||
          plainText.toLowerCase().includes("don't fret")
        ) {
          throw new Error('oEmbed returned an error embed');
        }
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
        // Return failed status so Reader shows "open on X.com" fallback
        return {
          title:             '',
          excerpt:           '',
          heroImage:         '',
          content:           '',
          wordCount:         0,
          estimatedReadTime: 0,
          authors:           [],
          domain:            host,
          fetchStatus:       'failed',
          fetchError:        err.message,
        };
      }
    }

    // ── YouTube — embed player + fetch transcript ─────────────────────────
    if (YOUTUBE_HOSTS.has(host)) {
      const videoId = getYouTubeVideoId(parsedUrl);
      if (!videoId) {
        throw new HttpsError('invalid-argument', 'Could not extract YouTube video ID');
      }

      let title = '';
      let excerpt = '';
      let heroImage = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
      let transcript = [];

      try {
        const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
          headers: { ...FETCH_HEADERS, 'Accept-Language': 'en-US,en;q=1.0' },
          signal: AbortSignal.timeout(15000),
        });

        if (pageRes.ok) {
          const pageHtml = await pageRes.text();

          // Extract ytInitialPlayerResponse using brace-counting (handles nested JSON)
          const markerIdx = pageHtml.indexOf('ytInitialPlayerResponse');
          if (markerIdx !== -1) {
            const jsonStart = pageHtml.indexOf('{', markerIdx);
            if (jsonStart !== -1) {
              let depth = 0;
              let i = jsonStart;
              const limit = Math.min(jsonStart + 2_000_000, pageHtml.length);
              for (; i < limit; i++) {
                if (pageHtml[i] === '{') depth++;
                else if (pageHtml[i] === '}') { depth--; if (depth === 0) break; }
              }
              try {
                const playerData = JSON.parse(pageHtml.slice(jsonStart, i + 1));
                const details = playerData.videoDetails || {};
                title = details.title || '';
                excerpt = (details.shortDescription || '').split('\n')[0];
                const thumbs = details.thumbnail?.thumbnails || [];
                if (thumbs.length) heroImage = thumbs[thumbs.length - 1].url;

                const captionTracks =
                  playerData.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
                const track =
                  captionTracks.find((t) => t.languageCode === 'en') ||
                  captionTracks.find((t) => t.languageCode?.startsWith('en')) ||
                  captionTracks[0];

                if (track?.baseUrl) {
                  try {
                    const capRes = await fetch(track.baseUrl + '&fmt=json3', {
                      signal: AbortSignal.timeout(10000),
                    });
                    if (capRes.ok) {
                      const capJson = await capRes.json();
                      transcript = parseTranscriptJson3(capJson).slice(0, 600);
                    }
                  } catch { /* no transcript */ }
                }
              } catch { /* JSON parse failed */ }
            }
          }
        }
      } catch { /* network error — use defaults */ }

      return {
        title: title || `YouTube: ${videoId}`,
        excerpt,
        heroImage,
        content: '',
        wordCount: 0,
        estimatedReadTime: 0,
        authors: [],
        domain: 'youtube.com',
        fetchStatus: 'fetched',
        isVideo: true,
        videoId,
        transcript,
      };
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
        // Cloud IPs are often blocked by publishers. Fall back to the latest
        // Wayback Machine snapshot by using a far-future date — Wayback redirects
        // to the nearest real snapshot automatically (redirect:follow handles it).
        const origStatus = res.status;
        const waybackUrl = `https://web.archive.org/web/20260101000000/${parsedUrl.href}`;
        const wbRes = await fetch(waybackUrl, {
          headers: FETCH_HEADERS,
          signal: AbortSignal.timeout(20000),
          redirect: 'follow',
        });
        if (!wbRes.ok) {
          throw new Error(`HTTP ${origStatus} (archive: ${wbRes.status})`);
        }
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

/**
 * approveSupportRequest — admin-only
 *
 * action: 'approve' → creates a GitHub issue with label 'claude-task', updates Firestore
 * action: 'reject'  → marks request as rejected in Firestore
 *
 * Requires GITHUB_TOKEN secret (set via `firebase functions:secrets:set GITHUB_TOKEN`).
 */
exports.approveSupportRequest = onCall(
  {
    cors: true,
    region: 'us-central1',
    secrets: [GITHUB_TOKEN],
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be signed in');
    }
    if (request.auth.token.email !== ADMIN_EMAIL) {
      throw new HttpsError('permission-denied', 'Admin only');
    }

    const { requestId, action } = request.data;
    if (!requestId || !['approve', 'reject'].includes(action)) {
      throw new HttpsError('invalid-argument', 'requestId and valid action required');
    }

    const db = admin.firestore();
    const ref = db.collection('supportRequests').doc(requestId);
    const snap = await ref.get();

    if (!snap.exists) {
      throw new HttpsError('not-found', 'Support request not found');
    }

    const data = snap.data();

    if (action === 'reject') {
      await ref.update({
        status: 'rejected',
        rejectedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return { status: 'rejected' };
    }

    // action === 'approve' — create GitHub issue
    const token = GITHUB_TOKEN.value();
    const issueBody = [
      `**Submitted by:** ${data.userName || ''} (${data.userEmail})`,
      '',
      data.description,
      '',
      '---',
      `*Support request ID: ${requestId}*`,
    ].join('\n');

    const ghRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/issues`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({
        title: data.title,
        body: issueBody,
        labels: ['claude-task'],
      }),
    });

    if (!ghRes.ok) {
      const errText = await ghRes.text();
      throw new HttpsError('internal', `GitHub API error ${ghRes.status}: ${errText}`);
    }

    const issue = await ghRes.json();

    await ref.update({
      status: 'approved',
      approvedAt: admin.firestore.FieldValue.serverTimestamp(),
      githubIssueUrl: issue.html_url,
      githubIssueNumber: issue.number,
    });

    return { status: 'approved', githubIssueUrl: issue.html_url };
  }
);
