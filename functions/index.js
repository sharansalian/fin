/**
 * Firebase Cloud Function — fetchArticle
 *
 * Server-side article fetcher. Replaces all CORS proxies.
 * Called as an authenticated Firebase callable from the client.
 *
 * Requires Blaze (pay-as-you-go) plan for external HTTP requests.
 * Deploy: firebase deploy --only functions
 */

const { onCall, onRequest, HttpsError } = require('firebase-functions/v2/https');
const { onDocumentUpdated, onDocumentCreated } = require('firebase-functions/v2/firestore');
const { defineSecret } = require('firebase-functions/params');
const nodemailer = require('nodemailer');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');
const crypto = require('crypto');

// ─────────────────────────────────────────────────────────────────────────────
// LangGraph imports
//   StateGraph  — the graph builder (nodes + edges live here)
//   Annotation  — defines the SHAPE of state that flows between nodes
//   START / END — special sentinel node names built into LangGraph
// ─────────────────────────────────────────────────────────────────────────────
const { StateGraph, Annotation, END, START } = require('@langchain/langgraph');
const { ChatOpenAI } = require('@langchain/openai');
const { HumanMessage, SystemMessage } = require('@langchain/core/messages');

// Firebase Admin — initialised once
if (!admin.apps.length) admin.initializeApp();

// Secret: GITHUB_TOKEN must be set via:
//   firebase functions:secrets:set GITHUB_TOKEN
// Then redeploy functions.
const GITHUB_TOKEN = defineSecret('GITHUB_TOKEN');

// Secret: GROQ_API_KEY must be set via:
//   firebase functions:secrets:set GROQ_API_KEY
// Get your free key at https://console.groq.com
const GROQ_API_KEY = defineSecret('GROQ_API_KEY');

// Secret: HF_API_KEY must be set via:
//   firebase functions:secrets:set HF_API_KEY
// Get your free key at https://huggingface.co/settings/tokens
const HF_API_KEY = defineSecret('HF_API_KEY');

// Secret: PADDLE_WEBHOOK_SECRET must be set via:
//   firebase functions:secrets:set PADDLE_WEBHOOK_SECRET
// Get it from: Paddle Dashboard → Developer Tools → Notifications → your webhook → secret key
const PADDLE_WEBHOOK_SECRET = defineSecret('PADDLE_WEBHOOK_SECRET');

// Secret: GMAIL_APP_PASSWORD must be set via:
//   firebase functions:secrets:set GMAIL_APP_PASSWORD
// Generate at: myaccount.google.com → Security → 2-Step Verification → App passwords
// Use the admin Gmail account (sharansalian.business@gmail.com)
const GMAIL_APP_PASSWORD = defineSecret('GMAIL_APP_PASSWORD');

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

    const { url, articleId } = request.data;
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
        img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
        '*': ['class', 'style'],
      },
      // Whitelist safe CSS properties — preserves layout/typography inline styles
      // while blocking dangerous properties like position:fixed, z-index, etc.
      allowedStyles: {
        '*': {
          'color':            [/.*/],
          'background-color': [/.*/],
          'font-size':        [/.*/],
          'font-weight':      [/.*/],
          'font-style':       [/.*/],
          'text-align':       [/.*/],
          'text-decoration':  [/.*/],
          'line-height':      [/.*/],
          'letter-spacing':   [/.*/],
          'margin':           [/.*/],
          'margin-top':       [/.*/],
          'margin-right':     [/.*/],
          'margin-bottom':    [/.*/],
          'margin-left':      [/.*/],
          'padding':          [/.*/],
          'padding-top':      [/.*/],
          'padding-right':    [/.*/],
          'padding-bottom':   [/.*/],
          'padding-left':     [/.*/],
          'border':           [/.*/],
          'border-radius':    [/.*/],
          'border-left':      [/.*/],
          'opacity':          [/.*/],
          'width':            [/^(?!100vw|100dvw).*/],
          'max-width':        [/.*/],
        },
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

    const result = {
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

    // If articleId is provided (e.g. from the browser extension), persist the
    // result directly to Firestore server-side so fire-and-forget callers
    // don't need to wait for the response.
    if (articleId) {
      await admin.firestore()
        .collection('users').doc(request.auth.uid)
        .collection('articles').doc(articleId)
        .update(result)
        .catch(() => {}); // non-fatal — caller still gets the data
    }

    return result;
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

// ═════════════════════════════════════════════════════════════════════════════
//
//  LANGGRAPH 101 — summarizeArticle
//
//  LangGraph lets you build AI workflows as a directed graph of "nodes"
//  connected by "edges". Each node receives STATE, does some work, and
//  returns a partial update to STATE. Edges decide what runs next.
//
//  This graph has 2 nodes:
//
//    START
//      │
//   ┌──▼──────┐   word count < 50?
//   │ assess  │ ──────────────────► END  (too short, skip LLM)
//   └──┬──────┘ long enough
//      │
//   ┌──▼──────────┐
//   │  summarize  │  one LLM call → summary + key points + tag suggestions
//   └──┬──────────┘
//      │
//     END
//
//  STATE is a plain JS object that flows through every node.
//  Nodes return PARTIAL updates — you only write what you changed.
//
// ═════════════════════════════════════════════════════════════════════════════

// ── 1. STATE SCHEMA ──────────────────────────────────────────────────────────
//
//  Annotation.Root() defines each field in state.
//  reducer: (currentValue, newValue) => merged  — "last write wins" is typical.
//  default: () => initialValue                  — what the field starts as.
//
const SummaryState = Annotation.Root({
  // ── inputs (provided by the caller) ──
  content:  Annotation({ reducer: (x, y) => y ?? x, default: () => '' }),
  title:    Annotation({ reducer: (x, y) => y ?? x, default: () => '' }),
  articleId: Annotation({ reducer: (x, y) => y ?? x, default: () => '' }),
  uid:      Annotation({ reducer: (x, y) => y ?? x, default: () => '' }),

  // ── computed in "assess" node ──
  wordCount:  Annotation({ reducer: (x, y) => y ?? x, default: () => 0 }),
  shouldSkip: Annotation({ reducer: (x, y) => y ?? x, default: () => false }),

  // ── produced by "summarize" node ──
  summary:       Annotation({ reducer: (x, y) => y ?? x, default: () => '' }),
  keyPoints:     Annotation({ reducer: (x, y) => y ?? x, default: () => [] }),
  suggestedTags: Annotation({ reducer: (x, y) => y ?? x, default: () => [] }),
});

// ── 2. NODE FUNCTIONS ─────────────────────────────────────────────────────────
//
//  Every node is a plain function:  (state) => partialUpdate
//  For async work (LLM calls, DB writes): async (state) => partialUpdate
//

// Node A — "assess"
// Pure function. No LLM. Just counts words and decides if content is usable.
const assessNode = (state) => {
  const wordCount = state.content.split(/\s+/).filter(Boolean).length;
  return {
    wordCount,
    shouldSkip: wordCount < 50, // not worth an LLM call on tiny snippets
  };
};

// Node B — "summarize"
// Makes a single LLM call asking for JSON with summary + key points + tags.
const summarizeNode = async (state) => {
  const llm = new ChatOpenAI({
    model:     'qwen/qwen3-32b', // replaces decommissioned qwen-qwq-32b
    apiKey:    GROQ_API_KEY.value(),
    maxTokens: 4000,
    configuration: {
      baseURL: 'https://api.groq.com/openai/v1',
    },
  });

  // Truncate to ~6 000 chars (~1 500 tokens) so we never blow the context window
  const excerpt = state.content.slice(0, 6000);

  const response = await llm.invoke([
    new SystemMessage(
      'You are a concise article summarizer. Always reply with ONLY valid JSON — no markdown, no preamble.'
    ),
    new HumanMessage(
      `Title: ${state.title}\n\nContent:\n${excerpt}\n\n` +
      'Return ONLY this JSON:\n' +
      '{\n' +
      '  "summary": "2-3 sentence plain-English summary",\n' +
      '  "keyPoints": ["point 1", "point 2", "point 3"],\n' +
      '  "suggestedTags": ["tag1", "tag2", "tag3"]\n' +
      '}'
    ),
  ]);

  let parsed = { summary: '', keyPoints: [], suggestedTags: [] };
  try {
    // Qwen3 may use thinking mode — strip any <think>…</think> block
    // then remove any accidental markdown fences before parsing JSON
    const raw = String(response.content)
      .replace(/<think>[\s\S]*?<\/think>/gi, '')
      .replace(/```json|```/g, '')
      .trim();
    parsed = JSON.parse(raw);
  } catch {
    // If JSON parse fails, surface the raw text as the summary
    parsed.summary = String(response.content).slice(0, 500);
  }

  // Persist results back to the article document so we never re-call the LLM
  if (state.articleId && state.uid) {
    await admin.firestore()
      .collection('users').doc(state.uid)
      .collection('articles').doc(state.articleId)
      .update({
        aiSummary:       parsed.summary       || '',
        aiKeyPoints:     parsed.keyPoints     || [],
        aiSuggestedTags: parsed.suggestedTags || [],
      }).catch(() => {}); // non-fatal — caller still gets the data
  }

  return {
    summary:       parsed.summary       || '',
    keyPoints:     parsed.keyPoints     || [],
    suggestedTags: parsed.suggestedTags || [],
  };
};

// ── 3. CONDITIONAL ROUTER ─────────────────────────────────────────────────────
//
//  addConditionalEdges() calls this function AFTER "assess" runs.
//  It returns the NAME of the next node (or END to stop the graph).
//
const routeAfterAssess = (state) => (state.shouldSkip ? END : 'summarize');

// ── 4. BUILD + COMPILE THE GRAPH ─────────────────────────────────────────────
//
//  .addNode(name, fn)          — register a node
//  .addEdge(from, to)          — fixed transition
//  .addConditionalEdges(from, routerFn) — dynamic transition
//  .compile()                  — lock the graph for execution
//
const summaryGraph = new StateGraph(SummaryState)
  .addNode('assess',    assessNode)
  .addNode('summarize', summarizeNode)
  .addEdge(START, 'assess')
  .addConditionalEdges('assess', routeAfterAssess)
  .addEdge('summarize', END)
  .compile();

// ── 5. CLOUD FUNCTION WRAPPER ─────────────────────────────────────────────────
exports.summarizeArticle = onCall(
  {
    cors:           true,
    timeoutSeconds: 60,
    memory:         '512MiB',
    region:         'us-central1',
    secrets:        [GROQ_API_KEY],
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be signed in');
    }

    const { content, title, articleId } = request.data;
    if (!content && !title) {
      throw new HttpsError('invalid-argument', 'content or title is required');
    }

    // ── 6. RUN THE GRAPH ─────────────────────────────────────────────────────
    //
    //  graph.invoke(initialState) starts at START, runs every node in order,
    //  and returns the FINAL merged state when END is reached.
    //
    let result;
    try {
      result = await summaryGraph.invoke({
        content:   content  || '',
        title:     title    || '',
        articleId: articleId || '',
        uid:       request.auth.uid,
      });
    } catch (err) {
      // ── Observability: structured log + Firestore error record ────────────
      // Logs appear in Firebase Console → Functions → Logs (and Cloud Logging).
      // Set up a Cloud Logging alert on severity=ERROR to get email/Slack pings.
      logger.error('summarizeArticle failed', {
        uid:       request.auth.uid,
        articleId: articleId || '',
        title:     (title || '').slice(0, 120),
        error:     err.message,
        stack:     err.stack,
      });

      // Persist to Firestore so you can query errors without trawling logs.
      // Firebase Console → Firestore → errors collection.
      await admin.firestore().collection('errors').add({
        type:      'summarization_failed',
        uid:       request.auth.uid,
        articleId: articleId || '',
        title:     (title || '').slice(0, 120),
        error:     err.message,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      }).catch(() => {}); // never let observability break the response

      throw new HttpsError('internal', err.message || 'Summarization failed');
    }

    return {
      summary:       result.summary,
      keyPoints:     result.keyPoints,
      suggestedTags: result.suggestedTags,
      wordCount:     result.wordCount,
      skipped:       result.shouldSkip,
    };
  }
);

// ═════════════════════════════════════════════════════════════════════════════
//
//  sharePreview — Bitly-style short links with proper OG meta tags
//
//  URL format:  https://app.web.app/p/{shortCode}
//
//  Flow:
//    1. Client creates a doc in /shares/{shortCode} with article metadata.
//    2. Client shares the clean URL  https://app.web.app/p/{shortCode}.
//    3. Messaging app crawlers visit the URL → this function reads the doc
//       and returns HTML with the original article's OG title/image/desc.
//    4. Human visitor is auto-redirected to /save?url=... so the article
//       gets saved to their Pocket list.
//
// ═════════════════════════════════════════════════════════════════════════════

const escapeHtml = (str) =>
  String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const buildOgHtml = ({ title, image, desc, url, saveUrl }) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(title)}</title>
  <meta property="og:site_name" content="Pocket">
  <meta property="og:type" content="article">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(desc || 'Save this article to your Pocket reading list')}">
  ${image ? `<meta property="og:image" content="${escapeHtml(image)}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">` : ''}
  <meta property="og:url" content="${escapeHtml(url)}">
  <meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(desc || 'Save this article to your Pocket reading list')}">
  ${image ? `<meta name="twitter:image" content="${escapeHtml(image)}">` : ''}
  <meta http-equiv="refresh" content="0;url=${escapeHtml(saveUrl)}">
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:system-ui,sans-serif;background:#0A0A0F;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px}
    .card{max-width:420px;width:100%;text-align:center}
    .logo{font-size:13px;font-weight:700;letter-spacing:1px;color:#EF4056;text-transform:uppercase;margin-bottom:20px}
    img{width:100%;border-radius:12px;object-fit:cover;max-height:220px}
    h1{font-size:18px;font-weight:600;line-height:1.4;margin:16px 0 8px}
    p{font-size:14px;color:#888}
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">Pocket</div>
    ${image ? `<img src="${escapeHtml(image)}" alt="">` : ''}
    <h1>${escapeHtml(title)}</h1>
    <p>Opening in Pocket…</p>
  </div>
  <script>window.location.replace(${JSON.stringify(saveUrl)});</script>
</body>
</html>`;

exports.sharePreview = onRequest(
  { cors: true, region: 'us-central1' },
  async (req, res) => {
    // Extract short code from path: /p/{code}
    const code = req.path.replace(/^\/p\/?/, '').split('/')[0].trim();

    let url, title, image, desc;

    if (code) {
      // Bitly-style: look up /shares/{code} in Firestore
      try {
        const snap = await admin.firestore().doc(`shares/${code}`).get();
        if (!snap.exists) { res.status(404).send('Link not found'); return; }
        const data = snap.data();
        url   = data.url   || '';
        title = data.title || 'Shared article';
        image = data.heroImage || '';
        desc  = data.excerpt   || '';
      } catch (err) {
        logger.error('sharePreview Firestore read failed:', err);
        res.status(500).send('Error loading link');
        return;
      }
    } else {
      // Fallback: query-param style (legacy / backward compat)
      url   = req.query.url   || '';
      title = req.query.title || 'Shared article';
      image = req.query.image || '';
      desc  = req.query.desc  || '';
    }

    if (!url) { res.status(400).send('Missing url'); return; }

    const saveParams = new URLSearchParams({ url });
    if (title) saveParams.set('title', title);
    if (image) saveParams.set('heroImage', image);
    const saveUrl = `/save?${saveParams.toString()}`;

    res.set('Cache-Control', 'public, max-age=300');
    res.send(buildOgHtml({ title, image, desc, url, saveUrl }));
  }
);

// ═════════════════════════════════════════════════════════════════════════════
//
//  onArticleFavoriteChange — maintains global favorite counts
//
//  Whenever a user favorites/unfavorites an article the counter in
//  /articleStats/{urlHash} is incremented or decremented.
//  The FeaturedArticle component queries this collection to find the
//  most-liked article across ALL users, showing it as the daily featured.
//
// ═════════════════════════════════════════════════════════════════════════════

exports.onArticleFavoriteChange = onDocumentUpdated(
  { document: 'users/{userId}/articles/{articleId}', region: 'us-central1' },
  async (event) => {
    const before = event.data.before.data();
    const after  = event.data.after.data();

    // Only act when isFavorite actually flipped
    if (Boolean(before?.isFavorite) === Boolean(after?.isFavorite)) return null;

    const url = after?.url;
    if (!url) return null;

    // Stable doc ID: MD5 of the URL (URL-safe, collision-resistant for this use)
    const urlHash = crypto.createHash('md5').update(url).digest('hex');
    const statsRef = admin.firestore().doc(`articleStats/${urlHash}`);
    const delta = after.isFavorite ? 1 : -1;

    await statsRef.set({
      url:           after.url,
      title:         after.title        || '',
      heroImage:     after.heroImage    || '',
      excerpt:       after.excerpt      || '',
      domain:        after.domain       || '',
      favoriteCount: admin.firestore.FieldValue.increment(delta),
      lastUpdated:   admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    return null;
  }
);

// ═════════════════════════════════════════════════════════════════════════════
//
//  LANGGRAPH — readArticle (Text-to-Speech via Kokoro)
//
//  Converts article text to speech using the open-source Kokoro TTS model
//  hosted on Hugging Face's free Inference API.
//
//  Graph:
//
//    START
//      │
//   ┌──▼────────┐   text too short?
//   │  prepare  │ ──────────────────► END  (nothing to read)
//   └──┬────────┘  has chunks
//      │
//   ┌──▼─────────────┐
//   │  synthesize    │  calls Kokoro via HF API for each chunk
//   └──┬─────────────┘
//      │
//     END
//
//  Free tier: https://huggingface.co/settings/tokens
//  Model:     https://huggingface.co/hexgrad/Kokoro-82M
//
// ═════════════════════════════════════════════════════════════════════════════

// ── 1. TTS STATE SCHEMA ────────────────────────────────────────────────────
const TTSState = Annotation.Root({
  content:     Annotation({ reducer: (x, y) => y ?? x, default: () => '' }),
  title:       Annotation({ reducer: (x, y) => y ?? x, default: () => '' }),
  chunks:      Annotation({ reducer: (x, y) => y ?? x, default: () => [] }),
  shouldSkip:  Annotation({ reducer: (x, y) => y ?? x, default: () => false }),
  audioChunks: Annotation({ reducer: (x, y) => y ?? x, default: () => [] }),
  contentType: Annotation({ reducer: (x, y) => y ?? x, default: () => '' }),
});

// ── 2. NODE: prepare ────────────────────────────────────────────────────────
//  Strip HTML, split into sentence-boundary chunks (~400 chars each).
//  TTS models work best with shorter inputs; chunking avoids timeouts.
const ttsPrepareNode = (state) => {
  let text = state.content
    .replace(/<[^>]+>/g, ' ')     // strip HTML tags
    .replace(/&[a-z]+;/gi, ' ')   // strip HTML entities
    .replace(/\s+/g, ' ')         // collapse whitespace
    .trim();

  if (state.title) text = `${state.title}. ${text}`;

  if (text.length < 10) return { shouldSkip: true, chunks: [] };

  // Split at sentence boundaries, group into ~400 char chunks
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const chunks = [];
  let current = '';

  for (const sentence of sentences) {
    if ((current + sentence).length > 400 && current) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current += sentence;
    }
  }
  if (current.trim()) chunks.push(current.trim());

  // Cap at ~3 000 chars total (~2–3 min of speech)
  const limited = [];
  let total = 0;
  for (const chunk of chunks) {
    if (total + chunk.length > 3000) break;
    limited.push(chunk);
    total += chunk.length;
  }

  return { chunks: limited, shouldSkip: limited.length === 0 };
};

// ── 3. NODE: synthesize ─────────────────────────────────────────────────────
//  Calls Hugging Face Inference API (Kokoro-82M) for each text chunk.
//  Returns an array of base64-encoded audio blobs.
const ttsSynthesizeNode = async (state) => {
  const token = HF_API_KEY.value();
  const audioChunks = [];
  let contentType = 'audio/flac';

  for (const chunk of state.chunks) {
    const res = await fetch(
      'https://api-inference.huggingface.co/models/hexgrad/Kokoro-82M',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inputs: chunk }),
        signal: AbortSignal.timeout(30000),
      }
    );

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Kokoro API ${res.status}: ${errText.slice(0, 200)}`);
    }

    contentType = res.headers.get('content-type') || 'audio/flac';
    const buffer = Buffer.from(await res.arrayBuffer());
    audioChunks.push(buffer.toString('base64'));
  }

  return { audioChunks, contentType };
};

// ── 4. CONDITIONAL ROUTER ───────────────────────────────────────────────────
const ttsRouteAfterPrepare = (state) => (state.shouldSkip ? END : 'synthesize');

// ── 5. BUILD + COMPILE THE TTS GRAPH ────────────────────────────────────────
const ttsGraph = new StateGraph(TTSState)
  .addNode('prepare',    ttsPrepareNode)
  .addNode('synthesize', ttsSynthesizeNode)
  .addEdge(START, 'prepare')
  .addConditionalEdges('prepare', ttsRouteAfterPrepare)
  .addEdge('synthesize', END)
  .compile();

// ── 6. CLOUD FUNCTION WRAPPER ───────────────────────────────────────────────
exports.readArticle = onCall(
  {
    cors:           true,
    timeoutSeconds: 120,
    memory:         '512MiB',
    region:         'us-central1',
    secrets:        [HF_API_KEY],
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be signed in');
    }

    const { content, title } = request.data;
    if (!content && !title) {
      throw new HttpsError('invalid-argument', 'content or title is required');
    }

    let result;
    try {
      result = await ttsGraph.invoke({
        content: content || '',
        title:   title   || '',
      });
    } catch (err) {
      logger.error('readArticle failed', {
        uid:   request.auth.uid,
        title: (title || '').slice(0, 120),
        error: err.message,
      });
      throw new HttpsError('internal', err.message || 'TTS generation failed');
    }

    if (result.shouldSkip) {
      return { skipped: true, audioChunks: [], contentType: '' };
    }

    return {
      skipped:     false,
      audioChunks: result.audioChunks,
      contentType: result.contentType,
    };
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// Lemon Squeezy — Payment Integration
// ═══════════════════════════════════════════════════════════════════════════

/**
 * paddleWebhook — receives Paddle Billing webhook events.
 *
 * Checkout is handled client-side via Paddle.js (no createCheckout function needed).
 * This webhook sets/revokes isPremium on the user's Firestore doc.
 *
 * Setup:
 *   1. firebase functions:secrets:set PADDLE_WEBHOOK_SECRET
 *   2. Paddle Dashboard → Developer Tools → Notifications → Add endpoint:
 *      https://us-central1-finn-2c4c5.cloudfunctions.net/paddleWebhook
 *   3. Subscribe to: subscription.activated, subscription.canceled,
 *      subscription.paused, transaction.completed
 *   4. Copy the secret key shown and set it via step 1.
 *
 * Paddle passes customData = { user_id: "<firebase_uid>" } from the client-side
 * Paddle.Checkout.open() call so we know which user paid.
 */
exports.paddleWebhook = onRequest(
  {
    region: 'us-central1',
    secrets: [PADDLE_WEBHOOK_SECRET],
  },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    // ── Verify Paddle signature ───────────────────────────────────────────
    // Header format: "ts=TIMESTAMP;h1=HMAC_SHA256_HEX"
    const secret = PADDLE_WEBHOOK_SECRET.value();
    if (!secret) {
      logger.error('PADDLE_WEBHOOK_SECRET not set');
      res.status(500).send('Webhook secret not configured');
      return;
    }

    const paddleSig = req.headers['paddle-signature'];
    if (!paddleSig) {
      res.status(401).send('Missing Paddle-Signature header');
      return;
    }

    const parts = Object.fromEntries(
      paddleSig.split(';').map((p) => p.split('='))
    );
    const ts = parts.ts;
    const receivedH1 = parts.h1;

    if (!ts || !receivedH1) {
      res.status(401).send('Malformed signature');
      return;
    }

    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    const signed = `${ts}:${rawBody}`;
    const expectedH1 = crypto.createHmac('sha256', secret).update(signed).digest('hex');

    if (!crypto.timingSafeEqual(Buffer.from(expectedH1), Buffer.from(receivedH1))) {
      logger.warn('paddleWebhook: invalid signature');
      res.status(401).send('Invalid signature');
      return;
    }

    // ── Process event ─────────────────────────────────────────────────────
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const eventType = body.event_type; // e.g. "subscription.activated"
    const data = body.data || {};
    const userId = data.custom_data?.user_id;

    if (!userId) {
      logger.warn('paddleWebhook: no user_id in custom_data', { eventType });
      res.status(200).send('OK — no user_id');
      return;
    }

    const db = admin.firestore();
    const userRef = db.collection('users').doc(userId);

    try {
      if (
        eventType === 'subscription.activated' ||
        eventType === 'subscription.created' ||
        eventType === 'transaction.completed'
      ) {
        await userRef.set({
          isPremium: true,
          premiumSince: new Date().toISOString(),
          paddleCustomerId: data.customer_id || null,
          paddleSubscriptionId: data.id || null,
        }, { merge: true });
        logger.info('paddleWebhook: Premium activated', { userId, eventType });
      } else if (
        eventType === 'subscription.canceled' ||
        eventType === 'subscription.paused'
      ) {
        await userRef.set({
          isPremium: false,
          premiumEndedAt: new Date().toISOString(),
        }, { merge: true });
        logger.info('paddleWebhook: Premium revoked', { userId, eventType });
      } else {
        logger.info('paddleWebhook: unhandled event', { eventType });
      }

      res.status(200).send('OK');
    } catch (err) {
      logger.error('paddleWebhook Firestore error', { userId, error: err.message });
      res.status(500).send('Internal error');
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// Support request — email notification
// ─────────────────────────────────────────────────────────────────────────────

/**
 * onSupportRequestCreated — fires when any new supportRequests doc is written.
 *
 * Sends an email to the admin (ADMIN_EMAIL) so you get a phone notification
 * immediately when a user raises a support ticket.
 *
 * Setup (one-time):
 *   1. Enable 2-Step Verification on sharansalian.business@gmail.com
 *   2. Go to myaccount.google.com → Security → 2-Step Verification → App passwords
 *   3. Generate an app password for "Mail" / "Other (custom)"
 *   4. firebase functions:secrets:set GMAIL_APP_PASSWORD   ← paste the 16-char password
 *   5. firebase deploy --only functions
 */
exports.onSupportRequestCreated = onDocumentCreated(
  {
    document: 'supportRequests/{requestId}',
    region: 'us-central1',
    secrets: [GMAIL_APP_PASSWORD],
  },
  async (event) => {
    const appPassword = GMAIL_APP_PASSWORD.value();
    if (!appPassword) {
      logger.warn('onSupportRequestCreated: GMAIL_APP_PASSWORD not set — skipping email');
      return;
    }

    const data = event.data?.data();
    if (!data) return;

    const requestId = event.params.requestId;
    const { title, description, userEmail, userName, createdAt } = data;

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: ADMIN_EMAIL,
        pass: appPassword,
      },
    });

    const submittedAt = createdAt?.toDate?.()?.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'medium',
      timeStyle: 'short',
    }) || new Date().toLocaleString();

    const mailOptions = {
      from: `"Pocket App" <${ADMIN_EMAIL}>`,
      to: ADMIN_EMAIL,
      subject: `[Support] ${title}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 520px;">
          <div style="background: #EF4056; padding: 20px 24px; border-radius: 12px 12px 0 0;">
            <h2 style="color: #fff; margin: 0; font-size: 18px;">New Support Request</h2>
          </div>
          <div style="background: #f9f9f9; padding: 24px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 12px 12px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #333;">
              <tr>
                <td style="padding: 6px 0; color: #888; width: 110px;">From</td>
                <td style="padding: 6px 0;"><strong>${userName || 'Unknown'}</strong> &lt;${userEmail}&gt;</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #888;">Request ID</td>
                <td style="padding: 6px 0; font-family: monospace; font-size: 12px;">${requestId}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #888;">Submitted</td>
                <td style="padding: 6px 0;">${submittedAt} IST</td>
              </tr>
            </table>
            <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 16px 0;" />
            <h3 style="margin: 0 0 8px; font-size: 15px; color: #111;">${title}</h3>
            <p style="margin: 0; font-size: 14px; color: #444; line-height: 1.6; white-space: pre-wrap;">${description}</p>
            <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 20px 0 16px;" />
            <p style="margin: 0; font-size: 12px; color: #999;">
              Reply to this user at <a href="mailto:${userEmail}" style="color: #EF4056;">${userEmail}</a>
              or review all requests in your Pocket admin panel.
            </p>
          </div>
        </div>
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
      logger.info('onSupportRequestCreated: email sent', { requestId, userEmail });
    } catch (err) {
      logger.error('onSupportRequestCreated: email failed', { error: err.message });
    }
  }
);
