import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Gem, Check, Chrome, Globe, Smartphone, Headphones,
  Moon, Search, Tag, Bookmark, Zap, Shield, Crown, Sparkles,
} from 'lucide-react';
import { usePremium } from '../hooks/usePremium';
import { useAuth } from '../context/AuthContext';
import styles from './Premium.module.css';

// ── Paddle price IDs — set in .env after creating products in Paddle dashboard ──
// VITE_PADDLE_CLIENT_TOKEN  = live_xxxxxxxxxxxx  (Paddle → Developer Tools → Client Token)
// VITE_PADDLE_PRICE_MONTHLY = pri_xxxxxxxxxxxx   (Paddle → Catalog → Prices → Monthly)
// VITE_PADDLE_PRICE_ANNUAL  = pri_xxxxxxxxxxxx   (Paddle → Catalog → Prices → Annual)
const PADDLE_CLIENT_TOKEN   = import.meta.env.VITE_PADDLE_CLIENT_TOKEN || '';
const PADDLE_PRICE_MONTHLY  = import.meta.env.VITE_PADDLE_PRICE_MONTHLY || '';
const PADDLE_PRICE_ANNUAL   = import.meta.env.VITE_PADDLE_PRICE_ANNUAL  || '';

const FREE_FEATURES = [
  { icon: Bookmark,    text: 'Save up to 500 articles' },
  { icon: Globe,       text: 'Clean reading mode' },
  { icon: Tag,         text: 'Tags & basic search' },
  { icon: Smartphone,  text: 'PWA — install on any device' },
];

const PREMIUM_FEATURES = [
  { icon: Gem,         text: 'Unlimited saves — no cap ever',               highlight: true },
  { icon: Chrome,      text: 'Browser extension (Chrome, Firefox, Edge)',   highlight: false },
  { icon: Search,      text: 'Full-text search across all saved articles',  highlight: false },
  { icon: Headphones,  text: 'AI text-to-speech for every article',        highlight: false },
  { icon: Sparkles,    text: 'AI summaries — get the key points fast',     highlight: false },
  { icon: Moon,        text: 'Dark mode & custom themes',                  highlight: false },
  { icon: Zap,         text: 'Highlights & inline annotations',            highlight: false },
  { icon: Shield,      text: 'Priority support & early access',            highlight: false },
];

export default function Premium() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isPremium, isAdmin } = usePremium();
  const { user } = useAuth();
  const [plan, setPlan] = useState('monthly'); // 'monthly' | 'annual'
  const [paddleReady, setPaddleReady] = useState(false);
  const upgraded = searchParams.get('upgraded') === '1';

  // Initialise Paddle once the script loads
  useEffect(() => {
    if (!PADDLE_CLIENT_TOKEN) return;
    const init = () => {
      if (!window.Paddle) return;
      window.Paddle.Initialize({ token: PADDLE_CLIENT_TOKEN });
      setPaddleReady(true);
    };
    if (window.Paddle) {
      init();
    } else {
      // Script loads async — wait for it
      const script = document.querySelector('script[src*="paddle.js"]');
      if (script) script.addEventListener('load', init);
    }
  }, []);

  const handleCheckout = () => {
    const priceId = plan === 'annual' ? PADDLE_PRICE_ANNUAL : PADDLE_PRICE_MONTHLY;
    if (!priceId || !paddleReady || !window.Paddle) return;
    window.Paddle.Checkout.open({
      items: [{ priceId, quantity: 1 }],
      customData: user ? { user_id: user.uid } : undefined,
      settings: {
        successUrl: `${window.location.origin}/premium?upgraded=1`,
        displayMode: 'overlay',
        theme: document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light',
      },
    });
  };

  const canCheckout = paddleReady && (
    plan === 'annual' ? !!PADDLE_PRICE_ANNUAL : !!PADDLE_PRICE_MONTHLY
  );

  return (
    <div className={styles.page}>
      {/* Upgraded success banner */}
      {upgraded && (
        <div className={styles.successBanner}>
          <Gem size={18} />
          <span>Welcome to Premium! All features are now unlocked.</span>
        </div>
      )}

      {/* Admin/Premium status banner */}
      {isPremium && !upgraded && (
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
          The best read-later experience — unlimited, AI-powered, always with you.
        </p>
      </div>

      {/* Billing toggle */}
      {!isPremium && (
        <div className={styles.toggle}>
          <button
            className={`${styles.toggleBtn} ${plan === 'monthly' ? styles.toggleActive : ''}`}
            onClick={() => setPlan('monthly')}
          >
            Monthly
          </button>
          <button
            className={`${styles.toggleBtn} ${plan === 'annual' ? styles.toggleActive : ''}`}
            onClick={() => setPlan('annual')}
          >
            Annual
            <span className={styles.saveBadge}>Save 37%</span>
          </button>
        </div>
      )}

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
              {plan === 'annual' ? (
                <>
                  <span className={styles.price}>$2.50</span>
                  <span className={styles.period}>/month</span>
                  <span className={styles.priceNote}>billed $29.99/year</span>
                </>
              ) : (
                <>
                  <span className={styles.price}>$3.99</span>
                  <span className={styles.period}>/month</span>
                </>
              )}
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
          ) : canCheckout ? (
            <button className={`btn-primary ${styles.checkoutLink}`} onClick={handleCheckout}>
              <Gem size={16} />
              Get Premium
            </button>
          ) : (
            <button className={`btn-primary ${styles.checkoutLink}`} disabled>
              <Gem size={16} />
              {PADDLE_PRICE_MONTHLY ? 'Loading…' : 'Coming Soon'}
            </button>
          )}
          {!isPremium && <p className={styles.planNote}>7-day free trial · Cancel anytime</p>}
        </div>
      </div>

      {/* Competitor comparison */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <Shield size={20} />
          How we compare
        </h2>
        <div className={styles.compareTable}>
          <div className={`${styles.compareRow} ${styles.compareHeader}`}>
            <span>App</span><span>Price</span><span>AI features</span><span>Extension</span>
          </div>
          {[
            { name: 'Pocket (us)',   price: '$3.99/mo',  ai: true,  ext: true,  us: true },
            { name: 'Instapaper',    price: '$6.00/mo',  ai: false, ext: true,  us: false },
            { name: 'Readwise',      price: '$8–10/mo',  ai: true,  ext: true,  us: false },
            { name: 'Matter',        price: '$80/yr',    ai: false, ext: false, us: false },
            { name: 'Raindrop',      price: '$3.00/mo',  ai: false, ext: true,  us: false },
          ].map(({ name, price, ai, ext, us }) => (
            <div key={name} className={`${styles.compareRow} ${us ? styles.compareUs : ''}`}>
              <span>{name}</span>
              <span>{price}</span>
              <span>{ai ? '✓' : '✗'}</span>
              <span>{ext ? '✓' : '✗'}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Browser Extensions */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <Chrome size={20} />
          Browser Extension
        </h2>
        <p className={styles.sectionSub}>Install the Pocket extension and save any page in one click.</p>
        <div className={styles.extGrid}>
          {[
            {
              name: 'Chrome',
              color: '#4285F4',
              icon: '🌐',
              desc: 'Click to save any page instantly',
              url: import.meta.env.VITE_CHROME_EXT_URL || null,
            },
            {
              name: 'Firefox',
              color: '#FF7139',
              icon: '🦊',
              desc: 'Save from Firefox in one click',
              url: import.meta.env.VITE_FIREFOX_EXT_URL || null,
            },
            {
              name: 'Edge',
              color: '#0078D7',
              icon: '🔷',
              desc: 'Microsoft Edge extension',
              url: import.meta.env.VITE_EDGE_EXT_URL || null,
            },
          ].map(({ name, color, icon, desc, url }) => (
            <div key={name} className={styles.extCard}>
              <div className={styles.extIcon} style={{ background: `${color}18`, color }}>
                {icon}
              </div>
              <div className={styles.extInfo}>
                <h3>{name}</h3>
                <p>{desc}</p>
              </div>
              {url ? (
                <a href={url} target="_blank" rel="noopener noreferrer" className={styles.extBtn}>
                  Install
                </a>
              ) : (
                <span className={styles.extBtnSoon}>Soon</span>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
