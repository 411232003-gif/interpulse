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
    const body = await request.json()
    const { year, month, totalHadir, totalTarget, capaian } = body

    if (!year || !month) {
      return NextResponse.json(
        { success: false, error: 'Year and month are required' },
        { status: 400 }
      )
    }

    // Create document ID: YYYY-MM
    const docId = `${year}-${String(month).padStart(2, '0')}`
    
    const summaryData = {
      year,
      month,
      totalHadir: totalHadir || 0,
      totalTarget: totalTarget || 0,
      capaian: capaian || 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    // Check if document exists
    const docRef = db.collection('monthlySummary').doc(docId)
    const docSnapshot = await docRef.get()

    if (docSnapshot.exists) {
      // Update existing document
      await docRef.update({
        ...summaryData,
        updatedAt: new Date().toISOString()
      })
    } else {
      // Create new document
      await docRef.set(summaryData)
    }

    return NextResponse.json({
      success: true,
      message: 'Monthly summary saved successfully',
      data: summaryData
    })

  } catch (error) {
    console.error('Error saving monthly summary:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      },
      { status: 500 }
    )
  }
}

// GET endpoint to retrieve monthly summaries
export async function GET(request: NextRequest) {
  try {
    const { db } = getFirebaseAdmin()
    const { searchParams } = new URL(request.url)
    const year = searchParams.get('year')

    let query = db.collection('monthlySummary').orderBy('year').orderBy('month')
    
    if (year) {
      query = query.where('year', '==', parseInt(year))
    }

    const snapshot = await query.get()
    const summaries = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))

    return NextResponse.json({
      success: true,
      data: summaries
    })

  } catch (error) {
    console.error('Error fetching monthly summaries:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      },
      { status: 500 }
    )
  }
}
