'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginQRPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to regular login page for security
    // QR code auto-login has been disabled to prevent unauthorized access
    router.push('/login')
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full mx-auto mb-4 animate-spin"></div>
          <p className="text-gray-600">Mengalihkan ke halaman login...</p>
        </div>
      </div>
    </div>
  )
}
