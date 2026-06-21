import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { initializeFirestore } from "firebase/firestore";

// Config parsed from firebase-applet-config.json
const firebaseConfig = {
  apiKey: "AIzaSyByQoT4JfI34KXMbN7Mtg8kYPJfXHw9Pnc",
  authDomain: "lucid-lodge-c8kj5.firebaseapp.com",
  projectId: "lucid-lodge-c8kj5",
  storageBucket: "lucid-lodge-c8kj5.firebasestorage.app",
  messagingSenderId: "648219956815",
  appId: "1:648219956815:web:73fe3b87918b51cf6dbc3a"
};

// Initialize app
const app = initializeApp(firebaseConfig);

// Initialize Firestore with the specific custom database ID provided in config
export const db = initializeFirestore(app, {
  databaseId: "ai-studio-6e6ed0d5-37a8-47f5-9daf-2d62b65cbea1"
} as any);

// Initialize Auth
export const auth = getAuth(app);

export { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, signInAnonymously };
