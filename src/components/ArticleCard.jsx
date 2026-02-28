import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Archive, Heart, Trash2, RotateCcw, Share2, SendHorizonal } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { updateArticle, deleteArticle } from '../firebase/articles';
import { isYouTubeUrl } from '../utils/articleFetcher';
import styles from './ArticleCard.module.css';

export default function ArticleCard({ article, onUpdate, onDelete }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pocketLinkCopied, setPocketLinkCopied] = useState(false);

  const act = async (action, data, e) => {
    if (e) e.stopPropagation();
    setLoading(action);
    try {
      await updateArticle(user.uid, article.id, data);
      onUpdate(article.id, data);
    } finally {
      setLoading(null);
    }
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    setLoading('delete');
    try {
      await deleteArticle(user.uid, article.id);
      onDelete(article.id);
    } finally {
      setLoading(null);
    }
  };

  const handleShare = (e) => {
    e.stopPropagation();
    if (navigator.share) {
      navigator.share({ title: article.title, url: article.url });
    } else {
      navigator.clipboard.writeText(article.url).catch(() => {});
    }
  };

  const handlePocketShare = (e) => {
    e.stopPropagation();
    const pocketUrl = `${window.location.origin}/save?url=${encodeURIComponent(article.url)}&title=${encodeURIComponent(article.title || '')}`;
    if (navigator.share) {
      navigator.share({ title: `Save to Pocket: ${article.title}`, url: pocketUrl });
    } else {
      navigator.clipboard.writeText(pocketUrl).catch(() => {});
      setPocketLinkCopied(true);
      setTimeout(() => setPocketLinkCopied(false), 2000);
    }
  };

  const domain = article.domain || '';
  const isVideo = article.isVideo || isYouTubeUrl(article.url);

  const sub = [
    domain,
    article.estimatedReadTime > 0 ? `${article.estimatedReadTime} min` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const handleOpen = () => {
    navigate(`/read/${article.id}`);
  };

  return (
    <div className={styles.item} onClick={handleOpen}>
      {/* Body: text + thumbnail */}
      <div className={styles.body}>
        <div className={styles.text}>
          <h3 className={styles.title}>{article.title || domain}</h3>
          <p className={styles.sub}>{sub}</p>
          {article.tags?.length > 0 && (
            <div className={styles.tagRow}>
              {article.tags.slice(0, 3).map((tag) => (
                <span key={tag} className={styles.tag}>{tag}</span>
              ))}
            </div>
          )}
        </div>

        <div className={styles.thumbWrap}>
          {article.heroImage ? (
            <img
              src={article.heroImage}
              alt=""
              className={styles.thumb}
              loading="lazy"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          ) : (
            <div className={styles.thumbPlaceholder}>
              <span>{(article.title || domain).charAt(0).toUpperCase()}</span>
            </div>
          )}
          {isVideo && (
            <span className={styles.videoBadge} aria-label="Video">▶</span>
          )}
        </div>
      </div>

      {/* Action row — hidden until hover, always visible on mobile */}
      <div className={styles.actions} onClick={(e) => e.stopPropagation()}>
        {confirmDelete ? (
          <>
            <span className={styles.deleteWarning}>Delete this article?</span>
            <button
              className={`${styles.actionBtn} ${styles.confirmYes}`}
              onClick={handleDelete}
              disabled={loading === 'delete'}
            >
              Delete
            </button>
            <button
              className={styles.actionBtn}
              onClick={(e) => { e.stopPropagation(); setConfirmDelete(false); }}
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              className={`${styles.actionBtn} ${article.isFavorite ? styles.actionActive : ''}`}
              onClick={(e) => act('favorite', { isFavorite: !article.isFavorite }, e)}
              disabled={loading === 'favorite'}
              title={article.isFavorite ? 'Unfavorite' : 'Favorite'}
            >
              <Heart size={15} fill={article.isFavorite ? 'currentColor' : 'none'} />
            </button>

            <button
              className={styles.actionBtn}
              onClick={(e) => act(article.isArchived ? 'unarchive' : 'archive', { isArchived: !article.isArchived }, e)}
              disabled={loading === 'archive' || loading === 'unarchive'}
              title={article.isArchived ? 'Move to My List' : 'Archive'}
            >
              {article.isArchived ? <RotateCcw size={15} /> : <Archive size={15} />}
            </button>

            <button
              className={styles.actionBtn}
              onClick={handleShare}
              title="Share"
            >
              <Share2 size={15} />
            </button>

            <button
              className={`${styles.actionBtn} ${pocketLinkCopied ? styles.actionActive : ''}`}
              onClick={handlePocketShare}
              title={pocketLinkCopied ? 'Pocket link copied!' : 'Send to Pocket user'}
            >
              <SendHorizonal size={15} />
            </button>

            <button
              className={`${styles.actionBtn} ${styles.deleteBtn}`}
              onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); }}
              title="Delete"
            >
              <Trash2 size={15} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
