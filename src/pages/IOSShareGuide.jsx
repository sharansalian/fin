/**
 * IOSShareGuide
 *
 * Safari on iOS does NOT support the Web Share Target API (Chrome/Android only).
 * The only way to get "Save to Pocket" in the iOS share sheet is through
 * an iOS Shortcut that the user installs once.
 *
 * This page walks users through creating that Shortcut in ~30 seconds.
 */

import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Share, Copy, CheckCircle } from 'lucide-react';
import styles from './IOSShareGuide.module.css';

// The URL your Shortcut will open — we build it from the current origin
// so it works for both production and preview deploys automatically.
const APP_URL = typeof window !== 'undefined' ? window.location.origin : '';

const STEPS = [
  {
    num: '1',
    title: 'Open the Shortcuts app',
    detail: 'It comes pre-installed on every iPhone and iPad. Search "Shortcuts" in Spotlight if you can\'t find it.',
    icon: '⚡',
  },
  {
    num: '2',
    title: 'Create a new Shortcut',
    detail: 'Tap the "+" button (top right). Tap "Add Action". Search for "Open URLs" and select it.',
    icon: '+',
  },
  {
    num: '3',
    title: 'Set the URL',
    detail: `Tap the URL field in the action and enter exactly this:\n${APP_URL}/save?url=[Shortcut Input]`,
    code:  `${APP_URL}/save?url=[Shortcut Input]`,
    icon: '🔗',
  },
  {
    num: '4',
    title: 'Name it "Save to Pocket"',
    detail: 'Tap the shortcut name at the top to rename it. This is what will show in the share sheet.',
    icon: '✏️',
  },
  {
    num: '5',
    title: 'Enable in share sheet',
    detail: 'Tap the "ⓘ" icon → turn on "Show in Share Sheet". Done! The shortcut now appears whenever you tap ⬆ Share in Safari.',
    icon: '⬆',
  },
];

export default function IOSShareGuide() {
  const navigate = useNavigate();

  const copyUrl = async (text) => {
    try { await navigator.clipboard.writeText(text); }
    catch { /* ignore */ }
  };

  return (
    <div className={styles.page}>
      <header className={styles.topBar}>
        <button className={`btn-ghost ${styles.backBtn}`} onClick={() => navigate(-1)}>
          <ArrowLeft size={18} /> Back
        </button>
      </header>

      <div className={styles.content}>
        <div className={styles.hero}>
          <div className={styles.heroIcon}>
            <Share size={28} />
          </div>
          <h1>Save from Safari</h1>
          <p className={styles.heroSub}>
            iOS doesn't support the Web Share Target API, but you can add
            a <strong>one-tap Shortcut</strong> to your share sheet in about 30 seconds.
          </p>
        </div>

        <div className={styles.steps}>
          {STEPS.map((step) => (
            <div key={step.num} className={styles.step}>
              <div className={styles.stepNum}>{step.num}</div>
              <div className={styles.stepBody}>
                <p className={styles.stepTitle}>{step.title}</p>
                <p className={styles.stepDetail}>{step.detail}</p>
                {step.code && (
                  <div className={styles.codeRow}>
                    <code className={styles.code}>{step.code}</code>
                    <button
                      className={styles.copyBtn}
                      onClick={() => copyUrl(step.code)}
                      title="Copy"
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className={styles.tip}>
          <CheckCircle size={16} className={styles.tipIcon} />
          <span>
            After setup, just tap <strong>Share → Save to Pocket</strong> on any page in Safari.
            The article is saved to your list instantly.
          </span>
        </div>

        <div className={styles.altTitle}>Already have the app open?</div>
        <p className={styles.altDetail}>
          Copy the URL in Safari, switch back to this app, tap the{' '}
          <strong>Save Article</strong> button — the URL auto-fills from your clipboard.
        </p>
      </div>
    </div>
  );
}
