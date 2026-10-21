import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/** When no Firebase env vars are set the app runs in local demo mode (data stays in this browser). */
export const isFirebaseConfigured = Boolean(config.apiKey && config.projectId && config.appId);

export const ALLOWED_DOMAIN = (process.env.NEXT_PUBLIC_ALLOWED_DOMAIN || "").trim().toLowerCase();

const app = isFirebaseConfigured ? (getApps().length ? getApp() : initializeApp(config)) : null;

export const firebaseAuth = app ? getAuth(app) : null;
export const firestore = app ? getFirestore(app) : null;
