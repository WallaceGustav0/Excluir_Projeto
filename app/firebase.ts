import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDygLNO6-C5_VBOKcI7YzBiE532xgR-WDc",
  authDomain: "liga-pra-quem-bd.firebaseapp.com",
  projectId: "liga-pra-quem-bd",
  storageBucket: "liga-pra-quem-bd.firebasestorage.app",
  messagingSenderId: "688322357217",
  appId: "1:688322357217:web:e714c9f5e97c7b38abd4a0"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();