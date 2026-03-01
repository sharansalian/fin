import { Link } from 'react-router-dom';
import styles from './Legal.module.css';

export default function Refund() {
  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.header}>
          <Link to="/login" className={styles.backLink}>← Back</Link>
          <h1 className={styles.title}>Refund Policy</h1>
          <p className={styles.updated}>Last updated: March 1, 2026</p>
        </div>

        <section className={styles.section}>
          <div className={styles.highlight}>
            We want you to be happy with Pocket. If you're not satisfied, we offer a 14-day refund on all
            new subscriptions — no questions asked.
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>14-Day Money-Back Guarantee</h2>
          <p className={styles.body}>
            If you subscribe to Pocket Premium and are not satisfied for any reason, you may request a full refund
            within <strong>14 days</strong> of your initial purchase. This applies to both monthly and annual plans.
          </p>
          <p className={styles.body}>
            To request a refund, simply email us at{' '}
            <a href="mailto:support@usepocket.app">support@usepocket.app</a> with the subject line "Refund Request"
            and include the email address associated with your account. We will process your refund within 5–7 business days.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Renewals</h2>
          <p className={styles.body}>
            After the 14-day window, subscription payments are non-refundable. Monthly and annual subscriptions
            renew automatically at the end of each billing period.
          </p>
          <p className={styles.body}>
            You can cancel your subscription at any time from your account settings or by contacting us. Cancellation
            stops future charges; you will retain access to Premium features until the end of the current paid period.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Exceptional Circumstances</h2>
          <p className={styles.body}>
            Outside the 14-day window, we consider refund requests on a case-by-case basis in exceptional
            circumstances — for example, if you were charged due to a billing error, or if the Service was
            unavailable for an extended period during your subscription. Please contact us and we'll do our best to help.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>How Refunds Are Processed</h2>
          <p className={styles.body}>
            Payments are processed by Paddle. Approved refunds are returned to the original payment method and
            typically appear within 5–10 business days depending on your bank or card provider.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Free Plan</h2>
          <p className={styles.body}>
            Pocket's Free plan is completely free of charge. There is nothing to refund for Free plan users.
          </p>
        </section>

        <div className={styles.footer}>
          Need help? Contact us at{' '}
          <a href="mailto:support@usepocket.app">support@usepocket.app</a>
          <br />
          See also: <Link to="/terms">Terms of Service</Link> · <Link to="/privacy">Privacy Policy</Link>
        </div>
      </div>
    </div>
  );
}
