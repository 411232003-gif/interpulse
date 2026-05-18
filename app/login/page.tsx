'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { Heart, Mail, Lock, Loader2, Eye, EyeOff } from 'lucide-react'
import ReCAPTCHA from 'react-google-recaptcha'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetSent, setResetSent] = useState(false)
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null)
  const recaptchaRef = useRef<ReCAPTCHA>(null)
  const router = useRouter()
  const { login, resetPassword } = useAuth()

  // reCAPTCHA site key - untuk production, ganti dengan key Anda sendiri dari https://www.google.com/recaptcha/admin
  // Key test ini hanya untuk development
  const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || '6LeCjvAsAAAAJimjdrQXBU97Anx8_cM54rBkONg'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validasi reCAPTCHA
    if (!recaptchaToken) {
      setError('Silakan verifikasi reCAPTCHA terlebih dahulu.')
      return
    }

    setLoading(true)

    try {
      await login(email, password)
      // Reset reCAPTCHA setelah login berhasil
      recaptchaRef.current?.reset()
      setRecaptchaToken(null)
      router.push('/')
    } catch (err: any) {
      // Reset reCAPTCHA setelah login gagal
      recaptchaRef.current?.reset()
      setRecaptchaToken(null)
      setError(err.message || 'Login gagal. Periksa email dan password.')
    } finally {
      setLoading(false)
    }
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Forgot Password Modal */}
        {showForgotPassword && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">
                Lupa Password
              </h3>
              
              {resetSent ? (
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Mail className="w-8 h-8 text-green-600" />
                  </div>
                  <p className="text-gray-600 mb-4">
                    Email reset password telah dikirim ke <strong>{resetEmail}</strong>
                  </p>
                  <p className="text-sm text-gray-500 mb-6">
                    Silakan cek inbox Anda dan ikuti instruksi untuk reset password.
                  </p>
                  <button
                    onClick={() => {
                      setShowForgotPassword(false)
                      setResetSent(false)
                      setResetEmail('')
                    }}
                    className="w-full py-3 bg-gradient-to-r from-teal-500 to-cyan-600 text-white font-medium rounded-xl hover:from-teal-600 hover:to-cyan-700 transition-all"
                  >
                    Tutup
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-gray-600 mb-4 text-center">
                    Masukkan email Anda dan kami akan mengirimkan link untuk reset password.
                  </p>
                  
                  {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                      {error}
                    </div>
                  )}
                  
                  <form onSubmit={async (e) => {
                    e.preventDefault()
                    setError('')
                    setLoading(true)
                    try {
                      await resetPassword(resetEmail)
                      setResetSent(true)
                    } catch (err: any) {
                      setError(err.message || 'Gagal mengirim email reset password. Periksa email Anda.')
                    } finally {
                      setLoading(false)
                    }
                  }} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="email"
                          value={resetEmail}
                          onChange={(e) => setResetEmail(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                          placeholder="nama@email.com"
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setShowForgotPassword(false)}
                        className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 py-3 bg-gradient-to-r from-teal-500 to-cyan-600 text-white font-medium rounded-xl hover:from-teal-600 hover:to-cyan-700 transition-all disabled:opacity-50"
                      >
                        {loading ? 'Mengirim...' : 'Kirim Link'}
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>
        )}
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
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="nama@email.com"
                  required
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

            {/* reCAPTCHA Widget */}
            <div className="flex justify-center">
              <ReCAPTCHA
                ref={recaptchaRef}
                sitekey={RECAPTCHA_SITE_KEY}
                onChange={(token) => setRecaptchaToken(token)}
                onExpired={() => setRecaptchaToken(null)}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !recaptchaToken}
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

            <div className="text-right">
              <button
                type="button"
                onClick={() => {
                  setShowForgotPassword(true)
                  setError('')
                  setResetEmail(email)
                }}
                className="text-sm text-teal-600 hover:underline"
              >
                Lupa password?
              </button>
            </div>
          </form>


          <div className="mt-6 text-center">
            <p className="text-gray-500 text-sm">
              Belum punya akun?{' '}
              <Link href="/register" className="text-teal-600 font-medium hover:underline">
                Daftar sekarang
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-400 text-sm mt-8">
          © 2026 InterPulse. All rights reserved.
        </p>
      </div>
    </div>
  )
}
