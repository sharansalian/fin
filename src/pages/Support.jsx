import { useState, useEffect, useCallback } from 'react';
import { MessageSquarePlus, CheckCircle, XCircle, Clock, ExternalLink, Send } from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { functions, db } from '../firebase/config';
import {
  createSupportRequest,
  getUserSupportRequests,
  getAllSupportRequests,
  ADMIN_EMAIL,
} from '../firebase/support';
import styles from './Support.module.css';

const STATUS_META = {
  pending:     { label: 'Pending',     icon: Clock,        className: 'pending' },
  approved:    { label: 'Approved',    icon: CheckCircle,  className: 'approved' },
  rejected:    { label: 'Rejected',    icon: XCircle,      className: 'rejected' },
  in_progress: { label: 'In Progress', icon: Clock,        className: 'inProgress' },
  done:        { label: 'Done',        icon: CheckCircle,  className: 'approved' },
};

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.pending;
  const Icon = meta.icon;
  return (
    <span className={`${styles.badge} ${styles[meta.className]}`}>
      <Icon size={12} />
      {meta.label}
    </span>
  );
}

function RequestCard({ req, isAdmin, onAction, actionLoading }) {
  const fmtDate = (ts) => {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.cardTitle}>{req.title}</div>
        <StatusBadge status={req.status} />
      </div>
      <p className={styles.cardDesc}>{req.description}</p>
      <div className={styles.cardMeta}>
        {isAdmin && (
          <span className={styles.metaUser}>{req.userName || req.userEmail}</span>
        )}
        <span className={styles.metaDate}>{fmtDate(req.createdAt)}</span>
        {req.githubIssueUrl && (
          <a
            href={req.githubIssueUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.issueLink}
          >
            <ExternalLink size={12} />
            #{req.githubIssueNumber}
          </a>
        )}
      </div>
      {isAdmin && req.status === 'pending' && (
        <div className={styles.adminActions}>
          <button
            className={`${styles.actionBtn} ${styles.approveBtn}`}
            onClick={() => onAction(req.id, 'approve')}
            disabled={actionLoading === req.id}
          >
            {actionLoading === req.id ? 'Processing…' : 'Approve & create issue'}
          </button>
          <button
            className={`${styles.actionBtn} ${styles.rejectBtn}`}
            onClick={() => onAction(req.id, 'reject')}
            disabled={actionLoading === req.id}
          >
            Reject
          </button>
        </div>
      )}
      {isAdmin && (req.status === 'approved' || req.status === 'in_progress') && (
        <div className={styles.adminActions}>
          <button
            className={`${styles.actionBtn} ${styles.doneBtn}`}
            onClick={() => onAction(req.id, 'done')}
            disabled={actionLoading === req.id}
          >
            {actionLoading === req.id ? 'Updating…' : 'Mark as Done'}
          </button>
          <button
            className={`${styles.actionBtn} ${styles.rejectBtn}`}
            onClick={() => onAction(req.id, 'reject')}
            disabled={actionLoading === req.id}
          >
            Reject
          </button>
        </div>
      )}
    </div>
  );
}

export default function Support() {
  const { user } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const data = isAdmin
        ? await getAllSupportRequests()
        : await getUserSupportRequests(user.uid);
      setRequests(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, user.uid]);

  useEffect(() => { loadRequests(); }, [loadRequests]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      await createSupportRequest(
        user.uid,
        user.email,
        user.displayName || user.email,
        title.trim(),
        description.trim(),
      );
      setTitle('');
      setDescription('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
      await loadRequests();
    } catch (e) {
      setError('Failed to submit. Please try again.');
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAction = async (requestId, action) => {
    setActionLoading(requestId);
    setError('');
    try {
      if (action === 'reject') {
        await updateDoc(doc(db, 'supportRequests', requestId), {
          status: 'rejected',
          rejectedAt: serverTimestamp(),
        });
      } else if (action === 'done') {
        await updateDoc(doc(db, 'supportRequests', requestId), {
          status: 'done',
          doneAt: serverTimestamp(),
        });
      } else {
        // Approve creates a GitHub issue — handled server-side by the Cloud Function
        const fn = httpsCallable(functions, 'approveSupportRequest');
        await fn({ requestId, action });
      }
      await loadRequests();
    } catch (e) {
      setError(e.message || 'Action failed. Please try again.');
      console.error(e);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className={styles.page}>
      {/* Submit form */}
      <section className={styles.formSection}>
        <div className={styles.formHeader}>
          <MessageSquarePlus size={20} />
          <h3>Submit a request</h3>
        </div>
        <form onSubmit={handleSubmit} className={styles.form}>
          <input
            className={styles.input}
            placeholder="Title — e.g. Add dark mode to reader"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            required
          />
          <textarea
            className={styles.textarea}
            placeholder="Describe the feature or bug in detail…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            maxLength={2000}
            required
          />
          {error && <p className={styles.errorMsg}>{error}</p>}
          {success && <p className={styles.successMsg}>Request submitted! We'll review it soon.</p>}
          <button
            type="submit"
            className={styles.submitBtn}
            disabled={submitting || !title.trim() || !description.trim()}
          >
            <Send size={15} />
            {submitting ? 'Submitting…' : 'Submit request'}
          </button>
        </form>
      </section>

      {/* Requests list */}
      <section className={styles.listSection}>
        <h3 className={styles.listTitle}>
          {isAdmin ? 'All requests' : 'Your requests'}
        </h3>
        {loading ? (
          <div className={styles.loadingRows}>
            {[...Array(3)].map((_, i) => (
              <div key={i} className={`skeleton ${styles.skeletonCard}`} />
            ))}
          </div>
        ) : requests.length === 0 ? (
          <p className={styles.empty}>No requests yet.</p>
        ) : (
          <div className={styles.list}>
            {requests.map((req) => (
              <RequestCard
                key={req.id}
                req={req}
                isAdmin={isAdmin}
                onAction={handleAction}
                actionLoading={actionLoading}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
