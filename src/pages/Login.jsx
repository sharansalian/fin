import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginWithGoogle } from '../firebase/auth';
import { Bookmark, AlertCircle, ExternalLink, Copy, Check } from 'lucide-react';
import { isInAppBrowser, getBrowserName } from '../utils/browserDetect';
import styles from './Auth.module.css';

const inApp = isInAppBrowser();
const browserName = getBrowserName();

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  const handleGoogle = async () => {
    setError('');
    setLoading(true);
    try {
      await loginWithGoogle();
      navigate('/');
    } catch (err) {
      if (err.code === 'auth/popup-closed-by-user') return;
      // Catch WebView errors that slip through detection
      if (err.code === 'auth/operation-not-supported-in-this-environment' || err.code === 'auth/web-storage-unsupported') {
        setError(`Google Sign-In isn't available here. Please open this page in ${browserName}.`);
      } else {
        setError('Sign-in failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select text
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

        {/* In-app browser warning */}
        {inApp && (
          <div className={styles.inAppWarning}>
            <p className={styles.inAppTitle}>Open in {browserName} to sign in</p>
            <p className={styles.inAppDesc}>
              Google Sign-In is blocked inside in-app browsers (Instagram, Gmail, etc.).
              Open this link in {browserName} to continue.
            </p>
            <div className={styles.inAppActions}>
              <a
                href={window.location.href}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.openBtn}
              >
                <ExternalLink size={14} />
                Open in {browserName}
              </a>
              <button className={styles.copyBtn} onClick={handleCopy}>
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Copied!' : 'Copy link'}
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className={styles.errorMsg}>
            <AlertCircle size={14} />
            {error}
          </div>
        )}

        <button
          className={styles.googleBtn}
          onClick={handleGoogle}
          disabled={loading || inApp}
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
          {loading ? 'Signing in…' : 'Continue with Google'}
        </button>

        <p className={styles.legalNote}>
          By continuing, your reading list is private and synced to your Google account.
        </p>
      </div>
    </div>
  );
}
