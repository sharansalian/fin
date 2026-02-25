import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Tag, Loader, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getArticles } from '../firebase/articles';
import ArticleCard from '../components/ArticleCard';
import styles from './Tags.module.css';

export default function Tags() {
  const { tag } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const filters = tag ? { tag } : {};
    getArticles(user.uid, filters)
      .then(setArticles)
      .finally(() => setLoading(false));
  }, [user.uid, tag]);

  const tagMap = useMemo(() => {
    const map = {};
    articles.forEach((a) => a.tags?.forEach((t) => { map[t] = (map[t] || 0) + 1; }));
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [articles]);

  const handleUpdate = (id, data) => {
    setArticles((prev) => prev.map((a) => (a.id === id ? { ...a, ...data } : a)));
  };

  const handleDelete = (id) => setArticles((prev) => prev.filter((a) => a.id !== id));

  if (loading) {
    return (
      <div className={styles.loadingState}>
        <Loader size={28} className={styles.spin} />
      </div>
    );
  }

  // Tag list view (no :tag param)
  if (!tag) {
    return (
      <div className={styles.page}>
        {tagMap.length === 0 ? (
          <div className={styles.empty}>
            <Tag size={48} className={styles.emptyIcon} />
            <h3>No tags yet</h3>
            <p>Add tags when saving articles to organize your reading list.</p>
          </div>
        ) : (
          <>
            <p className={styles.subtitle}>{tagMap.length} tag{tagMap.length !== 1 ? 's' : ''}</p>
            <div className={styles.tagGrid}>
              {tagMap.map(([t, count]) => (
                <button
                  key={t}
                  className={styles.tagCard}
                  onClick={() => navigate(`/tags/${encodeURIComponent(t)}`)}
                >
                  <Tag size={18} className={styles.tagIcon} />
                  <span className={styles.tagName}>{t}</span>
                  <span className={styles.tagCount}>{count} article{count !== 1 ? 's' : ''}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  // Filtered by tag
  const tagArticles = articles.filter((a) => a.tags?.includes(tag));

  return (
    <div className={styles.page}>
      <div className={styles.tagHeader}>
        <button className="btn-ghost" onClick={() => navigate('/tags')}>
          <ArrowLeft size={16} />
          All Tags
        </button>
        <div className={styles.tagTitle}>
          <Tag size={16} />
          <span>{tag}</span>
          <span className={styles.tagCount}>{tagArticles.length}</span>
        </div>
      </div>

      {tagArticles.length === 0 ? (
        <div className={styles.empty}>
          <h3>No articles with this tag</h3>
        </div>
      ) : (
        <div className={styles.grid}>
          {tagArticles.map((article) => (
            <ArticleCard
              key={article.id}
              article={article}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
