import { NextRequest, NextResponse } from 'next/server'
import admin from 'firebase-admin'
import serviceAccount from '@/../../scripts/firebase-service-account.json'

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as any),
    projectId: 'interpulse-6a17a'
  })
}

const db = admin.firestore()
const auth = admin.auth()

export async function POST(request: NextRequest) {
  try {
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
