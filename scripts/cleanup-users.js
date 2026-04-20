const admin = require('firebase-admin');

// Inisialisasi dengan service account
// Download serviceAccountKey.json dari: Firebase Console → Project Settings → Service Accounts → Generate new private key
admin.initializeApp({
  credential: admin.credential.cert(require('./serviceAccountKey.json'))
});

const db = admin.firestore();
const auth = admin.auth();

async function deleteNonAdminUsers() {
  console.log('🚀 Memulai pembersihan akun...\n');
  
  try {
    // Ambil semua users dari Firestore
    const usersSnapshot = await db.collection('users').get();
    const usersToDelete = [];
    const adminsToKeep = [];

    usersSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.role === 'admin') {
        adminsToKeep.push({ uid: doc.id, email: data.email });
        console.log('👤 Keep admin:', data.email || doc.id);
      } else {
        usersToDelete.push({ uid: doc.id, email: data.email, role: data.role });
      }
    });

    console.log(`\n📊 Summary:`);
    console.log(`   ${usersToDelete.length} akun user akan dihapus`);
    console.log(`   ${adminsToKeep.length} akun admin dipertahankan\n`);

    if (usersToDelete.length === 0) {
      console.log('✅ Tidak ada akun user untuk dihapus.');
      process.exit(0);
    }

    // Hapus dari Authentication dan Firestore
    let success = 0;
    let failed = 0;

    for (const user of usersToDelete) {
      try {
        // Hapus dari Auth
        await auth.deleteUser(user.uid);
        // Hapus dari Firestore
        await db.collection('users').doc(user.uid).delete();
        console.log(`✓ Deleted: ${user.email || user.uid} (role: ${user.role || 'user'})`);
        success++;
      } catch (err) {
        console.log(`✗ Failed: ${user.email || user.uid} - ${err.message}`);
        failed++;
      }
    }

    console.log(`\n🎉 Selesai! ${success} dihapus, ${failed} gagal.`);
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Jalankan
deleteNonAdminUsers();
