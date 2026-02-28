import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase/config';

// Domains that block scrapers or contain no readable article text.
// ArticleCard opens these directly in a new tab; Reader shows a link card.
// Twitter/X are handled via oEmbed in the cloud function — kept out of this list
// so saved tweets open in the reader instead of jumping to the site.
// YouTube is intentionally excluded — it opens in the in-app video player.
const SOCIAL_DOMAINS = [
  'instagram.com',
  'facebook.com', 'fb.com',
  'tiktok.com',
  'reddit.com',
  'linkedin.com',
  'threads.net',
  'snapchat.com',
];

export const isYouTubeUrl = (url) => {
  try {
    const host = new URL(url).hostname.replace('www.', '');
    return host === 'youtube.com' || host === 'youtu.be' || host === 'm.youtube.com';
  } catch {
    return false;
  }
};

export const isSocialUrl = (url) => {
  try {
    const host = new URL(url).hostname.replace('www.', '');
    return SOCIAL_DOMAINS.some((d) => host === d || host.endsWith('.' + d));
  } catch {
    return false;
  }
};

// Cloud Function callables
const callFetchArticle     = httpsCallable(functions, 'fetchArticle',     { timeout: 35000 });
const callSummarizeArticle = httpsCallable(functions, 'summarizeArticle', { timeout: 65000 });
const callReadArticle      = httpsCallable(functions, 'readArticle',      { timeout: 125000 });
const callCreateCheckout   = httpsCallable(functions, 'createCheckout',   { timeout: 15000 });

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

/**
 * Summarize an article using the LangGraph Cloud Function.
 *
 * How it works (LangGraph 101):
 *   The function runs a StateGraph with 2 nodes:
 *     assess    → counts words, decides if content is long enough
 *     summarize → one LLM call returns summary + keyPoints + suggestedTags
 *
 * Results are saved back to Firestore by the function, so the next
 * call to getArticle() will already have aiSummary / aiKeyPoints set.
 */
export const summarizeArticle = async ({ content, title, articleId }) => {
  const { data } = await callSummarizeArticle({ content, title, articleId });
  return data; // { summary, keyPoints, suggestedTags, wordCount, skipped }
};

/**
 * Convert article text to speech using the Kokoro TTS LangGraph Cloud Function.
 *
 * How it works:
 *   The function runs a StateGraph with 2 nodes:
 *     prepare    → strips HTML, chunks text into ~400 char segments
 *     synthesize → calls Kokoro (via Hugging Face) for each chunk
 *
 * Returns { audioChunks: string[], contentType: string, skipped: boolean }
 * Each chunk is a base64-encoded audio blob that can be played sequentially.
 */
export const readArticleAloud = async ({ content, title }) => {
  const { data } = await callReadArticle({ content, title });
  return data;
};

/**
 * Create a Lemon Squeezy checkout session.
 * Returns { checkoutUrl: string } — redirect the user there.
 */
export const createCheckoutSession = async ({ storeId, variantId }) => {
  const { data } = await callCreateCheckout({ storeId, variantId });
  return data;
};
