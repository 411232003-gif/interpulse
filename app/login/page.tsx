'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { Heart, Lock, Loader2, Eye, EyeOff, CreditCard, User } from 'lucide-react'

export default function LoginPage() {
  const [userId, setUserId] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [guestLoading, setGuestLoading] = useState(false)
  const router = useRouter()
  const { loginWithNIK, setGuest } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await loginWithNIK(userId, password)
      router.push('/')
    } catch (err: any) {
      console.error('Login error:', err)
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found') {
        setError('Interpulse ID atau password salah. Silakan periksa kembali.')
      } else if (err.code === 'auth/invalid-email') {
        setError('Format Interpulse ID tidak valid.')
      } else if (err.code === 'auth/too-many-requests') {
        setError('Terlalu banyak percobaan login. Silakan coba lagi nanti.')
      } else {
        setError(err.message || 'Login gagal. Periksa Interpulse ID dan password.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGuestAccess = () => {
    setGuestLoading(true)
    setGuest(true)
    setTimeout(() => {
      router.push('/')
    }, 300)
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 flex items-center justify-center p-4 relative overflow-x-hidden">
      {/* Guest Access Button - Top Right */}
      <button
        onClick={handleGuestAccess}
        disabled={guestLoading}
        className="absolute top-4 right-4 flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full shadow-md hover:bg-white transition-all group disabled:opacity-50"
        title="Masuk sebagai Guest"
      >
        {guestLoading ? (
          <Loader2 className="w-5 h-5 text-teal-600 animate-spin" />
        ) : (
          <User className="w-5 h-5 text-teal-600" />
        )}
        <span className="text-sm font-medium text-gray-700 group-hover:text-teal-600">
          {guestLoading ? 'Memuat...' : 'Guest'}
        </span>
      </button>

      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg">
            <Heart className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">InterPulse</h1>
          <p className="text-gray-500 mt-1">Aplikasi Kesehatan Terpadu</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-6 text-center">
            Masuk ke Akun
          </h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Interpulse ID
              </label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="Masukkan email/NIK Anda"
                  required
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-teal-500 to-cyan-600 text-white font-medium rounded-xl hover:from-teal-600 hover:to-cyan-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Memuat...
                </>
              ) : (
                'Masuk'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-500 text-sm font-medium">
              Semesta Bahagia
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-400 text-sm mt-8">
          © 2026 InterPulse. Satgas Anti Lag.
        </p>
      </div>
    </div>
  )
}
