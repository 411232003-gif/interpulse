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
    const { db } = getFirebaseAdmin()

    // Get all admins from Firestore
    const adminsSnapshot = await db.collection('admins').get()
    
    if (adminsSnapshot.empty) {
      return NextResponse.json(
        { success: false, error: 'Tidak ada admin di collection admins' },
        { status: 404 }
      )
    }

    const results = []
    let updatedCount = 0
    let skippedCount = 0

    for (const adminDoc of adminsSnapshot.docs) {
      const adminData = adminDoc.data()
      
      if (!adminData.role) {
        await db.collection('admins').doc(adminDoc.id).update({
          role: 'admin'
        })
        results.push({
          email: adminData.email,
          name: adminData.name || 'Unknown',
          status: 'updated',
          addedRole: 'admin'
        })
        updatedCount++
      } else {
        results.push({
          email: adminData.email,
          name: adminData.name || 'Unknown',
          status: 'skipped',
          reason: 'Role already exists'
        })
        skippedCount++
      }
    }

    return NextResponse.json({
      success: true,
      message: `Update role selesai: ${updatedCount} diperbarui, ${skippedCount} dilewati`,
      results: results,
      summary: {
        total: adminsSnapshot.size,
        updated: updatedCount,
        skipped: skippedCount
      }
    })
  } catch (error: any) {
    console.error('Error fixing admin role:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fix admin role' },
      { status: 500 }
    )
  }
}
