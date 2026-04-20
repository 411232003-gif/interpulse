const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.cert(require('./serviceAccountKey.json'))
});

const db = admin.firestore();
const auth = admin.auth();

async function cleanupAllUserData() {
  console.log('🧹 Memulai pembersihan data Firestore...\n');
  
  try {
    // 1. Ambil UID admin untuk dikecualikan
    const usersSnapshot = await db.collection('users').get();
    let adminUIDs = [];
    let userUIDs = [];

    usersSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.role === 'admin') {
        adminUIDs.push(doc.id);
        console.log('👤 Keep admin data:', data.email || doc.id);
      } else {
        userUIDs.push(doc.id);
      }
    });

    console.log(`\n📊 Ditemukan: ${userUIDs.length} user, ${adminUIDs.length} admin\n`);

    // 2. Hapus semua healthReadings
    const healthSnapshot = await db.collection('healthReadings').get();
    let deletedHealth = 0;
    
    for (const doc of healthSnapshot.docs) {
      await doc.ref.delete();
      deletedHealth++;
    }
    console.log(`✓ Health readings dihapus: ${deletedHealth}`);

    // 3. Hapus dokumen users non-admin
    let deletedUsers = 0;
    for (const uid of userUIDs) {
      await db.collection('users').doc(uid).delete();
      deletedUsers++;
    }
    console.log(`✓ User profiles dihapus: ${deletedUsers}`);

    // 4. Hapus akun Auth non-admin
    let deletedAuth = 0;
    const listUsers = await auth.listUsers();
    
    for (const user of listUsers.users) {
      if (!adminUIDs.includes(user.uid)) {
        try {
          await auth.deleteUser(user.uid);
          deletedAuth++;
        } catch (err) {
          console.log(`⚠ Gagal hapus auth ${user.email}: ${err.message}`);
        }
      }
    }
    console.log(`✓ Auth accounts dihapus: ${deletedAuth}`);

    console.log(`\n🎉 Pembersihan selesai!`);
    console.log(`   • Health readings: ${deletedHealth}`);
    console.log(`   • User profiles: ${deletedUsers}`);
    console.log(`   • Auth accounts: ${deletedAuth}`);
    console.log(`\n💾 Admin tetap tersimpan: ${adminUIDs.length} akun`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

cleanupAllUserData();
