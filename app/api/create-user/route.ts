import { NextRequest, NextResponse } from 'next/server'
import admin from 'firebase-admin'

// Helper function to initialize Firebase Admin
function getFirebaseAdmin() {
  if (!admin.apps.length) {
    const rawKey = process.env.FIREBASE_PRIVATE_KEY || ''
    const privateKey = rawKey
      .replace(/^["']|["']$/g, '')
      .replace(/\\n/g, '\n')

    if (!privateKey || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PROJECT_ID) {
      throw new Error('Missing Firebase environment variables')
    }

    const serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: privateKey,
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as any),
    })
  }

  return {
    db: admin.firestore(),
    auth: admin.auth()
  }
}

export async function POST(request: NextRequest) {
  try {
    const { db, auth } = getFirebaseAdmin()

    const body = await request.json()
    const { nama, nik, rw, rt, birthDate, jenisKelamin, alamat, adminId, phone, email } = body

    // Get kelurahan from admin profile if not provided
    let kelurahan = ''
    if (adminId) {
      try {
        const adminDoc = await db.collection('admins').doc(adminId).get()
        if (adminDoc.exists) {
          kelurahan = adminDoc.data()?.adminKelurahan || ''
        }
      } catch (err) {
        console.error('Error fetching admin kelurahan:', err)
      }
    }

    // Check if NIK already exists in users collection
    const existingUserSnapshot = await db.collection('users').where('nik', '==', nik).get()
    if (!existingUserSnapshot.empty) {
      return NextResponse.json(
        { success: false, error: 'NIK sudah terdaftar di sistem' },
        { status: 400 }
      )
    }

    // Check if NIK already exists in residents collection
    const existingResidentSnapshot = await db.collection('residents').where('nik', '==', nik).get()
    if (!existingResidentSnapshot.empty) {
      return NextResponse.json(
        { success: false, error: 'NIK sudah terdaftar di sistem' },
        { status: 400 }
      )
    }

    // Generate unique 6-digit PIN
    let password = ''
    let isUnique = false
    let attempts = 0
    const maxAttempts = 100

    while (!isUnique && attempts < maxAttempts) {
      password = Math.floor(100000 + Math.random() * 900000).toString()

      // Check if PIN already exists in users collection
      const usersSnapshot = await db.collection('users').where('password', '==', password).get()

      if (usersSnapshot.empty) {
        isUnique = true
      }

      attempts++
    }

    if (!isUnique) {
      throw new Error('Gagal generate PIN unik setelah beberapa percobaan')
    }

    // Create user in Firebase Authentication
    const userEmail = email || `${nik}@interpulse.id`
    const userRecord = await auth.createUser({
      email: userEmail,
      password: password,
      emailVerified: true
    })

    // Create user document in Firestore
    await db.collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      name: nama,
      nik: nik,
      email: userEmail,
      rw: rw,
      rt: rt,
      birthDate: birthDate,
      gender: jenisKelamin,
      kelurahan: kelurahan,
      alamat: alamat || '',
      role: 'user',
      password: password,
      phone: phone || '',
      createdAt: new Date().toISOString()
    })

    // Create resident document
    const age = new Date().getFullYear() - new Date(birthDate).getFullYear()
    await db.collection('residents').add({
      nama: nama,
      nik: nik,
      rw: rw,
      rt: rt,
      birthDate: birthDate,
      umur: age,
      jenisKelamin: jenisKelamin,
      alamat: alamat || kelurahan,
      password: password
    })

    return NextResponse.json({
      success: true,
      user: {
        uid: userRecord.uid,
        name: nama,
        nik: nik,
        password: password
      }
    })
  } catch (error: any) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create user' },
      { status: 500 }
    )
  }
}
