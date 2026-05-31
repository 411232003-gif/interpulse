const admin = require('firebase-admin');
const serviceAccount = require('./firebase-service-account.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const firestore = admin.firestore();

async function createFirestoreIndex() {
  try {
    console.log('Creating Firestore index for notifications collection...');
    
    // Create composite index for notifications collection
    // This index is required for queries with where('userId') and orderBy('timestamp')
    const index = {
      collectionGroup: 'notifications',
      queryScope: 'COLLECTION',
      fields: [
        {
          fieldPath: 'userId',
          order: 'ASCENDING'
        },
        {
          fieldPath: 'timestamp',
          order: 'DESCENDING'
        }
      ]
    };
    
    // Note: Firestore indexes cannot be created programmatically via Admin SDK
    // They must be created through Firebase Console or deployed via firestore.indexes.json
    console.log('\n=== IMPORTANT ===');
    console.log('Firestore indexes cannot be created programmatically via Admin SDK.');
    console.log('You need to create the index manually using one of these methods:');
    console.log('\n1. Click this link to create index in Firebase Console:');
    console.log('   https://console.firebase.google.com/v1/r/project/interpulse-6a17a/firestore/indexes?create_composite=ClZwcm9qZWN0cy9pbnRlcnB1bHNlLTZhMTdhL2RhdGFiYXNlcy8oZGVmYXVsdCkvY29sbGVjdGlvbkdyb3Vwcy9ub3RpZmljYXRpb25zL2luZGV4ZXMvXxABGgoKBnVzZXJJZBABGg0KCXRpbWVzdGFtcBACGgwKCF9fbmFtZV9fEAI');
    console.log('\n2. Or create a firestore.indexes.json file in your project root');
    console.log('   with the following content:');
    console.log(`
{
  "indexes": [
    {
      "collectionGroup": "notifications",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "userId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "timestamp",
          "order": "DESCENDING"
        }
      ]
    }
  ],
  "fieldOverrides": []
}
    `);
    console.log('\n3. Then deploy using: firebase deploy --only firestore:indexes');
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run script
createFirestoreIndex().then(() => {
  console.log('\nScript completed');
  process.exit(0);
});
