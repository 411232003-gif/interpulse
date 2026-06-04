import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { db } from './firebase'
import { collection, query, where, getDocs } from 'firebase/firestore'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Get admin's kelurahan setting (centralized kelurahan for entire app)
 * This should be used across the app to get the system-wide kelurahan value
 */
export async function getAdminKelurahan(): Promise<string> {
  try {
    const adminsRef = collection(db, 'admins')
    const q = query(adminsRef, where('role', '==', 'admin'))
    const snapshot = await getDocs(q)
    
    if (!snapshot.empty) {
      const adminData = snapshot.docs[0].data()
      return adminData.adminKelurahan || ''
    }
    
    return ''
  } catch (error) {
    console.error('Error fetching admin kelurahan:', error)
    return ''
  }
}
