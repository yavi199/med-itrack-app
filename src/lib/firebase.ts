// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
export const firebaseConfig = {
  apiKey: "AIzaSyBI96qh9EbuO0h8F1MBAYKwOloCrxaf6rk",
  authDomain: "med-itrack-nduik.firebaseapp.com",
  projectId: "med-itrack-nduik",
  storageBucket: "med-itrack-nduik.appspot.com",
  messagingSenderId: "324429977043",
  appId: "1:324429977043:web:e3092fb39e1e04751bcb26",
  measurementId: "G-C37WHTVBJ7"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

export { app, db, storage, auth };
