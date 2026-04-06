'use client';

import { FirebaseApp, getApp, getApps, initializeApp } from "firebase/app";
import { Auth, getAuth, inMemoryPersistence, setPersistence } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

function validateFirebaseConfig() {
  const missingKeys = Object.entries(firebaseConfig)
    .filter(([key, value]) => key !== "measurementId" && value === undefined)
    .map(([key]) => key);

  if (missingKeys.length > 0) {
    throw new Error(`Missing Firebase config: ${missingKeys.join(", ")}`);
  }
}

export function getFirebaseApp() {
  validateFirebaseConfig();

  if (!getApps().length) {
    return initializeApp(firebaseConfig);
  }

  return getApp();
}

let configuredAuthPromise: Promise<Auth> | null = null;

export function getFirebaseAuth() {
  if (!configuredAuthPromise) {
    configuredAuthPromise = (async () => {
      const app: FirebaseApp = getFirebaseApp();
      const auth = getAuth(app);
      await setPersistence(auth, inMemoryPersistence);

      // Disable app verification for test phone numbers on localhost
      if (
        typeof window !== "undefined" &&
        ["localhost", "127.0.0.1"].includes(window.location.hostname)
      ) {
        auth.settings.appVerificationDisabledForTesting = true;
      }

      return auth;
    })();
  }

  return configuredAuthPromise;
}
