/**
 * Detect if running inside an in-app browser / WebView where
 * Google OAuth is blocked (Error 403: disallowed_useragent).
 */
export const isInAppBrowser = () => {
  const ua = navigator.userAgent || '';
  if (/FBAN|FBAV|FB_IAB|FBDV|Instagram|Twitter\/|LinkedInApp|Snapchat|Line\/|GSA\/|TikTok|musical_ly|Pinterest/.test(ua)) return true;
  if (/Android/.test(ua) && /\bwv\b/.test(ua)) return true;
  if (/(iPhone|iPad)/.test(ua) && /AppleWebKit/.test(ua) && !/Safari\//.test(ua)) return true;
  return false;
};

export const isAndroid = () => /Android/.test(navigator.userAgent || '');
export const isIOS = () => /(iPhone|iPad)/.test(navigator.userAgent || '');

/** Suggest which system browser to use */
export const getBrowserName = () => (isIOS() ? 'Safari' : 'Chrome');

/**
 * Build an Android Intent URL that opens a URL in Chrome.
 * Falls back to the default browser if Chrome isn't installed.
 */
export const buildChromeIntentUrl = (targetUrl) => {
  const url = new URL(targetUrl);
  const path = `${url.host}${url.pathname}${url.search}${url.hash}`;
  return `intent://${path}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(targetUrl)};end`;
};
