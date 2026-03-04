import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { usePremium } from '../hooks/usePremium';
import { getArticles, getArticlesUnlimited } from '../firebase/articles';

const ArticlesContext = createContext(null);

export const ArticlesProvider = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const { isPremium } = usePremium();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async (silent = false) => {
    if (!user) {
      setArticles([]);
      setLoading(false);
      return;
    }
    if (!silent) setLoading(true);
    try {
      const fetcher = isPremium ? getArticlesUnlimited : getArticles;
      const data = await fetcher(user.uid, {});
      setArticles(data);
    } finally {
      setLoading(false);
    }
  }, [user, isPremium]);

  // Fetch once auth + profile are resolved
  useEffect(() => {
    if (!authLoading) fetchAll();
  }, [authLoading, fetchAll]);

  // Re-fetch when articles are added via AddArticleModal
  useEffect(() => {
    const handler = () => fetchAll(true);
    window.addEventListener('pocket:refresh', handler);
    return () => window.removeEventListener('pocket:refresh', handler);
  }, [fetchAll]);

  const updateArticle = useCallback((id, data) => {
    setArticles((prev) => prev.map((a) => (a.id === id ? { ...a, ...data } : a)));
  }, []);

  const removeArticle = useCallback((id) => {
    setArticles((prev) => prev.filter((a) => a.id !== id));
  }, []);

  return (
    <ArticlesContext.Provider value={{ articles, loading, updateArticle, removeArticle, refresh: fetchAll }}>
      {children}
    </ArticlesContext.Provider>
  );
};

export const useArticles = () => {
  const ctx = useContext(ArticlesContext);
  if (!ctx) throw new Error('useArticles must be used within ArticlesProvider');
  return ctx;
};
