// Firebase client init — qgi-kiosk project
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: 'AIzaSyAjVSuLHNwP4h3vjUpun4E5WWsQTD3S8y4',
  authDomain: 'qgi-kiosk.firebaseapp.com',
  projectId: 'qgi-kiosk',
  storageBucket: 'qgi-kiosk.firebasestorage.app',
  messagingSenderId: '868378415234',
  appId: '1:868378415234:web:ef3e30f2c1157aa292e49b',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);
