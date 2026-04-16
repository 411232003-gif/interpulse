import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

// Firebase config - InterPulse Project
const firebaseConfig = {
  apiKey: "AIzaSyAZGmLomPkBtrt4vwPOWBF_wx1bkiHJma0",
  authDomain: "interpulse.firebaseapp.com",
  projectId: "interpulse",
  storageBucket: "interpulse.firebasestorage.app",
  messagingSenderId: "181983238569",
  appId: "1:181983238569:web:3088543f5bea471a9c8cb8"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()

// Initialize services
export const auth = getAuth(app)
export const db = getFirestore(app)

export default app
