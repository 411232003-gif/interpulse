'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  User as FirebaseUser,
  getIdToken,
  sendPasswordResetEmail
} from 'firebase/auth'
import { GoogleAuthProvider } from 'firebase/auth'
import { doc, getDoc, setDoc, query, collection, where, getDocs } from 'firebase/firestore'
import { auth, db } from './firebase'

// Helper functions for cookie management
const setAuthCookie = (token: string) => {
  document.cookie = `firebaseIdToken=${token}; path=/; max-age=604800; SameSite=Strict` // 7 days
}

const clearAuthCookie = () => {
  document.cookie = 'firebaseIdToken=; path=/; max-age=0; SameSite=Strict'
}

export interface UserProfile {
  uid: string
  email: string
  nik: string
  name: string
  phone: string
  birthDate: string
  height: number
  weight: number
  targetWeight: number
  gender: string
  rt: string
  rw: string
  kelurahan: string
  adminKelurahan?: string
  role: 'user' | 'admin'
  createdAt: string
}

interface AuthContextType {
  user: FirebaseUser | null
  userProfile: UserProfile | null
  loading: boolean
  isAdmin: boolean
  login: (email: string, password: string) => Promise<void>
  loginWithGoogle: () => Promise<void>
  register: (email: string, password: string, profile: Omit<UserProfile, 'uid' | 'email' | 'role' | 'createdAt'>) => Promise<void>
  logout: () => Promise<void>
  refreshProfile: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for QR code login first
    const checkQRLogin = async () => {
      const qrLoginData = localStorage.getItem('interpulse_user')
      
      if (qrLoginData) {
        try {
          const loginData = JSON.parse(qrLoginData)
          
          // Verify login is recent (within 24 hours)
          const loginTime = new Date(loginData.loginTime)
          const now = new Date()
          const hoursDiff = (now.getTime() - loginTime.getTime()) / (1000 * 60 * 60)
          
          if (hoursDiff < 24) {
            // Fetch user profile from Firestore
            const profileDoc = await getDoc(doc(db, 'users', loginData.uid))
            if (profileDoc.exists()) {
              const profileData = profileDoc.data() as UserProfile
              setUserProfile(profileData)
              // Create a mock Firebase user object
              setUser({
                uid: loginData.uid,
                email: loginData.email,
                displayName: loginData.name,
              } as FirebaseUser)
              setLoading(false)
              return
            }
          } else {
            // Clear expired login data
            localStorage.removeItem('interpulse_user')
          }
        } catch (err) {
          console.error('Error parsing QR login data:', err)
          localStorage.removeItem('interpulse_user')
        }
      }
      
      // Fall back to Firebase Auth
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        setUser(firebaseUser)
        
        if (firebaseUser) {
          // Get and set auth token cookie
          try {
            const token = await getIdToken(firebaseUser)
            setAuthCookie(token)
          } catch (err) {
            console.error('Error getting token:', err)
          }
          
          // Fetch user profile from Firestore
          const profileDoc = await getDoc(doc(db, 'users', firebaseUser.uid))
          if (profileDoc.exists()) {
            setUserProfile(profileDoc.data() as UserProfile)
          }
        } else {
          setUserProfile(null)
          clearAuthCookie()
        }
        
        setLoading(false)
      })

      return () => unsubscribe()
    }
    
    checkQRLogin()
  }, [])

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password)
  }

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email)
  }

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider()
    const result = await signInWithPopup(auth, provider)
    
    // Check if user profile exists in Firestore
    const profileDoc = await getDoc(doc(db, 'users', result.user.uid))
    if (!profileDoc.exists()) {
      // Don't auto-create profile - user must complete registration first
      // The app will check for incomplete profile and redirect to completion page
      const userProfileData: UserProfile = {
        uid: result.user.uid,
        email: result.user.email!,
        nik: '', // Must be filled by user
        name: result.user.displayName || 'User',
        phone: '',
        birthDate: '',
        height: 0,
        weight: 0,
        targetWeight: 0,
        gender: 'Laki-laki',
        rt: '',
        rw: '',
        kelurahan: '',
        role: 'user',
        createdAt: new Date().toISOString()
      }
      await setDoc(doc(db, 'users', result.user.uid), userProfileData)
    }
  }

  const register = async (
    email: string, 
    password: string, 
    profile: Omit<UserProfile, 'uid' | 'email' | 'role' | 'createdAt'>
  ) => {
    // Check if NIK already exists
    if (profile.nik) {
      const nikQuery = query(
        collection(db, 'users'),
        where('nik', '==', profile.nik)
      )
      const nikSnapshot = await getDocs(nikQuery)
      if (!nikSnapshot.empty) {
        throw new Error('NIK sudah terdaftar. Gunakan NIK yang berbeda.')
      }
    }

    console.log('Auth: Creating user with email...', email)
    const { user: newUser } = await createUserWithEmailAndPassword(auth, email, password)
    console.log('Auth: User created successfully, uid:', newUser.uid)
    
    // Create user profile in Firestore
    const userProfileData: UserProfile = {
      uid: newUser.uid,
      email: newUser.email!,
      role: 'user', // Default role
      createdAt: new Date().toISOString(),
      ...profile
    }
    
    console.log('Auth: Saving profile to Firestore...', userProfileData)
    try {
      await setDoc(doc(db, 'users', newUser.uid), userProfileData)
      console.log('Auth: Profile saved successfully')
    } catch (firestoreErr: any) {
      console.error('Auth: Firestore error:', firestoreErr)
      // If Firestore fails, we should still throw but with better context
      throw new Error(`Gagal menyimpan profile: ${firestoreErr.message}`)
    }
    
    setUserProfile(userProfileData)
  }

  const logout = async () => {
    clearAuthCookie()
    // Clear QR login data
    localStorage.removeItem('interpulse_user')
    await signOut(auth)
    setUserProfile(null)
    setUser(null)
  }

  const refreshProfile = async () => {
    if (user) {
      const profileDoc = await getDoc(doc(db, 'users', user.uid))
      if (profileDoc.exists()) {
        setUserProfile(profileDoc.data() as UserProfile)
      }
    }
  }

  const isAdmin = userProfile?.role === 'admin'

  return (
    <AuthContext.Provider value={{ 
      user, 
      userProfile, 
      loading, 
      isAdmin,
      login, 
      loginWithGoogle,
      register, 
      logout,
      refreshProfile,
      resetPassword
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
