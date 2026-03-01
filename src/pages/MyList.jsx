import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Search, BookOpen, RotateCcw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePremium } from '../hooks/usePremium';
import { getArticles, getArticlesUnlimited } from '../firebase/articles';
import { useScrollRestore } from '../hooks/useScrollRestore';
import ArticleCard from '../components/ArticleCard';
import EditorPicks from '../components/EditorPicks';
import styles from './MyList.module.css';

// Strip HTML tags to search through article content (premium full-text search)
const stripHtml = (html) => {
  if (!html) return '';
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || '';
};

function SkeletonList() {
  return (
    <div className={styles.list}>
      {[...Array(6)].map((_, i) => (
        <div key={i} className={styles.skeletonItem}>
          <div className={styles.skeletonText}>
            <div className={`skeleton ${styles.skeletonTitle}`} />
            <div className={`skeleton ${styles.skeletonTitle}`} style={{ width: '68%' }} />
            <div className={`skeleton ${styles.skeletonSub}`} />
          </div>
          <div className={`skeleton ${styles.skeletonThumb}`} />
        </div>
      ))}
    </div>
  );
}

export default function MyList() {
  const { user } = useAuth();
  const { isPremium } = usePremium();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState('');

  // Pull-to-refresh state
  const [pullY, setPullY] = useState(0);
  const touchStartY = useRef(0);
  const pageRef = useRef(null);

  useScrollRestore(pageRef, !loading);

  const fetchList = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      // Premium users get unlimited articles; free tier is capped at 500.
      const fetcher = isPremium ? getArticlesUnlimited : getArticles;
      const data = await fetcher(user.uid, { isArchived: false });
      setArticles(data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user.uid, isPremium]);

  // Initial load
  useEffect(() => { fetchList(); }, [fetchList]);

  // Refresh when an article is added via AddArticleModal
  useEffect(() => {
    const handler = () => fetchList(true);
    window.addEventListener('pocket:refresh', handler);
    return () => window.removeEventListener('pocket:refresh', handler);
  }, [fetchList]);

  // Pull-to-refresh touch handlers
  const onTouchStart = useCallback((e) => {
    const scrollEl = pageRef.current?.parentElement;
    if (scrollEl && scrollEl.scrollTop > 0) return;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const onTouchMove = useCallback((e) => {
    const scrollEl = pageRef.current?.parentElement;
    if (scrollEl && scrollEl.scrollTop > 0) { setPullY(0); return; }
    const delta = e.touches[0].clientY - touchStartY.current;
    if (delta > 0) setPullY(Math.min(delta * 0.5, 64));
    else setPullY(0);
  }, []);

  const onTouchEnd = useCallback(() => {
    if (pullY >= 50) fetchList(true);
    setPullY(0);
  }, [pullY, fetchList]);

  const allTags = useMemo(() => {
    const map = {};
    articles.forEach((a) => a.tags?.forEach((t) => { map[t] = (map[t] || 0) + 1; }));
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [articles]);

  const filtered = useMemo(() => {
    let list = articles;
    if (activeTag) list = list.filter((a) => a.tags?.includes(activeTag));
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((a) => {
        if (a.title?.toLowerCase().includes(q)) return true;
        if (a.domain?.toLowerCase().includes(q)) return true;
        if (a.excerpt?.toLowerCase().includes(q)) return true;
        // Premium: full-text search through article content
        if (isPremium && a.content && stripHtml(a.content).toLowerCase().includes(q)) return true;
        return false;
      });
    }
    return list;
  }, [articles, search, activeTag, isPremium]);

  const handleUpdate = (id, data) => {
    setArticles((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...data } : a))
        .filter((a) => !data.isArchived || a.id !== id)
    );
  };

  const handleDelete = (id) => {
    setArticles((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <div
      ref={pageRef}
      className={styles.page}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Pull-to-refresh indicator */}
      {(pullY > 0 || refreshing) && (
        <div
          className={styles.pullIndicator}
          style={{ height: refreshing ? 48 : pullY }}
        >
          <RotateCcw
            size={18}
            className={refreshing ? styles.pullSpin : styles.pullIcon}
            style={{ transform: pullY > 0 ? `rotate(${(pullY / 50) * 180}deg)` : undefined }}
          />
        </div>
      )}

      <EditorPicks />

      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type="text"
            className={`input-field ${styles.searchInput}`}
            placeholder={isPremium ? 'Search all content…' : 'Search articles…'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {!loading && allTags.length > 0 && (
        <div className={styles.tagFilters}>
          <button
            className={`${styles.tagChip} ${!activeTag ? styles.tagChipActive : ''}`}
            onClick={() => setActiveTag('')}
          >
            All
          </button>
          {allTags.map(([tag, count]) => (
            <button
              key={tag}
              className={`${styles.tagChip} ${activeTag === tag ? styles.tagChipActive : ''}`}
              onClick={() => setActiveTag(activeTag === tag ? '' : tag)}
            >
              {tag}
              <span className={styles.tagCount}>{count}</span>
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <SkeletonList />
      ) : filtered.length === 0 ? (
        <div className={styles.empty}>
          <BookOpen size={48} className={styles.emptyIcon} />
          {articles.length === 0 ? (
            <>
              <h3>Your list is empty</h3>
              <p>Save articles, videos, and pages to read later.<br />Click <strong>Save Article</strong> to get started.</p>
            </>
          ) : (
            <>
              <h3>No results</h3>
              <p>Try a different search or tag filter.</p>
            </>
          )}
        </div>
      ) : (
        <>
          <p className={styles.listHeader}>{filtered.length} {filtered.length === 1 ? 'save' : 'saves'}</p>
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
        </>
      )}
    </div>
  );
}
