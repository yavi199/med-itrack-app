
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
export const firebaseConfig = {
  apiKey: "AIzaSyD9IOKISuv0-j3HKtQl-bfFYycAQLm50xk",
  authDomain: "med-itrack-nduik.firebaseapp.com",
  projectId: "med-itrack-nduik",
  storageBucket: "med-itrack-nduik.appspot.com",
  messagingSenderId: "922998764855",
  appId: "1:922998764855:web:e83293177b293c273b96b2"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

export { app, db, storage, auth };
