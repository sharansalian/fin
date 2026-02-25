/**
 * Detect if the page is running inside an in-app browser / WebView.
 * Google OAuth (signInWithPopup / signInWithRedirect) is blocked in these contexts.
 */
export const isInAppBrowser = () => {
  const ua = navigator.userAgent || '';

  // Known in-app browsers
  if (/FBAN|FBAV|FB_IAB|FBDV|Instagram|Twitter\/|LinkedInApp|Snapchat|Line\/|GSA\/|TikTok|musical_ly|Pinterest/.test(ua)) return true;

  // Android Chrome WebView (has "wv" marker)
  if (/Android/.test(ua) && /\bwv\b/.test(ua)) return true;

  // iOS UIWebView / WKWebView: has AppleWebKit but is missing "Safari/" token
  if (/(iPhone|iPad)/.test(ua) && /AppleWebKit/.test(ua) && !/Safari\//.test(ua)) return true;

  return false;
};

/** Suggest which browser to use based on platform */
export const getBrowserName = () => {
  const ua = navigator.userAgent || '';
  if (/iPhone|iPad/.test(ua)) return 'Safari';
  return 'Chrome';
};
