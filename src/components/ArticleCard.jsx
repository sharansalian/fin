import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Archive, Heart, Trash2, Clock, RotateCcw, HeartOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { updateArticle, deleteArticle } from '../firebase/articles';
import styles from './ArticleCard.module.css';

export default function ArticleCard({ article, onUpdate, onDelete }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(null);

  const act = async (action, data) => {
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

  const domain = article.domain || '';
  const faviconUrl = domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=32` : null;

  return (
    <div
      className={`${styles.card} ${article.isRead ? styles.read : ''}`}
      onClick={() => navigate(`/read/${article.id}`)}
    >
      {article.heroImage && (
        <div className={styles.hero}>
          <img
            src={article.heroImage}
            alt=""
            className={styles.heroImg}
            loading="lazy"
            onError={(e) => { e.currentTarget.parentElement.style.display = 'none'; }}
          />
        </div>
      )}

      <div className={styles.body}>
        <div className={styles.source}>
          {faviconUrl && (
            <img src={faviconUrl} alt="" className={styles.favicon} />
          )}
          <span className={styles.domain}>{domain}</span>
          {article.isRead && <span className={styles.readBadge}>Read</span>}
        </div>

        <h3 className={styles.title}>{article.title || domain}</h3>

        {article.excerpt && (
          <p className={styles.excerpt}>{article.excerpt}</p>
        )}

        <div className={styles.meta}>
          {article.estimatedReadTime > 0 && (
            <span className={styles.readTime}>
              <Clock size={12} />
              {article.estimatedReadTime} min read
            </span>
          )}
          {article.tags?.length > 0 && (
            <div className={styles.tags}>
              {article.tags.slice(0, 3).map((tag) => (
                <span key={tag} className={styles.tag}>{tag}</span>
              ))}
            </div>
          )}
        </div>

        <div className={styles.actions} onClick={(e) => e.stopPropagation()}>
          {article.isArchived ? (
            <button
              className={styles.actionBtn}
              onClick={(e) => { e.stopPropagation(); act('unarchive', { isArchived: false }); }}
              disabled={loading === 'unarchive'}
              title="Move to My List"
            >
              <RotateCcw size={15} />
            </button>
          ) : (
            <button
              className={styles.actionBtn}
              onClick={(e) => { e.stopPropagation(); act('archive', { isArchived: true }); }}
              disabled={loading === 'archive'}
              title="Archive"
            >
              <Archive size={15} />
            </button>
          )}

          <button
            className={`${styles.actionBtn} ${article.isFavorite ? styles.active : ''}`}
            onClick={(e) => { e.stopPropagation(); act('favorite', { isFavorite: !article.isFavorite }); }}
            disabled={loading === 'favorite'}
            title={article.isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
          >
            {article.isFavorite ? <HeartOff size={15} /> : <Heart size={15} />}
          </button>

          <button
            className={`${styles.actionBtn} ${styles.deleteBtn}`}
            onClick={handleDelete}
            disabled={loading === 'delete'}
            title="Delete"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
