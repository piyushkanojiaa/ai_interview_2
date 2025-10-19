// Import the functions you need from the SDKs you need
import { getApp, getApps, initializeApp } from "firebase/app";
// import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBgfTH_HVKevLkf619Mcx3RzzBGqIuHljc",
  authDomain: "interview-29ad2.firebaseapp.com",
  projectId: "interview-29ad2",
  storageBucket: "interview-29ad2.firebasestorage.app",
  messagingSenderId: "900537805157",
  appId: "1:900537805157:web:40038b453c20fda90f598c",
  measurementId: "G-HHEH9WJY1J",
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
// const analytics = getAnalytics(app);

export const auth = getAuth(app);
export const db = getFirestore(app);
