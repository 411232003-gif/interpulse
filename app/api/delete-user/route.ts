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
    const { nik } = body

    if (!nik) {
      return NextResponse.json(
        { success: false, error: 'NIK is required' },
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

    // Delete from Firebase Authentication
    try {
      await auth.deleteUser(uid)
    } catch (error: any) {
      console.error('Error deleting auth user:', error)
      // Continue even if auth deletion fails
    }

    // Delete from users collection
    await db.collection('users').doc(userDoc.id).delete()

    // Delete from residents collection
    const residentsSnapshot = await db.collection('residents').where('nik', '==', nik).get()
    const deletePromises = residentsSnapshot.docs.map(doc => doc.ref.delete())
    await Promise.all(deletePromises)

    // Cascade delete: Delete from healthReadings collection
    const healthReadingsSnapshot = await db.collection('healthReadings').where('nik', '==', nik).get()
    const healthReadingsDeletePromises = healthReadingsSnapshot.docs.map(doc => doc.ref.delete())
    await Promise.all(healthReadingsDeletePromises)

    // Cascade delete: Delete from attendance collection
    const attendanceSnapshot = await db.collection('attendance').where('nik', '==', nik).get()
    const attendanceDeletePromises = attendanceSnapshot.docs.map(doc => doc.ref.delete())
    await Promise.all(attendanceDeletePromises)

    // Cascade delete: Delete from tb-bb collection
    const tbbbSnapshot = await db.collection('tb-bb').where('nik', '==', nik).get()
    const tbbbDeletePromises = tbbbSnapshot.docs.map(doc => doc.ref.delete())
    await Promise.all(tbbbDeletePromises)

    // Cascade delete: Delete from notification collection
    const notificationSnapshot = await db.collection('notification').where('userId', '==', uid).get()
    const notificationDeletePromises = notificationSnapshot.docs.map(doc => doc.ref.delete())
    await Promise.all(notificationDeletePromises)

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully'
    })
  } catch (error: any) {
    console.error('Error deleting user:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete user' },
      { status: 500 }
    )
  }
}
