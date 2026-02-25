import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { registerWithEmail, loginWithGoogle } from '../firebase/auth';
import { Bookmark, Mail, Lock, User, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { isInAppBrowser, isAndroid, isIOS, getBrowserName, buildChromeIntentUrl } from '../utils/browserDetect';
import styles from './Auth.module.css';

const GOOGLE_AUTH_PARAM = 'google_auth';

const buildTargetUrl = () => {
  const url = new URL(window.location.href);
  url.searchParams.set(GOOGLE_AUTH_PARAM, '1');
  return url.toString();
};

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [showIosHint, setShowIosHint] = useState(false);
  const navigate = useNavigate();

  const triggerGoogleSignIn = useCallback(async () => {
    setError('');
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
      navigate('/');
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setError(getErrorMessage(err.code));
      }
    } finally {
      setGoogleLoading(false);
    }
  }, [navigate]);

  // Auto-trigger when redirected here from WebView via system browser
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get(GOOGLE_AUTH_PARAM) === '1' && !isInAppBrowser()) {
      window.history.replaceState({}, '', window.location.pathname);
      triggerGoogleSignIn();
    }
  }, [triggerGoogleSignIn]);

  const handleSignup = async (e) => {
    e.preventDefault();
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setError('');
    setLoading(true);
    try {
      await registerWithEmail(email, password, name);
      navigate('/');
    } catch (err) {
      setError(getErrorMessage(err.code));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    if (!isInAppBrowser()) {
      triggerGoogleSignIn();
      return;
    }

    const targetUrl = buildTargetUrl();

    if (isAndroid()) {
      window.location.href = buildChromeIntentUrl(targetUrl);
    } else if (isIOS()) {
      window.location.href = `x-safari-${targetUrl}`;
      setTimeout(() => setShowIosHint(true), 400);
    } else {
      window.open(targetUrl, '_blank');
    }
  };

  const inApp = isInAppBrowser();
  const browserName = getBrowserName();

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
          <h1>Create account</h1>
          <p>Save articles, videos, and pages for later</p>
        </div>

        {error && (
          <div className={styles.errorMsg}>
            <AlertCircle size={14} />
            {error}
          </div>
        )}

        {showIosHint && (
          <div className={styles.iosHint}>
            <p className={styles.iosHintTitle}>Open in {browserName} to continue</p>
            <ol className={styles.iosHintSteps}>
              <li>Tap the <strong>···</strong> or <strong>share</strong> icon in your browser bar</li>
              <li>Select <strong>"Open in {browserName}"</strong></li>
              <li>Tap <strong>Continue with Google</strong> on that page</li>
            </ol>
          </div>
        )}

        <button
          className={`${styles.googleBtn} btn-secondary`}
          onClick={handleGoogle}
          disabled={googleLoading}
        >
          {googleLoading ? (
            <span className="spinner" />
          ) : (
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
              <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
              <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
            </svg>
          )}
          {inApp ? `Open in ${browserName} & Sign in` : 'Continue with Google'}
        </button>

        <div className={styles.dividerText}>
          <span>or sign up with email</span>
        </div>

        <form onSubmit={handleSignup} className={styles.form}>
          <div className={styles.inputGroup}>
            <label>Full Name</label>
            <div className={styles.inputWrap}>
              <User size={16} className={styles.inputIcon} />
              <input
                type="text"
                className="input-field"
                style={{ paddingLeft: '44px' }}
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label>Email</label>
            <div className={styles.inputWrap}>
              <Mail size={16} className={styles.inputIcon} />
              <input
                type="email"
                className="input-field"
                style={{ paddingLeft: '44px' }}
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label>Password</label>
            <div className={styles.inputWrap}>
              <Lock size={16} className={styles.inputIcon} />
              <input
                type={showPw ? 'text' : 'password'}
                className="input-field"
                style={{ paddingLeft: '44px', paddingRight: '44px' }}
                placeholder="Min. 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button type="button" className={styles.eyeBtn} onClick={() => setShowPw(!showPw)}>
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary"
            style={{ width: '100%', marginTop: '8px' }}
            disabled={loading}
          >
            {loading ? <span className="spinner" /> : 'Create Account'}
          </button>
        </form>

        <p className={styles.switchAuth}>
          Already have an account?{' '}
          <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

function getErrorMessage(code) {
  const messages = {
    'auth/email-already-in-use': 'An account with this email already exists.',
    'auth/invalid-email': 'Invalid email address.',
    'auth/weak-password': 'Password is too weak.',
    'auth/network-request-failed': 'Network error. Check your connection.',
    'auth/popup-closed-by-user': 'Sign-in popup was closed.',
  };
  return messages[code] || 'Something went wrong. Please try again.';
}
