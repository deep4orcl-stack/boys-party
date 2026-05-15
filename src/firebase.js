// ─────────────────────────────────────────────────────────────────────────────
// STEP: Replace the values below with YOUR Firebase project config
// Get them from: Firebase Console → Project Settings → Your Apps → Web App
// ─────────────────────────────────────────────────────────────────────────────

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// For Firebase JS SDK v7.20.0 and later, measurementId is optional

const firebaseConfig = {
  apiKey: "AIzaSyBFuzl-f_T97sH7sGY4Ch7tah6rnPrZTnI",
  authDomain: "boyz-party.firebaseapp.com",
  projectId: "boyz-party",
  storageBucket: "boyz-party.firebasestorage.app",
  messagingSenderId: "1062285176361",
  appId: "1:1062285176361:web:ac5dfcc7d6fc7a3dc2b638",
  measurementId: "G-Q93QBTK66M"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
