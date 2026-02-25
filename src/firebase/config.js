import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyBRcOyzuDFXi80APPedQeL-ttwAHXNgVu4",
  authDomain: "finn-2c4c5.firebaseapp.com",
  projectId: "finn-2c4c5",
  storageBucket: "finn-2c4c5.firebasestorage.app",
  messagingSenderId: "914855199696",
  appId: "1:914855199696:web:7d8efdc63eaf7b6297efd5",
  measurementId: "G-039HM57SZ4"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

let analytics = null;
if (typeof window !== 'undefined') {
  try {
    analytics = getAnalytics(app);
  } catch (e) {
    // Analytics not available
  }
}
export { analytics };
export default app;
