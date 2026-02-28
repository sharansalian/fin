import {
  collection,
  addDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  deleteDoc,
  doc,
  updateDoc,
  writeBatch,
  Timestamp,
} from 'firebase/firestore';
import { db } from './config';

export const getArticleByUrl = async (userId, url) => {
  const ref = collection(db, 'users', userId, 'articles');
  const q = query(ref, where('url', '==', url), limit(1));
  const snap = await getDocs(q);
  return snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() };
};

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

// Import articles in batches (Firestore limit: 500 writes per batch)
// articles: [{ url, title, tags, isArchived, isRead, savedAt (unix seconds) }]
export const batchImportArticles = async (userId, articles, onProgress) => {
  const BATCH_SIZE = 499;
  const colRef = collection(db, 'users', userId, 'articles');
  let imported = 0;

  for (let i = 0; i < articles.length; i += BATCH_SIZE) {
    const chunk = articles.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(db);

    chunk.forEach((article) => {
      const docRef = doc(colRef);
      const savedAt = article.savedAt
        ? Timestamp.fromMillis(article.savedAt * 1000)
        : Timestamp.now();
      batch.set(docRef, {
        url: article.url,
        title: article.title || article.url,
        excerpt: '',
        heroImage: '',
        domain: (() => { try { return new URL(article.url).hostname.replace('www.', ''); } catch { return ''; } })(),
        tags: article.tags || [],
        estimatedReadTime: 0,
        content: '',
        fetchStatus: 'pending',
        isRead: article.isRead ?? false,
        isFavorite: false,
        isArchived: article.isArchived ?? false,
        savedAt,
        readAt: null,
      });
    });

    await batch.commit();
    imported += chunk.length;
    onProgress?.(imported, articles.length);
  }
};

export const getUserProfile = async (userId) => {
  const ref = doc(db, 'users', userId);
  const snap = await getDoc(ref);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

// Fetch the most-liked article across all users.
// Collection: /articleStats/{urlHash} maintained by the onArticleFavoriteChange Cloud Function.
export const getFeaturedArticle = async () => {
  const ref = collection(db, 'articleStats');
  const q = query(ref, where('favoriteCount', '>', 0), orderBy('favoriteCount', 'desc'), limit(1));
  const snap = await getDocs(q);
  return snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() };
};

// Create a Bitly-style short link stored in /shares/{autoId}.
// Returns the Firestore doc ID which becomes the short code.
export const createShareLink = async (article) => {
  const ref = collection(db, 'shares');
  const docRef = await addDoc(ref, {
    url:       article.url,
    title:     article.title     || '',
    heroImage: article.heroImage || '',
    excerpt:   article.excerpt   || '',
    domain:    article.domain    || '',
    createdAt: serverTimestamp(),
  });
  return docRef.id; // e.g. "Xk9mN2pQjR5tUvWxYzAb"
};
