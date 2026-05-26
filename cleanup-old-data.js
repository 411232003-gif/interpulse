require('dotenv').config({ path: '.env.local' });
const { initializeApp, getApps, getApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where, deleteDoc, doc } = require('firebase/firestore');

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

// Calculate date 3 months ago
const threeMonthsAgo = new Date();
threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

console.log(`Deleting data older than: ${threeMonthsAgo.toISOString()}`);

async function deleteOldDocuments(collectionName, timestampField = 'timestamp') {
  console.log(`\nProcessing collection: ${collectionName}`);
  let deletedCount = 0;
  
  try {
    // Query documents older than 3 months
    const q = query(
      collection(db, collectionName),
      where(timestampField, '<', threeMonthsAgo.toISOString())
    );
    
    const querySnapshot = await getDocs(q);
    const batchSize = querySnapshot.size;
    
    if (batchSize === 0) {
      console.log(`  No old documents found`);
      return 0;
    }
    
    console.log(`  Found ${batchSize} documents to delete`);
    
    const deletePromises = [];
    querySnapshot.forEach((docSnapshot) => {
      deletePromises.push(deleteDoc(docSnapshot.ref));
    });
    
    await Promise.all(deletePromises);
    deletedCount = batchSize;
    console.log(`  Deleted ${deletedCount} documents`);
  } catch (error) {
    console.error(`  Error in ${collectionName}:`, error.message);
  }
  
  return deletedCount;
}

async function cleanupOldData() {
  console.log('=== Starting cleanup of old data ===\n');
  
  // Collections to clean up with their timestamp field names
  const collections = [
    { name: 'healthReadings', timestampField: 'timestamp' },
    { name: 'attendance', timestampField: 'timestamp' },
    { name: 'tb-bb', timestampField: 'timestamp' }
  ];
  
  let totalDeleted = 0;
  
  for (const col of collections) {
    const deleted = await deleteOldDocuments(col.name, col.timestampField);
    totalDeleted += deleted;
  }
  
  console.log(`\n=== Cleanup complete ===`);
  console.log(`Total documents deleted: ${totalDeleted}`);
}

cleanupOldData().catch(console.error);
