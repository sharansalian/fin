import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase/config.js';

const callFetchArticle      = httpsCallable(functions, 'fetchArticle',      { timeout: 35000 });
const callSummarizeArticle  = httpsCallable(functions, 'summarizeArticle',  { timeout: 65000 });

export const SOCIAL_DOMAINS = [
  'instagram.com', 'facebook.com', 'fb.com', 'tiktok.com',
  'reddit.com', 'linkedin.com', 'threads.net', 'snapchat.com',
];

export const isYouTubeUrl = (url) => {
  try {
    const host = new URL(url).hostname.replace('www.', '');
    return host === 'youtube.com' || host === 'youtu.be' || host === 'm.youtube.com';
  } catch { return false; }
};

export const isSocialUrl = (url) => {
  try {
    const host = new URL(url).hostname.replace('www.', '');
    return SOCIAL_DOMAINS.some((d) => host === d || host.endsWith('.' + d));
  } catch { return false; }
};

export const fetchAndParse = async (url) => {
  const { data } = await callFetchArticle({ url });
  if (!data) throw new Error('Could not extract article content.');
  return data;
};

export const fetchMetadataOnly = async (url) => {
  try {
    const { data } = await callFetchArticle({ url });
    return data ?? fallback(url);
  } catch { return fallback(url); }
};

export const summarizeArticle = async ({ content, title, articleId }) => {
  const { data } = await callSummarizeArticle({ content, title, articleId });
  return data;
};

const fallback = (url) => ({
  title: domain(url), excerpt: '', heroImage: '',
  domain: domain(url), fetchStatus: 'pending',
});
const domain = (url) => {
  try { return new URL(url).hostname.replace('www.', ''); } catch { return url; }
};
