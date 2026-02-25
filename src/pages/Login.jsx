import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginWithGoogle } from '../firebase/auth';
import { Bookmark, AlertCircle } from 'lucide-react';
import { isInAppBrowser, isAndroid, isIOS, getBrowserName, buildChromeIntentUrl } from '../utils/browserDetect';
import styles from './Auth.module.css';

const GOOGLE_AUTH_PARAM = 'google_auth';

// Build the URL we want the system browser to land on, with auto-trigger flag
const buildTargetUrl = () => {
  const url = new URL(window.location.href);
  url.searchParams.set(GOOGLE_AUTH_PARAM, '1');
  return url.toString();
};

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showIosHint, setShowIosHint] = useState(false);
  const navigate = useNavigate();

  const triggerGoogleSignIn = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      await loginWithGoogle();
      navigate('/');
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setError('Sign-in failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  // Auto-trigger sign-in when redirected here from a WebView via system browser
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get(GOOGLE_AUTH_PARAM) === '1' && !isInAppBrowser()) {
      // Clean the URL param, then sign in
      window.history.replaceState({}, '', window.location.pathname);
      triggerGoogleSignIn();
    }
  }, [triggerGoogleSignIn]);

  const handleGoogle = () => {
    if (!isInAppBrowser()) {
      triggerGoogleSignIn();
      return;
    }

    // Inside WebView — open the app in the system browser instead
    const targetUrl = buildTargetUrl();

    if (isAndroid()) {
      // Android: launch Chrome directly via Intent URL
      window.location.href = buildChromeIntentUrl(targetUrl);
    } else if (isIOS()) {
      // iOS: try x-safari scheme (works in many in-app browsers)
      // also show manual instructions as fallback
      window.location.href = `x-safari-${targetUrl}`;
      setTimeout(() => setShowIosHint(true), 400);
    } else {
      // Generic fallback
      window.open(targetUrl, '_blank');
    }
  };

  return (
    <div className={styles.authPage}>
      <div className={styles.bgOrb1} />
      <div className={styles.bgOrb2} />

      <div className={styles.authCard}>
        <div className={styles.brandLogo}>
          <div className={styles.logoIcon}><Bookmark size={22} fill="currentColor" /></div>
          <span className={styles.logoText}>Pocket</span>
        </div>

        <div className={styles.authHeader}>
          <h1>Save it for later</h1>
          <p>Your personal reading list. Articles, videos, and pages — all in one place.</p>
        </div>

        {error && (
          <div className={styles.errorMsg}>
            <AlertCircle size={14} />
            {error}
          </div>
        )}

        {/* iOS manual instruction (shown if x-safari scheme didn't open Safari) */}
        {showIosHint && (
          <div className={styles.iosHint}>
            <p className={styles.iosHintTitle}>Open in {getBrowserName()} to continue</p>
            <ol className={styles.iosHintSteps}>
              <li>Tap the <strong>···</strong> or <strong>share</strong> icon in your browser bar</li>
              <li>Select <strong>"Open in {getBrowserName()}"</strong></li>
              <li>Tap <strong>Continue with Google</strong> on that page</li>
            </ol>
          </div>
        )}

        <button
          className={styles.googleBtn}
          onClick={handleGoogle}
          disabled={loading}
        >
          {loading ? (
            <span className="spinner" />
          ) : (
            <svg width="20" height="20" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
              <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
              <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
            </svg>
          )}
          {loading
            ? 'Signing in…'
            : isInAppBrowser()
              ? `Open in ${getBrowserName()} & Sign in`
              : 'Continue with Google'}
        </button>

        <p className={styles.legalNote}>
          By continuing, your reading list is private and synced to your Google account.
        </p>
      </div>
    </div>
  );
}
