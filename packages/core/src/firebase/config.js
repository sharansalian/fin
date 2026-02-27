// ─────────────────────────────────────────────────────────────────────────────
// @pocket/core — Firebase config
//
// All apps in the platform connect to the same Firebase project.
// If you ever need a separate project per app, copy this file into
// apps/<app-name>/src/firebase/config.js and override.
// ─────────────────────────────────────────────────────────────────────────────
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

// Analytics is intentionally NOT imported here.
// firebase/analytics is browser-only and crashes the Metro (React Native)
// bundler even with a runtime guard, because Metro resolves static imports
// at bundle time. Each web app that needs analytics should import it
// directly in its own firebase/config.js (the root Pocket web app does this).

const firebaseConfig = {
  apiKey:            "AIzaSyBRcOyzuDFXi80APPedQeL-ttwAHXNgVu4",
  authDomain:        "finn-2c4c5.firebaseapp.com",
  projectId:         "finn-2c4c5",
  storageBucket:     "finn-2c4c5.firebasestorage.app",
  messagingSenderId: "914855199696",
  appId:             "1:914855199696:web:7d8efdc63eaf7b6297efd5",
  measurementId:     "G-039HM57SZ4",
};

// getApps() guard: if the RN app already called initializeApp() with
// AsyncStorage persistence, we reuse that instance instead of creating a new one.
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const auth           = getAuth(app);
export const db             = getFirestore(app);
export const functions      = getFunctions(app);
export const googleProvider = new GoogleAuthProvider();
export default app;
