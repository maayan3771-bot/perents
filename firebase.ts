import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  onAuthStateChanged, 
  signOut,
  sendEmailVerification,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  PhoneAuthProvider,
  signInWithCredential,
  sendPasswordResetEmail,
  signInWithPopup,
  GoogleAuthProvider,
  FacebookAuthProvider
} from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  doc, 
  setDoc, 
  query, 
  orderBy, 
  getDoc 
} from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics, logEvent } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyAMt1TXPbg9rVOzuWpkUnRJcbZ4PJ-jzyE",
  authDomain: "sharedparentingapp.firebaseapp.com",
  projectId: "sharedparentingapp",
  storageBucket: "sharedparentingapp.firebasestorage.app",
  messagingSenderId: "781216764342",
  appId: "1:781216764342:web:1bf1a755fd795916d63117"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const analytics = getAnalytics(app);

// Log current domain for debugging auth/unauthorized-domain errors
if (typeof window !== 'undefined') {
  const currentDomain = window.location.hostname + (window.location.port ? ':' + window.location.port : '');
  const protocol = window.location.protocol;
  console.log(`🔐 App running on: ${protocol}//${currentDomain}`);
  console.log('📝 Make sure this domain is added to Firebase Console → Authentication → Authorized domains');
}

// Export all necessary functions for other components
export { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  onAuthStateChanged, 
  signOut,
  sendEmailVerification,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  PhoneAuthProvider,
  signInWithCredential,
  sendPasswordResetEmail,
  signInWithPopup,
  GoogleAuthProvider,
  FacebookAuthProvider,
  logEvent,
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc,
  deleteDoc,
  doc, 
  setDoc, 
  query, 
  orderBy, 
  getDoc 
};