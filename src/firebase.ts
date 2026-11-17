import { initializeApp, deleteApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, connectAuthEmulator, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

// La configurazione viene iniettata da Vite (vedi vite.config.ts):
// variabili VITE_FIREBASE_* oppure firebase-applet-config.json in locale.
export const firebaseConfig: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || undefined,
};

export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

if (!isFirebaseConfigured) {
  console.warn('[firebase] Configurazione mancante: imposta le variabili VITE_FIREBASE_* prima della build.');
}

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

const databaseId = import.meta.env.VITE_FIREBASE_DATABASE_ID;
export const db = databaseId ? getFirestore(app, databaseId) : getFirestore(app);

/** Sviluppo locale: `VITE_USE_EMULATORS=true npm run dev` usa gli emulatori Firebase (vedi firebase.json). */
const useEmulators = import.meta.env.VITE_USE_EMULATORS === 'true';
if (useEmulators) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
}

/**
 * Crea un account email/password SENZA disconnettere l'amministratore corrente.
 * Usa un'istanza Firebase secondaria e temporanea, così funziona anche su
 * hosting statico (GitHub Pages) senza un backend dedicato.
 */
export async function createAuthAccount(email: string, password: string): Promise<string> {
  const secondary = initializeApp(firebaseConfig, `secondary-${Date.now()}`);
  try {
    const secondaryAuth = getAuth(secondary);
    if (useEmulators) connectAuthEmulator(secondaryAuth, 'http://127.0.0.1:9099', { disableWarnings: true });
    const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    await signOut(secondaryAuth);
    return cred.user.uid;
  } finally {
    await deleteApp(secondary);
  }
}
