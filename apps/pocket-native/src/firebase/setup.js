// React Native Firebase initialisation.
//
// This file MUST be imported before ANY @pocket/core import in App entry.
// It initialises Firebase with AsyncStorage-backed auth persistence so that
// the user stays logged in across app restarts (the default web SDK uses
// sessionStorage which is ephemeral in a native context).
//
// After this file runs, @pocket/core/firebase reads the already-initialised
// app via getApps()[0] and skips calling initializeApp() a second time, so
// both the app's code and core's helpers share exactly one Firebase instance.

import { initializeApp, getApps } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey:            'AIzaSyBRcOyzuDFXi80APPedQeL-ttwAHXNgVu4',
  authDomain:        'finn-2c4c5.firebaseapp.com',
  projectId:         'finn-2c4c5',
  storageBucket:     'finn-2c4c5.firebasestorage.app',
  messagingSenderId: '914855199696',
  appId:             '1:914855199696:web:7d8efdc63eaf7b6297efd5',
};

if (!getApps().length) {
  const app = initializeApp(firebaseConfig);
  // initializeAuth (not getAuth) lets us specify persistence.
  // getReactNativePersistence stores tokens in AsyncStorage so the user
  // remains logged in after force-quitting or restarting the app.
  initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
}
