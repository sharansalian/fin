import { Readability } from '@mozilla/readability';
import DOMPurify from 'dompurify';

// Domains that block scrapers or contain no readable article text.
// ArticleCard opens these directly in a new tab; Reader shows a link card.
const SOCIAL_DOMAINS = [
  'twitter.com', 'x.com',
  'instagram.com',
  'facebook.com', 'fb.com',
  'tiktok.com',
  'youtube.com', 'youtu.be',
  'reddit.com',
  'linkedin.com',
  'threads.net',
  'snapchat.com',
];

export const isSocialUrl = (url) => {
  try {
    const host = new URL(url).hostname.replace('www.', '');
    return SOCIAL_DOMAINS.some((d) => host === d || host.endsWith('.' + d));
  } catch {
    return false;
  }
};

// Standard CORS proxies — all raced simultaneously
const PROXIES = [
  (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
];

const FETCH_TIMEOUT = 6000;

export const estimateReadTime = (text) => {
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
};

const getDomain = (url) => {
  try { return new URL(url).hostname.replace('www.', ''); }
  catch { return url; }
};

const extractOgMeta = (doc, url) => {
  const get = (sel) => doc.querySelector(sel)?.getAttribute('content') || '';
  return {
    title:
      get('meta[property="og:title"]') || get('meta[name="twitter:title"]') ||
      doc.title || getDomain(url),
    excerpt:
      get('meta[property="og:description"]') || get('meta[name="description"]') ||
      get('meta[name="twitter:description"]') || '',
    heroImage:
      get('meta[property="og:image"]') || get('meta[name="twitter:image"]') || '',
  };
};

// Race all proxies simultaneously — fastest valid response wins
const fetchHtmlViaProxy = async (url) => {
  const controllers = PROXIES.map(() => new AbortController());
  const attempts = PROXIES.map((proxyFn, i) => {
    const timer = setTimeout(() => controllers[i].abort(), FETCH_TIMEOUT);
    return fetch(proxyFn(url), { signal: controllers[i].signal })
      .then(async (res) => {
        clearTimeout(timer);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const html = await res.text();
        if (html.length > 500 && html.includes('<')) return html;
        throw new Error('Empty response');
      })
      .catch((err) => { clearTimeout(timer); throw err; });
  });

  try {
    const html = await Promise.any(attempts);
    controllers.forEach((c) => { try { c.abort(); } catch { /**/ } });
    return html;
  } catch {
    throw new Error('PROXY_FAIL');
  }
};

// Jina Reader AI — final fallback, works on JS-heavy/bot-protected sites
// Free service, no API key needed: https://r.jina.ai/
const fetchViaJina = async (url) => {
  const res = await fetch(`https://r.jina.ai/${url}`, {
    signal: AbortSignal.timeout(12000),
    headers: { 'Accept': 'text/html', 'X-Return-Format': 'html' },
  });
  if (!res.ok) throw new Error(`Jina ${res.status}`);
  const html = await res.text();
  if (html.length > 200) return html;
  throw new Error('Jina empty');
};

const parseHtml = (html, url) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const base = doc.createElement('base');
  base.href = url;
  doc.head.prepend(base);
  return doc;
};

export const fetchAndParse = async (url) => {
  let html;
  let usedJina = false;

  // Step 1: Try CORS proxies concurrently
  try {
    html = await fetchHtmlViaProxy(url);
  } catch {
    // Step 2: Fall back to Jina Reader AI
    try {
      html = await fetchViaJina(url);
      usedJina = true;
    } catch {
      throw new Error('Could not fetch this article. The site may be paywalled or only accessible in your browser.');
    }
  }

  const doc = parseHtml(html, url);
  const ogMeta = extractOgMeta(doc, url);

  const reader = new Readability(doc);
  const article = reader.parse();

  if (!article) throw new Error('Could not extract article content');

  const cleanContent = DOMPurify.sanitize(article.content, {
    ALLOWED_TAGS: [
      'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'blockquote', 'pre', 'code',
      'strong', 'em', 'b', 'i', 'u', 's',
      'a', 'img', 'figure', 'figcaption',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'br', 'hr', 'div', 'span',
    ],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'target'],
  });

  return {
    title: article.title || ogMeta.title,
    excerpt: ogMeta.excerpt || article.excerpt || article.textContent?.slice(0, 200) || '',
    heroImage: ogMeta.heroImage,
    content: cleanContent,
    wordCount: (article.textContent || '').trim().split(/\s+/).length,
    estimatedReadTime: estimateReadTime(article.textContent || ''),
    authors: article.byline ? [article.byline] : [],
    domain: getDomain(url),
    fetchStatus: 'fetched',
    _via: usedJina ? 'jina' : 'proxy',
  };
};

export const fetchMetadataOnly = async (url) => {
  try {
    let html;
    try { html = await fetchHtmlViaProxy(url); }
    catch { html = await fetchViaJina(url); }
    const doc = parseHtml(html, url);
    const meta = extractOgMeta(doc, url);
    return { ...meta, domain: getDomain(url), fetchStatus: 'pending' };
  } catch {
    return { title: getDomain(url), excerpt: '', heroImage: '', domain: getDomain(url), fetchStatus: 'pending' };
  }
};
