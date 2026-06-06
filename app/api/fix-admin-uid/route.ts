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
    const { email } = body

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      )
    }

    // Get Firebase Auth user by email
    const userRecord = await auth.getUserByEmail(email)
    
    if (!userRecord) {
      return NextResponse.json(
        { success: false, error: 'User not found in Firebase Auth' },
        { status: 404 }
      )
    }

    // Get admin from Firestore by email
    const adminsSnapshot = await db.collection('admins').where('email', '==', email).get()
    
    if (adminsSnapshot.empty) {
      return NextResponse.json(
        { success: false, error: 'Admin not found in Firestore' },
        { status: 404 }
      )
    }

    const adminDoc = adminsSnapshot.docs[0]
    const adminData = adminDoc.data()

    // Update uid in Firestore to match Firebase Auth
    await db.collection('admins').doc(adminDoc.id).update({
      uid: userRecord.uid
    })

    return NextResponse.json({
      success: true,
      message: 'Admin uid updated successfully',
      oldUid: adminData.uid,
      newUid: userRecord.uid,
      email: email
    })
  } catch (error: any) {
    console.error('Error fixing admin uid:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fix admin uid' },
      { status: 500 }
    )
  }
}
