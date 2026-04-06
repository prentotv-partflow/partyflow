import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBsQLjNiZCssa7TJH178UBY9kyAuhtMzJY",
  authDomain: "partyflow-3d0cf.firebaseapp.com",
  projectId: "partyflow-3d0cf",
  storageBucket: "partyflow-3d0cf.firebasestorage.app",
  messagingSenderId: "1092792312674",
  appId: "1:1092792312674:web:479289e14b3190331fc23b"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);