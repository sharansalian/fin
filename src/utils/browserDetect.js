/**
 * Detect if running inside an in-app browser / WebView where
 * Google OAuth is blocked (Error 403: disallowed_useragent).
 */
export const isInAppBrowser = () => {
  const ua = navigator.userAgent || '';

  // Named in-app browsers (ordered by prevalence)
  if (/FBAN|FBAV|FB_IAB|FBDV|Instagram|Twitter\/|LinkedInApp|Snapchat|Line\/|GSA\/|TikTok|musical_ly|Pinterest|YouTube|WhatsApp|Telegram|MicroMessenger|Weibo/.test(ua)) return true;

  // Android Chrome WebView has a "wv" token
  if (/Android/.test(ua) && /\bwv\b/.test(ua)) return true;

  // iOS WKWebView / UIWebView: AppleWebKit present but "Safari/" absent
  if (/(iPhone|iPad|iPod)/.test(ua) && /AppleWebKit/.test(ua) && !/Safari\//.test(ua)) return true;

  return false;
};

export const isAndroid = () => /Android/.test(navigator.userAgent || '');

// iPadOS 13+ reports a Mac-style UA, so also detect via touch points on Mac.
export const isIOS = () =>
  /(iPhone|iPad|iPod)/.test(navigator.userAgent || '') ||
  (/Mac/.test(navigator.platform ?? '') && navigator.maxTouchPoints > 1);

/** System browser name to suggest to the user */
export const getBrowserName = () => (isIOS() ? 'Safari' : 'Chrome');

/**
 * Android Intent URL that opens a URL directly in Chrome.
 * Falls back to the system default browser if Chrome is absent.
 */
export const buildChromeIntentUrl = (targetUrl) => {
  const url = new URL(targetUrl);
  const path = `${url.host}${url.pathname}${url.search}${url.hash}`;
  return (
    `intent://${path}` +
    `#Intent;scheme=https;package=com.android.chrome;` +
    `S.browser_fallback_url=${encodeURIComponent(targetUrl)};end`
  );
};
