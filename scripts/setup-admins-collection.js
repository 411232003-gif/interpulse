const admin = require('firebase-admin');
const serviceAccount = require('./firebase-service-account.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const auth = admin.auth();

async function setupAdminsCollection() {
  try {
    console.log('Setting up admins collection...');
    
    // Get all users with role 'admin' from users collection
    const usersSnapshot = await db.collection('users').where('role', '==', 'admin').get();
    
    if (usersSnapshot.empty) {
      console.log('No admin users found in users collection');
      return;
    }
    
    console.log(`Found ${usersSnapshot.size} admin users`);
    
    let migratedCount = 0;
    let errorCount = 0;
    
    for (const doc of usersSnapshot.docs) {
      const userData = doc.data();
      const uid = doc.id;
      
      try {
        // Create admin document in admins collection
        const adminData = {
          uid: uid,
          email: userData.email,
          name: userData.name || 'Admin',
          phone: userData.phone || '',
          adminKelurahan: userData.adminKelurahan || '',
          createdAt: userData.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        await db.collection('admins').doc(uid).set(adminData);
        
        // Remove role from users collection (now only for regular users)
        await db.collection('users').doc(uid).update({
          role: admin.firestore.FieldValue.delete()
        });
        
        migratedCount++;
        console.log(`✓ Migrated admin: ${userData.email} (${userData.name})`);
      } catch (error) {
        errorCount++;
        console.error(`✗ Failed to migrate admin ${userData.email}:`, error.message);
      }
    }
    
    console.log('\n=== Migration Summary ===');
    console.log(`Total admins found: ${usersSnapshot.size}`);
    console.log(`Migrated: ${migratedCount}`);
    console.log(`Errors: ${errorCount}`);
    
    if (migratedCount > 0) {
      console.log('\n✓ Admins collection is now ready');
      console.log('Admin accounts are now separated from regular users');
    }
    
  } catch (error) {
    console.error('Setup failed:', error);
    process.exit(1);
  }
}

// Run setup
setupAdminsCollection().then(() => {
  console.log('Setup completed');
  process.exit(0);
});
