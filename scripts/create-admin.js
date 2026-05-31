const admin = require('firebase-admin');
const serviceAccount = require('./firebase-service-account.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'interpulse-6a17a'
});

const db = admin.firestore();
const auth = admin.auth();

async function createAdminUser(email, password, nama, nik, rw, rt) {
  try {
    console.log('Creating admin user...');

    // Create user in Firebase Authentication
    const userRecord = await auth.createUser({
      email: email,
      password: password,
      emailVerified: true
    });

    console.log('✓ User created in Authentication:', userRecord.uid);

    // Create user document in Firestore
    await db.collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      email: email,
      nama: nama,
      nik: nik,
      rw: rw,
      rt: rt,
      role: 'admin',
      createdAt: new Date().toISOString()
    });

    console.log('✓ User document created in Firestore');
    console.log('\n=== Admin User Created Successfully ===');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log(`NIK: ${nik}`);
    console.log(`Nama: ${nama}`);
    console.log(`RW: ${rw}`);
    console.log(`RT: ${rt}`);
    console.log(`UID: ${userRecord.uid}`);

  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  }
}

// Get command line arguments
const args = process.argv.slice(2);
if (args.length < 6) {
  console.log('Usage: node create-admin.js <email> <password> <nama> <nik> <rw> <rt>');
  console.log('Example: node create-admin.js admin@interpulse.id admin123 "Admin Utama" 1234567890123456 01 01');
  process.exit(1);
}

const [email, password, nama, nik, rw, rt] = args;

createAdminUser(email, password, nama, nik, rw, rt).then(() => {
  console.log('\nScript completed successfully.');
  process.exit(0);
}).catch((error) => {
  console.error('Script failed:', error);
  process.exit(1);
});
