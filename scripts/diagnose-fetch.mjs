/**
 * diagnose-fetch.mjs — Test which URLs fail to load using the same
 * fetch + JSDOM + Readability pipeline as the Cloud Function.
 *
 * Usage:  node scripts/diagnose-fetch.mjs [url1] [url2] ...
 *
 * Without arguments, tests a default set of common problem domains.
 * Pass URLs from your saved articles to diagnose specific failures.
 *
 * For each URL, reports:
 *   ✓  Success — article content extracted
 *   ✗  Failed  — reason why it couldn't be parsed
 *
 * NOTE: Must be run from a machine with outbound internet access
 *       (e.g., your local machine, NOT a sandboxed CI environment).
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { JSDOM } = require('../functions/node_modules/jsdom');
const { Readability } = require('../functions/node_modules/@mozilla/readability');

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

const FALLBACK_SELECTORS = [
  'article', '[role="main"]', 'main', '[itemprop="articleBody"]',
  '.post-content', '.entry-content', '.article-body', '.article-content',
  '.story-body', '.post-body', '.blog-content', '.content-body', '#content',
];

// Default URLs to test when no args provided
const DEFAULT_URLS = [
  'https://fs.blog/reading/',
  'https://thecreativeindependent.com/guides/how-to-find-the-others/',
  'https://medium.com/@dariusforoux/the-one-thing-nobody-tells-you-about-reading-books-5b9e303c5200',
  'https://www.nytimes.com/',
  'https://www.wsj.com/',
  'https://www.bloomberg.com/',
];

const fallbackExtract = (doc) => {
  ['nav', 'header', 'footer', 'aside', '.sidebar', '.comments', '.related',
   'script', 'style', 'noscript'].forEach((sel) => {
    doc.querySelectorAll(sel).forEach((el) => el.remove());
  });
  for (const sel of FALLBACK_SELECTORS) {
    const el = doc.querySelector(sel);
    if (el && el.textContent.trim().length > 200) {
      return { selector: sel, length: el.textContent.trim().length };
    }
  }
  return null;
};

const getOgMeta = (doc) => {
  const get = (sel) => doc.querySelector(sel)?.getAttribute('content') || '';
  return {
    title: get('meta[property="og:title"]') || get('meta[name="twitter:title"]') || doc.title || '',
    excerpt: get('meta[property="og:description"]') || get('meta[name="description"]') || '',
    heroImage: get('meta[property="og:image"]') || get('meta[name="twitter:image"]') || '',
  };
};

async function diagnoseUrl(url) {
  const result = {
    url,
    status: 'unknown',
    httpStatus: null,
    usedWayback: false,
    ogMeta: null,
    readability: null,
    fallback: null,
    wordCount: 0,
    error: null,
  };

  try {
    let html;
    const res = await fetch(url, {
      headers: FETCH_HEADERS,
      signal: AbortSignal.timeout(15000),
      redirect: 'follow',
    });
    result.httpStatus = res.status;

    if (res.ok) {
      html = await res.text();
    } else if ([403, 429, 503].includes(res.status)) {
      const waybackUrl = `https://web.archive.org/web/20260101000000/${url}`;
      try {
        const wbRes = await fetch(waybackUrl, {
          headers: FETCH_HEADERS,
          signal: AbortSignal.timeout(15000),
          redirect: 'follow',
        });
        if (wbRes.ok) {
          html = await wbRes.text();
          result.usedWayback = true;
          result.httpStatus = `${res.status} → Wayback ${wbRes.status}`;
        } else {
          result.status = 'FAILED';
          result.error = `HTTP ${res.status}, Wayback also failed (${wbRes.status})`;
          return result;
        }
      } catch (wbErr) {
        result.status = 'FAILED';
        result.error = `HTTP ${res.status}, Wayback error: ${wbErr.message}`;
        return result;
      }
    } else {
      result.status = 'FAILED';
      result.error = `HTTP ${res.status}`;
      return result;
    }

    const dom = new JSDOM(html, { url });
    const doc = dom.window.document;
    result.ogMeta = getOgMeta(doc);

    const reader = new Readability(doc.cloneNode(true));
    const article = reader.parse();

    if (article?.content) {
      const wordCount = article.textContent.trim().split(/\s+/).length;
      result.readability = { title: article.title, wordCount, hasContent: true };
      result.wordCount = wordCount;
      result.status = 'OK';
    } else {
      result.readability = { hasContent: false };
      const fb = fallbackExtract(doc);
      if (fb) {
        result.fallback = fb;
        result.wordCount = Math.round(fb.length / 5);
        result.status = 'OK (fallback)';
      } else {
        result.status = 'FAILED';
        result.error = 'Readability returned null and no fallback selector matched';
      }
    }
  } catch (err) {
    result.status = 'FAILED';
    result.error = err.message;
  }

  return result;
}

// ── Main ────────────────────────────────────────────────────────────────────
const urls = process.argv.length > 2 ? process.argv.slice(2) : DEFAULT_URLS;

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║  Pocket Article Fetch Diagnostic                           ║');
console.log('║  Testing URLs with the same pipeline as the Cloud Function ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

const results = [];
for (const url of urls) {
  process.stdout.write(`Testing: ${url} ... `);
  const r = await diagnoseUrl(url);
  results.push(r);
  if (r.status.startsWith('OK')) {
    console.log(`✓ ${r.status} (${r.wordCount} words)`);
  } else {
    console.log(`✗ ${r.status}`);
  }
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('DETAILED REPORT\n');

for (const r of results) {
  const icon = r.status.startsWith('OK') ? '✓' : '✗';
  console.log(`${icon}  ${r.url}`);
  console.log(`   Status:       ${r.status}`);
  console.log(`   HTTP:         ${r.httpStatus}`);
  if (r.usedWayback) console.log(`   Wayback:      Yes (original blocked)`);
  if (r.ogMeta?.title) console.log(`   OG Title:     ${r.ogMeta.title.slice(0, 60)}`);
  if (r.readability?.hasContent) {
    console.log(`   Readability:  ✓ (${r.readability.wordCount} words)`);
  } else if (r.readability) {
    console.log(`   Readability:  ✗ returned null`);
  }
  if (r.fallback) {
    console.log(`   Fallback:     ✓ via "${r.fallback.selector}" (${r.fallback.length} chars)`);
  }
  if (r.error) console.log(`   Error:        ${r.error}`);
  console.log('');
}

const passed = results.filter((r) => r.status.startsWith('OK'));
const failed = results.filter((r) => !r.status.startsWith('OK'));
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`SUMMARY: ${passed.length} passed, ${failed.length} failed out of ${results.length} URLs\n`);
if (failed.length > 0) {
  console.log('Failed URLs:');
  for (const f of failed) {
    console.log(`  ✗ ${f.url} — ${f.error}`);
  }
  console.log('');
}
