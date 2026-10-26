import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyAi3Veex5yC07ZkAuW3HuRdMSi2yAVcxfc',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'turknroll-management-app.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'turknroll-management-app',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'turknroll-management-app.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '965645863051',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:965645863051:web:c1273f5db9f7616a966c8e',
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
