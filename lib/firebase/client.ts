"use client";

import { getApps, initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseApp = getApps()[0] ?? initializeApp(config);
export const auth = getAuth(firebaseApp);

export const NIFT_DOMAIN = "nift.ac.in";

export const googleProvider = new GoogleAuthProvider();
// Only offer NIFT accounts in Google's account picker. The server re-checks
// the domain on every request — this hint alone isn't a security boundary.
googleProvider.setCustomParameters({ hd: NIFT_DOMAIN, prompt: "select_account" });
