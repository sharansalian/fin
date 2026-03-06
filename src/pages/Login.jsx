import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginWithGoogle } from '../firebase/auth';
import { REDIRECT_AFTER_LOGIN_KEY } from '../App';
import { AlertCircle, Copy, Check } from 'lucide-react';
import PocketIcon from '../components/PocketIcon';
import {
  isInAppBrowser,
  isAndroid,
  isIOS,
  getBrowserName,
  buildChromeIntentUrl,
} from '../utils/browserDetect';
import styles from './Auth.module.css';

const GOOGLE_AUTH_PARAM = 'google_auth';

/** URL the system browser should open — includes flag to auto-trigger sign-in */
const buildTargetUrl = () => {
  const url = new URL(window.location.href);
  url.searchParams.set(GOOGLE_AUTH_PARAM, '1');
  return url.toString();
};

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showIosPanel, setShowIosPanel] = useState(false);
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();
  const inApp = useRef(isInAppBrowser()).current;
  const ios = useRef(isIOS()).current;
  const browserName = getBrowserName();

  const triggerGoogleSignIn = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      await loginWithGoogle();
      const redirect = sessionStorage.getItem(REDIRECT_AFTER_LOGIN_KEY) || '/';
      sessionStorage.removeItem(REDIRECT_AFTER_LOGIN_KEY);
      navigate(redirect, { replace: true });
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setError('Sign-in failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  // When the page is opened in the system browser via the intent/copy-link flow,
  // auto-trigger Google sign-in so the user doesn't have to tap again.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get(GOOGLE_AUTH_PARAM) === '1' && !isInAppBrowser()) {
      window.history.replaceState({}, '', window.location.pathname);
      triggerGoogleSignIn();
    }
  }, [triggerGoogleSignIn]);

  const handleGoogle = () => {
    if (!inApp) {
      triggerGoogleSignIn();
      return;
    }

    if (isAndroid()) {
      // Android: open the page in Chrome directly via an Intent URL.
      // Chrome will load with ?google_auth=1 and auto-trigger sign-in.
      window.location.href = buildChromeIntentUrl(buildTargetUrl());
    } else {
      // iOS: there is no reliable JS scheme to force-open Safari from a WebView.
      // Show a copy-link panel so the user can paste the URL into Safari manually.
      setShowIosPanel(true);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(buildTargetUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* clipboard blocked — user sees the URL anyway */
    }
  };

  return (
    <div className={styles.authPage}>
      <div className={styles.bgOrb1} />
      <div className={styles.bgOrb2} />

      <div className={styles.authCard}>
        <div className={styles.brandLogo}>
          <div className={styles.logoIcon}><PocketIcon size={22} /></div>
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
            : inApp && !ios
              ? `Open in ${browserName} & Sign in`
              : 'Continue with Google'}
        </button>

        {/* iOS copy-link panel — shown after button tap in WebView */}
        {showIosPanel && (
          <div className={styles.iosPanel}>
            <p className={styles.iosPanelTitle}>Open in {browserName} to continue</p>
            <p className={styles.iosPanelDesc}>
              Google sign-in is blocked inside this browser. Copy the link below and paste it into {browserName}.
            </p>
            <button className={styles.copyLinkBtn} onClick={handleCopy}>
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? 'Copied!' : 'Copy link'}
            </button>
            <ol className={styles.iosSteps}>
              <li>Tap <strong>Copy link</strong> above</li>
              <li>Open <strong>{browserName}</strong> and paste in the address bar</li>
              <li>Google sign-in will start automatically</li>
            </ol>
          </div>
        )}

        <p className={styles.legalNote}>
          By continuing, your reading list is private and synced to your Google account.
        </p>
      </div>
    </div>
  );
}
