const admin = require('firebase-admin');
const serviceAccount = require('./firebase-service-account.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Configuration
const months = ['januari', 'februari', 'maret', 'april'];
const rwTargets = {
  '01': 120,
  '02': 120,
  '03': 120,
  '04': 118
};

// Generate random number between min and max
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Generate dummy residents
async function generateResidents() {
  console.log('👥 Generating dummy residents...\n');
  
  const residentsRef = db.collection('residents');
  const batch = db.batch();
  
  const maleNames = [
    'Budi Santoso', 'Ahmad Dahlan', 'Rudi Hartono', 'Joko Widodo', 'Dedi Corbuzier',
    'Raffi Ahmad', 'Andi Wijaya', 'Denny Cagur', 'Bambang Pamungkas', 'Reza Rahadian',
    'Agus Setiawan', 'Bambang Sutrisno', 'Cahyo Purnomo', 'Dedi Kurniawan', 'Eko Prasetyo',
    'Feri Irawan', 'Gunawan Santoso', 'Hendra Wijaya', 'I Made Suweta', 'Joko Susilo'
  ];
  
  const femaleNames = [
    'Siti Aminah', 'Dewi Sartika', 'Lina Marlina', 'Rina Nose', 'Putri Titian',
    'Nagita Slavina', 'Maya Estianty', 'Rina Wati', 'Citra Kirana', 'Maudy Ayunda',
    'Ani Suryani', 'Bella Safira', 'Citra Lestari', 'Dina Mariani', 'Eka Putri',
    'Fitri Handayani', 'Gita Savitri', 'Haniifah', 'Indah Permata', 'Jihan Audy'
  ];
  
  const allNames = [...maleNames, ...femaleNames];
  const residentData = [];
  const totalResidents = 478;
  
  for (let i = 0; i < totalResidents; i++) {
    const rw = Object.keys(rwTargets)[randomInt(0, Object.keys(rwTargets).length - 1)];
    const rt = String(randomInt(1, 10));
    const nik = `317${String(randomInt(100000000, 999999999))}`;
    const birthYear = randomInt(1950, 2000);
    const birthDate = `${birthYear}-${String(randomInt(1, 12)).padStart(2, '0')}-${String(randomInt(1, 28)).padStart(2, '0')}`;
    const isMale = i % 2 === 0; // Alternate between male and female
    const nameIndex = i % allNames.length;
    
    const docRef = residentsRef.doc(nik);
    batch.set(docRef, {
      nama: allNames[nameIndex] + ` ${randomInt(1, 99)}`, // Add number to make unique
      nik: nik,
      rw: rw,
      rt: rt,
      birthDate: birthDate,
      umur: 2026 - birthYear,
      jenisKelamin: isMale ? 'Laki-laki' : 'Perempuan',
      alamat: `Jl. Duris Selatan No. ${randomInt(1, 100)}, RT ${rt}, RW ${rw}`,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    residentData.push({
      nik: nik,
      nama: allNames[nameIndex] + ` ${randomInt(1, 99)}`,
      rw: rw,
      rt: rt,
      jenisKelamin: isMale ? 'Laki-laki' : 'Perempuan'
    });
    
    if (i % 50 === 0) {
      console.log(`✅ Generated ${i}/${totalResidents} residents...`);
    }
  }
  
  await batch.commit();
  console.log(`\n✨ ${totalResidents} Residents generated successfully!\n`);
  return residentData;
}

// Generate dummy health readings for all months
async function generateHealthReadings(residentData) {
  console.log('🏥 Generating dummy health readings...\n');
  
  const healthRef = db.collection('healthReadings');
  const batch = db.batch();
  
  const healthTypes = ['kolesterol', 'tensi', 'guladarah', 'asamurat'];
  
  let count = 0;
  
  for (const month of months) {
    for (const rw of Object.keys(rwTargets)) {
      for (const healthType of healthTypes) {
        const numReadings = randomInt(5, 15);
        
        for (let i = 0; i < numReadings; i++) {
          const resident = residentData[randomInt(0, residentData.length - 1)];
          const day = randomInt(1, 28);
          const timestamp = `2026-${months.indexOf(month) + 1}-${day}T${String(randomInt(8, 16)).padStart(2, '0')}:00:00`;
          
          let value;
          switch (healthType) {
            case 'kolesterol':
              value = randomInt(150, 280);
              break;
            case 'tensi':
              value = randomInt(90, 160);
              break;
            case 'guladarah':
              value = randomInt(70, 150);
              break;
            case 'asamurat':
              value = randomInt(4, 12);
              break;
          }
          
          const docRef = healthRef.doc();
          batch.set(docRef, {
            type: healthType,
            value: value,
            nik: resident.nik,
            nama: resident.nama,
            rw: resident.rw,
            rt: resident.rt,
            timestamp: timestamp,
            source: 'posbindu',
            createdAt: admin.firestore.FieldValue.serverTimestamp()
          });
          
          count++;
        }
      }
    }
  }
  
  await batch.commit();
  console.log(`✨ ${count} health readings generated successfully!\n`);
}

// Generate dummy attendance for all months
async function generateAttendance(residentData) {
  console.log('📊 Generating dummy attendance...\n');
  
  const attendanceRef = db.collection('attendance');
  const batch = db.batch();
  
  let count = 0;
  
  for (const month of months) {
    for (const rw of Object.keys(rwTargets)) {
      const target = rwTargets[rw];
      const attendance = Math.floor(target * (randomInt(60, 95) / 100));
      
      for (let i = 0; i < attendance; i++) {
        const resident = residentData[randomInt(0, residentData.length - 1)];
        const day = randomInt(1, 28);
        const timestamp = `2026-${months.indexOf(month) + 1}-${day}T${String(randomInt(7, 10)).padStart(2, '0')}:00:00`;
        
        const docRef = attendanceRef.doc();
        batch.set(docRef, {
          nama: resident.nama,
          nik: resident.nik,
          rw: resident.rw,
          rt: resident.rt,
          umur: 2026 - randomInt(1950, 2000),
          alamat: `Jl. Duris Selatan No. ${randomInt(1, 100)}, RT ${resident.rt}, RW ${resident.rw}`,
          timestamp: timestamp,
          date: `2026-${months.indexOf(month) + 1}-${day}`,
          time: `${String(randomInt(7, 10)).padStart(2, '0')}:00`,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        count++;
      }
    }
  }
  
  await batch.commit();
  console.log(`✨ ${count} attendance records generated successfully!\n`);
}

// Generate dummy TB/BB data
async function generateTBBB(residentData) {
  console.log('📏 Generating dummy TB/BB data...\n');
  
  const tbbbRef = db.collection('tbbb');
  const batch = db.batch();
  
  let count = 0;
  
  for (const resident of residentData) {
    const day = randomInt(1, 28);
    const timestamp = `2026-${String(randomInt(1, 12)).padStart(2, '0')}-${day}T${String(randomInt(8, 16)).padStart(2, '0')}:00:00`;
    
    const docRef = tbbbRef.doc();
    batch.set(docRef, {
      nama: resident.nama,
      nik: resident.nik,
      rw: resident.rw,
      rt: resident.rt,
      tb: randomInt(150, 180),
      bb: randomInt(50, 90),
      lp: randomInt(70, 110),
      timestamp: timestamp,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    count++;
  }
  
  await batch.commit();
  console.log(`✨ ${count} TB/BB records generated successfully!\n`);
}

// Main function
async function generateAllDummyData() {
  console.log('🚀 Starting dummy data generation...\n');
  console.log('=====================================\n');
  
  try {
    const residentData = await generateResidents();
    await generateHealthReadings(residentData);
    await generateAttendance(residentData);
    await generateTBBB(residentData);
    
    console.log('=====================================');
    console.log('✨ All dummy data generated successfully!');
    console.log('\n📝 Summary:');
    console.log('   - Residents: 478 (239 Laki-laki, 239 Perempuan)');
    console.log('   - Health Readings: ~640 (4 months × 4 RW × 4 types × ~10 readings)');
    console.log('   - Attendance: ~1,600 (4 months × 4 RW × ~100 attendance)');
    console.log('   - TB/BB: 478 (1 per resident)');
    console.log('\n🎉 You can now test the monitoring page!');
    
  } catch (error) {
    console.error('❌ Error generating dummy data:', error);
  } finally {
    process.exit();
  }
}

generateAllDummyData();
