import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock, BookOpen, Video, Timer, Star, Gem,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePremium } from '../hooks/usePremium';
import { getArticles, getArticlesUnlimited } from '../firebase/articles';
import ArticleCard from '../components/ArticleCard';
import styles from './Collections.module.css';

const COLLECTIONS = [
  {
    id: 'unread',
    name: 'Unread',
    desc: 'Articles you haven\'t opened yet',
    icon: BookOpen,
    color: '#3b82f6',
    filter: (a) => !a.isRead,
  },
  {
    id: 'quick',
    name: 'Quick Reads',
    desc: 'Under 5 minutes',
    icon: Timer,
    color: '#10b981',
    filter: (a) => a.estimatedReadTime > 0 && a.estimatedReadTime <= 5,
  },
  {
    id: 'long',
    name: 'Long Reads',
    desc: '10+ minutes',
    icon: Clock,
    color: '#8b5cf6',
    filter: (a) => a.estimatedReadTime >= 10,
  },
  {
    id: 'videos',
    name: 'Videos',
    desc: 'Saved videos',
    icon: Video,
    color: '#ef4444',
    filter: (a) => !!a.isVideo,
  },
  {
    id: 'recent',
    name: 'Recently Read',
    desc: 'Last 7 days',
    icon: Star,
    color: '#f59e0b',
    filter: (a) => {
      if (!a.readAt) return false;
      const readTime = typeof a.readAt === 'string' ? new Date(a.readAt).getTime() : a.readAt?.toMillis?.() ?? 0;
      return Date.now() - readTime < 7 * 24 * 60 * 60 * 1000;
    },
  },
];

export default function Collections() {
  const { user } = useAuth();
  const { isPremium } = usePremium();
  const navigate = useNavigate();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCollection, setActiveCollection] = useState(null);

  useEffect(() => {
    const fetcher = isPremium ? getArticlesUnlimited : getArticles;
    fetcher(user.uid, {}).then((data) => {
      setArticles(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [user.uid, isPremium]);

  const counts = useMemo(() => {
    const map = {};
    COLLECTIONS.forEach((c) => {
      map[c.id] = articles.filter(c.filter).length;
    });
    return map;
  }, [articles]);

  const filtered = useMemo(() => {
    if (!activeCollection) return [];
    const col = COLLECTIONS.find((c) => c.id === activeCollection);
    return col ? articles.filter(col.filter) : [];
  }, [articles, activeCollection]);

  const handleUpdate = useCallback((id, data) => {
    setArticles((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...data } : a))
    );
  }, []);

  const handleDelete = useCallback((id) => {
    setArticles((prev) => prev.filter((a) => a.id !== id));
  }, []);

  if (!isPremium) {
    return (
      <div className={styles.page}>
        <div className={styles.premiumBanner}>
          <Gem size={20} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
          <span>
            Smart Collections is a Premium feature.{' '}
            <a href="#" onClick={(e) => { e.preventDefault(); navigate('/premium'); }}>Upgrade</a> to unlock.
          </span>
        </div>
      </div>
    );
  }

  const activeCol = COLLECTIONS.find((c) => c.id === activeCollection);

  return (
    <div className={styles.page}>
      <div className={styles.grid}>
        {COLLECTIONS.map((col) => {
          const Icon = col.icon;
          return (
            <div
              key={col.id}
              className={`${styles.card} ${activeCollection === col.id ? styles.cardActive : ''}`}
              onClick={() => setActiveCollection(activeCollection === col.id ? null : col.id)}
            >
              <div className={styles.cardIcon} style={{ background: `${col.color}15`, color: col.color }}>
                <Icon size={20} />
              </div>
              <div className={styles.cardInfo}>
                <div className={styles.cardName}>{col.name}</div>
                <div className={styles.cardDesc}>{col.desc}</div>
              </div>
              <span className={styles.cardCount}>{loading ? '—' : counts[col.id]}</span>
            </div>
          );
        })}
      </div>

      {activeCollection && (
        <>
          <p className={styles.listHeader}>
            {activeCol?.name} · {filtered.length} {filtered.length === 1 ? 'article' : 'articles'}
          </p>
          {filtered.length === 0 ? (
            <div className={styles.empty}>No articles in this collection.</div>
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
        </>
      )}
    </div>
  );
}
