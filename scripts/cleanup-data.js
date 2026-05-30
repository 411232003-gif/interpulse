const admin = require('firebase-admin');
const serviceAccount = require('./firebase-service-account.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'interpulse'
});

const db = admin.firestore();

async function deleteCollection(collectionName) {
  console.log(`Deleting collection: ${collectionName}...`);
  
  let count = 0;
  let batchCount = 0;
  let batch = db.batch();
  
  const snapshot = await db.collection(collectionName).limit(50).get();
  
  while (!snapshot.empty) {
    for (const doc of snapshot.docs) {
      batch.delete(doc.ref);
      count++;
      batchCount++;
      
      // Firebase batch allows max 500 operations
      if (batchCount === 500) {
        await batch.commit();
        console.log(`  Deleted ${count} documents...`);
        batchCount = 0;
        batch = db.batch();
        // Add delay to avoid quota exceeded
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    if (batchCount > 0) {
      await batch.commit();
      batchCount = 0;
      batch = db.batch();
      // Add delay to avoid quota exceeded
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Get next batch
    const lastDoc = snapshot.docs[snapshot.docs.length - 1];
    const nextSnapshot = await db.collection(collectionName).startAfter(lastDoc).limit(50).get();
    snapshot.empty = nextSnapshot.empty;
    snapshot.docs = nextSnapshot.docs;
  }
  
  console.log(`  ✓ Deleted ${count} documents from ${collectionName}`);
  return count;
}

async function cleanupData() {
  console.log('=== Starting Data Cleanup ===');
  console.log('This will delete ALL data except user accounts\n');
  
  try {
    // Order of deletion (child collections first)
    const collections = [
      'healthReadings',  // Health data
      'tbbb',            // TB/BB data
      'attendance',      // Attendance data
      'residents'        // Resident data
    ];
    
    let totalDeleted = 0;
    
    for (const collection of collections) {
      const count = await deleteCollection(collection);
      totalDeleted += count;
    }
    
    console.log('\n=== Cleanup Complete ===');
    console.log(`Total documents deleted: ${totalDeleted}`);
    console.log('User accounts (users collection) and Authentication are preserved.\n');
    
  } catch (error) {
    console.error('Error during cleanup:', error);
    process.exit(1);
  }
}

// Run cleanup
cleanupData().then(() => {
  console.log('Script completed successfully.');
  process.exit(0);
}).catch((error) => {
  console.error('Script failed:', error);
  process.exit(1);
});
