require('dotenv').config({ path: '.env.local' });
const { initializeApp, getApps, getApp } = require('firebase/app');
const { getFirestore, collection, getDocs, deleteDoc, doc } = require('firebase/firestore');

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

async function deleteCollection(collectionName) {
  console.log(`Deleting collection: ${collectionName}`);
  let deletedCount = 0;
  
  try {
    const querySnapshot = await getDocs(collection(db, collectionName));
    const batchSize = querySnapshot.size;
    
    if (batchSize === 0) {
      console.log(`  Collection is empty`);
      return;
    }
    
    const deletePromises = [];
    querySnapshot.forEach((doc) => {
      deletePromises.push(deleteDoc(doc.ref));
    });
    
    await Promise.all(deletePromises);
    deletedCount = batchSize;
    console.log(`  Deleted ${deletedCount} documents`);
  } catch (error) {
    console.error(`  Error deleting ${collectionName}:`, error);
  }
  
  return deletedCount;
}

async function clearAllData() {
  console.log('Starting to clear all Firestore data...\n');
  
  const collections = [
    'residents',
    'healthReadings',
    'attendance',
    'elderly-attendance'
  ];
  
  let totalDeleted = 0;
  
  for (const col of collections) {
    const deleted = await deleteCollection(col);
    if (deleted) {
      totalDeleted += deleted;
    }
  }
  
  console.log(`\nTotal documents deleted: ${totalDeleted}`);
  console.log('All data cleared successfully!');
}

clearAllData().catch(console.error);
