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
  
  const snapshot = await db.collection(collectionName).get();
  
  if (snapshot.empty) {
    console.log(`  Collection ${collectionName} is empty.`);
    return 0;
  }
  
  let count = 0;
  let batchCount = 0;
  let batch = db.batch();
  
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
    }
  }
  
  if (batchCount > 0) {
    await batch.commit();
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
