import { useNavigate } from 'react-router-dom';
import { Bookmark, Headphones, Sparkles, Check, Chrome, ArrowRight, ExternalLink } from 'lucide-react';
import styles from './Landing.module.css';

const FEATURES = [
  {
    icon: Bookmark,
    title: 'Save anything, instantly',
    desc: 'One click from any browser, phone, or app. Articles, videos, PDFs — all in one place.',
  },
  {
    icon: Sparkles,
    title: 'AI summaries',
    desc: 'Get the key points in seconds. Never waste time on an article that isn\'t worth your time.',
  },
  {
    icon: Headphones,
    title: 'Listen while you move',
    desc: 'High-quality AI text-to-speech turns your reading list into a podcast.',
  },
];

const EDITOR_PICKS = [
  {
    tag: "Editor's Pick",
    title: "Why a Reading List Is the Most Underrated Habit You're Not Building",
    source: 'Pocket Blog',
    readTime: '8 min read',
    desc: "The browser tabs don't count. The 'send to myself' emails don't count. Here's the case for building a real reading practice.",
    internal: true,
    href: '/blog/reading-toolkit',
  },
  {
    tag: 'Productivity',
    title: 'How to Read More: A Lot More',
    source: 'Farnam Street',
    readTime: '12 min read',
    desc: 'Shane Parrish on building a reading practice that actually sticks — and why most people fail at it.',
    internal: false,
    href: 'https://fs.blog/reading/',
  },
  {
    tag: 'Habits',
    title: 'How to Build a Reading Habit',
    source: 'James Clear',
    readTime: '6 min read',
    desc: "James Clear on the systems behind consistent reading — and why motivation isn't the problem.",
    internal: false,
    href: 'https://jamesclear.com/reading-guide',
  },
];

const COMPETITORS = [
  { name: 'Mozilla Pocket', status: 'dead', note: 'Shut down July 2025' },
  { name: 'Omnivore', status: 'dead', note: 'Shut down Nov 2024' },
  { name: 'Instapaper', status: 'live', note: '$6/mo — no AI' },
  { name: 'Matter', status: 'live', note: '$80/yr — no extension' },
  { name: 'Readwise', status: 'live', note: '$8–10/mo' },
  { name: 'Pocket (us)', status: 'us', note: '$3.99/mo — AI included' },
];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className={styles.page}>
      {/* ── Nav ────────────────────────────────────────────────── */}
      <nav className={styles.nav}>
        <div className={styles.navBrand}>
          <div className={styles.navIcon}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <span className={styles.navName}>Pocket</span>
        </div>
        <div className={styles.navActions}>
          <button className="btn-secondary" onClick={() => navigate('/login')}>Sign in</button>
          <button className="btn-primary" onClick={() => navigate('/login')}>Get started free</button>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────── */}
      <section className={styles.hero}>
        <div className={styles.heroEyebrow}>
          <span className={styles.eyebrowDot} />
          Read-later, reimagined
        </div>
        <h1 className={styles.heroTitle}>
          Save anything.<br />Read when you're ready.
        </h1>
        <p className={styles.heroSub}>
          Your personal reading list with AI summaries, text-to-speech, and a browser extension.
          Free to start — upgrade when it matters.
        </p>
        <div className={styles.heroCta}>
          <button className={`btn-primary ${styles.ctaPrimary}`} onClick={() => navigate('/login')}>
            Start for free
            <ArrowRight size={16} />
          </button>
          <span className={styles.ctaNote}>No credit card. No trial expiry.</span>
        </div>

        {/* Browser mockup */}
        <div className={styles.heroMockup}>
          <div className={styles.mockupBar}>
            <span className={styles.dot} style={{ background: '#FF5F57' }} />
            <span className={styles.dot} style={{ background: '#FFBD2E' }} />
            <span className={styles.dot} style={{ background: '#28C840' }} />
            <div className={styles.mockupUrl}>finn-2c4c5.web.app</div>
          </div>
          <div className={styles.mockupBody}>
            <div className={styles.mockupSidebar}>
              {['My List', 'Favorites', 'Archive', 'Tags'].map((item, i) => (
                <div key={item} className={`${styles.mockupNavItem} ${i === 0 ? styles.mockupNavActive : ''}`}>
                  {item}
                </div>
              ))}
            </div>
            <div className={styles.mockupContent}>
              {[
                { t: 'The future of AI in everyday life', d: 'mit.edu · 6 min read', tag: 'tech' },
                { t: 'How stoicism changed how I work', d: 'medium.com · 8 min read', tag: 'productivity' },
                { t: 'WebAssembly: the next decade', d: 'webkit.org · 12 min read', tag: 'engineering' },
              ].map(({ t, d, tag }) => (
                <div key={t} className={styles.mockupCard}>
                  <div>
                    <div className={styles.mockupCardTitle}>{t}</div>
                    <div className={styles.mockupCardMeta}>{d}</div>
                  </div>
                  <span className={styles.mockupTag}>{tag}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Everything you need to read smarter</h2>
        <div className={styles.features}>
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <Icon size={22} />
              </div>
              <h3 className={styles.featureTitle}>{title}</h3>
              <p className={styles.featureDesc}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Editor's Picks ─────────────────────────────────────── */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>Editor's picks</h2>
            <p className={styles.sectionSub}>Curated reads to get you started — save any of them to your list with one click.</p>
          </div>
        </div>
        <div className={styles.picksList}>
          {EDITOR_PICKS.map(({ tag, title, source, readTime, desc, internal, href }) => (
            <a
              key={title}
              className={`${styles.pickCard} ${internal ? styles.pickCardFeatured : ''}`}
              href={href}
              target={internal ? undefined : '_blank'}
              rel={internal ? undefined : 'noopener noreferrer'}
              onClick={internal ? (e) => { e.preventDefault(); navigate(href); } : undefined}
            >
              <div className={styles.pickCardInner}>
                <div className={styles.pickMeta}>
                  <span className={`${styles.pickTag} ${internal ? styles.pickTagFeatured : ''}`}>{tag}</span>
                  <span className={styles.pickReadTime}>{readTime}</span>
                </div>
                <h3 className={styles.pickTitle}>{title}</h3>
                <p className={styles.pickDesc}>{desc}</p>
                <div className={styles.pickFooter}>
                  <span className={styles.pickSource}>{source}</span>
                  {!internal && <ExternalLink size={12} className={styles.pickExtIcon} />}
                  {internal && <span className={styles.pickReadLink}>Read article <ArrowRight size={12} /></span>}
                </div>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* ── Pricing ────────────────────────────────────────────── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Simple pricing</h2>
        <p className={styles.sectionSub}>Free forever for casual readers. Premium for power users.</p>
        <div className={styles.pricingCards}>
          <div className={styles.pricingCard}>
            <div className={styles.pricingTier}>Free</div>
            <div className={styles.pricingPrice}>$0</div>
            <ul className={styles.pricingList}>
              {['Save up to 500 articles', 'Clean reading mode', 'Tags & basic search', 'PWA on any device'].map((f) => (
                <li key={f}><Check size={14} className={styles.checkFree} />{f}</li>
              ))}
            </ul>
            <button className="btn-secondary" style={{ width: '100%' }} onClick={() => navigate('/login')}>
              Get started
            </button>
          </div>
          <div className={`${styles.pricingCard} ${styles.pricingCardPremium}`}>
            <div className={styles.pricingBadge}>Most popular</div>
            <div className={styles.pricingTier}>Premium</div>
            <div className={styles.pricingPrice}>
              $3.99 <span className={styles.pricingPer}>/mo</span>
            </div>
            <ul className={styles.pricingList}>
              {[
                'Unlimited saves',
                'Full-text search',
                'AI text-to-speech (Kokoro)',
                'AI article summaries',
                'Highlights & annotations',
                'Smart collections',
              ].map((f) => (
                <li key={f}><Check size={14} className={styles.checkPremium} />{f}</li>
              ))}
            </ul>
            <button className="btn-primary" style={{ width: '100%' }} onClick={() => navigate('/login')}>
              Start free trial
            </button>
            <p className={styles.pricingNote}>7-day trial · Cancel anytime · $2.50/mo billed annually</p>
          </div>
        </div>
      </section>

      {/* ── Competitors ────────────────────────────────────────── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>The read-later graveyard</h2>
        <p className={styles.sectionSub}>
          Mozilla Pocket and Omnivore both shut down. We&apos;re independent, profitable from subscriber one, and here to stay.
        </p>
        <div className={styles.competitorList}>
          {COMPETITORS.map(({ name, status, note }) => (
            <div key={name} className={`${styles.competitorRow} ${status === 'us' ? styles.competitorUs : ''}`}>
              <div className={styles.competitorName}>
                {status === 'dead' && <span className={styles.deadBadge}>Dead</span>}
                {status === 'us' && <span className={styles.usBadge}>Us</span>}
                {name}
              </div>
              <div className={styles.competitorNote}>{note}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Extension callout ──────────────────────────────────── */}
      <section className={styles.extCallout}>
        <div className={styles.extCalloutIcon}>
          <Chrome size={28} />
        </div>
        <div>
          <h3 className={styles.extCalloutTitle}>Browser extension coming soon</h3>
          <p className={styles.extCalloutSub}>Save any page to Pocket with one click — directly from Chrome, Firefox, or Edge.</p>
        </div>
      </section>

      {/* ── Final CTA ──────────────────────────────────────────── */}
      <section className={styles.finalCta}>
        <h2 className={styles.finalCtaTitle}>Start building your reading list today</h2>
        <p className={styles.finalCtaSub}>Free forever. No card required.</p>
        <button className={`btn-primary ${styles.ctaPrimary}`} onClick={() => navigate('/login')}>
          Create free account
          <ArrowRight size={16} />
        </button>
      </section>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className={styles.footer}>
        <div className={styles.footerBrand}>
          <div className={styles.navIcon} style={{ width: 28, height: 28 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <span>Pocket</span>
        </div>
        <div className={styles.footerLinks}>
          {[
            { label: 'About', path: '/about' },
            { label: 'Terms', path: '/terms' },
            { label: 'Privacy', path: '/privacy' },
            { label: 'Refund', path: '/refund' },
            { label: 'Support', path: '/support' },
          ].map(({ label, path }) => (
            <button key={label} className={styles.footerLink} onClick={() => navigate(path)}>
              {label}
            </button>
          ))}
        </div>
        <p className={styles.footerCopy}>© {new Date().getFullYear()} Pocket. All rights reserved.</p>
      </footer>
    </div>
  );
}
