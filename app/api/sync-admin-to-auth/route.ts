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
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Check if admin exists in Firestore
    const adminsSnapshot = await db.collection('admins').where('email', '==', email).get()
    
    if (adminsSnapshot.empty) {
      return NextResponse.json(
        { success: false, error: 'Admin tidak ditemukan di collection admins' },
        { status: 404 }
      )
    }

    const adminDoc = adminsSnapshot.docs[0]
    const adminData = adminDoc.data()

    // Check if user already exists in Firebase Auth
    try {
      const existingUser = await auth.getUserByEmail(email)
      if (existingUser) {
        // Update password if needed
        await auth.updateUser(existingUser.uid, {
          password: password
        })
        return NextResponse.json({
          success: true,
          message: 'Password admin berhasil diperbarui',
          admin: {
            uid: existingUser.uid,
            email: email,
            name: adminData.name
          }
        })
      }
    } catch (error: any) {
      // User not found is expected, continue to create
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

    // Update admin document with uid if not set
    if (!adminData.uid) {
      await db.collection('admins').doc(adminDoc.id).update({
        uid: userRecord.uid
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Admin berhasil disinkronkan ke Firebase Authentication',
      admin: {
        uid: userRecord.uid,
        email: email,
        name: adminData.name
      }
    })
  } catch (error: any) {
    console.error('Error syncing admin to auth:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to sync admin' },
      { status: 500 }
    )
  }
}
