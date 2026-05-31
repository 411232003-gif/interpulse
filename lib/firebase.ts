import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

// Firebase config - InterPulse Project (New)
const firebaseConfig = {
  apiKey: "AIzaSyB_tFnJVqpJgNhruE3bCCGjhAd6ZHGCAXg",
  authDomain: "interpulse-6a17a.firebaseapp.com",
  projectId: "interpulse-6a17a",
  storageBucket: "interpulse-6a17a.firebasestorage.app",
  messagingSenderId: "243666576516",
  appId: "1:243666576516:web:3779ce4b395d42b5758ed1",
  measurementId: "G-SXR6DBJ29D"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()

// Initialize services
export const auth = getAuth(app)
export const db = getFirestore(app)

export default app
