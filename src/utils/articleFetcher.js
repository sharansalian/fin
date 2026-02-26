import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase/config';

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

// Cloud Function callable — server fetches the URL, no CORS issues
const callFetchArticle = httpsCallable(functions, 'fetchArticle', { timeout: 35000 });

/**
 * Fetch and parse an article via the Firebase Cloud Function.
 * Returns full content including title, excerpt, heroImage, content, etc.
 */
export const fetchAndParse = async (url) => {
  const { data } = await callFetchArticle({ url });
  if (!data) {
    throw new Error('Could not extract article content from this page.');
  }
  // Return partial data (OG title/excerpt/image) even when body extraction fails
  return data;
};

/**
 * Prefetch a full article in the background immediately after saving.
 * Stores everything (including content) so the Reader has zero load time.
 * On failure, returns minimal fallback so the article is still usable.
 */
export const fetchMetadataOnly = async (url) => {
  try {
    const { data } = await callFetchArticle({ url });
    return data ?? { title: getDomain(url), excerpt: '', heroImage: '', domain: getDomain(url), fetchStatus: 'pending' };
  } catch {
    return { title: getDomain(url), excerpt: '', heroImage: '', domain: getDomain(url), fetchStatus: 'pending' };
  }
};

const getDomain = (url) => {
  try { return new URL(url).hostname.replace('www.', ''); }
  catch { return url; }
};
