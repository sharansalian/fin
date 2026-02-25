import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Heart, HeartOff, Archive, RotateCcw,
  ExternalLink, Loader, AlertCircle, Minus, Plus, Type,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getArticle, updateArticle } from '../firebase/articles';
import { fetchAndParse } from '../utils/articleFetcher';
import styles from './Reader.module.css';

const FONT_SIZES = ['small', 'medium', 'large'];

export default function Reader() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState('');
  const [fontSizeIdx, setFontSizeIdx] = useState(1);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const data = await getArticle(user.uid, id);
        if (!data) { setError('Article not found.'); setLoading(false); return; }
        if (mounted) setArticle(data);

        // Mark as read
        if (!data.isRead) {
          updateArticle(user.uid, id, { isRead: true, readAt: new Date().toISOString() });
        }

        // Fetch content if not yet fetched
        if (data.fetchStatus !== 'fetched' && data.url) {
          if (mounted) setFetching(true);
          try {
            const parsed = await fetchAndParse(data.url);
            await updateArticle(user.uid, id, parsed);
            if (mounted) setArticle((prev) => ({ ...prev, ...parsed }));
          } catch (e) {
            await updateArticle(user.uid, id, { fetchStatus: 'failed' });
            if (mounted) setArticle((prev) => ({ ...prev, fetchStatus: 'failed' }));
          } finally {
            if (mounted) setFetching(false);
          }
        }
      } catch (e) {
        if (mounted) setError('Failed to load article.');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [id, user.uid]);

  const act = async (data) => {
    setArticle((prev) => ({ ...prev, ...data }));
    await updateArticle(user.uid, id, data);
  };

  if (loading) {
    return (
      <div className={styles.loadingFull}>
        <Loader size={32} className={styles.spin} />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorFull}>
        <AlertCircle size={40} />
        <p>{error}</p>
        <button className="btn-secondary" onClick={() => navigate(-1)}>Go Back</button>
      </div>
    );
  }

  const fontSize = FONT_SIZES[fontSizeIdx];

  return (
    <div className={styles.page}>
      {/* Top bar */}
      <header className={styles.topBar}>
        <button className={`btn-ghost ${styles.backBtn}`} onClick={() => navigate(-1)}>
          <ArrowLeft size={18} />
          Back
        </button>

        <div className={styles.topActions}>
          <div className={styles.fontControls}>
            <Type size={14} className={styles.fontIcon} />
            <button
              className={styles.iconBtn}
              onClick={() => setFontSizeIdx((i) => Math.max(0, i - 1))}
              disabled={fontSizeIdx === 0}
            >
              <Minus size={14} />
            </button>
            <button
              className={styles.iconBtn}
              onClick={() => setFontSizeIdx((i) => Math.min(FONT_SIZES.length - 1, i + 1))}
              disabled={fontSizeIdx === FONT_SIZES.length - 1}
            >
              <Plus size={14} />
            </button>
          </div>

          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.iconBtn}
            title="Open original"
          >
            <ExternalLink size={16} />
          </a>

          <button
            className={`${styles.iconBtn} ${article.isFavorite ? styles.active : ''}`}
            onClick={() => act({ isFavorite: !article.isFavorite })}
            title={article.isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
          >
            {article.isFavorite ? <HeartOff size={16} /> : <Heart size={16} />}
          </button>

          <button
            className={styles.iconBtn}
            onClick={() => act({ isArchived: !article.isArchived })}
            title={article.isArchived ? 'Move to My List' : 'Archive'}
          >
            {article.isArchived ? <RotateCcw size={16} /> : <Archive size={16} />}
          </button>
        </div>
      </header>

      {/* Article */}
      <article className={`${styles.article} ${styles[fontSize]}`}>
        {article.heroImage && (
          <img
            src={article.heroImage}
            alt=""
            className={styles.heroImage}
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        )}

        <div className={styles.articleMeta}>
          {article.domain && <span className={styles.metaDomain}>{article.domain}</span>}
          {article.estimatedReadTime > 0 && (
            <span className={styles.metaReadTime}>{article.estimatedReadTime} min read</span>
          )}
        </div>

        <h1 className={styles.articleTitle}>{article.title}</h1>

        {article.authors?.length > 0 && (
          <p className={styles.byline}>By {article.authors.join(', ')}</p>
        )}

        <div className={styles.divider} />

        {fetching && (
          <div className={styles.fetchingMsg}>
            <Loader size={16} className={styles.spin} />
            Loading article content…
          </div>
        )}

        {article.fetchStatus === 'fetched' && article.content ? (
          <div
            className={styles.content}
            dangerouslySetInnerHTML={{ __html: article.content }}
          />
        ) : article.fetchStatus === 'failed' ? (
          <div className={styles.fetchFailed}>
            <AlertCircle size={20} />
            <p>Could not load the article content.</p>
            <a href={article.url} target="_blank" rel="noopener noreferrer" className="btn-primary">
              Read on original site
            </a>
          </div>
        ) : !fetching ? (
          <div className={styles.fetchFailed}>
            <p className={styles.excerpt}>{article.excerpt}</p>
            <a href={article.url} target="_blank" rel="noopener noreferrer" className="btn-secondary">
              Open original article
            </a>
          </div>
        ) : null}
      </article>
    </div>
  );
}
