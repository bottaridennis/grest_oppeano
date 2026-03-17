import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';

// Firebase configuration is injected via Vite's 'define' in vite.config.ts
// This supports both AI Studio preview and GitHub Pages deployment
// Hardcoded config for debugging
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

console.log("Initializing Firebase with Project ID:", firebaseConfig.projectId);

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Use the provided database ID
const databaseId = import.meta.env.VITE_FIREBASE_DATABASE_ID;
console.log("Using Firestore Database ID:", databaseId);

export const db = getFirestore(app, databaseId);

export async function testConnection() {
  try {
    console.log("Testing Firebase connection...");
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firebase connection successful.");
  } catch (error) {
    console.error("Firebase connection test failed:", error);
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. This often means the Project ID, API Key, or Database ID is incorrect.");
    }
  }
}
