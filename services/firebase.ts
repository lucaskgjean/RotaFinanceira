
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, enableMultiTabIndexedDbPersistence } from "firebase/firestore";
import firebaseConfig from "../firebase-applet-config.json";

const isConfigValid = !!firebaseConfig.apiKey && firebaseConfig.apiKey !== 'TODO_KEYHERE';

const app = isConfigValid ? initializeApp(firebaseConfig) : null;
const auth = app ? getAuth(app) : null;
const db = app ? getFirestore(app) : null;

if (typeof window !== "undefined" && db) {
  enableMultiTabIndexedDbPersistence(db).catch((err) => {
    if (err.code === "failed-precondition") {
      console.warn("Persistência falhou: Múltiplas abas abertas.");
    } else if (err.code === "unimplemented") {
      console.warn("O navegador não suporta persistência offline.");
    }
  });
}

export { auth, db };
export const isFirebaseConfigured = isConfigValid;
