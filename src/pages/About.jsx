import { Bookmark, Globe, Tag, Heart, Archive, Zap, Shield, Github, BookOpen } from 'lucide-react';
import styles from './About.module.css';

const FEATURES = [
  { icon: Bookmark, title: 'Save anything', desc: 'Save articles, videos, and pages from anywhere on the web.' },
  { icon: Globe, title: 'Clean reader', desc: 'Strip away clutter and read content in a distraction-free view.' },
  { icon: Tag, title: 'Tags & search', desc: 'Organise your reading list with tags and find anything instantly.' },
  { icon: Heart, title: 'Favorites', desc: 'Star the articles you love and revisit them anytime.' },
  { icon: Archive, title: 'Archive', desc: 'Keep your list clean by archiving what you\'ve read.' },
  { icon: Shield, title: 'Private by default', desc: 'Your reading list stays yours — no tracking, no selling data.' },
];

const STACK = [
  { name: 'React 19', desc: 'UI framework' },
  { name: 'Firebase', desc: 'Auth & database' },
  { name: 'Vite', desc: 'Build tooling' },
  { name: 'Framer Motion', desc: 'Animations' },
  { name: 'Lucide', desc: 'Icons' },
  { name: '@mozilla/readability', desc: 'Article parsing' },
];

export default function About() {
  return (
    <div className={styles.page}>
      {/* Hero */}
      <div className={styles.hero}>
        <div className={styles.logoBadge}>
          <Bookmark size={30} fill="currentColor" />
        </div>
        <h1 className={styles.heroTitle}>Pocket</h1>
        <p className={styles.heroSub}>
          A revival of the read-later experience, for everyone who still believes great articles deserve your full attention.
        </p>
      </div>

      {/* Origin story / tribute */}
      <section className={styles.tributeSection}>
        <div className={styles.tributeHeader}>
          <BookOpen size={18} />
          <span>A tribute to the original</span>
        </div>
        <p className={styles.body}>
          In 2025, Mozilla shut down the original Pocket after 14 years: the app that taught millions of people to save articles and read them later. They cited changing browsing habits, but the truth is that millions of us still love reading long-form articles with focus and intention.
        </p>
        <p className={styles.body}>
          This Pocket is a personal revival of that idea. Same name, same love of reading, built by someone who missed it. It's not affiliated with Mozilla or the original team, but it's dedicated to the spirit they created: <em>the best articles deserve more than a glance.</em>
        </p>
        <blockquote className={styles.quote}>
          "So long, farewell, Auf Wiedersehen..." Mozilla, 2025. But the list goes on.
        </blockquote>
      </section>

      {/* Mission */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Why rebuild it?</h2>
        <p className={styles.body}>
          The internet moves fast. Great articles appear at the wrong moment — when you're busy, on the go, or just not ready to focus. Pocket gives you one place to save everything and come back to it on your own terms.
        </p>
        <p className={styles.body}>
          No algorithm pushing content at you. No infinite scroll. No corporate sunset. Just your list, open source, waiting when you are.
        </p>
      </section>

      {/* Features */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <Zap size={20} />
          Features
        </h2>
        <div className={styles.featureGrid}>
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <Icon size={20} />
              </div>
              <h3 className={styles.featureTitle}>{title}</h3>
              <p className={styles.featureDesc}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Tech stack */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Built with</h2>
        <div className={styles.stackList}>
          {STACK.map(({ name, desc }) => (
            <div key={name} className={styles.stackItem}>
              <span className={styles.stackName}>{name}</span>
              <span className={styles.stackDesc}>{desc}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <div className={styles.footer}>
        <a
          href="https://github.com/sharansalian/pocket"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.githubLink}
        >
          <Github size={16} />
          Open source on GitHub
        </a>
        <span className={styles.version}>v1.0</span>
      </div>
    </div>
  );
}
