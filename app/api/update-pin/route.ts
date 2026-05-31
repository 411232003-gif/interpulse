import { NextRequest, NextResponse } from 'next/server'
import admin from 'firebase-admin'

// Helper function to initialize Firebase Admin
function getFirebaseAdmin() {
  if (!admin.apps.length) {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')

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
    const { nik, newPin } = body

    if (!nik || !newPin) {
      return NextResponse.json(
        { success: false, error: 'NIK and new PIN are required' },
        { status: 400 }
      )
    }

    // Validate PIN (6 digits)
    if (!/^\d{6}$/.test(newPin)) {
      return NextResponse.json(
        { success: false, error: 'PIN must be 6 digits' },
        { status: 400 }
      )
    }

    // Find user document by NIK
    const usersSnapshot = await db.collection('users').where('nik', '==', nik).get()
    
    if (usersSnapshot.empty) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    const userDoc = usersSnapshot.docs[0]
    const userData = userDoc.data()
    const uid = userData.uid

    // Update Firebase Authentication password
    try {
      await auth.updateUser(uid, {
        password: newPin
      })
    } catch (error: any) {
      console.error('Error updating auth password:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to update authentication password' },
        { status: 500 }
      )
    }

    // Update users collection
    await db.collection('users').doc(userDoc.id).update({
      password: newPin
    })

    // Update residents collection
    const residentsSnapshot = await db.collection('residents').where('nik', '==', nik).get()
    const updatePromises = residentsSnapshot.docs.map(doc => doc.ref.update({ password: newPin }))
    await Promise.all(updatePromises)

    return NextResponse.json({
      success: true,
      message: 'PIN updated successfully'
    })
  } catch (error: any) {
    console.error('Error updating PIN:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update PIN' },
      { status: 500 }
    )
  }
}
