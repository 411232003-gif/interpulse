const admin = require('firebase-admin');
const serviceAccount = require('./firebase-service-account.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const auth = admin.auth();
const db = admin.firestore();

async function migrateUserEmails() {
  try {
    console.log('Starting email migration...');
    
    // Get all users from Firestore
    const usersSnapshot = await db.collection('users').get();
    
    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    for (const doc of usersSnapshot.docs) {
      const userData = doc.data();
      const uid = doc.id;
      const nik = userData.nik;
      const currentEmail = userData.email;
      
      // Skip if no NIK or email already in correct format
      if (!nik || currentEmail.includes('@interpulse.id')) {
        skippedCount++;
        console.log(`Skipped: ${nik || 'no NIK'} (${currentEmail})`);
        continue;
      }
      
      const newEmail = `${nik}@interpulse.id`;
      
      try {
        // Update email in Firebase Auth
        await auth.updateUser(uid, {
          email: newEmail
        });
        
        // Update email in Firestore
        await db.collection('users').doc(uid).update({
          email: newEmail
        });
        
        migratedCount++;
        console.log(`✓ Migrated: ${nik} (${currentEmail} -> ${newEmail})`);
      } catch (error) {
        errorCount++;
        console.error(`✗ Failed to migrate ${nik}:`, error.message);
      }
    }
    
    console.log('\n=== Migration Summary ===');
    console.log(`Total users: ${usersSnapshot.size}`);
    console.log(`Migrated: ${migratedCount}`);
    console.log(`Skipped: ${skippedCount}`);
    console.log(`Errors: ${errorCount}`);
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrateUserEmails().then(() => {
  console.log('Migration completed');
  process.exit(0);
});
