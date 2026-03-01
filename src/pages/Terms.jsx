import { Link } from 'react-router-dom';
import styles from './Legal.module.css';

export default function Terms() {
  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.header}>
          <Link to="/login" className={styles.backLink}>← Back</Link>
          <h1 className={styles.title}>Terms of Service</h1>
          <p className={styles.updated}>Last updated: March 1, 2026</p>
        </div>

        <section className={styles.section}>
          <p className={styles.body}>
            By using Pocket ("the Service"), you agree to these Terms of Service. Please read them carefully.
            The Service is operated by Sharan Salian ("we", "us", "our").
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>1. Use of the Service</h2>
          <p className={styles.body}>
            Pocket is a read-later web application that allows you to save, organise, and read articles and web content.
            You must be at least 13 years old to use this Service. By creating an account, you represent that you meet this requirement.
          </p>
          <p className={styles.body}>
            You are responsible for maintaining the security of your account and for all activity that occurs under it.
            You agree not to use the Service for any unlawful purpose or in any way that could damage, disable, or impair the Service.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>2. Your Content</h2>
          <p className={styles.body}>
            You retain full ownership of any content you save to Pocket. We do not claim ownership over your saved articles,
            notes, or any other content you add. By using the Service, you grant us a limited licence to store and display
            your content solely to provide the Service to you.
          </p>
          <p className={styles.body}>
            You are responsible for ensuring that any content you save complies with applicable copyright and intellectual property laws.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>3. Premium Subscription</h2>
          <p className={styles.body}>
            Pocket offers a Free plan and a Premium subscription. Premium plans are billed monthly ($3.99/month) or annually
            ($29.99/year) and provide access to additional features including AI summaries, AI text-to-speech, and unlimited saves.
          </p>
          <p className={styles.body}>
            Subscriptions are managed through Paddle. By subscribing, you also agree to{' '}
            <a href="https://www.paddle.com/legal/terms" target="_blank" rel="noopener noreferrer">Paddle's Terms of Service</a>.
            You may cancel your subscription at any time; cancellation takes effect at the end of the current billing period.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>4. Acceptable Use</h2>
          <p className={styles.body}>You agree not to:</p>
          <ul className={styles.list}>
            <li>Scrape, crawl, or use automated means to access the Service</li>
            <li>Attempt to reverse engineer or extract the source code of the Service</li>
            <li>Use the Service to distribute spam, malware, or other harmful content</li>
            <li>Impersonate any person or entity or misrepresent your affiliation</li>
            <li>Interfere with or disrupt the integrity or performance of the Service</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>5. Availability and Changes</h2>
          <p className={styles.body}>
            We aim to keep Pocket available at all times but cannot guarantee uninterrupted access. We reserve the right to
            modify, suspend, or discontinue any part of the Service at any time with reasonable notice where possible.
          </p>
          <p className={styles.body}>
            We may update these Terms from time to time. Continued use of the Service after changes are posted constitutes
            your acceptance of the new Terms. We will notify registered users of material changes via email or an in-app notice.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>6. Disclaimer of Warranties</h2>
          <p className={styles.body}>
            The Service is provided "as is" without warranties of any kind, express or implied. We do not warrant that
            the Service will be error-free, secure, or continuously available.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>7. Limitation of Liability</h2>
          <p className={styles.body}>
            To the maximum extent permitted by applicable law, we shall not be liable for any indirect, incidental, special,
            consequential, or punitive damages arising from your use of the Service, even if we have been advised of the
            possibility of such damages.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>8. Governing Law</h2>
          <p className={styles.body}>
            These Terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction
            of the courts of India.
          </p>
        </section>

        <div className={styles.footer}>
          Questions about these Terms? Contact us at{' '}
          <a href="mailto:support@usepocket.app">support@usepocket.app</a>.
          <br />
          See also: <Link to="/privacy">Privacy Policy</Link> · <Link to="/refund">Refund Policy</Link>
        </div>
      </div>
    </div>
  );
}
