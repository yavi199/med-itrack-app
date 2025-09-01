
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp, FirebaseOptions } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

// This function checks if the code is running in a server environment
const isServer = typeof window === 'undefined';

// Function to get the Firebase config
const getFirebaseConfig = (): FirebaseOptions => {
  // If running on the server (during build or in a server component),
  // try to get config from environment variables provided by App Hosting.
  if (isServer) {
    try {
      const config = JSON.parse(process.env.FIREBASE_CONFIG || '{}');
      if (config.projectId) {
        return config;
      }
    } catch (e) {
      // Fallback to public env vars if FIREBASE_CONFIG is not available
    }
  }

  // Fallback for client-side or when server-side env is not set.
  // These are your public environment variables from .env
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
};

const firebaseConfig = getFirebaseConfig();

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

export { app, db, storage, auth };
