'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { collection, onSnapshot, query, where, addDoc, updateDoc, doc, getDocs, deleteDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import BackButton from '@/components/BackButton'
import { Users, Search, Filter, CheckCircle, Calendar, X, AlertCircle, Plus, Info, MoreVertical } from 'lucide-react'

interface Resident {
  id: string
  nama: string
  nik: string
  rw: string
  rt: string
  birthDate: string
  umur: number
  jenisKelamin: 'L' | 'P'
  alamat: string
  password?: string
}

export default function AbsensiPage() {
  const router = useRouter()
  const { isAdmin, userProfile, loading: authLoading } = useAuth()

  const [residents, setResidents] = useState<Resident[]>([])
  const [filterRW, setFilterRW] = useState('')
  const [filterRT, setFilterRT] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [attendanceThisMonth, setAttendanceThisMonth] = useState<Set<string>>(new Set())
  const [attendanceTimestamp, setAttendanceTimestamp] = useState<Map<string, number>>(new Map())
  const [loading, setLoading] = useState(true)
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [showCancelFor, setShowCancelFor] = useState<string | null>(null)

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 4000)
  }
  const [residentForm, setResidentForm] = useState({
    nama: '',
    nik: '',
    rw: '',
    rt: '',
    birthDate: '',
    jenisKelamin: 'L' as 'L' | 'P',
    alamat: '',
    email: '',
    phone: ''
  })
  const [generatedPassword, setGeneratedPassword] = useState('')

  // Calculate age from birthDate
  const calculateAge = (birthDate: string): number => {
    if (!birthDate) return 0
    const birth = new Date(birthDate)
    const today = new Date()
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return age
  }

  // Load residents from database
  useEffect(() => {
    const residentsRef = collection(db, 'residents')
    const usersRef = collection(db, 'users')

    const unsubscribeResidents = onSnapshot(residentsRef, (residentsSnapshot) => {
      const residentsData = residentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Resident[]

      // Fetch users and merge with residents
      const unsubscribeUsers = onSnapshot(usersRef, (usersSnapshot) => {
        const usersData = usersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as any[]

        // Merge residents and users, avoiding duplicates by NIK
        // Filter out admin users (role: 'admin')
        const mergedData = [...residentsData]
        usersData.forEach(user => {
          // Skip admin users
          if (user.role === 'admin') return

          if (user.nik && !mergedData.find(r => r.nik === user.nik)) {
            const age = user.birthDate ? calculateAge(user.birthDate) : 0
            mergedData.push({
              id: user.uid,
              nama: user.name,
              nik: user.nik,
              rw: user.rw,
              rt: user.rt,
              birthDate: user.birthDate,
              umur: age,
              jenisKelamin: user.gender,
              alamat: user.kelurahan,
              password: user.password,
            } as Resident)
          }
        })

        setResidents(mergedData)
        setLoading(false)
      }, (error) => {
        console.error('Error fetching users:', error)
        setResidents(residentsData)
        setLoading(false)
      })

      return () => unsubscribeUsers()
    }, (error) => {
      console.error('Error fetching residents:', error)
      setResidents([])
      setLoading(false)
    })

    return () => unsubscribeResidents()
  }, [])

  // Load this month's attendance (once per month per NIK)
  useEffect(() => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    const attendanceRef = collection(db, 'attendance')
    const unsubscribe = onSnapshot(attendanceRef, (snapshot) => {
      const monthAttendance = new Set<string>()
      const timestampMap = new Map<string, number>()
      snapshot.docs.forEach(doc => {
        const data = doc.data()
        if (data.timestamp) {
          const d = new Date(data.timestamp)
          if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
            monthAttendance.add(data.nik)
            timestampMap.set(data.nik, d.getTime())
          }
        }
      })
      setAttendanceThisMonth(monthAttendance)
      setAttendanceTimestamp(timestampMap)
    })

    return () => unsubscribe()
  }, [])

  // Show loading while auth state is being determined
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat...</p>
        </div>
      </div>
    )
  }

  // Redirect non-admin users
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4 overflow-x-hidden">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Akses Ditolak</h2>
          <p className="text-gray-600 mb-6">Halaman ini hanya dapat diakses oleh admin.</p>
          <button onClick={() => router.push('/')} className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium">
            Kembali ke Beranda
          </button>
        </div>
      </div>
    )
  }

  // Filter residents
  const filteredResidents = residents.filter(r => {
    const rwMatch = !filterRW || r.rw === filterRW
    const rtMatch = !filterRT || r.rt === filterRT
    const searchMatch = !searchQuery || 
      r.nama.toLowerCase().includes(searchQuery.toLowerCase()) || 
      r.nik.includes(searchQuery)
    return rwMatch && rtMatch && searchMatch
  }).sort((a, b) => {
    const aPresent = attendanceThisMonth.has(a.nik)
    const bPresent = attendanceThisMonth.has(b.nik)
    if (aPresent && !bPresent) return 1
    if (!aPresent && bPresent) return -1
    if (aPresent && bPresent) return (attendanceTimestamp.get(b.nik) || 0) - (attendanceTimestamp.get(a.nik) || 0)
    return 0
  })

  // Handle attendance
  const handleAttendance = async (resident: Resident) => {
    // Guard: prevent re-click if already present this month
    if (attendanceThisMonth.has(resident.nik)) {
      showNotification('info', `${resident.nama} sudah diabsen di bulan ini`)
      return
    }

    try {
      const today = new Date()
      const todayStr = today.toISOString().split('T')[0]
      const currentMonth = today.toLocaleString('id-ID', { month: 'long' }).toLowerCase()
      const currentYear = today.getFullYear()

      // Check if attendance record exists for this NIK in current month
      const existingAttendanceQuery = query(
        collection(db, 'attendance'),
        where('nik', '==', resident.nik)
      )
      const existingSnapshot = await getDocs(existingAttendanceQuery)

      let existingDocId = null
      existingSnapshot.docs.forEach(doc => {
        const d = doc.data()
        const docMonth = new Date(d.timestamp).toLocaleString('id-ID', { month: 'long' }).toLowerCase()
        const docYear = new Date(d.timestamp).getFullYear()
        if (docMonth === currentMonth && docYear === currentYear) {
          existingDocId = doc.id
        }
      })

      const attendanceData = {
        nama: resident.nama,
        nik: resident.nik,
        umur: resident.umur,
        rt: resident.rt,
        rw: resident.rw,
        alamat: resident.alamat,
        timestamp: new Date().toISOString(),
        date: new Date().toLocaleDateString('id-ID'),
        time: new Date().toLocaleTimeString('id-ID'),
      }

      if (existingDocId) {
        // Update existing record
        await updateDoc(doc(db, 'attendance', existingDocId), attendanceData)
      } else {
        // Create new record
        await addDoc(collection(db, 'attendance'), attendanceData)

        // Add notification to user
        try {
          // Get user UID from users collection
          const usersQuery = query(
            collection(db, 'users'),
            where('nik', '==', resident.nik)
          )
          const usersSnapshot = await getDocs(usersQuery)

          if (!usersSnapshot.empty) {
            const userDoc = usersSnapshot.docs[0]
            const userId = userDoc.id

            await addDoc(collection(db, 'notifications'), {
              userId: userId,
              type: 'attendance',
              message: `Anda telah diabsen hari ini (${today.toLocaleDateString('id-ID')})`,
              timestamp: new Date().toISOString(),
              read: false
            })
          }
        } catch (notifError) {
          console.error('Error adding notification:', notifError)
          // Don't fail attendance if notification fails
        }
      }

      showNotification('success', 'Absensi berhasil dicatat')
    } catch (error) {
      console.error('Error saving attendance:', error)
      showNotification('error', 'Gagal menyimpan absensi')
    }
  }

  // Handle cancel attendance
  const handleCancelAttendance = async (resident: Resident) => {
    if (!attendanceThisMonth.has(resident.nik)) {
      showNotification('info', `${resident.nama} belum diabsen di bulan ini`)
      return
    }

    try {
      const currentMonth = new Date().toLocaleString('id-ID', { month: 'long' }).toLowerCase()
      const currentYear = new Date().getFullYear()

      // Find and delete attendance record for this NIK in current month
      const attendanceQuery = query(
        collection(db, 'attendance'),
        where('nik', '==', resident.nik)
      )
      const snapshot = await getDocs(attendanceQuery)

      let docToDelete: any = null
      snapshot.docs.forEach(doc => {
        const d = doc.data()
        const docMonth = new Date(d.timestamp).toLocaleString('id-ID', { month: 'long' }).toLowerCase()
        const docYear = new Date(d.timestamp).getFullYear()
        if (docMonth === currentMonth && docYear === currentYear) {
          docToDelete = doc
        }
      })

      if (docToDelete) {
        await deleteDoc(doc(db, 'attendance', docToDelete.id))
        
        // Also delete the notification for this user
        try {
          const usersQuery = query(
            collection(db, 'users'),
            where('nik', '==', resident.nik)
          )
          const usersSnapshot = await getDocs(usersQuery)
          
          if (!usersSnapshot.empty) {
            const userId = usersSnapshot.docs[0].id
            
            // Find and delete attendance notification for this user
            const notificationsQuery = query(
              collection(db, 'notifications'),
              where('userId', '==', userId),
              where('type', '==', 'attendance')
            )
            const notificationsSnapshot = await getDocs(notificationsQuery)
            
            notificationsSnapshot.docs.forEach(notifDoc => {
              deleteDoc(doc(db, 'notifications', notifDoc.id))
            })
          }
        } catch (notifError) {
          console.error('Error deleting notification:', notifError)
          // Don't fail attendance cancellation if notification deletion fails
        }

        // Delete healthReadings for this user in current month
        try {
          const healthReadingsQuery = query(
            collection(db, 'healthReadings'),
            where('nik', '==', resident.nik)
          )
          const healthReadingsSnapshot = await getDocs(healthReadingsQuery)
          
          healthReadingsSnapshot.docs.forEach(healthDoc => {
            const d = healthDoc.data()
            const docMonth = new Date(d.timestamp).toLocaleString('id-ID', { month: 'long' }).toLowerCase()
            const docYear = new Date(d.timestamp).getFullYear()
            if (docMonth === currentMonth && docYear === currentYear) {
              deleteDoc(doc(db, 'healthReadings', healthDoc.id))
            }
          })
        } catch (healthError) {
          console.error('Error deleting healthReadings:', healthError)
        }

        // Delete tb-bb data for this user in current month
        try {
          const tbbbQuery = query(
            collection(db, 'tb-bb'),
            where('nik', '==', resident.nik)
          )
          const tbbbSnapshot = await getDocs(tbbbQuery)
          
          tbbbSnapshot.docs.forEach(tbbbDoc => {
            const d = tbbbDoc.data()
            const docMonth = new Date(d.timestamp).toLocaleString('id-ID', { month: 'long' }).toLowerCase()
            const docYear = new Date(d.timestamp).getFullYear()
            if (docMonth === currentMonth && docYear === currentYear) {
              deleteDoc(doc(db, 'tb-bb', tbbbDoc.id))
            }
          })
        } catch (tbbbError) {
          console.error('Error deleting tb-bb:', tbbbError)
        }
        
        setShowCancelFor(null)
        showNotification('success', `Absensi ${resident.nama} berhasil dibatalkan`)
      } else {
        showNotification('error', 'Data absensi tidak ditemukan')
      }
    } catch (error) {
      console.error('Error canceling attendance:', error)
      showNotification('error', 'Gagal membatalkan absensi')
    }
  }

  // Generate random PIN (6 digits)
  const generatePIN = () => {
    return Math.floor(100000 + Math.random() * 900000).toString()
  }

  // Handle add resident with auto username/password
  const handleAddResident = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nama: residentForm.nama,
          nik: residentForm.nik,
          rw: residentForm.rw,
          rt: residentForm.rt,
          birthDate: residentForm.birthDate,
          jenisKelamin: residentForm.jenisKelamin,
          alamat: residentForm.alamat,
          email: residentForm.email,
          phone: residentForm.phone
        })
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Gagal menambahkan warga')
      }

      setIsAddModalOpen(false)
      setResidentForm({
        nama: '',
        nik: '',
        rw: '',
        rt: '',
        birthDate: '',
        jenisKelamin: 'L',
        alamat: '',
        email: '',
        phone: ''
      })

      // Show detailed notification
      showNotification('success', `Akun user berhasil dibuat! Nama: ${data.user.name}, NIK: ${data.user.nik}, PIN: ${data.user.password}. User dapat login dengan NIK dan PIN tersebut.`)
    } catch (error: any) {
      console.error('Error adding resident:', error)
      showNotification('error', error.message || 'Gagal menambahkan warga. Pastikan NIK belum terdaftar.')
    }
  }

  const resetResidentForm = () => {
    setResidentForm({
      nama: '',
      nik: '',
      rw: '',
      rt: '',
      birthDate: '',
      jenisKelamin: 'L',
      alamat: '',
      email: '',
      phone: ''
    })
    setGeneratedPassword('')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center overflow-x-hidden">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 pb-24 overflow-x-hidden">
      {/* Modern Notification */}
      {notification && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-right">
          <div className={`rounded-2xl shadow-2xl p-4 flex items-center gap-3 min-w-[320px] ${
            notification.type === 'success'
              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white'
              : notification.type === 'error'
              ? 'bg-gradient-to-r from-red-500 to-rose-500 text-white'
              : 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white'
          }`}>
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
              {notification.type === 'success' && <CheckCircle className="w-6 h-6" />}
              {notification.type === 'error' && <AlertCircle className="w-6 h-6" />}
              {notification.type === 'info' && <Info className="w-6 h-6" />}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-white">{notification.message}</p>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="p-1 hover:bg-white/20 rounded-full transition-colors"
              aria-label="Tutup notifikasi"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <BackButton onClick={() => router.push('/')} />
              <h1 className="text-2xl font-bold text-gray-800">Absensi Posbindu</h1>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">{new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-600" />
                <span className="font-semibold text-gray-700 text-sm">Filter</span>
              </div>
              <button
                onClick={() => { setIsAddModalOpen(true); resetResidentForm(); }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah Warga
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <select value={filterRW} onChange={e => setFilterRW(e.target.value)} aria-label="Filter RW" className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Semua RW</option>
                {['01','02','03','04','05','06','07','08','09','10'].map(rw => <option key={rw} value={rw}>RW {rw}</option>)}
              </select>
              <select value={filterRT} onChange={e => setFilterRT(e.target.value)} aria-label="Filter RT" className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Semua RT</option>
                {['01','02','03','04','05','06','07','08','09','10'].map(rt => <option key={rt} value={rt}>RT {rt}</option>)}
              </select>
              <div className="md:col-span-2 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" placeholder="Cari nama atau NIK..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          </div>

          {/* Residents Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Nama</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">NIK</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">RW/RT</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Jenis Kelamin</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Usia</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">Status Bulan Ini</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredResidents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-400">Tidak ada data warga</td>
                  </tr>
                ) : filteredResidents.map(r => {
                  const isPresentThisMonth = attendanceThisMonth.has(r.nik)
                  return (
                    <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800">{r.nama}</td>
                      <td className="px-4 py-3 text-gray-600">{r.nik}</td>
                      <td className="px-4 py-3 text-gray-600">RW {r.rw} / RT {r.rt}</td>
                      <td className="px-4 py-3 text-gray-600">{r.jenisKelamin === 'L' ? 'Laki-laki' : 'Perempuan'}</td>
                      <td className="px-4 py-3 text-gray-600">{r.umur} tahun</td>
                      <td className="px-4 py-3 text-center">
                        {isPresentThisMonth ? (
                          <CheckCircle className="w-5 h-5 text-green-600 mx-auto" />
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleAttendance(r)}
                            disabled={isPresentThisMonth}
                            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-xs font-medium ${
                              isPresentThisMonth
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-blue-600 text-white hover:bg-blue-700'
                            }`}
                          >
                            <Calendar className="w-3.5 h-3.5" />
                            {isPresentThisMonth ? 'Sudah Hadir' : 'Hadir'}
                          </button>
                          {isPresentThisMonth && (
                            <button
                              onClick={() => setShowCancelFor(showCancelFor === r.nik ? null : r.nik)}
                              className="inline-flex items-center justify-center p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 transition-colors"
                              title="Opsi Absensi"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          )}
                          {isPresentThisMonth && showCancelFor === r.nik && (
                            <button
                              onClick={() => handleCancelAttendance(r)}
                              className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors text-xs font-medium"
                              title="Batalkan Absensi"
                            >
                              <X className="w-3.5 h-3.5" />
                              Batal
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Form for Add Resident */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-800">Tambah Data Warga</h3>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Tutup modal"
                  aria-label="Tutup modal"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              <form onSubmit={handleAddResident} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nama Lengkap *</label>
                    <input
                      type="text"
                      required
                      value={residentForm.nama}
                      onChange={(e) => setResidentForm({ ...residentForm, nama: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Masukkan nama lengkap"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">NIK *</label>
                    <input
                      type="text"
                      required
                      value={residentForm.nik}
                      onChange={(e) => setResidentForm({ ...residentForm, nik: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Masukkan NIK (16 digit)"
                      maxLength={16}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">RT *</label>
                    <select
                      required
                      value={residentForm.rt}
                      onChange={(e) => setResidentForm({ ...residentForm, rt: e.target.value })}
                      aria-label="Pilih RT"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Pilih RT</option>
                      {['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20'].map(rt => (
                        <option key={rt} value={rt}>RT {rt}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">RW *</label>
                    <select
                      required
                      value={residentForm.rw}
                      onChange={(e) => setResidentForm({ ...residentForm, rw: e.target.value })}
                      aria-label="Pilih RW"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Pilih RW</option>
                      {['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20'].map(rw => (
                        <option key={rw} value={rw}>RW {rw}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Tanggal Lahir *</label>
                    <input
                      type="date"
                      required
                      value={residentForm.birthDate}
                      onChange={(e) => setResidentForm({ ...residentForm, birthDate: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      aria-label="Tanggal Lahir"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Jenis Kelamin *</label>
                    <select
                      required
                      value={residentForm.jenisKelamin}
                      onChange={(e) => setResidentForm({ ...residentForm, jenisKelamin: e.target.value as 'L' | 'P' })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      aria-label="Jenis Kelamin"
                    >
                      <option value="L">Laki-laki</option>
                      <option value="P">Perempuan</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Alamat *</label>
                    <input
                      type="text"
                      required
                      value={residentForm.alamat}
                      onChange={(e) => setResidentForm({ ...residentForm, alamat: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Masukkan alamat lengkap"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <input
                      type="email"
                      value={residentForm.email}
                      onChange={(e) => setResidentForm({ ...residentForm, email: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="email@contoh.com (opsional)"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">No. Telepon</label>
                    <input
                      type="tel"
                      value={residentForm.phone}
                      onChange={(e) => setResidentForm({ ...residentForm, phone: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="+62 xxx xxxx xxxx (opsional)"
                    />
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800 font-medium mb-2">ℹ️ Informasi Akun</p>
                  <p className="text-xs text-blue-700">Username akan dibuat otomatis menggunakan NIK. Password akan dibuat otomatis (PIN 6 digit) dan ditampilkan setelah data berhasil disimpan.</p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    Tambah Warga
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
