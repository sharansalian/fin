import {
  collection, addDoc, getDocs, query,
  where, serverTimestamp, orderBy,
} from 'firebase/firestore';
import { db } from './config';

// The admin email — only this user sees the admin panel
export const ADMIN_EMAIL = 'sharansalian.business@gmail.com';

export const createSupportRequest = (userId, userEmail, userName, title, description) =>
  addDoc(collection(db, 'supportRequests'), {
    title,
    description,
    userId,
    userEmail,
    userName,
    status: 'pending',
    createdAt: serverTimestamp(),
  });

export const getUserSupportRequests = async (userId) => {
  const q = query(
    collection(db, 'supportRequests'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const getAllSupportRequests = async () => {
  const q = query(collection(db, 'supportRequests'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};
