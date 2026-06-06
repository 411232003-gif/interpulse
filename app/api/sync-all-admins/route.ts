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
    const { defaultPassword } = body

    if (!defaultPassword) {
      return NextResponse.json(
        { success: false, error: 'Default password is required' },
        { status: 400 }
      )
    }

    // Get all admins from Firestore
    const adminsSnapshot = await db.collection('admins').get()
    
    if (adminsSnapshot.empty) {
      return NextResponse.json(
        { success: false, error: 'Tidak ada admin di collection admins' },
        { status: 404 }
      )
    }

    const results = []
    let successCount = 0
    let failCount = 0

    for (const adminDoc of adminsSnapshot.docs) {
      const adminData = adminDoc.data()
      const email = adminData.email

      if (!email) {
        results.push({
          email: 'N/A',
          name: adminData.name || 'Unknown',
          status: 'skipped',
          reason: 'No email field'
        })
        failCount++
        continue
      }

      try {
        // Check if user already exists in Firebase Auth
        try {
          const existingUser = await auth.getUserByEmail(email)
          if (existingUser) {
            results.push({
              email: email,
              name: adminData.name || 'Unknown',
              status: 'skipped',
              reason: 'Already exists in Firebase Auth'
            })
            continue
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
          password: defaultPassword,
          emailVerified: true
        })

        // Update admin document with uid and role if not set
        if (!adminData.uid) {
          await db.collection('admins').doc(adminDoc.id).update({
            uid: userRecord.uid
          })
        }
        
        // Ensure role field exists
        if (!adminData.role) {
          await db.collection('admins').doc(adminDoc.id).update({
            role: 'admin'
          })
        }

        results.push({
          email: email,
          name: adminData.name || 'Unknown',
          status: 'success',
          uid: userRecord.uid
        })
        successCount++
      } catch (error: any) {
        console.error('Error syncing admin:', email, error)
        results.push({
          email: email,
          name: adminData.name || 'Unknown',
          status: 'failed',
          reason: error.message
        })
        failCount++
      }
    }

    return NextResponse.json({
      success: true,
      message: `Sinkronisasi selesai: ${successCount} berhasil, ${failCount} gagal`,
      results: results,
      summary: {
        total: adminsSnapshot.size,
        success: successCount,
        failed: failCount
      }
    })
  } catch (error: any) {
    console.error('Error syncing all admins:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to sync admins' },
      { status: 500 }
    )
  }
}
