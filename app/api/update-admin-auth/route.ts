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
    const { uid, email, password } = body

    if (!uid) {
      return NextResponse.json(
        { success: false, error: 'UID is required' },
        { status: 400 }
      )
    }

    // Get current user from Firebase Auth
    const userRecord = await auth.getUser(uid)

    // Update email if changed
    if (email && email !== userRecord.email) {
      await auth.updateUser(uid, { email: email })
    }

    // Update password if provided
    if (password) {
      await auth.updateUser(uid, { password: password })
    }

    // Update email in Firestore admins collection
    if (email && email !== userRecord.email) {
      const adminDoc = await db.collection('admins').doc(uid).get()
      if (adminDoc.exists) {
        await db.collection('admins').doc(uid).update({ email: email })
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Firebase Auth updated successfully'
    })
  } catch (error: any) {
    console.error('Error updating admin auth:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update Firebase Auth' },
      { status: 500 }
    )
  }
}
