import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Gem, Check, Chrome, Globe, Smartphone, Headphones,
  Moon, Search, Tag, Bookmark, Zap, Shield, Crown, Loader,
} from 'lucide-react';
import { usePremium } from '../hooks/usePremium';
import { createCheckoutSession } from '../utils/articleFetcher';
import styles from './Premium.module.css';

// ── Lemon Squeezy IDs ─────────────────────────────────────────────────────
// Replace these with your actual Lemon Squeezy store + variant IDs
// after creating a product at https://app.lemonsqueezy.com
const LS_STORE_ID   = import.meta.env.VITE_LS_STORE_ID   || '';
const LS_VARIANT_ID = import.meta.env.VITE_LS_VARIANT_ID || '';

const FREE_FEATURES = [
  { icon: Bookmark, text: 'Save up to 500 articles' },
  { icon: Globe, text: 'Clean reading mode' },
  { icon: Tag, text: 'Tags & basic search' },
  { icon: Smartphone, text: 'PWA — install on any device' },
];

const PREMIUM_FEATURES = [
  { icon: Gem, text: 'Unlimited saves — no cap ever', highlight: true },
  { icon: Chrome, text: 'Browser extensions (Chrome, Firefox, Safari, Edge)' },
  { icon: Search, text: 'Full-text search across all saved articles' },
  { icon: Headphones, text: 'Listen mode — text-to-speech for every article' },
  { icon: Moon, text: 'Dark mode & custom themes' },
  { icon: Tag, text: 'Nested tags & smart collections' },
  { icon: Zap, text: 'Highlights & inline annotations' },
  { icon: Shield, text: 'Priority support & early access to new features' },
];

const EXTENSIONS = [
  { name: 'Chrome', color: '#4285F4', icon: '🌐', desc: 'Click to save any page instantly' },
  { name: 'Firefox', color: '#FF7139', icon: '🦊', desc: 'Save from Firefox in one click' },
  { name: 'Safari', color: '#006CFF', icon: '🧭', desc: 'Share to Pocket from Safari' },
  { name: 'Edge', color: '#0078D7', icon: '🔷', desc: 'Microsoft Edge extension' },
];

const SAVE_METHODS = [
  { icon: Smartphone, title: 'Android Share Sheet', desc: 'Share any URL → Pocket from any app' },
  { icon: Globe, title: 'Bookmarklet', desc: 'Drag to your bookmarks bar and save from any browser' },
  { icon: Chrome, title: 'Browser Extension', desc: 'One-click save from Chrome, Firefox, Safari, Edge' },
  { icon: Zap, title: 'Email to Pocket', desc: 'Forward articles to your unique Pocket email address' },
];

export default function Premium() {
  const navigate = useNavigate();
  const { isPremium, isAdmin } = usePremium();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');

  const handleGetPremium = async () => {
    if (!LS_STORE_ID || !LS_VARIANT_ID) {
      setCheckoutError('Payment not configured yet. Check back soon!');
      return;
    }
    setCheckoutLoading(true);
    setCheckoutError('');
    try {
      const { checkoutUrl } = await createCheckoutSession({
        storeId: LS_STORE_ID,
        variantId: LS_VARIANT_ID,
      });
      window.location.href = checkoutUrl;
    } catch (err) {
      console.error('[Premium] checkout error:', err);
      setCheckoutError('Could not start checkout. Please try again.');
      setCheckoutLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      {/* Admin/Premium status banner */}
      {isPremium && (
        <div className={styles.statusBanner}>
          <Crown size={18} />
          <span>
            {isAdmin
              ? 'Admin — All Premium features are unlocked'
              : 'Premium — You have access to all features'}
          </span>
        </div>
      )}

      {/* Hero */}
      <div className={styles.hero}>
        <div className={styles.gemBadge}>
          <Gem size={28} />
        </div>
        <h1 className={styles.heroTitle}>Pocket Premium</h1>
        <p className={styles.heroSub}>
          The best read-later experience — unlimited, distraction-free, and always with you.
        </p>
      </div>

      {/* Pricing cards */}
      <div className={styles.plans}>
        {/* Free */}
        <div className={styles.planCard}>
          <div className={styles.planHeader}>
            <h2 className={styles.planName}>Free</h2>
            <div className={styles.planPrice}>
              <span className={styles.price}>$0</span>
              <span className={styles.period}>forever</span>
            </div>
          </div>
          <ul className={styles.featureList}>
            {FREE_FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className={styles.featureItem}>
                <Check size={15} className={styles.checkFree} />
                <span>{text}</span>
              </li>
            ))}
          </ul>
          <button className="btn-secondary" style={{ width: '100%' }} onClick={() => navigate('/')}>
            {isPremium ? 'Free tier' : 'Current plan'}
          </button>
        </div>

        {/* Premium */}
        <div className={`${styles.planCard} ${styles.planPremium}`}>
          <div className={styles.premiumBadge}>Most Popular</div>
          <div className={styles.planHeader}>
            <h2 className={styles.planName}>Premium</h2>
            <div className={styles.planPrice}>
              <span className={styles.price}>$4.99</span>
              <span className={styles.period}>/month</span>
            </div>
          </div>
          <ul className={styles.featureList}>
            {PREMIUM_FEATURES.map(({ icon: Icon, text, highlight }) => (
              <li key={text} className={`${styles.featureItem} ${highlight ? styles.featureHighlight : ''}`}>
                <Check size={15} className={styles.checkPremium} />
                <span>{text}</span>
              </li>
            ))}
          </ul>
          {isPremium ? (
            <button className="btn-primary" style={{ width: '100%' }} disabled>
              <Check size={16} />
              Active
            </button>
          ) : (
            <button
              className="btn-primary"
              style={{ width: '100%' }}
              onClick={handleGetPremium}
              disabled={checkoutLoading}
            >
              {checkoutLoading ? <Loader size={16} className="spin" /> : <Gem size={16} />}
              {checkoutLoading ? 'Redirecting...' : 'Get Premium'}
            </button>
          )}
          {checkoutError && <p className={styles.planNote} style={{ color: 'var(--color-danger)' }}>{checkoutError}</p>}
          {!isPremium && <p className={styles.planNote}>7-day free trial · Cancel anytime</p>}
        </div>
      </div>

      {/* Browser Extensions */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <Chrome size={20} />
          Browser Extensions
        </h2>
        <p className={styles.sectionSub}>Install the Pocket extension and save any page in one click.</p>
        <div className={styles.extGrid}>
          {EXTENSIONS.map(({ name, color, icon, desc }) => (
            <div key={name} className={styles.extCard}>
              <div className={styles.extIcon} style={{ background: `${color}18`, color }}>
                {icon}
              </div>
              <div className={styles.extInfo}>
                <h3>{name}</h3>
                <p>{desc}</p>
              </div>
              <button className={styles.extBtn}>Install</button>
            </div>
          ))}
        </div>
      </section>

      {/* Ways to save */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <Zap size={20} />
          Ways to Save
        </h2>
        <p className={styles.sectionSub}>Save articles from anywhere, any device, any browser.</p>
        <div className={styles.saveGrid}>
          {SAVE_METHODS.map(({ icon: Icon, title, desc }) => (
            <div key={title} className={styles.saveCard}>
              <div className={styles.saveIcon}>
                <Icon size={22} />
              </div>
              <h3 className={styles.saveTitle}>{title}</h3>
              <p className={styles.saveDesc}>{desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
