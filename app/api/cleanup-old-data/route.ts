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

// Helper function to delete documents older than 2 months
async function deleteOldDocuments(collectionName: string, db: admin.firestore.Firestore, cutoffDate: Date) {
  try {
    const snapshot = await db.collection(collectionName).get()
    
    let deletedCount = 0
    const batch = db.batch()
    let batchCount = 0
    const maxBatchSize = 500 // Firestore batch limit

    for (const doc of snapshot.docs) {
      const data = doc.data()
      const timestamp = data.timestamp || data.createdAt

      if (timestamp) {
        const docDate = new Date(timestamp)
        if (docDate < cutoffDate) {
          batch.delete(doc.ref)
          batchCount++
          deletedCount++

          if (batchCount >= maxBatchSize) {
            await batch.commit()
            batchCount = 0
          }
        }
      }
    }

    // Commit remaining documents in batch
    if (batchCount > 0) {
      await batch.commit()
    }

    return deletedCount
  } catch (error) {
    console.error(`Error deleting from ${collectionName}:`, error)
    throw error
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify API key for security (or allow Vercel cron jobs)
    const apiKey = request.headers.get('x-api-key')
    const cronSecret = request.headers.get('x-vercel-cron-secret')
    
    if (apiKey !== process.env.CLEANUP_API_KEY && cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { db } = getFirebaseAdmin()

    // Calculate cutoff date (1 month ago - data from previous month is deleted at start of current month)
    const cutoffDate = new Date()
    cutoffDate.setMonth(cutoffDate.getMonth() - 1)
    cutoffDate.setDate(1) // Set to 1st of the month to ensure clear cutoff

    console.log(`Starting cleanup for data older than ${cutoffDate.toISOString()}`)

    // Collections to clean up
    const collections = ['attendance', 'tb-bb', 'healthReadings']
    const results: Record<string, number> = {}

    for (const collectionName of collections) {
      const deletedCount = await deleteOldDocuments(collectionName, db, cutoffDate)
      results[collectionName] = deletedCount
      console.log(`Deleted ${deletedCount} documents from ${collectionName}`)
    }

    const totalDeleted = Object.values(results).reduce((sum, count) => sum + count, 0)

    return NextResponse.json({
      success: true,
      message: `Cleanup completed successfully`,
      cutoffDate: cutoffDate.toISOString(),
      results,
      totalDeleted
    })

  } catch (error) {
    console.error('Cleanup error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      },
      { status: 500 }
    )
  }
}

// Also support GET for easier testing (with API key)
export async function GET(request: NextRequest) {
  return POST(request)
}
