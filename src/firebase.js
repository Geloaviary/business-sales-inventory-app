import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyD7hsCpQdAjS6gFR8f-lghkFRWxrGzqt2M",
  authDomain: "business-sales-inventory-app.firebaseapp.com",
  projectId: "business-sales-inventory-app",
  storageBucket: "business-sales-inventory-app.firebasestorage.app",
  messagingSenderId: "519520911391",
  appId: "1:519520911391:web:c825d54aa78d1eb48f952a"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
