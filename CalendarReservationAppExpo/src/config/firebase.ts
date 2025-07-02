import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase konfigürasyonu - Firebase Console'dan alınacak
const firebaseConfig = {
  apiKey: "AIzaSyA1obADNq_CQcVNdbL34O6KtrRHiNk21ZM",
  authDomain: "reservas-d5893.firebaseapp.com",
  projectId: "reservas-d5893",
  storageBucket: "reservas-d5893.firebasestorage.app",
  messagingSenderId: "174032507109",
  appId: "1:174032507109:web:243c1dd66e75df1ba4440c",
  measurementId: "G-MWZXZ3BJDN"
};
// Firebase'i başlat
const app = initializeApp(firebaseConfig);

// Auth ve Firestore servislerini export et
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;