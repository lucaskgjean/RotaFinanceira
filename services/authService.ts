
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  sendPasswordResetEmail,
  sendEmailVerification,
  setPersistence,
  browserLocalPersistence,
  updateProfile,
  reauthenticateWithCredential,
  EmailAuthProvider,
  User,
  GoogleAuthProvider,
  signInWithPopup,
  updatePassword
} from "firebase/auth";
import { auth } from "./firebase";
import { storageService } from "./storageService";
import { DEFAULT_CONFIG } from "../types";

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

  loginWithGoogle: async () => {
    if (!auth) throw new Error("Firebase não configurado.");
    const provider = new GoogleAuthProvider();
    await setPersistence(auth, browserLocalPersistence);
    return signInWithPopup(auth, provider);
  },

  reauthenticate: async (password: string) => {
    if (!auth || !auth.currentUser || !auth.currentUser.email) {
      throw new Error("Usuário não autenticado.");
    }
    const credential = EmailAuthProvider.credential(auth.currentUser.email, password);
    return reauthenticateWithCredential(auth.currentUser, credential);
  },

  sendVerificationEmail: async () => {
    if (!auth || !auth.currentUser) throw new Error("Usuário não autenticado.");
    return sendEmailVerification(auth.currentUser);
  },

  reloadUser: async () => {
    if (!auth || !auth.currentUser) return null;
    await auth.currentUser.reload();
    return auth.currentUser;
  },

  signup: async (email: string, pass: string, profileData?: { firstName: string; lastName: string; nickname?: string; phone: string; acceptedMarketing?: boolean }) => {
    if (!auth) throw new Error("Firebase não configurado.");
    await setPersistence(auth, browserLocalPersistence);
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    const user = userCredential.user;

    // Send verification email immediately (don't block signup if it fails)
    try {
      await sendEmailVerification(user);
    } catch (e) {
      console.error("Erro ao enviar e-mail de verificação inicial:", e);
    }

    if (profileData) {
      const displayName = `${profileData.firstName} ${profileData.lastName}`.trim();
      await updateProfile(user, { displayName });

      // Save initial config with profile data to Firestore
      const initialConfig = {
        ...DEFAULT_CONFIG,
        profile: {
          ...DEFAULT_CONFIG.profile,
          firstName: profileData.firstName,
          lastName: profileData.lastName,
          displayName,
          nickname: profileData.nickname || '',
          phone: profileData.phone,
          acceptedMarketing: profileData.acceptedMarketing || false,
          createdAt: new Date().toISOString()
        }
      };
      await storageService.saveConfig(initialConfig, user.uid);
    }

    return userCredential;
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
  },

  changePassword: async (newPassword: string) => {
    if (!auth || !auth.currentUser) throw new Error("Usuário não autenticado.");
    return updatePassword(auth.currentUser, newPassword);
  }
};
