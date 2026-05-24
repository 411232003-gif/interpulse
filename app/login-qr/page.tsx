'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Heart, Loader2, AlertCircle } from 'lucide-react'

export default function LoginQRPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const userId = searchParams.get('userId')
    const email = searchParams.get('email')

    if (!userId || !email) {
      setError('Invalid QR code data')
      setLoading(false)
      return
    }

    // Store login data in localStorage for auth context to pick up
    const loginData = {
      uid: userId,
      email: email,
      name: email.split('@')[0], // Extract name from email
      loginTime: new Date().toISOString()
    }

    localStorage.setItem('interpulse_user', JSON.stringify(loginData))

    // Redirect to home page after a short delay
    setTimeout(() => {
      router.push('/')
    }, 500)
  }, [searchParams, router])

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Error</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => router.push('/login')}
              className="px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
            >
              Kembali ke Login
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg">
            <Heart className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">InterPulse</h1>
          <p className="text-gray-500 mb-6">Login otomatis via QR Code</p>
          
          <div className="flex flex-col items-center">
            <Loader2 className="w-12 h-12 text-teal-600 animate-spin mb-4" />
            <p className="text-gray-600">Sedang memproses login...</p>
          </div>
        </div>
      </div>
    </div>
  )
}
