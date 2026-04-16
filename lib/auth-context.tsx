'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  User as FirebaseUser,
  getIdToken
} from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
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
  role: 'user' | 'admin'
  createdAt: string
}

interface AuthContextType {
  user: FirebaseUser | null
  userProfile: UserProfile | null
  loading: boolean
  isAdmin: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, profile: Omit<UserProfile, 'uid' | 'email' | 'role' | 'createdAt'>) => Promise<void>
  logout: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
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
  }, [])

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password)
  }

  const register = async (
    email: string, 
    password: string, 
    profile: Omit<UserProfile, 'uid' | 'email' | 'role' | 'createdAt'>
  ) => {
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
    await signOut(auth)
    setUserProfile(null)
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
      register, 
      logout,
      refreshProfile
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
