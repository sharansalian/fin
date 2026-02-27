/**
 * Home — your main page.
 *
 * Starter wires up the article list from @pocket/core so you can
 * immediately read/write Firestore without any boilerplate.
 *
 * ✏️ Replace with whatever UI your app needs.
 */

import { useEffect, useState } from 'react';
import { useAuth }     from '@pocket/core/context';
import { getArticles } from '@pocket/core/firebase';
import { logout }      from '@pocket/core/firebase';
import { useNavigate } from 'react-router-dom';

export default function Home() {
  const { user }     = useAuth();
  const navigate     = useNavigate();
  const [articles, setArticles] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    getArticles(user.uid, { isArchived: false })
      .then(setArticles)
      .finally(() => setLoading(false));
  }, [user.uid]);

  return (
    <div className="page">
      <header className="app-header">
        {/* ✏️ CUSTOMIZE: replace with your nav / logo */}
        <span className="app-name">My App</span>
        <button className="btn-ghost" onClick={() => logout().then(() => navigate('/login'))}>
          Sign out
        </button>
      </header>

      <main className="app-content">
        {loading ? (
          <div className="spinner" />
        ) : articles.length === 0 ? (
          <p className="empty-state">No items yet. Save something!</p>
        ) : (
          <ul className="article-list">
            {articles.map((a) => (
              <li key={a.id} className="article-item">
                <a href={a.url} target="_blank" rel="noopener noreferrer">
                  {a.title || a.url}
                </a>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
