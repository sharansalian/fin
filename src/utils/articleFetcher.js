import { Readability } from '@mozilla/readability';
import DOMPurify from 'dompurify';

const PROXIES = [
  (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
];

const FETCH_TIMEOUT = 10000; // 10s per proxy

export const estimateReadTime = (text) => {
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
};

const getDomain = (url) => {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return url;
  }
};

const extractOgMeta = (doc, url) => {
  const get = (sel) => doc.querySelector(sel)?.getAttribute('content') || '';
  return {
    title:
      get('meta[property="og:title"]') ||
      get('meta[name="twitter:title"]') ||
      doc.title ||
      getDomain(url),
    excerpt:
      get('meta[property="og:description"]') ||
      get('meta[name="description"]') ||
      get('meta[name="twitter:description"]') ||
      '',
    heroImage:
      get('meta[property="og:image"]') ||
      get('meta[name="twitter:image"]') ||
      '',
  };
};

// Race all proxies simultaneously — fastest valid response wins
const fetchHtml = async (url) => {
  const controllers = PROXIES.map(() => new AbortController());

  const attempts = PROXIES.map((proxyFn, i) => {
    const timer = setTimeout(() => controllers[i].abort(), FETCH_TIMEOUT);
    return fetch(proxyFn(url), { signal: controllers[i].signal })
      .then(async (res) => {
        clearTimeout(timer);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const html = await res.text();
        if (html.length > 500 && html.includes('<')) return html;
        throw new Error('Invalid or empty response');
      })
      .catch((err) => {
        clearTimeout(timer);
        throw err;
      });
  });

  try {
    // Promise.any resolves as soon as any succeeds; rejects only if all fail
    const html = await Promise.any(attempts);
    // Cancel any still-in-flight requests
    controllers.forEach((c) => { try { c.abort(); } catch { /* ignore */ } });
    return html;
  } catch {
    throw new Error('Could not fetch this article — the site may be paywalled or blocking readers');
  }
};

export const fetchAndParse = async (url) => {
  const html = await fetchHtml(url);

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const base = doc.createElement('base');
  base.href = url;
  doc.head.prepend(base);

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

  const readTime = estimateReadTime(article.textContent || '');

  return {
    title: article.title || ogMeta.title,
    excerpt: ogMeta.excerpt || article.excerpt || article.textContent?.slice(0, 200) || '',
    heroImage: ogMeta.heroImage,
    content: cleanContent,
    wordCount: (article.textContent || '').trim().split(/\s+/).length,
    estimatedReadTime: readTime,
    authors: article.byline ? [article.byline] : [],
    domain: getDomain(url),
    fetchStatus: 'fetched',
  };
};

export const fetchMetadataOnly = async (url) => {
  try {
    const html = await fetchHtml(url);
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const base = doc.createElement('base');
    base.href = url;
    doc.head.prepend(base);
    const meta = extractOgMeta(doc, url);
    return { ...meta, domain: getDomain(url), fetchStatus: 'pending' };
  } catch {
    return {
      title: getDomain(url),
      excerpt: '',
      heroImage: '',
      domain: getDomain(url),
      fetchStatus: 'pending',
    };
  }
};
