import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  onAuthStateChanged, 
  signOut 
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

// Export all necessary functions for other components
export { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  onAuthStateChanged, 
  signOut,
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