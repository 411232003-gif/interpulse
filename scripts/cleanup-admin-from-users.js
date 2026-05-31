const admin = require('firebase-admin');
const serviceAccount = require('./firebase-service-account.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function cleanupAdminFromUsers() {
  try {
    console.log('Checking for admin accounts in users collection...');
    
    // Get all UIDs from admins collection
    const adminsSnapshot = await db.collection('admins').get();
    
    if (adminsSnapshot.empty) {
      console.log('No admins found in admins collection');
      return;
    }
    
    const adminUids = adminsSnapshot.docs.map(doc => doc.id);
    console.log(`Found ${adminUids.length} admin accounts in admins collection`);
    
    let deletedCount = 0;
    let notFoundCount = 0;
    let errorCount = 0;
    
    for (const uid of adminUids) {
      try {
        // Check if admin document exists in users collection
        const userDoc = await db.collection('users').doc(uid).get();
        
        if (userDoc.exists) {
          await db.collection('users').doc(uid).delete();
          deletedCount++;
          console.log(`✓ Deleted admin from users collection: ${uid}`);
        } else {
          notFoundCount++;
          console.log(`- Admin not found in users collection: ${uid}`);
        }
      } catch (error) {
        errorCount++;
        console.error(`✗ Failed to delete admin ${uid}:`, error.message);
      }
    }
    
    console.log('\n=== Cleanup Summary ===');
    console.log(`Total admins in admins collection: ${adminUids.length}`);
    console.log(`Deleted from users collection: ${deletedCount}`);
    console.log(`Not found in users collection: ${notFoundCount}`);
    console.log(`Errors: ${errorCount}`);
    
    if (deletedCount > 0) {
      console.log('\n✓ Cleanup completed successfully');
      console.log('Admin accounts are now only in the admins collection');
    }
    
  } catch (error) {
    console.error('Cleanup failed:', error);
    process.exit(1);
  }
}

// Run cleanup
cleanupAdminFromUsers().then(() => {
  console.log('Cleanup completed');
  process.exit(0);
});
