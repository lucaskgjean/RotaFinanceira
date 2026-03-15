
import { initializeApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore, enableMultiTabIndexedDbPersistence } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || "AIzaSyB5sk9819kKbD2_9v68KWWQSrXxHCWKxIQ",
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "rotafinanceira-aba24.firebaseapp.com",
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || "rotafinanceira-aba24",
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "rotafinanceira-aba24.firebasestorage.app",
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "277383693862",
  appId: process.env.VITE_FIREBASE_APP_ID || "1:277383693862:web:15ae42575974a0c8ae88e7"
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

const isConfigValid = !!firebaseConfig.apiKey && firebaseConfig.apiKey !== 'undefined';

if (isConfigValid) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    
    // Habilitar persistência offline
    if (typeof window !== 'undefined') {
      enableMultiTabIndexedDbPersistence(db).catch((err) => {
        if (err.code === 'failed-precondition') {
          console.warn('Persistência falhou: Múltiplas abas abertas.');
        } else if (err.code === 'unimplemented') {
          console.warn('O navegador não suporta persistência offline.');
        }
      });
    }
  } catch (error) {
    console.error("Erro ao inicializar Firebase:", error);
  }
}

export { auth, db };
export const isFirebaseConfigured = isConfigValid;
