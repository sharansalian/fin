import { useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Tag, ArrowLeft, Pencil, Trash2, Check, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useArticles } from '../context/ArticlesContext';
import { renameTag, removeTag } from '../firebase/articles';
import ArticleCard from '../components/ArticleCard';
import styles from './Tags.module.css';

export default function Tags() {
  const { tag } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { articles, loading, updateArticle, removeArticle, refresh } = useArticles();

  const [editingTag, setEditingTag] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [busy, setBusy] = useState(false);

  const tagMap = useMemo(() => {
    const map = {};
    articles.forEach((a) => a.tags?.forEach((t) => { map[t] = (map[t] || 0) + 1; }));
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [articles]);

  const handleUpdate = useCallback((id, data) => updateArticle(id, data), [updateArticle]);
  const handleDelete = useCallback((id) => removeArticle(id), [removeArticle]);

  const startEditing = (e, t) => {
    e.stopPropagation();
    setEditingTag(t);
    setEditValue(t);
  };

  const cancelEditing = (e) => {
    if (e) e.stopPropagation();
    setEditingTag(null);
    setEditValue('');
  };

  const confirmRename = async (e) => {
    e.stopPropagation();
    const newName = editValue.trim().toLowerCase();
    if (!newName || newName === editingTag || busy) return;
    setBusy(true);
    try {
      await renameTag(user.uid, editingTag, newName);
      await refresh(true);
      setEditingTag(null);
      setEditValue('');
      // If we're viewing the tag that was renamed, navigate to the new tag
      if (tag === editingTag) navigate(`/tags/${encodeURIComponent(newName)}`, { replace: true });
    } finally {
      setBusy(false);
    }
  };

  const handleRemoveTag = async (e, t) => {
    e.stopPropagation();
    if (busy) return;
    const count = tagMap.find(([name]) => name === t)?.[1] || 0;
    if (!window.confirm(`Remove tag "${t}" from ${count} article${count !== 1 ? 's' : ''}?`)) return;
    setBusy(true);
    try {
      await removeTag(user.uid, t);
      await refresh(true);
      if (tag === t) navigate('/tags', { replace: true });
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingState}>
        <div className="spinner" />
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
                  <div className={styles.tagCardTop}>
                    <Tag size={18} className={styles.tagIcon} />
                    <div className={styles.tagActions}>
                      <span
                        className={styles.tagAction}
                        onClick={(e) => startEditing(e, t)}
                        title="Rename tag"
                      >
                        <Pencil size={14} />
                      </span>
                      <span
                        className={styles.tagAction}
                        onClick={(e) => handleRemoveTag(e, t)}
                        title="Delete tag"
                      >
                        <Trash2 size={14} />
                      </span>
                    </div>
                  </div>
                  {editingTag === t ? (
                    <div className={styles.editRow} onClick={(e) => e.stopPropagation()}>
                      <input
                        className={styles.editInput}
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') confirmRename(e);
                          if (e.key === 'Escape') cancelEditing();
                        }}
                        autoFocus
                        disabled={busy}
                      />
                      <button className={styles.editBtn} onClick={confirmRename} disabled={busy} title="Save">
                        <Check size={14} />
                      </button>
                      <button className={styles.editBtn} onClick={cancelEditing} title="Cancel">
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <span className={styles.tagName}>{t}</span>
                  )}
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
          <span
            className={styles.tagAction}
            onClick={(e) => startEditing(e, tag)}
            title="Rename tag"
          >
            <Pencil size={14} />
          </span>
          <span
            className={styles.tagAction}
            onClick={(e) => handleRemoveTag(e, tag)}
            title="Delete tag"
          >
            <Trash2 size={14} />
          </span>
        </div>
      </div>

      {editingTag === tag && (
        <div className={styles.editRow}>
          <input
            className={styles.editInput}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') confirmRename(e);
              if (e.key === 'Escape') cancelEditing();
            }}
            autoFocus
            disabled={busy}
            placeholder="New tag name"
          />
          <button className={styles.editBtn} onClick={confirmRename} disabled={busy} title="Save">
            <Check size={14} />
          </button>
          <button className={styles.editBtn} onClick={cancelEditing} title="Cancel">
            <X size={14} />
          </button>
        </div>
      )}

      {tagArticles.length === 0 ? (
        <div className={styles.empty}>
          <h3>No articles with this tag</h3>
        </div>
      ) : (
        <div className={styles.list}>
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
