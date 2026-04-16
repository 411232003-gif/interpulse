'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { Heart, Mail, Lock, Loader2, Eye, EyeOff, User, Phone, Calendar, Ruler, Weight, Target, Home } from 'lucide-react'

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    phone: '',
    birthDate: '',
    height: '',
    weight: '',
    targetWeight: '',
    rt: '',
    rw: '',
    kelurahan: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { register } = useAuth()

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (formData.password !== formData.confirmPassword) {
      setError('Password tidak cocok')
      return
    }

    if (formData.password.length < 6) {
      setError('Password minimal 6 karakter')
      return
    }

    setLoading(true)

    try {
      console.log('Starting registration...', formData.email)
      await register(formData.email, formData.password, {
        name: formData.name,
        phone: formData.phone,
        birthDate: formData.birthDate,
        height: parseFloat(formData.height) || 0,
        weight: parseFloat(formData.weight) || 0,
        targetWeight: parseFloat(formData.targetWeight) || 0,
        gender: 'Laki-laki', // Default, bisa diedit nanti
        rt: formData.rt,
        rw: formData.rw,
        kelurahan: formData.kelurahan
      })
      console.log('Registration successful!')
      router.push('/')
    } catch (err: any) {
      console.error('Registration error:', err)
      console.error('Error code:', err.code)
      console.error('Error message:', err.message)
      
      // Firebase specific error messages
      let errorMessage = 'Registrasi gagal. Coba lagi.'
      if (err.code === 'auth/email-already-in-use') {
        errorMessage = 'Email sudah terdaftar. Silakan login.'
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = 'Format email tidak valid.'
      } else if (err.code === 'auth/weak-password') {
        errorMessage = 'Password terlalu lemah. Minimal 6 karakter.'
      } else if (err.code === 'auth/network-request-failed') {
        errorMessage = 'Koneksi internet bermasalah. Periksa koneksi Anda.'
      } else if (err.code === 'permission-denied') {
        errorMessage = 'Izin ditolak. Firestore rules belum di-set.'
      } else if (err.message) {
        errorMessage = err.message
      }
      
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 py-8 px-4">
      <div className="w-full max-w-lg mx-auto">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-2xl mx-auto mb-3 flex items-center justify-center shadow-lg">
            <Heart className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-800">Daftar Akun InterPulse</h1>
          <p className="text-gray-500 text-sm">Lengkapi data diri Anda</p>
        </div>

        {/* Register Card */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Account Info */}
            <div className="border-b pb-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Informasi Akun</h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                      placeholder="nama@email.com"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={(e) => handleChange('password', e.target.value)}
                        className="w-full pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                        placeholder="••••••"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Konfirmasi</label>
                    <input
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => handleChange('confirmPassword', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                      placeholder="••••••"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Personal Info */}
            <div className="border-b pb-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Data Pribadi</h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Nama Lengkap</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                      placeholder="Nama lengkap"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">No. HP</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => handleChange('phone', e.target.value)}
                        className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                        placeholder="0812xxxx"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Tanggal Lahir</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="date"
                        value={formData.birthDate}
                        onChange={(e) => handleChange('birthDate', e.target.value)}
                        className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                        required
                        aria-label="Pilih tanggal lahir"
                        title="Pilih tanggal lahir"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Tinggi (cm)</label>
                    <div className="relative">
                      <Ruler className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="number"
                        value={formData.height}
                        onChange={(e) => handleChange('height', e.target.value)}
                        className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                        placeholder="170"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Berat (kg)</label>
                    <div className="relative">
                      <Weight className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="number"
                        value={formData.weight}
                        onChange={(e) => handleChange('weight', e.target.value)}
                        className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                        placeholder="65"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Target (kg)</label>
                    <div className="relative">
                      <Target className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="number"
                        value={formData.targetWeight}
                        onChange={(e) => handleChange('targetWeight', e.target.value)}
                        className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                        placeholder="60"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Location Info */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Home className="w-4 h-4" />
                Informasi Wilayah
              </h3>
              
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">RT</label>
                  <input
                    type="text"
                    value={formData.rt}
                    onChange={(e) => handleChange('rt', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="001"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">RW</label>
                  <input
                    type="text"
                    value={formData.rw}
                    onChange={(e) => handleChange('rw', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="01"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Kelurahan</label>
                  <input
                    type="text"
                    value={formData.kelurahan}
                    onChange={(e) => handleChange('kelurahan', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="Nama kelurahan"
                    required
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-teal-500 to-cyan-600 text-white font-medium rounded-xl hover:from-teal-600 hover:to-cyan-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-6"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Mendaftar...
                </>
              ) : (
                'Daftar Sekarang'
              )}
            </button>
          </form>

          <div className="mt-4 text-center">
            <p className="text-gray-500 text-sm">
              Sudah punya akun?{' '}
              <Link href="/login" className="text-teal-600 font-medium hover:underline">
                Masuk
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
