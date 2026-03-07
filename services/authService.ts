
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  sendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence,
  User
} from "firebase/auth";
import { auth } from "./firebase";

export const authService = {
  auth,
  subscribeToAuthChanges: (callback: (user: User | null) => void) => {
    if (!auth) {
      callback(null);
      return () => {};
    }
    return onAuthStateChanged(auth, callback);
  },

  login: async (email: string, pass: string) => {
    if (!auth) throw new Error("Firebase não configurado.");
    await setPersistence(auth, browserLocalPersistence);
    return signInWithEmailAndPassword(auth, email, pass);
  },

  signup: async (email: string, pass: string) => {
    if (!auth) throw new Error("Firebase não configurado.");
    await setPersistence(auth, browserLocalPersistence);
    return createUserWithEmailAndPassword(auth, email, pass);
  },

  logout: async () => {
    if (!auth) return;
    return signOut(auth);
  },

  resetPassword: async (email: string) => {
    if (!auth) throw new Error("Firebase não configurado.");
    return sendPasswordResetEmail(auth, email);
  },

  deleteAccount: async () => {
    if (!auth || !auth.currentUser) throw new Error("Usuário não autenticado.");
    const user = auth.currentUser;
    return user.delete();
  }
};
