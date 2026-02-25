import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  deleteDoc,
  doc,
  writeBatch,
  getDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from './config';

export const addTransaction = async (userId, transaction) => {
  const ref = collection(db, 'users', userId, 'transactions');
  return addDoc(ref, {
    ...transaction,
    createdAt: serverTimestamp(),
  });
};

export const addTransactionsBatch = async (userId, transactions) => {
  const batch = writeBatch(db);
  transactions.forEach((txn) => {
    const ref = doc(collection(db, 'users', userId, 'transactions'));
    batch.set(ref, { ...txn, createdAt: serverTimestamp() });
  });
  return batch.commit();
};

export const getTransactions = async (userId, limitCount = 100) => {
  const ref = collection(db, 'users', userId, 'transactions');
  const q = query(ref, orderBy('date', 'desc'), limit(limitCount));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const getTransactionsByMonth = async (userId, year, month) => {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59);
  const ref = collection(db, 'users', userId, 'transactions');
  const q = query(
    ref,
    where('date', '>=', start.toISOString()),
    where('date', '<=', end.toISOString()),
    orderBy('date', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const deleteTransaction = async (userId, transactionId) => {
  const ref = doc(db, 'users', userId, 'transactions', transactionId);
  return deleteDoc(ref);
};

export const getUserProfile = async (userId) => {
  const ref = doc(db, 'users', userId);
  const snap = await getDoc(ref);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

export const updateUserProfile = async (userId, data) => {
  const ref = doc(db, 'users', userId);
  return updateDoc(ref, data);
};
