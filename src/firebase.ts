import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { initializeFirestore } from "firebase/firestore";

// Config parsed from compile-time injected environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ""
};

// Initialize app
const app = initializeApp(firebaseConfig);

// Initialize Firestore with the specific custom database ID provided in config
export const db = initializeFirestore(app, {
  databaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID || "default"
} as any);

// Initialize Auth
export const auth = getAuth(app);

export { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, signInAnonymously };
