import { useState, useEffect } from 'react';
import { Sparkles, X, Bookmark } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getFeaturedArticle, addArticle, getArticleByUrl, updateArticle } from '../firebase/articles';
import { fetchMetadataOnly } from '../utils/articleFetcher';
import styles from './FeaturedArticle.module.css';

export default function FeaturedArticle() {
  const { user } = useAuth();
  const [article, setArticle] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const dismissedDate = localStorage.getItem('featured-dismissed');
    const today = new Date().toISOString().slice(0, 10);
    if (dismissedDate === today) { setDismissed(true); return; }

    getFeaturedArticle().then((data) => {
      if (data) setArticle(data);
    }).catch(() => {});
  }, []);

  const handleDismiss = (e) => {
    e.stopPropagation();
    setDismissed(true);
    localStorage.setItem('featured-dismissed', new Date().toISOString().slice(0, 10));
  };

  const handleSave = async () => {
    if (!article?.url || saving) return;
    setSaving(true);
    try {
      const existing = await getArticleByUrl(user.uid, article.url);
      if (existing) { setDismissed(true); return; }

      const domain = new URL(article.url).hostname.replace('www.', '');
      const docRef = await addArticle(user.uid, {
        url: article.url,
        title: article.title || domain,
        excerpt: article.excerpt || '',
        heroImage: article.heroImage || '',
        domain,
        tags: [],
        estimatedReadTime: 0,
        content: '',
        fetchStatus: 'pending',
      });

      fetchMetadataOnly(article.url).then((meta) => {
        updateArticle(user.uid, docRef.id, {
          title: meta.title || article.title || domain,
          excerpt: meta.excerpt || '',
          heroImage: meta.heroImage || '',
          domain: meta.domain || domain,
          ...(meta.content ? { content: meta.content } : {}),
          ...(meta.fetchStatus ? { fetchStatus: meta.fetchStatus } : {}),
          ...(meta.estimatedReadTime ? { estimatedReadTime: meta.estimatedReadTime } : {}),
        }).catch(() => {});
      });

      window.dispatchEvent(new CustomEvent('pocket:refresh'));
      setDismissed(true);
    } catch {
      setSaving(false);
    }
  };

  if (dismissed || !article) return null;

  return (
    <div className={styles.wrapper}>
      <button className={styles.dismissBtn} onClick={handleDismiss} title="Dismiss">
        <X size={14} />
      </button>
      <div className={styles.card} onClick={handleSave}>
        <div className={styles.content}>
          <span className={styles.badge}>
            <Sparkles size={12} /> Featured by Pocket
          </span>
          <h3 className={styles.title}>{article.title}</h3>
          {article.excerpt && <p className={styles.excerpt}>{article.excerpt}</p>}
          <span className={styles.source}>
            {article.source || (() => { try { return new URL(article.url).hostname.replace('www.', ''); } catch { return ''; } })()}
            {' · '}
            <Bookmark size={10} style={{ verticalAlign: '-1px' }} />
            {saving ? ' Saving…' : ' Tap to save'}
          </span>
        </div>
        {article.heroImage ? (
          <img src={article.heroImage} alt="" className={styles.image} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
        ) : (
          <div className={styles.imagePlaceholder}>
            <Sparkles size={20} />
          </div>
        )}
      </div>
    </div>
  );
}
