import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Archive, Heart, Trash2, Clock, RotateCcw, HeartOff, MoreHorizontal } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { updateArticle, deleteArticle } from '../firebase/articles';
import styles from './ArticleCard.module.css';

export default function ArticleCard({ article, onUpdate, onDelete }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const act = async (action, data, e) => {
    if (e) e.stopPropagation();
    setMenuOpen(false);
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
    setMenuOpen(false);
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
      className={`${styles.item} ${article.isRead ? styles.read : ''}`}
      onClick={() => navigate(`/read/${article.id}`)}
    >
      {/* Left: text */}
      <div className={styles.text}>
        <div className={styles.source}>
          {faviconUrl && <img src={faviconUrl} alt="" className={styles.favicon} />}
          <span className={styles.domain}>{domain}</span>
        </div>

        <h3 className={styles.title}>{article.title || domain}</h3>

        <div className={styles.meta}>
          {article.estimatedReadTime > 0 && (
            <span className={styles.readTime}>
              <Clock size={11} />
              {article.estimatedReadTime} min
            </span>
          )}
          {article.tags?.slice(0, 2).map((tag) => (
            <span key={tag} className={styles.tag}>{tag}</span>
          ))}
          {article.isRead && <span className={styles.readBadge}>Read</span>}
        </div>
      </div>

      {/* Right: thumbnail + actions */}
      <div className={styles.right}>
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

        {/* Inline favorite button */}
        <button
          className={`${styles.starBtn} ${article.isFavorite ? styles.starActive : ''}`}
          onClick={(e) => act('favorite', { isFavorite: !article.isFavorite }, e)}
          disabled={loading === 'favorite'}
          title={article.isFavorite ? 'Unfavorite' : 'Favorite'}
        >
          <Heart size={14} fill={article.isFavorite ? 'currentColor' : 'none'} />
        </button>
      </div>

      {/* Overflow menu */}
      <div className={styles.menuWrap} onClick={(e) => e.stopPropagation()}>
        <button
          className={styles.menuBtn}
          onClick={(e) => { e.stopPropagation(); setMenuOpen((o) => !o); }}
        >
          <MoreHorizontal size={16} />
        </button>
        {menuOpen && (
          <div className={styles.menu}>
            {article.isArchived ? (
              <button onClick={(e) => act('unarchive', { isArchived: false }, e)}>
                <RotateCcw size={14} /> Move to List
              </button>
            ) : (
              <button onClick={(e) => act('archive', { isArchived: true }, e)}>
                <Archive size={14} /> Archive
              </button>
            )}
            <button onClick={(e) => act('favorite', { isFavorite: !article.isFavorite }, e)}>
              <Heart size={14} /> {article.isFavorite ? 'Unfavorite' : 'Favorite'}
            </button>
            <button className={styles.deleteItem} onClick={handleDelete}>
              <Trash2 size={14} /> Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
