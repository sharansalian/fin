import { Readability } from '@mozilla/readability';
import DOMPurify from 'dompurify';

const CORS_PROXY = 'https://corsproxy.io/?';

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

export const fetchAndParse = async (url) => {
  const proxyUrl = `${CORS_PROXY}${encodeURIComponent(url)}`;
  const response = await fetch(proxyUrl);
  if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
  const html = await response.text();

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // Fix relative URLs before parsing
  const base = doc.createElement('base');
  base.href = url;
  doc.head.prepend(base);

  const ogMeta = extractOgMeta(doc, url);

  const reader = new Readability(doc);
  const article = reader.parse();

  if (!article) {
    throw new Error('Could not extract article content');
  }

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
    const proxyUrl = `${CORS_PROXY}${encodeURIComponent(url)}`;
    const response = await fetch(proxyUrl);
    if (!response.ok) throw new Error(`${response.status}`);
    const html = await response.text();
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
