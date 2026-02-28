/**
 * Chrome Extension popup script.
 * Bundled by Vite (vite.config.extension.js) → extension/popup.bundle.js
 *
 * SETUP (one-time, after loading the extension):
 *   1. npm run build:ext
 *   2. chrome://extensions → Developer mode ON → Load unpacked → select extension/
 *   3. Copy the Extension ID shown on the card
 *   4. Firebase Console → finn-2c4c5 → Authentication → Settings → Authorized domains
 *      → Add:  chrome-extension://[PASTE_EXTENSION_ID]
 *   5. Click the Pocket icon → Sign in with Google
 */

import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';

// ── Firebase config (same project as the web app) ──────────────────────────
const firebaseConfig = {
  apiKey: 'AIzaSyBRcOyzuDFXi80APPedQeL-ttwAHXNgVu4',
  authDomain: 'finn-2c4c5.firebaseapp.com',
  projectId: 'finn-2c4c5',
  storageBucket: 'finn-2c4c5.firebasestorage.app',
  messagingSenderId: '914855199696',
  appId: '1:914855199696:web:7d8efdc63eaf7b6297efd5',
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app);
const googleProvider = new GoogleAuthProvider();

// Cloud function — fetches article content + metadata server-side.
// When articleId is passed, the function writes results directly to Firestore,
// so it works even if this popup closes before the response arrives.
const callFetchArticle = httpsCallable(functions, 'fetchArticle', { timeout: 35000 });

// ── DOM refs ───────────────────────────────────────────────────────────────
const authView    = document.getElementById('auth-view');
const saveView    = document.getElementById('save-view');
const loadingView = document.getElementById('loading-view');

const signInBtn   = document.getElementById('sign-in-btn');
const signOutBtn  = document.getElementById('sign-out-btn');
const saveBtn     = document.getElementById('save-btn');
const tagsInput   = document.getElementById('tags-input');
const authError   = document.getElementById('auth-error');
const saveStatus  = document.getElementById('save-status');
const userAvatar  = document.getElementById('user-avatar');
const userName    = document.getElementById('user-name');
const articleDomain = document.getElementById('article-domain');
const articleTitle  = document.getElementById('article-title');

// ── Current tab info ───────────────────────────────────────────────────────
let currentTab = null;
chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
  currentTab = tab;
  if (tab?.url) {
    try {
      articleDomain.textContent = new URL(tab.url).hostname.replace('www.', '');
    } catch {
      articleDomain.textContent = '';
    }
    articleTitle.textContent = tab.title || tab.url;
  }
});

// ── Auth state ─────────────────────────────────────────────────────────────
onAuthStateChanged(auth, (user) => {
  loadingView.style.display = 'none';
  if (user) {
    // Update user info display
    const name = user.displayName || user.email || 'User';
    userAvatar.textContent = name.charAt(0).toUpperCase();
    userName.textContent = name;

    authView.style.display = 'none';
    saveView.style.display = 'block';
  } else {
    authView.style.display = 'block';
    saveView.style.display = 'none';
  }
});

// ── Sign in ────────────────────────────────────────────────────────────────
signInBtn.addEventListener('click', async () => {
  authError.style.display = 'none';
  signInBtn.disabled = true;
  signInBtn.textContent = 'Signing in…';
  try {
    await signInWithPopup(auth, googleProvider);
  } catch (err) {
    let msg = 'Sign-in failed. Please try again.';
    if (err.code === 'auth/popup-blocked') {
      msg = 'Popup was blocked. Please allow popups for this extension.';
    } else if (err.code === 'auth/unauthorized-domain') {
      msg = 'Extension not authorized. Add this extension\'s origin in Firebase Console → Authentication → Authorized domains.';
    }
    authError.textContent = msg;
    authError.style.display = 'block';
    signInBtn.disabled = false;
    signInBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
      Sign in with Google`;
  }
});

// ── Sign out ───────────────────────────────────────────────────────────────
signOutBtn.addEventListener('click', () => signOut(auth));

// ── Save article ───────────────────────────────────────────────────────────
saveBtn.addEventListener('click', async () => {
  const user = auth.currentUser;
  if (!user || !currentTab?.url) return;

  const url = currentTab.url;
  const title = currentTab.title || url;
  let domain = '';
  try { domain = new URL(url).hostname.replace('www.', ''); } catch { /* */ }

  const tags = tagsInput.value
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);

  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving…';
  saveStatus.style.display = 'none';

  try {
    const ref = collection(db, 'users', user.uid, 'articles');
    await addDoc(ref, {
      url,
      title,
      domain,
      excerpt: '',
      heroImage: '',
      content: '',
      tags,
      estimatedReadTime: 0,
      fetchStatus: 'pending',
      isRead: false,
      isFavorite: false,
      isArchived: false,
      savedAt: serverTimestamp(),
      readAt: null,
    });

    saveStatus.className = 'save-status success';
    saveStatus.textContent = '✓ Saved to Pocket!';
    saveStatus.style.display = 'flex';

    // Clear tags and close after a short delay
    tagsInput.value = '';
    setTimeout(() => window.close(), 900);
  } catch (err) {
    const msg = err?.code === 'permission-denied'
      ? '✕ Permission denied — are you signed in to the right account?'
      : `✕ Failed to save: ${err?.message || 'Unknown error'}`;
    saveStatus.className = 'save-status error';
    saveStatus.textContent = msg;
    saveStatus.style.display = 'flex';
    saveBtn.disabled = false;
    saveBtn.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10l-5 5-5-5V7h2v6.17L12 16l3-3V7h2v6z"/>
      </svg>
      Save to Pocket`;
  }
});

// Allow Cmd/Ctrl+Enter to save quickly
tagsInput.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') saveBtn.click();
});
