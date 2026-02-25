import {
  collection,
  addDoc,
  getDoc,
  getDocs,
  query,
  where,
  limit,
  serverTimestamp,
  deleteDoc,
  doc,
  updateDoc,
} from 'firebase/firestore';
import { db } from './config';

export const addArticle = async (userId, articleData) => {
  const ref = collection(db, 'users', userId, 'articles');
  return addDoc(ref, {
    ...articleData,
    isRead: false,
    isFavorite: false,
    isArchived: false,
    fetchStatus: 'pending',
    tags: articleData.tags || [],
    savedAt: serverTimestamp(),
    readAt: null,
  });
};

export const updateArticle = async (userId, articleId, data) => {
  const ref = doc(db, 'users', userId, 'articles', articleId);
  return updateDoc(ref, data);
};

export const deleteArticle = async (userId, articleId) => {
  const ref = doc(db, 'users', userId, 'articles', articleId);
  return deleteDoc(ref);
};

export const getArticle = async (userId, articleId) => {
  const ref = doc(db, 'users', userId, 'articles', articleId);
  const snap = await getDoc(ref);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

// filters: { isArchived, isFavorite, tag }
// Sorting is done client-side to avoid composite index requirements
export const getArticles = async (userId, filters = {}) => {
  const ref = collection(db, 'users', userId, 'articles');
  const conditions = [limit(500)];

  if (filters.isArchived !== undefined) {
    conditions.push(where('isArchived', '==', filters.isArchived));
  }
  if (filters.isFavorite !== undefined) {
    conditions.push(where('isFavorite', '==', filters.isFavorite));
  }
  if (filters.tag) {
    conditions.push(where('tags', 'array-contains', filters.tag));
  }

  const q = query(ref, ...conditions);
  const snap = await getDocs(q);
  const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  // Sort by savedAt descending client-side
  return docs.sort((a, b) => {
    const ta = a.savedAt?.toMillis?.() ?? 0;
    const tb = b.savedAt?.toMillis?.() ?? 0;
    return tb - ta;
  });
};

export const getUserProfile = async (userId) => {
  const ref = doc(db, 'users', userId);
  const snap = await getDoc(ref);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};
