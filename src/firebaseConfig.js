import { initializeApp } from "firebase/app";

import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut,
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCdN-5MksNyYVVDY_9lGAJ5KtCKzmb30lk",
  authDomain: "nutriamigo-fd9f9.firebaseapp.com",
  projectId: "nutriamigo-fd9f9",
  storageBucket: "nutriamigo-fd9f9.firebasestorage.app",
  messagingSenderId: "520764766029",
  appId: "1:520764766029:web:bce3f9677fbee54b5ae904",
  measurementId: "G-4LKL12DPKW"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export {
  app,
  auth,

  // Auth functions
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut,
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential
};
