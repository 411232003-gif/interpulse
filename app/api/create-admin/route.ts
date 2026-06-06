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
    const { email, password, name, nik, phone, adminKelurahan, rt, rw } = body

    if (!email || !password || !name) {
      return NextResponse.json(
        { success: false, error: 'Email, password, and name are required' },
        { status: 400 }
      )
    }

    // Check if admin already exists in Firebase Auth
    try {
      const existingUser = await auth.getUserByEmail(email)
      if (existingUser) {
        return NextResponse.json(
          { success: false, error: 'Admin dengan email ini sudah ada' },
          { status: 400 }
        )
      }
    } catch (error: any) {
      // User not found is expected, continue
      if (error.code !== 'auth/user-not-found') {
        console.error('Error checking existing user:', error)
      }
    }

    // Create user in Firebase Authentication
    const userRecord = await auth.createUser({
      email: email,
      password: password,
      emailVerified: true
    })

    // Create admin document in Firestore
    await db.collection('admins').doc(userRecord.uid).set({
      uid: userRecord.uid,
      email: email,
      name: name,
      nik: nik || '',
      phone: phone || '',
      adminKelurahan: adminKelurahan || '',
      rt: rt || '',
      rw: rw || '',
      role: 'admin',
      createdAt: new Date().toISOString()
    })

    return NextResponse.json({
      success: true,
      admin: {
        uid: userRecord.uid,
        email: email,
        name: name,
        nik: nik
      }
    })
  } catch (error: any) {
    console.error('Error creating admin:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create admin' },
      { status: 500 }
    )
  }
}
