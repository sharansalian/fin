import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { isIOS, isAndroid } from '../utils/browserDetect';
import styles from './InstallBanner.module.css';

const DISMISSED_KEY = 'pocketInstallDismissed';

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

// iOS share-box icon (matches the actual Safari toolbar button)
function ShareIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle', margin: '0 2px' }}>
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  );
}

// iOS "Add to Home Screen" square-plus icon
function AddIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle', margin: '0 2px' }}>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  );
}

export default function InstallBanner() {
  const [visible, setVisible] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const ios = isIOS();
  const android = isAndroid();

  useEffect(() => {
    if (isStandalone()) return;
    if (localStorage.getItem(DISMISSED_KEY)) return;

    if (ios) {
      setVisible(true);
      return;
    }

    if (android) {
      const handler = (e) => {
        e.preventDefault();
        setDeferredPrompt(e);
        setVisible(true);
      };
      window.addEventListener('beforeinstallprompt', handler);
      return () => window.removeEventListener('beforeinstallprompt', handler);
    }
  }, [ios, android]);

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, '1');
    setVisible(false);
    setShowGuide(false);
  };

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setVisible(false);
    }
    setDeferredPrompt(null);
  };

  if (!visible) return null;

  return (
    <>
      <div className={styles.banner}>
        <div className={styles.bannerIcon}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
        </div>
        <div className={styles.bannerBody}>
          <strong>Share links to Pocket</strong>
          <span>
            {ios
              ? 'Add to Home Screen to save from any app'
              : 'Install the app to save from the share sheet'}
          </span>
        </div>
        <button
          className={styles.bannerCta}
          onClick={ios ? () => setShowGuide(true) : handleInstall}
        >
          {ios ? 'How?' : 'Install'}
        </button>
        <button className={styles.bannerClose} onClick={dismiss} aria-label="Dismiss">
          <X size={15} />
        </button>
      </div>

      {showGuide && (
        <div className={styles.overlay} onClick={() => setShowGuide(false)}>
          <div className={styles.guide} onClick={(e) => e.stopPropagation()}>
            <button className={styles.guideClose} onClick={() => setShowGuide(false)} aria-label="Close">
              <X size={18} />
            </button>

            <div className={styles.guideLogo}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <h3 className={styles.guideTitle}>Add Pocket to Home Screen</h3>
            <p className={styles.guideSubtitle}>
              Once installed, Pocket appears in the share sheet of every app — just like WhatsApp.
            </p>

            <ol className={styles.steps}>
              <li className={styles.step}>
                <span className={styles.stepNum}>1</span>
                <span>
                  Open this page in <strong>Safari</strong>, then tap the{' '}
                  <strong>Share</strong> button <ShareIcon /> at the bottom of the screen
                </span>
              </li>
              <li className={styles.step}>
                <span className={styles.stepNum}>2</span>
                <span>
                  Scroll down and tap{' '}
                  <strong>Add to Home Screen</strong> <AddIcon />
                </span>
              </li>
              <li className={styles.step}>
                <span className={styles.stepNum}>3</span>
                <span>
                  Tap <strong>Add</strong> — Pocket now appears every time you tap Share in Safari or any other app
                </span>
              </li>
            </ol>

            <button className={styles.guideDone} onClick={() => setShowGuide(false)}>
              Got it
            </button>
            <button className={styles.guideDismiss} onClick={dismiss}>
              Don't show again
            </button>
          </div>
        </div>
      )}
    </>
  );
}
