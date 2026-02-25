import { useState } from 'react';
import { X, Link, Tag, Loader } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { addArticle, updateArticle } from '../firebase/articles';
import { fetchMetadataOnly } from '../utils/articleFetcher';
import styles from './AddArticleModal.module.css';

export default function AddArticleModal({ onClose }) {
  const { user } = useAuth();
  const [url, setUrl] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    let cleanUrl = url.trim();
    if (!cleanUrl) return;
    if (!/^https?:\/\//i.test(cleanUrl)) cleanUrl = 'https://' + cleanUrl;

    try {
      new URL(cleanUrl);
    } catch {
      setError('Please enter a valid URL');
      return;
    }

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    setSaving(true);
    try {
      // Save immediately with minimal data
      const docRef = await addArticle(user.uid, {
        url: cleanUrl,
        title: new URL(cleanUrl).hostname.replace('www.', ''),
        excerpt: '',
        heroImage: '',
        domain: new URL(cleanUrl).hostname.replace('www.', ''),
        tags,
        estimatedReadTime: 0,
        content: '',
        fetchStatus: 'pending',
      });

      // Fetch og metadata in background
      fetchMetadataOnly(cleanUrl).then((meta) => {
        updateArticle(user.uid, docRef.id, {
          title: meta.title,
          excerpt: meta.excerpt,
          heroImage: meta.heroImage,
          domain: meta.domain,
        }).catch(() => {});
      });

      // Tell the list to refresh
      window.dispatchEvent(new CustomEvent('pocket:refresh'));
      onClose();
    } catch (err) {
      const msg = err?.code === 'permission-denied'
        ? 'Permission denied — Firestore rules may still be deploying. Try again in a minute.'
        : `Error: ${err?.message || 'Failed to save. Please try again.'}`;
      setError(msg);
      setSaving(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h3>Save Article</h3>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSave} className={styles.form}>
          <div className={styles.field}>
            <div className={styles.inputWrap}>
              <Link size={16} className={styles.inputIcon} />
              <input
                type="text"
                className="input-field"
                style={{ paddingLeft: '44px' }}
                placeholder="https://example.com/article"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                autoFocus
                required
              />
            </div>
          </div>

          <div className={styles.field}>
            <div className={styles.inputWrap}>
              <Tag size={16} className={styles.inputIcon} />
              <input
                type="text"
                className="input-field"
                style={{ paddingLeft: '44px' }}
                placeholder="Tags (comma separated)"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
              />
            </div>
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.actions}>
            <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving || !url.trim()}>
              {saving ? <Loader size={16} className={styles.spin} /> : null}
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
