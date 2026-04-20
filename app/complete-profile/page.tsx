'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Heart, Badge, Calendar, Home, Loader2, CheckCircle, X } from 'lucide-react'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export default function CompleteProfilePage() {
  const [formData, setFormData] = useState({
    nik: '',
    birthDate: '',
    rt: '',
    rw: '',
    kelurahan: ''
  })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()
  const { userProfile, refreshProfile, loading: authLoading, logout } = useAuth()

  useEffect(() => {
    // Don't redirect while loading
    if (authLoading) return

    // Only redirect if profile is already complete (has NIK)
    if (userProfile && userProfile.nik) {
      router.push('/')
      return
    }
  }, [userProfile, authLoading, router])

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleCancel = async () => {
    await logout()
    router.push('/login')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (formData.nik.length !== 16) {
      setError('NIK harus 16 digit')
      return
    }

    setSubmitting(true)

    try {
      // Check if NIK already exists
      const { collection, query, where, getDocs } = await import('firebase/firestore')
      const nikQuery = query(
        collection(db, 'users'),
        where('nik', '==', formData.nik)
      )
      const nikSnapshot = await getDocs(nikQuery)
      if (!nikSnapshot.empty) {
        const existingUser = nikSnapshot.docs[0].data()
        if (existingUser.uid !== userProfile?.uid) {
          setError('NIK sudah terdaftar. Gunakan NIK yang berbeda.')
          setSubmitting(false)
          return
        }
      }

      // Update user profile with completion data
      if (userProfile) {
        await updateDoc(doc(db, 'users', userProfile.uid), {
          nik: formData.nik,
          birthDate: formData.birthDate,
          rt: formData.rt,
          rw: formData.rw,
          kelurahan: formData.kelurahan
        })
        
        // Refresh profile to get updated data
        await refreshProfile()
        
        router.push('/')
      }
    } catch (err: any) {
      console.error('Error completing profile:', err)
      setError('Gagal menyimpan data. Silakan coba lagi.')
    } finally {
      setSubmitting(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 flex items-center justify-center p-4">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 py-8 px-4">
      <div className="w-full max-w-lg mx-auto">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-2xl mx-auto mb-3 flex items-center justify-center shadow-lg">
            <Heart className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-800">Lengkapi Profil</h1>
          <p className="text-gray-500 text-sm">Selesaikan pendaftaran akun Anda</p>
        </div>

        {/* Info Card */}
        <div className="bg-blue-50 rounded-2xl p-4 border border-blue-200 mb-6">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-blue-800 mb-1">Akun Google Anda telah terhubung</h4>
              <p className="text-sm text-blue-700">
                Email: {userProfile?.email}<br />
                Nama: {userProfile?.name}
              </p>
            </div>
          </div>
        </div>

        {/* Complete Profile Card */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Personal Info */}
            <div className="border-b pb-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Data Pribadi</h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">NIK (16 digit)</label>
                  <div className="relative">
                    <Badge className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={formData.nik}
                      onChange={(e) => handleChange('nik', e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                      placeholder="Masukkan 16 digit NIK"
                      required
                      maxLength={16}
                      pattern="[0-9]{16}"
                      title="NIK harus 16 digit angka"
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
              disabled={submitting}
              className="w-full py-3 bg-gradient-to-r from-teal-500 to-cyan-600 text-white font-medium rounded-xl hover:from-teal-600 hover:to-cyan-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-6"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                'Selesaikan Pendaftaran'
              )}
            </button>

            <button
              type="button"
              onClick={handleCancel}
              className="w-full py-3 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 mt-3"
            >
              <X className="w-5 h-5" />
              Batal dan Keluar
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
