import { useState, useMemo, useCallback, useRef } from 'react';
import { Search, Archive as ArchiveIcon } from 'lucide-react';
import { useArticles } from '../context/ArticlesContext';
import { useScrollRestore } from '../hooks/useScrollRestore';
import ArticleCard from '../components/ArticleCard';
import styles from './MyList.module.css';

export default function Archive() {
  const { articles: allArticles, loading, updateArticle, removeArticle } = useArticles();
  const [search, setSearch] = useState('');
  const pageRef = useRef(null);

  useScrollRestore(pageRef, !loading);

  const articles = useMemo(() => allArticles.filter((a) => a.isArchived), [allArticles]);

  const filtered = useMemo(() => {
    if (!search) return articles;
    const q = search.toLowerCase();
    return articles.filter(
      (a) =>
        a.title?.toLowerCase().includes(q) ||
        a.domain?.toLowerCase().includes(q) ||
        a.excerpt?.toLowerCase().includes(q)
    );
  }, [articles, search]);

  const handleUpdate = useCallback((id, data) => updateArticle(id, data), [updateArticle]);
  const handleDelete = useCallback((id) => removeArticle(id), [removeArticle]);

  if (loading) {
    return (
      <div ref={pageRef} className={styles.loadingState}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div ref={pageRef} className={styles.page}>
      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type="text"
            className={`input-field ${styles.searchInput}`}
            placeholder="Search archived articles…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className={styles.empty}>
          <ArchiveIcon size={48} className={styles.emptyIcon} />
          {articles.length === 0 ? (
            <>
              <h3>No archived articles</h3>
              <p>Articles you archive will appear here.</p>
            </>
          ) : (
            <>
              <h3>No results</h3>
              <p>Try a different search.</p>
            </>
          )}
        </div>
      ) : (
        <div className={styles.list}>
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
