
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyANYrDw_ATJmKI0epV20LXewbaI2oPKnqk",
  authDomain: "attendance-app-bk.firebaseapp.com",
  projectId: "attendance-app-bk",
  storageBucket: "attendance-app-bk.firebasestorage.app",
  messagingSenderId: "821861868020",
  appId: "1:821861868020:web:580b7b2a6734b9eb6959a1"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
export { db };
