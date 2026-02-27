import { Bookmark, Globe, Tag, Heart, Archive, Zap, Shield, Github } from 'lucide-react';
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
          A fast, clean read-later app. Save anything from the web and read it whenever you're ready — on any device, distraction-free.
        </p>
      </div>

      {/* Mission */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Why Pocket?</h2>
        <p className={styles.body}>
          The internet moves fast. Great articles, threads, and videos appear at the wrong time — when you're busy, on the go, or just not ready to focus. Pocket gives you one place to save everything and come back to it on your own terms.
        </p>
        <p className={styles.body}>
          No algorithm pushing content at you. No infinite scroll. Just your list, waiting when you are.
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
          href="https://github.com/sharansalian/fin"
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
