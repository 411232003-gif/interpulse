const admin = require('firebase-admin');
const serviceAccount = require('./firebase-service-account.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function makeUserAdmin(email) {
  console.log(`🔧 Making user ${email} an admin...\n`);

  try {
    // Find user by email in users collection
    const usersSnapshot = await db.collection('users').where('email', '==', email).get();
    
    if (usersSnapshot.empty) {
      console.log(`❌ User with email ${email} not found in users collection`);
      process.exit(1);
    }

    const userDoc = usersSnapshot.docs[0];
    const userData = userDoc.data();
    
    console.log(`📋 Found user: ${userData.name} (${userData.email})`);
    console.log(`📋 Current role: ${userData.role}\n`);

    // Update role to admin
    await userDoc.ref.update({
      role: 'admin',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`✅ Successfully updated role to 'admin' for user ${email}`);
    console.log(`\n📝 User ${email} now has admin privileges`);
    
  } catch (error) {
    console.error('❌ Error making user admin:', error);
    process.exit(1);
  } finally {
    process.exit();
  }
}

// Get email from command line argument
const email = process.argv[2];

if (!email) {
  console.log('❌ Please provide an email address');
  console.log('Usage: node make-admin.js <email>');
  console.log('Example: node make-admin.js akuhnadmin@interpulse.id');
  process.exit(1);
}

makeUserAdmin(email);
