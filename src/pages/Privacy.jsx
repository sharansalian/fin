import { Link } from 'react-router-dom';
import styles from './Legal.module.css';

export default function Privacy() {
  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.header}>
          <Link to="/login" className={styles.backLink}>← Back</Link>
          <h1 className={styles.title}>Privacy Policy</h1>
          <p className={styles.updated}>Last updated: March 1, 2026</p>
        </div>

        <section className={styles.section}>
          <div className={styles.highlight}>
            Short version: We collect only what's necessary to run the Service. We never sell your data.
            Your reading list is private and belongs to you.
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>1. Who We Are</h2>
          <p className={styles.body}>
            Pocket is operated by Sharan Salian ("we", "us", "our"). This Privacy Policy explains how we collect,
            use, and protect your personal information when you use Pocket at{' '}
            <a href="https://finn-2c4c5.web.app">finn-2c4c5.web.app</a>.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>2. Information We Collect</h2>
          <p className={styles.body}><strong>Account information:</strong> When you sign in with Google, we receive
            your name, email address, and Google account ID. We use this to create and manage your account.</p>
          <p className={styles.body}><strong>Saved content:</strong> The URLs, titles, and text content of articles
            you choose to save. This data is stored in Firebase Firestore and is private to your account.</p>
          <p className={styles.body}><strong>Usage data:</strong> Basic usage information such as when articles are
            saved or archived. We do not use third-party analytics trackers.</p>
          <p className={styles.body}><strong>Payment information:</strong> If you subscribe to Premium, payment
            processing is handled entirely by Paddle. We never see or store your credit card details. We only
            receive confirmation of your subscription status from Paddle.</p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>3. How We Use Your Information</h2>
          <ul className={styles.list}>
            <li>To provide and operate the Service — syncing your reading list across devices</li>
            <li>To deliver Premium features — AI summaries, text-to-speech, and full-text search</li>
            <li>To manage your subscription and process payments via Paddle</li>
            <li>To send you transactional emails (e.g. payment receipts) — no marketing without consent</li>
            <li>To improve and debug the Service</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>4. Data Storage and Security</h2>
          <p className={styles.body}>
            Your data is stored securely in Google Firebase (Firestore), hosted in the United States. Firebase
            uses industry-standard encryption at rest and in transit. Access to your data is restricted by
            Firestore security rules so that only you can read or write your own articles.
          </p>
          <p className={styles.body}>
            AI features (summaries and text-to-speech) temporarily transmit article text to third-party AI APIs
            (Groq and HuggingFace) to generate the output. This text is not retained by those services beyond
            the duration of the request.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>5. Sharing Your Information</h2>
          <p className={styles.body}>
            We do not sell, rent, or share your personal information with third parties for their marketing purposes.
            We share data only with the following service providers strictly to operate the Service:
          </p>
          <ul className={styles.list}>
            <li><strong>Google Firebase</strong> — authentication and database</li>
            <li><strong>Paddle</strong> — subscription billing and payment processing</li>
            <li><strong>Groq</strong> — AI language model for article summaries (Premium)</li>
            <li><strong>HuggingFace / Kokoro</strong> — AI text-to-speech (Premium)</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>6. Cookies</h2>
          <p className={styles.body}>
            We use only essential cookies required for authentication (managed by Firebase Auth). We do not use
            advertising or tracking cookies.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>7. Your Rights</h2>
          <p className={styles.body}>You have the right to:</p>
          <ul className={styles.list}>
            <li>Access the personal data we hold about you</li>
            <li>Request correction of inaccurate data</li>
            <li>Request deletion of your account and all associated data</li>
            <li>Export your saved articles (via the CSV export feature in settings)</li>
          </ul>
          <p className={styles.body}>
            To exercise any of these rights, contact us at{' '}
            <a href="mailto:support@usepocket.app">support@usepocket.app</a>.
            We will respond within 30 days.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>8. Data Retention</h2>
          <p className={styles.body}>
            We retain your data for as long as your account is active. If you delete your account, we will delete
            your personal data within 30 days, except where we are required to retain it for legal or financial
            record-keeping purposes (e.g. payment records, up to 7 years as required by Indian tax law).
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>9. Children's Privacy</h2>
          <p className={styles.body}>
            The Service is not directed at children under 13. We do not knowingly collect personal information
            from children under 13. If we become aware that a child under 13 has provided us with personal
            information, we will delete it promptly.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>10. Changes to This Policy</h2>
          <p className={styles.body}>
            We may update this Privacy Policy from time to time. We will notify you of significant changes via
            email or an in-app notice. Continued use of the Service after changes are posted constitutes your
            acceptance of the updated policy.
          </p>
        </section>

        <div className={styles.footer}>
          Questions or data requests? Email us at{' '}
          <a href="mailto:support@usepocket.app">support@usepocket.app</a>.
          <br />
          See also: <Link to="/terms">Terms of Service</Link> · <Link to="/refund">Refund Policy</Link>
        </div>
      </div>
    </div>
  );
}
