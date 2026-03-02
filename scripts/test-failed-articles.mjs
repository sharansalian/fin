#!/usr/bin/env node
/**
 * test-failed-articles.mjs
 *
 * Finds articles with fetchStatus='failed' in your Firestore, then tests each URL
 * with JSDOM (current pipeline) and Puppeteer (new fallback) to compare results.
 *
 * Usage:
 *   # Set GOOGLE_APPLICATION_CREDENTIALS to your service account JSON file first:
 *   export GOOGLE_APPLICATION_CREDENTIALS="/path/to/finn-2c4c5-firebase-adminsdk.json"
 *
 *   # Run for a specific user (your email):
 *   node scripts/test-failed-articles.mjs sharansalian.business@gmail.com
 *
 *   # Or pass a UID directly:
 *   node scripts/test-failed-articles.mjs --uid <firebase-uid>
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

// ── Firebase init ────────────────────────────────────────────────────────────
if (!getApps().length) {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    initializeApp();
  } else {
    console.error('ERROR: Set GOOGLE_APPLICATION_CREDENTIALS env var to your service account JSON');
    process.exit(1);
  }
}

const db = getFirestore();

const FETCH_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  Referer: 'https://www.google.com/',
};

const FALLBACK_SELECTORS = [
  'article', '[role="main"]', 'main', '[itemprop="articleBody"]',
  '.post-content', '.entry-content', '.article-body', '.article-content',
  '.story-body', '.post-body', '.blog-content', '.content-body', '#content',
];

// ── JSDOM test (current pipeline) ────────────────────────────────────────────
async function testWithJSDOM(url) {
  try {
    const res = await fetch(url, {
      headers: FETCH_HEADERS,
      signal: AbortSignal.timeout(15000),
      redirect: 'follow',
    });
    if (!res.ok) return { method: 'jsdom', status: res.status, content: null, error: `HTTP ${res.status}` };

    const html = await res.text();
    const dom = new JSDOM(html, { url });
    const doc = dom.window.document;
    const reader = new Readability(doc.cloneNode(true));
    const article = reader.parse();

    let content = article?.content ?? null;
    if (!content) {
      // Try fallback selectors
      ['nav', 'header', 'footer', 'aside', 'script', 'style', 'noscript'].forEach((sel) => {
        doc.querySelectorAll(sel).forEach((el) => el.remove());
      });
      for (const sel of FALLBACK_SELECTORS) {
        const el = doc.querySelector(sel);
        if (el && el.textContent.trim().length > 200) { content = el.innerHTML; break; }
      }
    }

    const textLen = content ? content.replace(/<[^>]+>/g, '').trim().length : 0;
    return {
      method: 'jsdom',
      status: res.status,
      title: article?.title || doc.title || '',
      contentLength: textLen,
      success: textLen > 100,
      error: textLen < 100 ? 'Empty or near-empty content' : null,
    };
  } catch (err) {
    return { method: 'jsdom', status: null, content: null, error: err.message };
  }
}

// ── Puppeteer test (new fallback) ────────────────────────────────────────────
async function testWithPuppeteer(url) {
  let puppeteer;
  try {
    puppeteer = await import('puppeteer');
  } catch {
    return { method: 'puppeteer', error: 'puppeteer not installed — run: npm install puppeteer' };
  }

  let browser;
  try {
    browser = await puppeteer.default.launch({
      headless: 'shell',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    });
    const page = await browser.newPage();
    await page.setUserAgent(FETCH_HEADERS['User-Agent']);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 20000 });
    await new Promise((r) => setTimeout(r, 1500));
    const html = await page.content();

    const dom = new JSDOM(html, { url });
    const doc = dom.window.document;
    const reader = new Readability(doc.cloneNode(true));
    const article = reader.parse();

    let content = article?.content ?? null;
    if (!content) {
      ['nav', 'header', 'footer', 'aside', 'script', 'style', 'noscript'].forEach((sel) => {
        doc.querySelectorAll(sel).forEach((el) => el.remove());
      });
      for (const sel of FALLBACK_SELECTORS) {
        const el = doc.querySelector(sel);
        if (el && el.textContent.trim().length > 200) { content = el.innerHTML; break; }
      }
    }

    const textLen = content ? content.replace(/<[^>]+>/g, '').trim().length : 0;
    return {
      method: 'puppeteer',
      title: article?.title || doc.title || '',
      contentLength: textLen,
      success: textLen > 100,
      error: textLen < 100 ? 'Empty or near-empty content' : null,
    };
  } catch (err) {
    return { method: 'puppeteer', error: err.message };
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const arg = process.argv[2];
  let uid;

  if (!arg) {
    console.error('Usage: node scripts/test-failed-articles.mjs <email-or-uid>');
    process.exit(1);
  }

  if (arg === '--uid') {
    uid = process.argv[3];
  } else if (arg.includes('@')) {
    // Look up UID by email
    const userRecord = await getAuth().getUserByEmail(arg);
    uid = userRecord.uid;
    console.log(`Resolved ${arg} → UID: ${uid}\n`);
  } else {
    uid = arg;
  }

  // Query failed articles
  const articlesRef = db.collection('users').doc(uid).collection('articles');
  const failedSnap = await articlesRef.where('fetchStatus', '==', 'failed').limit(10).get();

  if (failedSnap.empty) {
    console.log('No failed articles found!');
    // Also check pending articles
    const pendingSnap = await articlesRef.where('fetchStatus', '==', 'pending').limit(10).get();
    if (pendingSnap.empty) {
      console.log('No pending articles either. All articles fetched successfully.');
      return;
    }
    console.log(`\nFound ${pendingSnap.size} pending articles instead:\n`);
    for (const doc of pendingSnap.docs) {
      const d = doc.data();
      console.log(`  ${d.url} — "${d.title || '(no title)'}"`);
    }
    return;
  }

  console.log(`Found ${failedSnap.size} failed articles. Testing each with JSDOM and Puppeteer...\n`);
  console.log('='.repeat(90));

  const results = [];

  for (const docSnap of failedSnap.docs) {
    const data = docSnap.data();
    const url = data.url;
    console.log(`\n  URL:   ${url}`);
    console.log(`  Title: ${data.title || '(no title)'}`);
    console.log(`  Error: ${data.fetchError || '(no error stored)'}`);
    console.log(`  Saved: ${data.savedAt?.toDate?.()?.toISOString?.() || 'unknown'}`);

    // Test with JSDOM (current)
    const jsdomResult = await testWithJSDOM(url);
    console.log(`\n  JSDOM:      ${jsdomResult.success ? 'SUCCESS' : 'FAILED'} — ${jsdomResult.error || `${jsdomResult.contentLength} chars extracted`}`);

    // Test with Puppeteer (new)
    const ppResult = await testWithPuppeteer(url);
    console.log(`  Puppeteer:  ${ppResult.success ? 'SUCCESS' : 'FAILED'} — ${ppResult.error || `${ppResult.contentLength} chars extracted`}`);

    const fixable = !jsdomResult.success && ppResult.success;
    console.log(`  Verdict:    ${fixable ? 'FIXABLE with Puppeteer' : jsdomResult.success ? 'Already works (retry needed)' : 'Still broken — needs proxy or manual parser'}`);
    console.log('-'.repeat(90));

    results.push({ url, title: data.title, jsdom: jsdomResult, puppeteer: ppResult, fixable });
  }

  // Summary
  console.log('\n' + '='.repeat(90));
  console.log('SUMMARY');
  console.log('='.repeat(90));
  const fixable = results.filter((r) => r.fixable).length;
  const alreadyWorks = results.filter((r) => r.jsdom.success).length;
  const stillBroken = results.filter((r) => !r.jsdom.success && !r.puppeteer.success).length;
  console.log(`  Total tested:         ${results.length}`);
  console.log(`  Fixable (Puppeteer):  ${fixable}`);
  console.log(`  Already works (retry):${alreadyWorks}`);
  console.log(`  Still broken:         ${stillBroken}`);

  if (fixable > 0) {
    console.log('\n  Articles Puppeteer would fix:');
    results.filter((r) => r.fixable).forEach((r) => {
      console.log(`    - ${r.url} ("${r.title || 'untitled'}")`);
    });
  }
  if (stillBroken > 0) {
    console.log('\n  Articles still broken (need proxy/manual parser):');
    results.filter((r) => !r.jsdom.success && !r.puppeteer.success).forEach((r) => {
      console.log(`    - ${r.url} — JSDOM: ${r.jsdom.error}, Puppeteer: ${r.puppeteer.error}`);
    });
  }
}

main().catch((err) => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
