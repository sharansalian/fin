import { useState, useEffect, useCallback } from 'react';
import { Sparkles, X, Bookmark, ExternalLink, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { addArticle, getArticleByUrl, updateArticle } from '../firebase/articles';
import { fetchMetadataOnly } from '../utils/articleFetcher';
import styles from './EditorPicks.module.css';

const EDITOR_PICKS = [
  {
    tag: "Editor's Pick",
    title: "Why a Reading List Is the Most Underrated Habit You're Not Building",
    source: 'Pocket Blog',
    readTime: '8 min read',
    desc: "The browser tabs don't count. Here's the case for building a real reading practice.",
    internal: true,
    url: '/blog/reading-toolkit',
  },
  {
    tag: 'Productivity',
    title: 'How to Read More: A Lot More',
    source: 'Farnam Street',
    readTime: '12 min read',
    desc: 'Shane Parrish on building a reading practice that actually sticks.',
    url: 'https://fs.blog/reading/',
  },
];

export default function EditorPicks() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);
  const [savedUrls, setSavedUrls] = useState({});
  const [savingUrls, setSavingUrls] = useState({});

  useEffect(() => {
    const key = localStorage.getItem('editorpicks-dismissed');
    if (key === 'true') setDismissed(true);
  }, []);

  // Check which picks the user already has saved
  useEffect(() => {
    if (!user) return;
    const checkSaved = async () => {
      const results = {};
      for (const pick of EDITOR_PICKS) {
        if (pick.internal) continue;
        const existing = await getArticleByUrl(user.uid, pick.url);
        if (existing) results[pick.url] = true;
      }
      setSavedUrls(results);
    };
    checkSaved();
  }, [user]);

  const handleDismiss = useCallback((e) => {
    e.stopPropagation();
    setDismissed(true);
    localStorage.setItem('editorpicks-dismissed', 'true');
  }, []);

  const handleSave = useCallback(async (pick) => {
    if (pick.internal) {
      navigate(pick.url);
      return;
    }
    if (savedUrls[pick.url] || savingUrls[pick.url]) return;

    setSavingUrls((prev) => ({ ...prev, [pick.url]: true }));
    try {
      const existing = await getArticleByUrl(user.uid, pick.url);
      if (existing) {
        setSavedUrls((prev) => ({ ...prev, [pick.url]: true }));
        setSavingUrls((prev) => ({ ...prev, [pick.url]: false }));
        return;
      }

      const domain = new URL(pick.url).hostname.replace('www.', '');
      const docRef = await addArticle(user.uid, {
        url: pick.url,
        title: pick.title || domain,
        excerpt: pick.desc || '',
        heroImage: '',
        domain,
        tags: [],
        estimatedReadTime: 0,
        content: '',
        fetchStatus: 'pending',
      });

      fetchMetadataOnly(pick.url).then((meta) => {
        updateArticle(user.uid, docRef.id, {
          title: meta.title || pick.title || domain,
          excerpt: meta.excerpt || '',
          heroImage: meta.heroImage || '',
          domain: meta.domain || domain,
          ...(meta.content ? { content: meta.content } : {}),
          ...(meta.fetchStatus ? { fetchStatus: meta.fetchStatus } : {}),
          ...(meta.estimatedReadTime ? { estimatedReadTime: meta.estimatedReadTime } : {}),
        }).catch(() => {});
      });

      setSavedUrls((prev) => ({ ...prev, [pick.url]: true }));
      window.dispatchEvent(new CustomEvent('pocket:refresh'));
    } catch {
      // silent
    } finally {
      setSavingUrls((prev) => ({ ...prev, [pick.url]: false }));
    }
  }, [user, savedUrls, savingUrls, navigate]);

  if (dismissed) return null;

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Sparkles size={14} className={styles.headerIcon} />
          <span className={styles.headerTitle}>Editor&apos;s Picks</span>
        </div>
        <button className={styles.dismissBtn} onClick={handleDismiss} title="Dismiss">
          <X size={14} />
        </button>
      </div>
      <div className={styles.list}>
        {EDITOR_PICKS.map((pick) => {
          const saved = savedUrls[pick.url];
          const saving = savingUrls[pick.url];
          return (
            <button
              key={pick.url}
              className={`${styles.card} ${pick.internal ? styles.cardFeatured : ''}`}
              onClick={() => handleSave(pick)}
            >
              <div className={styles.cardContent}>
                <div className={styles.cardMeta}>
                  <span className={`${styles.tag} ${pick.internal ? styles.tagFeatured : ''}`}>{pick.tag}</span>
                  <span className={styles.readTime}>{pick.readTime}</span>
                </div>
                <h3 className={styles.cardTitle}>{pick.title}</h3>
                <p className={styles.cardDesc}>{pick.desc}</p>
                <div className={styles.cardFooter}>
                  <span className={styles.source}>{pick.source}</span>
                  {pick.internal ? (
                    <span className={styles.readLink}>Read article</span>
                  ) : saved ? (
                    <span className={styles.savedBadge}><Check size={10} /> Saved</span>
                  ) : (
                    <span className={styles.savePrompt}>
                      {saving ? (
                        'Saving\u2026'
                      ) : (
                        <><Bookmark size={10} /> Save to list</>
                      )}
                    </span>
                  )}
                  {!pick.internal && <ExternalLink size={10} className={styles.extIcon} />}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
