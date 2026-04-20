'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

function LoginQRContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('Memproses login...')

  const userId = searchParams.get('userId')
  const email = searchParams.get('email')

  useEffect(() => {
    const processLogin = async () => {
      if (!userId || !email) {
        setStatus('error')
        setMessage('QR code tidak valid atau sudah kadaluarsa')
        return
      }

      try {
        // Verifikasi user exists di Firestore
        const userDoc = await getDoc(doc(db, 'users', userId))
        
        if (!userDoc.exists()) {
          setStatus('error')
          setMessage('Akun tidak ditemukan')
          return
        }

        const userData = userDoc.data()
        
        // Verifikasi email cocok
        if (userData.email !== decodeURIComponent(email)) {
          setStatus('error')
          setMessage('Data akun tidak cocok')
          return
        }

        // Simpan data login ke localStorage
        const loginData = {
          uid: userId,
          email: userData.email,
          name: userData.name || '',
          role: userData.role || 'user',
          loginTime: new Date().toISOString(),
          loginMethod: 'qr-code'
        }
        
        localStorage.setItem('interpulse_user', JSON.stringify(loginData))
        
        setStatus('success')
        setMessage(`Selamat datang, ${userData.name || 'Pengguna'}!`)
        
        // Redirect ke beranda setelah 2 detik
        setTimeout(() => {
          router.push('/')
        }, 2000)
        
      } catch (error) {
        console.error('Login QR error:', error)
        setStatus('error')
        setMessage('Terjadi kesalahan saat login')
      }
    }

    processLogin()
  }, [userId, email, router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
        {status === 'loading' && (
          <>
            <div className="w-20 h-20 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Loader2 className="w-10 h-10 text-teal-600 animate-spin" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Sedang Login...</h1>
            <p className="text-gray-600">{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Login Berhasil!</h1>
            <p className="text-gray-600 mb-4">{message}</p>
            <p className="text-sm text-gray-500">Mengalihkan ke halaman beranda...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-10 h-10 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Login Gagal</h1>
            <p className="text-gray-600 mb-6">{message}</p>
            <button
              onClick={() => router.push('/login')}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
            >
              Login Manual
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default function LoginQRPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Loader2 className="w-10 h-10 text-teal-600 animate-spin" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Memuat...</h1>
        </div>
      </div>
    }>
      <LoginQRContent />
    </Suspense>
  )
}
