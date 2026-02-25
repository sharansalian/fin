import { useState, useEffect, useMemo } from 'react';
import { Search, Heart, Loader } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getArticles } from '../firebase/articles';
import ArticleCard from '../components/ArticleCard';
import styles from './MyList.module.css';

export default function Favorites() {
  const { user } = useAuth();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    getArticles(user.uid, { isFavorite: true })
      .then(setArticles)
      .finally(() => setLoading(false));
  }, [user.uid]);

  const filtered = useMemo(() => {
    if (!search) return articles;
    const q = search.toLowerCase();
    return articles.filter(
      (a) =>
        a.title?.toLowerCase().includes(q) ||
        a.domain?.toLowerCase().includes(q)
    );
  }, [articles, search]);

  const handleUpdate = (id, data) => {
    setArticles((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...data } : a))
        .filter((a) => data.isFavorite !== false || a.id !== id)
    );
  };

  const handleDelete = (id) => setArticles((prev) => prev.filter((a) => a.id !== id));

  if (loading) {
    return (
      <div className={styles.loadingState}>
        <Loader size={28} className={styles.spin} />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type="text"
            className={`input-field ${styles.searchInput}`}
            placeholder="Search favorites…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className={styles.empty}>
          <Heart size={48} className={styles.emptyIcon} />
          {articles.length === 0 ? (
            <>
              <h3>No favorites yet</h3>
              <p>Heart an article to add it to your favorites.</p>
            </>
          ) : (
            <>
              <h3>No results</h3>
              <p>Try a different search.</p>
            </>
          )}
        </div>
      ) : (
        <div className={styles.grid}>
          {filtered.map((article) => (
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
