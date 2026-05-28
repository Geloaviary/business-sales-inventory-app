import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD7hsCpQdAjS6gFR8f-lghkFRWxrGzqt2M",
  authDomain: "business-sales-inventory-app.firebaseapp.com",
  projectId: "business-sales-inventory-app",
  storageBucket: "business-sales-inventory-app.firebasestorage.app",
  messagingSenderId: "519520911391",
  appId: "1:519520911391:web:c825d54aa78d1eb48f952a"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

const firebaseConfig = {
  apiKey: "PASTE_YOUR_API_KEY_HERE",
  authDomain: "PASTE_YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "PASTE_YOUR_PROJECT_ID",
  storageBucket: "PASTE_YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "PASTE_YOUR_MESSAGING_SENDER_ID",
  appId: "PASTE_YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
