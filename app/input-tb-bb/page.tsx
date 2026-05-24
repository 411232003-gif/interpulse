'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { collection, onSnapshot, query, where, addDoc, updateDoc, doc, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Users, Search, Filter, ArrowLeft, Ruler, Scale, X, CheckCircle } from 'lucide-react'

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

interface AttendanceRecord {
  id: string
  nama: string
  nik: string
  umur: number
  rt: string
  rw: string
  alamat: string
  timestamp: string
}

interface TBBBData {
  nik: string
  tinggiBadan: number
  beratBadan: number
  lingkarPinggang: number
  timestamp: string
}

export default function InputTBBBPage() {
  const router = useRouter()
  const { isAdmin, userProfile } = useAuth()
  const [attendanceToday, setAttendanceToday] = useState<AttendanceRecord[]>([])
  const [filterRW, setFilterRW] = useState('')
  const [filterRT, setFilterRT] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedResident, setSelectedResident] = useState<AttendanceRecord | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [tb, setTb] = useState('')
  const [bb, setBb] = useState('')
  const [lingkarPinggang, setLingkarPinggang] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showSuccessBanner, setShowSuccessBanner] = useState(false)
  const [tbbbData, setTbbbData] = useState<TBBBData[]>([])

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

  // Load today's attendance
  useEffect(() => {
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    
    const attendanceRef = collection(db, 'attendance')
    const unsubscribe = onSnapshot(attendanceRef, (snapshot) => {
      const todayAttendance: AttendanceRecord[] = []
      snapshot.docs.forEach(doc => {
        const data = doc.data()
        if (data.timestamp && data.timestamp.startsWith(todayStr)) {
          todayAttendance.push({
            id: doc.id,
            nama: data.nama,
            nik: data.nik,
            umur: data.umur,
            rt: data.rt,
            rw: data.rw,
            alamat: data.alamat,
            timestamp: data.timestamp
          })
        }
      })
      setAttendanceToday(todayAttendance)
      setLoading(false)
    })
    
    return () => unsubscribe()
  }, [])

  // Load TB/BB data from database
  useEffect(() => {
    const q = collection(db, 'tb-bb')
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        nik: doc.data().nik,
        tinggiBadan: doc.data().tinggiBadan,
        beratBadan: doc.data().beratBadan,
        lingkarPinggang: doc.data().lingkarPinggang || 0,
        timestamp: doc.data().timestamp
      })) as TBBBData[]
      setTbbbData(data)
    })
    return () => unsubscribe()
  }, [])

  // Check if resident has TB/BB data for today
  const getTodayTBBB = (nik: string) => {
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    const todayTBBB = tbbbData.find(tb => 
      tb.nik === nik && tb.timestamp.startsWith(todayStr)
    )
    return todayTBBB
  }

  // Filter attendance
  const filteredAttendance = attendanceToday.filter(att => {
    const rwMatch = !filterRW || att.rw === filterRW
    const rtMatch = !filterRT || att.rt === filterRT
    const searchMatch = !searchQuery || 
      att.nama.toLowerCase().includes(searchQuery.toLowerCase()) || 
      att.nik.includes(searchQuery)
    return rwMatch && rtMatch && searchMatch
  }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  // Open modal for input
  const openModal = (resident: AttendanceRecord) => {
    setSelectedResident(resident)
    const todayTBBB = getTodayTBBB(resident.nik)
    if (todayTBBB) {
      setTb(todayTBBB.tinggiBadan.toString())
      setBb(todayTBBB.beratBadan.toString())
      setLingkarPinggang(todayTBBB.lingkarPinggang?.toString() || '')
    } else {
      setTb('')
      setBb('')
      setLingkarPinggang('')
    }
    setShowModal(true)
  }

  // Close modal
  const closeModal = () => {
    setShowModal(false)
    setSelectedResident(null)
    setTb('')
    setBb('')
    setLingkarPinggang('')
  }

  // Save TB/BB data
  const handleSave = async () => {
    if (!selectedResident || !tb || !bb) {
      alert('Mohon isi tinggi badan dan berat badan')
      return
    }

    setSaving(true)
    try {
      const tbData = {
        nik: selectedResident.nik,
        nama: selectedResident.nama,
        tinggiBadan: parseInt(tb),
        beratBadan: parseInt(bb),
        lingkarPinggang: lingkarPinggang ? parseInt(lingkarPinggang) : 0,
        rt: selectedResident.rt,
        rw: selectedResident.rw,
        timestamp: new Date().toISOString(),
        date: new Date().toLocaleDateString('id-ID'),
        time: new Date().toLocaleTimeString('id-ID'),
      }

      // Check if TB/BB record exists for today
      const existingQuery = query(
        collection(db, 'tb-bb'),
        where('nik', '==', selectedResident.nik)
      )
      const existingSnapshot = await getDocs(existingQuery)
      
      const today = new Date()
      const todayStr = today.toISOString().split('T')[0]
      
      let existingDocId = null
      existingSnapshot.docs.forEach(doc => {
        const d = doc.data()
        if (d.timestamp && d.timestamp.startsWith(todayStr)) {
          existingDocId = doc.id
        }
      })

      if (existingDocId) {
        await updateDoc(doc(db, 'tb-bb', existingDocId), tbData)
      } else {
        await addDoc(collection(db, 'tb-bb'), tbData)
      }

      closeModal()
      setShowSuccessBanner(true)
      setTimeout(() => setShowSuccessBanner(false), 4000)
    } catch (error) {
      console.error('Error saving TB/BB:', error)
      alert('Gagal menyimpan data')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-teal-50 to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-teal-50 to-cyan-50 p-4 pb-24">
      {/* Success Banner */}
      {showSuccessBanner && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-slide-down">
          <div className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="font-bold text-lg">Berhasil!</p>
              <p className="text-sm text-white/90">Data tinggi badan dan berat badan tersimpan</p>
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
              <h1 className="text-2xl font-bold text-gray-800">Input Tinggi Badan & Berat Badan</h1>
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
              <select value={filterRW} onChange={e => setFilterRW(e.target.value)} aria-label="Filter RW" className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                <option value="">Semua RW</option>
                {['01','02','03','04','05','06','07','08','09','10'].map(rw => <option key={rw} value={rw}>RW {rw}</option>)}
              </select>
              <select value={filterRT} onChange={e => setFilterRT(e.target.value)} aria-label="Filter RT" className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                <option value="">Semua RT</option>
                {['01','02','03','04','05','06','07','08','09','10'].map(rt => <option key={rt} value={rt}>RT {rt}</option>)}
              </select>
              <div className="md:col-span-2 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" placeholder="Cari nama atau NIK..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
            </div>
          </div>

          {/* Attendance Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Nama</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">NIK</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">RW/RT</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Jenis Kelamin</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Usia</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredAttendance.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-400">Tidak ada warga yang hadir hari ini</td>
                  </tr>
                ) : filteredAttendance.map(att => {
                  const todayTBBB = getTodayTBBB(att.nik)
                  const hasTBBB = todayTBBB !== undefined
                  return (
                    <tr key={att.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800">{att.nama}</td>
                      <td className="px-4 py-3 text-gray-600">{att.nik}</td>
                      <td className="px-4 py-3 text-gray-600">RW {att.rw} / RT {att.rt}</td>
                      <td className="px-4 py-3 text-gray-600">-</td>
                      <td className="px-4 py-3 text-gray-600">{att.umur} tahun</td>
                      <td className="px-4 py-3 text-center">
                        <button 
                          onClick={() => openModal(att)}
                          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-xs font-medium ${
                            hasTBBB 
                              ? 'bg-blue-600 text-white hover:bg-blue-700' 
                              : 'bg-green-600 text-white hover:bg-green-700'
                          }`}
                        >
                          <Ruler className="w-3.5 h-3.5" />
                          <Scale className="w-3.5 h-3.5" />
                          {hasTBBB ? 'Edit' : 'Input TB/BB'}
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

      {/* Modal for TB/BB Input */}
      {showModal && selectedResident && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800">Input TB/BB</h2>
              <button onClick={closeModal} aria-label="Tutup" className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">Nama: <span className="font-semibold text-gray-800">{selectedResident.nama}</span></p>
              <p className="text-sm text-gray-600">NIK: <span className="font-semibold text-gray-800">{selectedResident.nik}</span></p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tinggi Badan (cm)</label>
                <input
                  type="number"
                  value={tb}
                  onChange={e => setTb(e.target.value)}
                  placeholder="Contoh: 165"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Berat Badan (kg)</label>
                <input
                  type="number"
                  value={bb}
                  onChange={e => setBb(e.target.value)}
                  placeholder="Contoh: 65"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Lingkar Pinggang (cm)</label>
                <input
                  type="number"
                  value={lingkarPinggang}
                  onChange={e => setLingkarPinggang(e.target.value)}
                  placeholder="Contoh: 80"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={closeModal}
                className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors font-medium"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
