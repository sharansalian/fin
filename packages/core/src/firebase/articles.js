import {
  collection, addDoc, getDoc, getDocs,
  query, where, limit, serverTimestamp,
  deleteDoc, doc, updateDoc, writeBatch, Timestamp,
} from 'firebase/firestore';
import { db } from './config.js';

export const addArticle = async (userId, data) => {
  const ref = collection(db, 'users', userId, 'articles');
  return addDoc(ref, {
    ...data,
    isRead: false, isFavorite: false, isArchived: false,
    fetchStatus: 'pending',
    tags: data.tags || [],
    savedAt: serverTimestamp(),
    readAt: null,
  });
};

export const updateArticle = async (userId, articleId, data) =>
  updateDoc(doc(db, 'users', userId, 'articles', articleId), data);

export const deleteArticle = async (userId, articleId) =>
  deleteDoc(doc(db, 'users', userId, 'articles', articleId));

export const getArticle = async (userId, articleId) => {
  const snap = await getDoc(doc(db, 'users', userId, 'articles', articleId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

// filters: { isArchived, isFavorite, tag }
export const getArticles = async (userId, filters = {}) => {
  const ref = collection(db, 'users', userId, 'articles');
  const conditions = [limit(500)];
  if (filters.isArchived !== undefined)
    conditions.push(where('isArchived', '==', filters.isArchived));
  if (filters.isFavorite !== undefined)
    conditions.push(where('isFavorite', '==', filters.isFavorite));
  if (filters.tag)
    conditions.push(where('tags', 'array-contains', filters.tag));

  const snap = await getDocs(query(ref, ...conditions));
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.savedAt?.toMillis?.() ?? 0) - (a.savedAt?.toMillis?.() ?? 0));
};

// Bulk-import articles (e.g. from CSV). Batched to respect Firestore limits.
export const batchImportArticles = async (userId, articles, onProgress) => {
  const BATCH_SIZE = 499;
  const colRef = collection(db, 'users', userId, 'articles');
  let imported = 0;
  for (let i = 0; i < articles.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    articles.slice(i, i + BATCH_SIZE).forEach((a) => {
      const ref = doc(colRef);
      batch.set(ref, {
        url: a.url, title: a.title || a.url,
        excerpt: '', heroImage: '', content: '',
        domain: (() => { try { return new URL(a.url).hostname.replace('www.', ''); } catch { return ''; } })(),
        tags: a.tags || [], estimatedReadTime: 0,
        fetchStatus: 'pending',
        isRead: a.isRead ?? false, isFavorite: false, isArchived: a.isArchived ?? false,
        savedAt: a.savedAt ? Timestamp.fromMillis(a.savedAt * 1000) : Timestamp.now(),
        readAt: null,
      });
    });
    await batch.commit();
    imported += articles.slice(i, i + BATCH_SIZE).length;
    onProgress?.(imported, articles.length);
  }
};
