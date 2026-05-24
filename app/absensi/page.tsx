'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { collection, onSnapshot, query, where, addDoc, updateDoc, doc, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Users, Search, Filter, ArrowLeft, CheckCircle, Calendar, X, AlertCircle } from 'lucide-react'

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
}

export default function AbsensiPage() {
  const router = useRouter()
  const { isAdmin, userProfile, loading: authLoading } = useAuth()

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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
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

  const [residents, setResidents] = useState<Resident[]>([])
  const [filterRW, setFilterRW] = useState('')
  const [filterRT, setFilterRT] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [attendanceToday, setAttendanceToday] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [showSuccessBanner, setShowSuccessBanner] = useState(false)

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
        const mergedData = [...residentsData]
        usersData.forEach(user => {
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

  // Load today's attendance
  useEffect(() => {
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    
    const attendanceRef = collection(db, 'attendance')
    const unsubscribe = onSnapshot(attendanceRef, (snapshot) => {
      const todayAttendance = new Set<string>()
      snapshot.docs.forEach(doc => {
        const data = doc.data()
        if (data.timestamp && data.timestamp.startsWith(todayStr)) {
          todayAttendance.add(data.nik)
        }
      })
      setAttendanceToday(todayAttendance)
    })
    
    return () => unsubscribe()
  }, [])

  // Filter residents
  const filteredResidents = residents.filter(r => {
    const rwMatch = !filterRW || r.rw === filterRW
    const rtMatch = !filterRT || r.rt === filterRT
    const searchMatch = !searchQuery || 
      r.nama.toLowerCase().includes(searchQuery.toLowerCase()) || 
      r.nik.includes(searchQuery)
    return rwMatch && rtMatch && searchMatch
  })

  // Handle attendance
  const handleAttendance = async (resident: Resident) => {
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
      }
      
      // If elderly (60+), also save to elderly-attendance
      if (resident.umur >= 60) {
        const existingElderlyQuery = query(
          collection(db, 'elderly-attendance'),
          where('nik', '==', resident.nik)
        )
        const existingElderlySnapshot = await getDocs(existingElderlyQuery)
        
        let existingElderlyDocId = null
        existingElderlySnapshot.docs.forEach(doc => {
          const d = doc.data()
          const docMonth = new Date(d.timestamp).toLocaleString('id-ID', { month: 'long' }).toLowerCase()
          const docYear = new Date(d.timestamp).getFullYear()
          if (docMonth === currentMonth && docYear === currentYear) {
            existingElderlyDocId = doc.id
          }
        })
        
        if (existingElderlyDocId) {
          await updateDoc(doc(db, 'elderly-attendance', existingElderlyDocId), attendanceData)
        } else {
          await addDoc(collection(db, 'elderly-attendance'), attendanceData)
        }
      }
      
      setShowSuccessBanner(true)
      setTimeout(() => setShowSuccessBanner(false), 4000)
    } catch (error) {
      console.error('Error saving attendance:', error)
      alert('Gagal menyimpan absensi')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 pb-24">
      {/* Success Banner */}
      {showSuccessBanner && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-slide-down">
          <div className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="font-bold text-lg">Berhasil!</p>
              <p className="text-sm text-white/90">Absensi berhasil dicatat</p>
            </div>
            <button 
              onClick={() => setShowSuccessBanner(false)}
              aria-label="Tutup banner"
              className="ml-2 p-1 hover:bg-white/20 rounded-full transition-colors"
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
              <button onClick={() => router.push('/')} className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-1.5 rounded-lg transition-all text-sm">← Kembali</button>
              <h1 className="text-2xl font-bold text-gray-800">Absensi Posbindu</h1>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">{new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="w-4 h-4 text-gray-600" />
              <span className="font-semibold text-gray-700 text-sm">Filter</span>
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
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">Status Hari Ini</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredResidents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-400">Tidak ada data warga</td>
                  </tr>
                ) : filteredResidents.map(r => {
                  const isPresentToday = attendanceToday.has(r.nik)
                  return (
                    <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800">{r.nama}</td>
                      <td className="px-4 py-3 text-gray-600">{r.nik}</td>
                      <td className="px-4 py-3 text-gray-600">RW {r.rw} / RT {r.rt}</td>
                      <td className="px-4 py-3 text-gray-600">{r.jenisKelamin === 'L' ? 'Laki-laki' : 'Perempuan'}</td>
                      <td className="px-4 py-3 text-gray-600">{r.umur} tahun</td>
                      <td className="px-4 py-3 text-center">
                        {isPresentToday ? (
                          <CheckCircle className="w-5 h-5 text-green-600 mx-auto" />
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button 
                          onClick={() => handleAttendance(r)}
                          disabled={isPresentToday}
                          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-xs font-medium ${
                            isPresentToday 
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                        >
                          <Calendar className="w-3.5 h-3.5" />
                          {isPresentToday ? 'Sudah Hadir' : 'Hadir'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
