const admin = require('firebase-admin');
const serviceAccount = require('./firebase-service-account.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function setupAdminsCollection() {
  console.log('🔧 Setting up admins collection...\n');

  try {
    // 1. Create admins collection
    const adminsRef = db.collection('admins');
    
    // 2. Fetch all users with role = 'admin'
    const usersSnapshot = await db.collection('users').where('role', '==', 'admin').get();
    
    if (usersSnapshot.empty) {
      console.log('⚠️  No admin users found in users collection');
      return;
    }

    console.log(`📋 Found ${usersSnapshot.size} admin users\n`);

    // 3. Add each admin to the admins collection
    const batch = db.batch();
    let count = 0;

    for (const doc of usersSnapshot.docs) {
      const userData = doc.data();
      const adminDocRef = adminsRef.doc(doc.id);
      
      batch.set(adminDocRef, {
        uid: doc.id,
        name: userData.name,
        email: userData.email,
        nik: userData.nik,
        role: 'admin',
        createdAt: userData.createdAt || admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      count++;
      console.log(`✅ Adding admin: ${userData.name} (${userData.email})`);
    }

    // 4. Commit the batch
    await batch.commit();
    
    console.log(`\n✨ Successfully added ${count} admins to 'admins' collection`);
    console.log('\n📝 Next steps:');
    console.log('   1. Update your code to check the admins collection instead of role field');
    console.log('   2. Use: const adminsSnapshot = await db.collection("admins").get()');
    console.log('   3. Check if user.uid exists in admins collection to verify admin status');

  } catch (error) {
    console.error('❌ Error setting up admins collection:', error);
  } finally {
    process.exit();
  }
}

setupAdminsCollection();
