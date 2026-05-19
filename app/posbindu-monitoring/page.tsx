'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { collection, doc, addDoc, updateDoc, deleteDoc, getDocs, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Users, History, Search, Filter, Plus, Edit, Trash2, X, AlertCircle, TrendingUp, Target, UserPlus, Calendar, Activity, ArrowLeft, CheckCircle, Download, FileText, MessageSquare } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

// Target PMT per RW
const rwTargets = {
  '01': 32,
  '02': 65,
  '03': 60,
  '04': 60,
  '05': 70,
  '06': 33
}

interface Resident {
  id: string
  nama: string
  nik: string
  rw: string
  rt: string
  umur: number
  jenisKelamin: 'L' | 'P'
  tekananDarah: number
  gulaDarah: number
  kolesterol: number
  asamUrat: number
  alamat: string
}

// Mock data for elderly attendance
const mockAttendance = {
  '01': { januari: 28, februari: 30, maret: 25, april: 32 },
  '02': { januari: 55, februari: 60, maret: 58, april: 62 },
  '03': { januari: 52, februari: 55, maret: 50, april: 57 },
  '04': { januari: 50, februari: 54, maret: 48, april: 55 },
  '05': { januari: 60, februari: 65, maret: 62, april: 68 },
  '06': { januari: 28, februari: 30, maret: 27, april: 31 },
}

export default function PosbinduMonitoring() {
  const router = useRouter()
  const { isAdmin, userProfile } = useAuth()
  const [activeTab, setActiveTab] = useState<'datawarga' | 'riwayat' | 'absen'>(isAdmin ? 'datawarga' : 'absen')
  const [autoFillFromProfile, setAutoFillFromProfile] = useState(false)
  const [filterRW, setFilterRW] = useState<string>('')
  const [filterRT, setFilterRT] = useState<string>('')
  const [filterUmur, setFilterUmur] = useState<string>('')
  const [searchNama, setSearchNama] = useState('')
  const [residents, setResidents] = useState<Resident[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isPosbinduModalOpen, setIsPosbinduModalOpen] = useState(false)
  const [editingResident, setEditingResident] = useState<Resident | null>(null)
  const [residentForm, setResidentForm] = useState({
    nama: '',
    nik: '',
    rw: '',
    rt: '',
    umur: '',
    jenisKelamin: 'L',
    tekananDarah: '',
    gulaDarah: '',
    kolesterol: '',
    asamUrat: '',
    alamat: '',
  })

  // Check-in form state
  const [checkInForm, setCheckInForm] = useState({
    nama: '',
    nik: '',
    umur: '',
    rt: '',
    rw: '',
    alamat: '',
  })
  const [userAttendance, setUserAttendance] = useState<any[]>([])
  const [showAttendanceHistory, setShowAttendanceHistory] = useState(false)
  const [elderlyAttendance, setElderlyAttendance] = useState<Record<string, Record<string, number>>>(mockAttendance)
  const [healthReadings, setHealthReadings] = useState<any[]>([])
  const [activeHealthTab, setActiveHealthTab] = useState<'tensi' | 'kolesterol' | 'asamurat' | 'guladarah'>('tensi')
  const [riwayatSubTab, setRiwayatSubTab] = useState<'kesehatan' | 'absensi'>('kesehatan')
  const [attendanceList, setAttendanceList] = useState<any[]>([])
  const [attendanceFilter, setAttendanceFilter] = useState({ rw: '', rt: '', search: '' })
  const [attendancePage, setAttendancePage] = useState(1)
  const ITEMS_PER_PAGE = 20
  const [posbinduForm, setPosbinduForm] = useState({
    type: 'tensi',
    userName: '',
    rt: '',
    rw: '',
    kelurahan: '',
    sistolik: '',
    diastolik: '',
    nadi: '',
    total: '',
    ldl: '',
    hdl: '',
    trigliserida: '',
    value: '',
    gender: 'pria'
  })

  // Health data edit modal state
  const [isHealthEditModalOpen, setIsHealthEditModalOpen] = useState(false)
  const [editingHealth, setEditingHealth] = useState<any>(null)

  // Attendance edit modal state
  const [isAttendanceEditModalOpen, setIsAttendanceEditModalOpen] = useState(false)
  const [editingAttendance, setEditingAttendance] = useState<any>(null)
  const [attendanceForm, setAttendanceForm] = useState({
    nama: '',
    nik: '',
    umur: '',
    rt: '',
    rw: '',
    alamat: ''
  })
  const [healthEditForm, setHealthEditForm] = useState({
    type: 'tensi',
    userName: '',
    rt: '',
    rw: '',
    sistolik: '',
    diastolik: '',
    nadi: '',
    total: '',
    ldl: '',
    hdl: '',
    trigliserida: '',
    value: '',
  })

  // Fetch residents from Firestore
  useEffect(() => {
    const residentsRef = collection(db, 'residents')
    const unsubscribe = onSnapshot(residentsRef, (snapshot) => {
      const residentsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Resident[]
      setResidents(residentsData)
    }, (error) => {
      console.error('Error fetching residents:', error)
      setResidents([])
    })
    return () => unsubscribe()
  }, [])

  // Auto-fill form when checkbox is checked
  useEffect(() => {
    handleAutoFillFromProfile()
  }, [autoFillFromProfile])

  // Fetch elderly attendance from Firestore - REAL TIME SYNC
  useEffect(() => {
    const attendanceRef = collection(db, 'attendance')
    const unsubscribe = onSnapshot(attendanceRef, (snapshot) => {
      const attendanceData: Record<string, Record<string, number>> = {}
      
      // Initialize all RW with 0
      Object.keys(rwTargets).forEach(rw => {
        attendanceData[rw] = { januari: 0, februari: 0, maret: 0, april: 0, mei: 0, juni: 0, juli: 0, agustus: 0, september: 0, oktober: 0, november: 0, desember: 0 }
      })
      
      // Count attendance per RW per month - ALL ages included
      snapshot.docs.forEach(doc => {
        const data = doc.data() as any
        const rw = data.rw
        
        // Count all attendance regardless of age
        if (rw && attendanceData[rw]) {
          const month = new Date(data.timestamp).toLocaleString('id-ID', { month: 'long' }).toLowerCase()
          if (attendanceData[rw][month] !== undefined) {
            attendanceData[rw][month]++
          }
        }
      })
      
      // Always use real data (even if 0), fallback to mock only on error
      setElderlyAttendance(attendanceData)
    }, (error) => {
      console.error('Error fetching elderly attendance:', error)
      setElderlyAttendance(mockAttendance)
    })
    return () => unsubscribe()
  }, [])

  // Fetch attendance history from Firestore (for riwayat absensi)
  useEffect(() => {
    const attendanceRef = collection(db, 'attendance')
    const unsubscribe = onSnapshot(attendanceRef, (snapshot) => {
      const attendanceData = snapshot.docs.map(doc => {
        const data = doc.data()
        return {
          id: doc.id,
          nama: data.nama,
          nik: data.nik,
          umur: data.umur,
          rt: data.rt,
          rw: data.rw,
          alamat: data.alamat,
          timestamp: data.timestamp,
          date: data.date,
          time: data.time
        }
      }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      setAttendanceList(attendanceData)
    }, (error) => {
      console.error('Error fetching attendance list:', error)
    })
    return () => unsubscribe()
  }, [])

  // Fetch health readings from Firestore (for monitoring and riwayat tabs)
  useEffect(() => {
    const readingsRef = collection(db, 'healthReadings')
    const unsubscribe = onSnapshot(readingsRef, (snapshot) => {
      const readingsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setHealthReadings(readingsData)
    }, (error) => {
      console.error('Error fetching health readings:', error)
    })
    return () => unsubscribe()
  }, [])

  // Auto-cleanup: Hapus data monitoring pribadi yang lebih dari 7 hari
  useEffect(() => {
    const cleanupOldPribadiData = async () => {
      try {
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
        
        const oldPribadiQuery = query(
          collection(db, 'healthReadings'),
          where('source', '==', 'pribadi'),
          where('timestamp', '<', sevenDaysAgo.toISOString())
        )
        
        const snapshot = await getDocs(oldPribadiQuery)
        const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref))
        await Promise.all(deletePromises)
        
        if (deletePromises.length > 0) {
          console.log(`Cleaned up ${deletePromises.length} old pribadi records from monitoring`)
        }
      } catch (error) {
        console.error('Error cleaning up old pribadi data:', error)
      }
    }
    
    // Run cleanup on mount and every hour
    cleanupOldPribadiData()
    const interval = setInterval(cleanupOldPribadiData, 60 * 60 * 1000) // 1 hour
    
    return () => clearInterval(interval)
  }, [])

  // CRUD functions
  const handleAddResident = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const newResident = {
        nama: residentForm.nama,
        nik: residentForm.nik,
        rw: residentForm.rw,
        rt: residentForm.rt,
        umur: parseInt(residentForm.umur),
        jenisKelamin: residentForm.jenisKelamin,
        tekananDarah: parseFloat(residentForm.tekananDarah),
        gulaDarah: parseInt(residentForm.gulaDarah),
        kolesterol: parseInt(residentForm.kolesterol),
        asamUrat: parseFloat(residentForm.asamUrat),
        alamat: residentForm.alamat,
      }
      await addDoc(collection(db, 'residents'), newResident)
      setIsModalOpen(false)
      resetResidentForm()
      alert('Data warga berhasil ditambahkan')
    } catch (error) {
      console.error('Error adding resident:', error)
      alert('Gagal menambahkan data warga')
    }
  }

  const handleEditResident = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingResident) return
    try {
      const updatedResident = {
        nama: residentForm.nama,
        nik: residentForm.nik,
        rw: residentForm.rw,
        rt: residentForm.rt,
        umur: parseInt(residentForm.umur),
        jenisKelamin: residentForm.jenisKelamin,
        tekananDarah: parseFloat(residentForm.tekananDarah),
        gulaDarah: parseInt(residentForm.gulaDarah),
        kolesterol: parseInt(residentForm.kolesterol),
        asamUrat: parseFloat(residentForm.asamUrat),
        alamat: residentForm.alamat,
      }
      await updateDoc(doc(db, 'residents', editingResident.id), updatedResident)
      setIsModalOpen(false)
      setEditingResident(null)
      resetResidentForm()
      alert('Data warga berhasil diperbarui')
    } catch (error) {
      console.error('Error updating resident:', error)
      alert('Gagal memperbarui data warga')
    }
  }

  const handleDeleteResident = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus data warga ini?')) return
    try {
      await deleteDoc(doc(db, 'residents', id))
      alert('Data warga berhasil dihapus')
    } catch (error) {
      console.error('Error deleting resident:', error)
      alert('Gagal menghapus data warga')
    }
  }

  const openAddModal = () => {
    setEditingResident(null)
    resetResidentForm()
    setIsModalOpen(true)
  }

  const openEditModal = (resident: Resident) => {
    setEditingResident(resident)
    setResidentForm({
      nama: resident.nama,
      nik: resident.nik,
      rw: resident.rw,
      rt: resident.rt,
      umur: resident.umur.toString(),
      jenisKelamin: resident.jenisKelamin,
      tekananDarah: resident.tekananDarah.toString(),
      gulaDarah: resident.gulaDarah.toString(),
      kolesterol: resident.kolesterol.toString(),
      asamUrat: resident.asamUrat.toString(),
      alamat: resident.alamat,
    })
    setIsModalOpen(true)
  }

  // CRUD functions for Health Readings
  const openEditHealthModal = (reading: any) => {
    setEditingHealth(reading)
    setHealthEditForm({
      type: reading.type,
      userName: reading.userName || '',
      rt: reading.rt || '',
      rw: reading.rw || '',
      sistolik: reading.sistolik || '',
      diastolik: reading.diastolik || '',
      nadi: reading.nadi || '',
      total: reading.total || '',
      ldl: reading.ldl || '',
      hdl: reading.hdl || '',
      trigliserida: reading.trigliserida || '',
      value: reading.value || '',
    })
    setIsHealthEditModalOpen(true)
  }

  const handleEditHealth = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingHealth) return
    try {
      const updatedReading = {
        type: healthEditForm.type,
        userName: healthEditForm.userName,
        rt: healthEditForm.rt,
        rw: healthEditForm.rw,
      }

      if (healthEditForm.type === 'tensi') {
        Object.assign(updatedReading, {
          sistolik: healthEditForm.sistolik,
          diastolik: healthEditForm.diastolik,
          nadi: healthEditForm.nadi
        })
      } else if (healthEditForm.type === 'kolesterol') {
        Object.assign(updatedReading, {
          total: healthEditForm.total,
          ldl: healthEditForm.ldl,
          hdl: healthEditForm.hdl,
          trigliserida: healthEditForm.trigliserida
        })
      } else if (healthEditForm.type === 'asamurat' || healthEditForm.type === 'guladarah') {
        Object.assign(updatedReading, {
          value: healthEditForm.value
        })
      }

      await updateDoc(doc(db, 'healthReadings', editingHealth.id), updatedReading)
      setIsHealthEditModalOpen(false)
      setEditingHealth(null)
      alert('Data kesehatan berhasil diperbarui')
    } catch (error) {
      console.error('Error updating health reading:', error)
      alert('Gagal memperbarui data kesehatan')
    }
  }

  const handleDeleteHealth = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus data kesehatan ini?')) return
    try {
      await deleteDoc(doc(db, 'healthReadings', id))
      alert('Data kesehatan berhasil dihapus')
    } catch (error) {
      console.error('Error deleting health reading:', error)
      alert('Gagal menghapus data kesehatan')
    }
  }

  // Attendance CRUD functions
  const handleDeleteAttendance = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus data absensi ini?')) return
    try {
      await deleteDoc(doc(db, 'attendance', id))
      alert('Data absensi berhasil dihapus')
    } catch (error) {
      console.error('Error deleting attendance:', error)
      alert('Gagal menghapus data absensi')
    }
  }

  const openAttendanceEditModal = (attendance: any) => {
    setEditingAttendance(attendance)
    setAttendanceForm({
      nama: attendance.nama || '',
      nik: attendance.nik || '',
      umur: attendance.umur?.toString() || '',
      rt: attendance.rt || '',
      rw: attendance.rw || '',
      alamat: attendance.alamat || ''
    })
    setIsAttendanceEditModalOpen(true)
  }

  const handleEditAttendance = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingAttendance) return
    try {
      const updatedAttendance = {
        nama: attendanceForm.nama,
        nik: attendanceForm.nik,
        umur: parseInt(attendanceForm.umur) || 0,
        rt: attendanceForm.rt,
        rw: attendanceForm.rw,
        alamat: attendanceForm.alamat
      }
      await updateDoc(doc(db, 'attendance', editingAttendance.id), updatedAttendance)
      setIsAttendanceEditModalOpen(false)
      setEditingAttendance(null)
      alert('Data absensi berhasil diperbarui')
    } catch (error) {
      console.error('Error updating attendance:', error)
      alert('Gagal memperbarui data absensi')
    }
  }

  const handlePosbinduSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const newReading = {
        type: posbinduForm.type,
        source: 'posbindu',
        userName: posbinduForm.userName,
        rt: posbinduForm.rt,
        rw: posbinduForm.rw,
        kelurahan: posbinduForm.kelurahan,
        timestamp: new Date().toISOString()
      }

      if (posbinduForm.type === 'tensi') {
        Object.assign(newReading, {
          sistolik: posbinduForm.sistolik,
          diastolik: posbinduForm.diastolik,
          nadi: posbinduForm.nadi
        })
      } else if (posbinduForm.type === 'kolesterol') {
        Object.assign(newReading, {
          total: posbinduForm.total,
          ldl: posbinduForm.ldl,
          hdl: posbinduForm.hdl,
          trigliserida: posbinduForm.trigliserida
        })
      } else if (posbinduForm.type === 'asamurat') {
        Object.assign(newReading, {
          value: posbinduForm.value,
          gender: posbinduForm.gender
        })
      } else if (posbinduForm.type === 'guladarah') {
        Object.assign(newReading, {
          value: posbinduForm.value,
          condition: 'puasa'
        })
      }

      await addDoc(collection(db, 'healthReadings'), newReading)
      setIsPosbinduModalOpen(false)
      setPosbinduForm({
        type: 'tensi',
        userName: '',
        rt: '',
        rw: '',
        kelurahan: '',
        sistolik: '',
        diastolik: '',
        nadi: '',
        total: '',
        ldl: '',
        hdl: '',
        trigliserida: '',
        value: '',
        gender: 'pria'
      })
      alert('Data posbindu berhasil disimpan!')
    } catch (error) {
      console.error('Error saving posbindu data:', error)
      alert('Gagal menyimpan data. Coba lagi.')
    }
  }

  const resetResidentForm = () => {
    setResidentForm({
      nama: '',
      nik: '',
      rw: '',
      rt: '',
      umur: '',
      jenisKelamin: 'L',
      tekananDarah: '',
      gulaDarah: '',
      kolesterol: '',
      asamUrat: '',
      alamat: '',
    })
  }

  // Helper function to normalize RT/RW values for comparison
  // Handles both formats: "01" and "1" should match
  const normalizeRTRW = (value: string): string => {
    return value ? value.toString().padStart(2, '0') : ''
  }

  // Filter residents based on criteria
  const filteredResidents = residents.filter(resident => {
    if (filterRW && normalizeRTRW(resident.rw) !== normalizeRTRW(filterRW)) return false
    if (filterRT && normalizeRTRW(resident.rt) !== normalizeRTRW(filterRT)) return false
    if (filterUmur) {
      if (filterUmur === '0-20' && resident.umur > 20) return false
      if (filterUmur === '21-50' && (resident.umur < 21 || resident.umur > 50)) return false
      if (filterUmur === '51-60' && (resident.umur < 51 || resident.umur > 60)) return false
      if (filterUmur === '60+' && resident.umur < 60) return false
    }
    if (searchNama && !resident.nama.toLowerCase().includes(searchNama.toLowerCase())) return false
    return true
  })

  // Categorize health values
  const getKategori = (value: number, type: 'gula' | 'kolesterol' | 'asamUrat' | 'tekananDarah') => {
    if (type === 'gula') {
      if (value > 160) return { label: 'Tinggi', color: 'bg-red-500' }
      if (value > 140) return { label: 'Sedang', color: 'bg-yellow-500' }
      return { label: 'Normal', color: 'bg-green-500' }
    }
    if (type === 'kolesterol') {
      if (value > 240) return { label: 'Tinggi', color: 'bg-red-500' }
      if (value > 200) return { label: 'Sedang', color: 'bg-yellow-500' }
      return { label: 'Normal', color: 'bg-green-500' }
    }
    if (type === 'asamUrat') {
      if (value > 7) return { label: 'Tinggi', color: 'bg-red-500' }
      if (value > 6) return { label: 'Sedang', color: 'bg-yellow-500' }
      return { label: 'Normal', color: 'bg-green-500' }
    }
    if (type === 'tekananDarah') {
      if (value > 140/90) return { label: 'Tinggi', color: 'bg-red-500' }
      if (value > 130/85) return { label: 'Sedang', color: 'bg-yellow-500' }
      return { label: 'Normal', color: 'bg-green-500' }
    }
    return { label: 'Normal', color: 'bg-green-500' }
  }

  const handleAutoFillFromProfile = () => {
    if (autoFillFromProfile && userProfile) {
      // Calculate age from birthDate
      let age = 0
      if (userProfile.birthDate) {
        const birthDate = new Date(userProfile.birthDate)
        const today = new Date()
        age = today.getFullYear() - birthDate.getFullYear()
      }

      setCheckInForm({
        nama: userProfile.name || '',
        nik: userProfile.nik || '',
        umur: age.toString(),
        rt: userProfile.rt || '',
        rw: userProfile.rw || '',
        alamat: userProfile.kelurahan || '',
      })
    } else {
      // Clear form if checkbox is unchecked
      setCheckInForm({ nama: '', nik: '', umur: '', rt: '', rw: '', alamat: '' })
    }
  }

  // Export to PDF
  const exportToPDF = () => {
    const doc = new jsPDF()
    
    // Header with gradient background
    doc.setFillColor(37, 99, 235)
    doc.rect(0, 0, 210, 40, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(22)
    doc.setFont('helvetica', 'bold')
    doc.text('Data Warga Posbindu', 105, 20, { align: 'center' })
    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.text(`Kelurahan Duris Selatan - ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, 105, 30, { align: 'center' })
    
    // Summary
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(10)
    doc.text(`Total Warga: ${filteredResidents.length}`, 14, 50)
    
    // Table data
    const tableData = filteredResidents.map(resident => [
      resident.nama,
      resident.nik,
      `RW ${resident.rw} / RT ${resident.rt}`,
      `${resident.umur} th`,
      resident.jenisKelamin === 'L' ? 'Laki-laki' : 'Perempuan',
      `${resident.tekananDarah} mmHg`,
      `${resident.gulaDarah} mg/dL`,
      `${resident.kolesterol} mg/dL`,
      `${resident.asamUrat} mg/dL`,
      resident.alamat
    ])
    
    autoTable(doc, {
      startY: 55,
      head: [['Nama', 'NIK', 'RW/RT', 'Umur', 'Jenis Kelamin', 'Tensi', 'Gula', 'Kolesterol', 'Asam Urat', 'Alamat']],
      body: tableData,
      styles: {
        fontSize: 8,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [37, 99, 235],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [240, 249, 255],
      },
    })
    
    doc.save('data-warga-posbindu.pdf')
  }

  // Export to Excel
  const exportToExcel = () => {
    const data = filteredResidents.map(resident => ({
      'Nama Lengkap': resident.nama,
      'NIK': resident.nik,
      'RW': resident.rw,
      'RT': resident.rt,
      'Umur (Tahun)': resident.umur,
      'Jenis Kelamin': resident.jenisKelamin === 'L' ? 'Laki-laki' : 'Perempuan',
      'Tekanan Darah (mmHg)': resident.tekananDarah,
      'Gula Darah (mg/dL)': resident.gulaDarah,
      'Kolesterol (mg/dL)': resident.kolesterol,
      'Asam Urat (mg/dL)': resident.asamUrat,
      'Alamat': resident.alamat,
    }))
    
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Data Warga')
    
    // Set column widths
    ws['!cols'] = [
      { wch: 20 }, // Nama
      { wch: 18 }, // NIK
      { wch: 5 },  // RW
      { wch: 5 },  // RT
      { wch: 8 },  // Umur
      { wch: 12 }, // Jenis Kelamin
      { wch: 12 }, // Tensi
      { wch: 12 }, // Gula
      { wch: 12 }, // Kolesterol
      { wch: 12 }, // Asam Urat
      { wch: 30 }, // Alamat
    ]
    
    XLSX.writeFile(wb, 'data-warga-posbindu.xlsx')
  }

  // Export to WhatsApp
  const exportToWhatsApp = () => {
    const total = filteredResidents.length
    const elderly = filteredResidents.filter(r => r.umur >= 60).length
    const avgTensi = filteredResidents.reduce((sum, r) => sum + r.tekananDarah, 0) / total || 0
    const avgGula = filteredResidents.reduce((sum, r) => sum + r.gulaDarah, 0) / total || 0
    
    let message = `📊 *DATA WARGA POSBINDU*\n`
    message += `🏥 Kelurahan Duris Selatan\n`
    message += `📅 ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}\n\n`
    message += `━━━━━━━━━━━━━━━━━━━━\n\n`
    message += `📈 *RINGKASAN DATA*\n`
    message += `• Total Warga: ${total}\n`
    message += `• Lansia (60+): ${elderly}\n`
    message += `• Rata-rata Tensi: ${avgTensi.toFixed(0)} mmHg\n`
    message += `• Rata-rata Gula: ${avgGula.toFixed(0)} mg/dL\n\n`
    message += `━━━━━━━━━━━━━━━━━━━━\n\n`
    message += `📋 *DATA DETAIL*\n\n`
    
    filteredResidents.forEach((resident, index) => {
      message += `${index + 1}. ${resident.nama}\n`
      message += `   NIK: ${resident.nik}\n`
      message += `   RW/RT: ${resident.rw}/${resident.rt} | Umur: ${resident.umur} th\n`
      message += `   Tensi: ${resident.tekananDarah} | Gula: ${resident.gulaDarah}\n`
      message += `   Kolesterol: ${resident.kolesterol} | Asam Urat: ${resident.asamUrat}\n\n`
    })
    
    message += `━━━━━━━━━━━━━━━━━━━━\n`
    message += `📱 InterPulse - Aplikasi Kesehatan Terpadu\n`
    
    const encodedMessage = encodeURIComponent(message)
    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank')
  }

  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const age = parseInt(checkInForm.umur)
      const isElderly = age >= 60
      
      // Save check-in data to Firestore
      const checkInData = {
        nama: checkInForm.nama,
        nik: checkInForm.nik,
        umur: age,
        rt: checkInForm.rt,
        rw: checkInForm.rw,
        alamat: checkInForm.alamat,
        timestamp: new Date().toISOString(),
        date: new Date().toLocaleDateString('id-ID'),
        time: new Date().toLocaleTimeString('id-ID'),
      }
      await addDoc(collection(db, 'attendance'), checkInData)
      
      // If elderly, also save to elderly-attendance collection for participation tracking
      if (isElderly) {
        await addDoc(collection(db, 'elderly-attendance'), checkInData)
      }
      
      // Fetch user's attendance history
      const attendanceQuery = query(
        collection(db, 'attendance'),
        where('nik', '==', checkInForm.nik)
      )
      const snapshot = await getDocs(attendanceQuery)
      const attendanceData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setUserAttendance(attendanceData)
      setShowAttendanceHistory(true)
      
      setCheckInForm({ nama: '', nik: '', umur: '', rt: '', rw: '', alamat: '' })
      alert('Absensi berhasil disimpan!')
    } catch (error) {
      console.error('Error saving attendance:', error)
      alert('Gagal menyimpan absensi')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-b-3xl shadow-lg">
        <div className="flex items-center gap-4 mb-2">
          <button
            onClick={() => router.push('/')}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            title="Kembali ke Beranda"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-bold">{isAdmin ? 'Monitoring Posbindu' : 'Absensi Posbindu'}</h1>
        </div>
        <p className="text-blue-100 text-sm ml-10">{isAdmin ? 'Pantau kesehatan warga dan partisipasi lansia' : 'Silakan isi form absensi saat datang ke Posbindu'}</p>
      </div>

      {/* Tab Navigation - Only for Admin */}
      {isAdmin && (
        <div className="px-4 -mt-4">
          <div className="bg-white rounded-2xl shadow-lg p-2 flex gap-2">
            <button
              onClick={() => setActiveTab('datawarga')}
              className={`flex-1 py-3 px-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
                activeTab === 'datawarga' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Users className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">Data Warga</span>
            </button>
            <button
              onClick={() => setActiveTab('riwayat')}
              className={`flex-1 py-3 px-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
                activeTab === 'riwayat' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <History className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">Riwayat</span>
            </button>
          </div>
        </div>
      )}

      <div className="px-4 mt-6">
        {/* Data Warga Tab */}
        {activeTab === 'datawarga' && (
          <div className="space-y-4">
            {/* Summary + Export + Add Button */}
            <div className="flex items-center justify-between gap-2">
              <div className="bg-blue-50 rounded-xl px-4 py-2">
                <span className="text-blue-700 font-semibold text-sm">{filteredResidents.length} warga ditemukan</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={exportToPDF}
                  className="flex items-center gap-2 px-3 py-2 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 transition-colors"
                  title="Export ke PDF"
                >
                  <FileText className="w-4 h-4" />
                  <span className="hidden sm:inline">PDF</span>
                </button>
                <button
                  onClick={exportToExcel}
                  className="flex items-center gap-2 px-3 py-2 bg-green-500 text-white rounded-xl text-sm font-medium hover:bg-green-600 transition-colors"
                  title="Export ke Excel"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Excel</span>
                </button>
                <button
                  onClick={exportToWhatsApp}
                  className="flex items-center gap-2 px-3 py-2 bg-emerald-500 text-white rounded-xl text-sm font-medium hover:bg-emerald-600 transition-colors"
                  title="Export ke WhatsApp"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span className="hidden sm:inline">WA</span>
                </button>
                <button
                  onClick={openAddModal}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Tambah Warga
                </button>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="grid grid-cols-2 gap-2">
                <select value={filterRW} onChange={e => setFilterRW(e.target.value)} aria-label="Filter RW" className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Semua RW</option>
                  {['01','02','03','04','05','06','07','08','09','10','11','12','13','14','15','16','17','18','19','20'].map(rw => <option key={rw} value={rw}>RW {rw}</option>)}
                </select>
                <select value={filterRT} onChange={e => setFilterRT(e.target.value)} aria-label="Filter RT" className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Semua RT</option>
                  {['01','02','03','04','05','06','07','08','09','10','11','12','13','14','15','16','17','18','19','20'].map(rt => <option key={rt} value={rt}>RT {rt}</option>)}
                </select>
                <select value={filterUmur} onChange={e => setFilterUmur(e.target.value)} aria-label="Filter umur" className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Semua Umur</option>
                  <option value="0-20">0-20 Tahun</option>
                  <option value="21-50">21-50 Tahun</option>
                  <option value="51-60">51-60 Tahun</option>
                  <option value="60+">60+ Tahun</option>
                </select>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="text" placeholder="Cari nama..." value={searchNama} onChange={e => setSearchNama(e.target.value)} className="w-full pl-7 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
            </div>

            {/* Resident Cards */}
            <div className="space-y-3">
              {filteredResidents.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Belum ada data warga</p>
                </div>
              ) : filteredResidents.map(resident => (
                <div key={resident.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-gray-800">{resident.nama}</p>
                      <p className="text-xs text-gray-500">NIK: {resident.nik}</p>
                      <div className="flex gap-3 mt-1 text-xs text-gray-600">
                        <span>RW {resident.rw} / RT {resident.rt}</span>
                        <span>{resident.umur} tahun</span>
                        <span>{resident.jenisKelamin === 'L' ? 'Laki-laki' : 'Perempuan'}</span>
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      <button onClick={() => openEditModal(resident)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteResident(resident.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Hapus">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2 mt-3">
                    {[
                      { label: 'Tensi', value: `${resident.tekananDarah}`, alert: resident.tekananDarah > 140 },
                      { label: 'Gula', value: `${resident.gulaDarah}`, alert: resident.gulaDarah > 160 },
                      { label: 'Kolesterol', value: `${resident.kolesterol}`, alert: resident.kolesterol > 240 },
                      { label: 'Asam Urat', value: `${resident.asamUrat}`, alert: resident.asamUrat > 7 },
                    ].map(item => (
                      <div key={item.label} className={`rounded-lg p-2 text-center ${item.alert ? 'bg-red-50' : 'bg-gray-50'}`}>
                        <p className="text-[9px] text-gray-500">{item.label}</p>
                        <p className={`text-xs font-bold ${item.alert ? 'text-red-600' : 'text-gray-700'}`}>{item.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

          </div>
        )}

        {/* PARTISIPASI TAB REMOVED - moved to /partisipasi page */}
        {false && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-4 shadow-md">
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-gray-800">Target Partisipasi Warga per Bulan</h3>
              </div>
              <div className="space-y-4">
                {Object.entries(rwTargets).map(([rw, target]) => {
                  const attendance = elderlyAttendance[rw as keyof typeof elderlyAttendance]
                  const latestMonth = Object.keys(attendance).pop() || 'april'
                  const latestAttendance = attendance[latestMonth as keyof typeof attendance]
                  const percentage = (latestAttendance / target) * 100
                  
                  return (
                    <div key={rw} className="border border-gray-200 rounded-xl p-4">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-semibold text-gray-800">RW {rw}</h4>
                        <span className={`text-sm font-medium ${percentage >= 100 ? 'text-green-600' : percentage >= 80 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {latestAttendance}/{target} PMT ({Math.round(percentage)}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3 relative">
                        {/* Inline style used for dynamic width calculation based on percentage */}
                        <div
                          className={`absolute top-0 left-0 h-3 rounded-full transition-all ${percentage >= 100 ? 'bg-green-500' : percentage >= 80 ? 'bg-yellow-500' : 'bg-red-500'}`}
                          style={{ width: `${Math.min(percentage, 100)}%` }}
                        />
                      </div>
                      <div className="mt-3 grid grid-cols-6 gap-2 text-center">
                        {Object.entries(attendance).map(([month, count]) => (
                          <div key={month} className="bg-gray-50 rounded-lg p-2">
                            <p className="text-xs text-gray-500 capitalize">{month}</p>
                            <p className="font-semibold text-gray-800">{count}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Summary - Real Time */}
            {(() => {
              const currentMonth = new Date().toLocaleString('id-ID', { month: 'long' }).toLowerCase()
              const currentMonthShort = new Date().toLocaleString('id-ID', { month: 'short' }).toLowerCase()
              const totalTarget = Object.values(rwTargets).reduce((a, b) => a + b, 0)
              const totalAchieved = Object.values(elderlyAttendance).reduce((sum, rw) => sum + (rw[currentMonth] || 0), 0)
              
              return (
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-6 h-6" />
                    <h3 className="font-semibold text-lg">Ringkasan Partisipasi Real-Time</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-blue-100 text-sm">Total Target</p>
                      <p className="text-3xl font-bold">{totalTarget} PMT</p>
                    </div>
                    <div>
                      <p className="text-blue-100 text-sm">Total Tercapai ({currentMonthShort})</p>
                      <p className="text-3xl font-bold">{totalAchieved} PMT</p>
                      <p className="text-sm text-blue-200">
                        {Math.round((totalAchieved / totalTarget) * 100)}% dari target
                      </p>
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>
        )}

        {/* Riwayat Tab - Only for Admin */}
        {isAdmin && activeTab === 'riwayat' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-md">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-gray-800">Riwayat</h3>
                </div>
              </div>

              {/* Sub Tab: Kesehatan vs Absensi */}
              <div className="flex gap-2 mb-6 border-b border-gray-200 pb-2">
                <button
                  onClick={() => setRiwayatSubTab('kesehatan')}
                  className={`px-4 py-2 rounded-t-lg font-medium whitespace-nowrap ${
                    riwayatSubTab === 'kesehatan' 
                      ? 'bg-blue-600 text-white border-b-2 border-blue-600' 
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Kesehatan
                </button>
                <button
                  onClick={() => setRiwayatSubTab('absensi')}
                  className={`px-4 py-2 rounded-t-lg font-medium whitespace-nowrap ${
                    riwayatSubTab === 'absensi' 
                      ? 'bg-green-600 text-white border-b-2 border-green-600' 
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Absensi
                </button>
              </div>

              {/* Kesehatan Content */}
              {riwayatSubTab === 'kesehatan' && (
                <>
                  {/* Health Type Tabs */}
              <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                <button
                  onClick={() => setActiveHealthTab('tensi')}
                  className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap ${
                    activeHealthTab === 'tensi' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Tekanan Darah
                </button>
                <button
                  onClick={() => setActiveHealthTab('kolesterol')}
                  className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap ${
                    activeHealthTab === 'kolesterol' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Kolesterol
                </button>
                <button
                  onClick={() => setActiveHealthTab('asamurat')}
                  className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap ${
                    activeHealthTab === 'asamurat' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Asam Urat
                </button>
                <button
                  onClick={() => setActiveHealthTab('guladarah')}
                  className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap ${
                    activeHealthTab === 'guladarah' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Gula Darah
                </button>
              </div>

              {/* Health Readings List */}
              <div className="space-y-3">
                {healthReadings
                  .filter(reading => reading.type === activeHealthTab && reading.source === 'posbindu')
                  .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                  .map((reading) => (
                    <div key={reading.id} className="border border-gray-200 rounded-xl p-4 bg-gray-50">
                      <div className="mb-2">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-semibold text-gray-800">{reading.userName || 'Unknown'}</h4>
                          <span className="text-xs text-gray-400 bg-gray-200 px-2 py-1 rounded">
                            RW {reading.rw || '-'} / RT {reading.rt || '-'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500">
                          {new Date(reading.timestamp).toLocaleDateString('id-ID', { 
                            day: 'numeric', 
                            month: 'long', 
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <div className="text-sm text-gray-600">
                        {activeHealthTab === 'tensi' && (
                          <p className="font-semibold">{reading.sistolik}/{reading.diastolik} mmHg - Nadi: {reading.nadi} bpm</p>
                        )}
                        {activeHealthTab === 'kolesterol' && (
                          <p className="font-semibold">Total: {reading.total} - LDL: {reading.ldl} - HDL: {reading.hdl}</p>
                        )}
                        {activeHealthTab === 'asamurat' && (
                          <p className="font-semibold">{reading.value} mg/dL - {reading.gender}</p>
                        )}
                        {activeHealthTab === 'guladarah' && (
                          <p className="font-semibold">{reading.value} mg/dL - {reading.condition}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-200">
                        <button
                          onClick={() => openEditHealthModal(reading)}
                          className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteHealth(reading.id)}
                          className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Hapus"
                        >
                          <Trash2 className="h-4 w-4" />
                          Hapus
                        </button>
                      </div>
                    </div>
                  ))}
                {healthReadings.filter(reading => reading.type === activeHealthTab && reading.source === 'posbindu').length === 0 && (
                  <p className="text-center text-gray-500 py-8">Belum ada data {activeHealthTab}</p>
                )}
              </div>
              </>
              )}

              {/* Absensi Content */}
              {riwayatSubTab === 'absensi' && (
                <div className="space-y-4">
                  {/* Filter Absensi */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    <select
                      value={attendanceFilter.rw}
                      onChange={(e) => {
                        setAttendanceFilter({...attendanceFilter, rw: e.target.value})
                        setAttendancePage(1) // Reset ke halaman 1
                      }}
                      className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      title="Filter RW"
                    >
                      <option value="">Semua RW</option>
                      {['01','02','03','04','05','06','07','08','09','10','11','12','13','14','15','16','17','18','19','20'].map(rw => (
                        <option key={rw} value={rw}>RW {rw}</option>
                      ))}
                    </select>
                    <select
                      value={attendanceFilter.rt}
                      onChange={(e) => {
                        setAttendanceFilter({...attendanceFilter, rt: e.target.value})
                        setAttendancePage(1) // Reset ke halaman 1
                      }}
                      className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      title="Filter RT"
                    >
                      <option value="">Semua RT</option>
                      {['01','02','03','04','05','06','07','08','09','10','11','12','13','14','15','16','17','18','19','20'].map(rt => (
                        <option key={rt} value={rt}>RT {rt}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="Cari nama/NIK..."
                      value={attendanceFilter.search}
                      onChange={(e) => {
                        setAttendanceFilter({...attendanceFilter, search: e.target.value})
                        setAttendancePage(1) // Reset ke halaman 1
                      }}
                      className="px-3 py-2 border border-gray-200 rounded-lg text-sm flex-1 min-w-[200px]"
                    />
                  </div>

                  {/* Tabel Riwayat Absensi */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium text-gray-700">Nama</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-700">NIK</th>
                          <th className="px-4 py-3 text-center font-medium text-gray-700">Umur</th>
                          <th className="px-4 py-3 text-center font-medium text-gray-700">RT/RW</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-700">Tanggal</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-700">Waktu</th>
                          <th className="px-4 py-3 text-center font-medium text-gray-700">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {(() => {
                          const filteredData = attendanceList.filter(item => {
                            if (attendanceFilter.rw && normalizeRTRW(item.rw) !== normalizeRTRW(attendanceFilter.rw)) return false
                            if (attendanceFilter.rt && normalizeRTRW(item.rt) !== normalizeRTRW(attendanceFilter.rt)) return false
                            if (attendanceFilter.search) {
                              const searchLower = attendanceFilter.search.toLowerCase()
                              return (item.nama?.toLowerCase().includes(searchLower) || 
                                      item.nik?.includes(searchLower))
                            }
                            return true
                          })
                          
                          const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE)
                          const startIndex = (attendancePage - 1) * ITEMS_PER_PAGE
                          const endIndex = startIndex + ITEMS_PER_PAGE
                          const paginatedData = filteredData.slice(startIndex, endIndex)
                          
                          return paginatedData.map((item) => (
                          <tr key={item.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium text-gray-800">{item.nama || '-'}</td>
                            <td className="px-4 py-3 text-gray-600">{item.nik || '-'}</td>
                            <td className="px-4 py-3 text-center text-gray-600">{item.umur || '-'}</td>
                            <td className="px-4 py-3 text-center">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                RT {item.rt || '-'}/RW {item.rw || '-'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-gray-600">{item.date || '-'}</td>
                            <td className="px-4 py-3 text-gray-600">{item.time || '-'}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => openAttendanceEditModal(item)}
                                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="Edit"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => handleDeleteAttendance(item.id)}
                                  className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Hapus"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                          ))
                        })()}
                      </tbody>
                    </table>
                    {attendanceList.filter(item => {
                      if (attendanceFilter.rw && normalizeRTRW(item.rw) !== normalizeRTRW(attendanceFilter.rw)) return false
                      if (attendanceFilter.rt && normalizeRTRW(item.rt) !== normalizeRTRW(attendanceFilter.rt)) return false
                      if (attendanceFilter.search) {
                        const searchLower = attendanceFilter.search.toLowerCase()
                        return (item.nama?.toLowerCase().includes(searchLower) || 
                                item.nik?.includes(searchLower))
                      }
                      return true
                    }).length === 0 && (
                      <p className="text-center text-gray-500 py-8">Belum ada data absensi</p>
                    )}
                  </div>
                  
                  {/* Pagination Navigation */}
                  {(() => {
                    const filteredCount = attendanceList.filter(item => {
                      if (attendanceFilter.rw && normalizeRTRW(item.rw) !== normalizeRTRW(attendanceFilter.rw)) return false
                      if (attendanceFilter.rt && normalizeRTRW(item.rt) !== normalizeRTRW(attendanceFilter.rt)) return false
                      if (attendanceFilter.search) {
                        const searchLower = attendanceFilter.search.toLowerCase()
                        return (item.nama?.toLowerCase().includes(searchLower) || 
                                item.nik?.includes(searchLower))
                      }
                      return true
                    }).length
                    
                    const totalPages = Math.ceil(filteredCount / ITEMS_PER_PAGE)
                    
                    if (totalPages <= 1) {
                      return (
                        <p className="text-sm text-gray-500 mt-2">
                          Total: {filteredCount} absensi
                        </p>
                      )
                    }
                    
                    return (
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                        <p className="text-sm text-gray-500">
                          Total: {filteredCount} absensi | Halaman {attendancePage} dari {totalPages}
                        </p>
                        
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setAttendancePage(prev => Math.max(1, prev - 1))}
                            disabled={attendancePage === 1}
                            className="px-3 py-1 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-gray-100 hover:bg-gray-200 text-gray-700"
                          >
                            ← Previous
                          </button>
                          
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum
                            if (totalPages <= 5) {
                              pageNum = i + 1
                            } else if (attendancePage <= 3) {
                              pageNum = i + 1
                            } else if (attendancePage >= totalPages - 2) {
                              pageNum = totalPages - 4 + i
                            } else {
                              pageNum = attendancePage - 2 + i
                            }
                            
                            return (
                              <button
                                key={pageNum}
                                onClick={() => setAttendancePage(pageNum)}
                                className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                                  attendancePage === pageNum
                                    ? 'bg-green-600 text-white'
                                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                                }`}
                              >
                                {pageNum}
                              </button>
                            )
                          })}
                          
                          {totalPages > 5 && attendancePage < totalPages - 2 && (
                            <span className="px-2 text-gray-500">...</span>
                          )}
                          
                          {totalPages > 5 && attendancePage < totalPages - 2 && (
                            <button
                              onClick={() => setAttendancePage(totalPages)}
                              className="w-8 h-8 rounded-lg text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                            >
                              {totalPages}
                            </button>
                          )}
                          
                          <button
                            onClick={() => setAttendancePage(prev => Math.min(totalPages, prev + 1))}
                            disabled={attendancePage === totalPages}
                            className="px-3 py-1 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-gray-100 hover:bg-gray-200 text-gray-700"
                          >
                            Next →
                          </button>
                        </div>
                      </div>
                    )
                  })()}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Absen Tab - Only for non-admin */}
        {!isAdmin && activeTab === 'absen' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-md">
              <div className="flex items-center gap-2 mb-6">
                <UserPlus className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-gray-800">Form Absensi Posbindu</h3>
              </div>
              <form onSubmit={handleCheckIn} className="space-y-4">
                {/* Auto-fill from profile checkbox */}
                <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <input
                    type="checkbox"
                    id="autoFill"
                    checked={autoFillFromProfile}
                    onChange={(e) => setAutoFillFromProfile(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <label htmlFor="autoFill" className="text-sm text-blue-800 font-medium cursor-pointer">
                    Isi data otomatis dari profil saya
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nama Lengkap</label>
                  <input
                    type="text"
                    required
                    value={checkInForm.nama}
                    onChange={(e) => setCheckInForm({ ...checkInForm, nama: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Masukkan nama lengkap"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">NIK</label>
                  <input
                    type="text"
                    required
                    value={checkInForm.nik}
                    onChange={(e) => setCheckInForm({ ...checkInForm, nik: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Masukkan NIK (16 digit)"
                    maxLength={16}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Umur</label>
                  <input
                    type="number"
                    required
                    value={checkInForm.umur}
                    onChange={(e) => setCheckInForm({ ...checkInForm, umur: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Masukkan umur"
                    min={0}
                    max={120}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">RT</label>
                    <select
                      required
                      value={checkInForm.rt}
                      onChange={(e) => setCheckInForm({ ...checkInForm, rt: e.target.value })}
                      aria-label="Pilih RT"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Pilih RT</option>
                      {['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20'].map(rt => (
                        <option key={rt} value={rt}>RT {rt}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">RW</label>
                    <select
                      required
                      value={checkInForm.rw}
                      onChange={(e) => setCheckInForm({ ...checkInForm, rw: e.target.value })}
                      aria-label="Pilih RW"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Pilih RW</option>
                      {['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20'].map(rw => (
                        <option key={rw} value={rw}>RW {rw}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Alamat Jalan</label>
                  <input
                    type="text"
                    required
                    value={checkInForm.alamat}
                    onChange={(e) => setCheckInForm({ ...checkInForm, alamat: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Masukkan alamat lengkap"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-5 h-5" />
                  Simpan Data Absensi
                </button>
              </form>
            </div>

            <div className="bg-blue-50 rounded-2xl p-4 border border-blue-200">
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-blue-800 mb-1">Informasi</h4>
                  <p className="text-sm text-blue-700">
                    Setiap warga yang datang ke Posbindu wajib melakukan absensi terlebih dahulu dengan mengisi data lengkap di atas.
                    Data ini akan digunakan untuk monitoring kesehatan dan partisipasi lansia.
                  </p>
                </div>
              </div>
            </div>

            {/* User Attendance History - Only for non-admin */}
            {!isAdmin && showAttendanceHistory && userAttendance.length > 0 && (
              <div className="bg-white rounded-2xl p-4 shadow-md mt-6">
                <div className="flex items-center gap-2 mb-4">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-gray-800">Riwayat Absensi Anda</h3>
                </div>
                <div className="space-y-3">
                  {userAttendance
                    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                    .map((attendance) => (
                      <div key={attendance.id} className="border border-gray-200 rounded-xl p-4 bg-gray-50">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-semibold text-gray-800">{attendance.nama}</h4>
                            <p className="text-sm text-gray-500">NIK: {attendance.nik}</p>
                          </div>
                          <span className="text-xs text-gray-400">
                            {attendance.date} - {attendance.time}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600">
                          <p>RT {attendance.rt} / RW {attendance.rw}</p>
                          <p className="text-xs text-gray-500">{attendance.alamat}</p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal Form for Add/Edit Resident */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-800">
                  {editingResident ? 'Edit Data Warga' : 'Tambah Warga Baru'}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Tutup modal"
                  aria-label="Tutup modal"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              <form onSubmit={editingResident ? handleEditResident : handleAddResident} className="space-y-4">
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

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">RT *</label>
                    <select
                      required
                      value={residentForm.rt}
                      onChange={(e) => setResidentForm({ ...residentForm, rt: e.target.value })}
                      aria-label="Pilih RT"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Pilih RT</option>
                      {['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20'].map(rt => (
                        <option key={rt} value={rt}>RT {rt}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">RW *</label>
                    <select
                      required
                      value={residentForm.rw}
                      onChange={(e) => setResidentForm({ ...residentForm, rw: e.target.value })}
                      aria-label="Pilih RW"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Pilih RW</option>
                      {['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20'].map(rw => (
                        <option key={rw} value={rw}>RW {rw}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Umur *</label>
                    <input
                      type="number"
                      required
                      value={residentForm.umur}
                      onChange={(e) => setResidentForm({ ...residentForm, umur: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Umur"
                      min={0}
                      max={120}
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
                      aria-label="Pilih jenis kelamin"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                      placeholder="Alamat lengkap"
                    />
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4 mt-4">
                  <h4 className="font-semibold text-gray-800 mb-4">Data Kesehatan</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Tekanan Darah *</label>
                      <input
                        type="number"
                        step="0.1"
                        required
                        value={residentForm.tekananDarah}
                        onChange={(e) => setResidentForm({ ...residentForm, tekananDarah: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Contoh: 120/80"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Gula Darah (mg/dL) *</label>
                      <input
                        type="number"
                        required
                        value={residentForm.gulaDarah}
                        onChange={(e) => setResidentForm({ ...residentForm, gulaDarah: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Contoh: 100"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Kolesterol (mg/dL) *</label>
                      <input
                        type="number"
                        required
                        value={residentForm.kolesterol}
                        onChange={(e) => setResidentForm({ ...residentForm, kolesterol: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Contoh: 200"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Asam Urat (mg/dL) *</label>
                      <input
                        type="number"
                        step="0.1"
                        required
                        value={residentForm.asamUrat}
                        onChange={(e) => setResidentForm({ ...residentForm, asamUrat: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Contoh: 6.0"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    {editingResident ? 'Simpan Perubahan' : 'Tambah Warga'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Form for Add Posbindu Data */}
      {isPosbinduModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-800">
                  Tambah Data Posbindu
                </h3>
                <button
                  onClick={() => setIsPosbinduModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Tutup modal"
                  aria-label="Tutup modal"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              <form onSubmit={handlePosbinduSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tipe Pengecekan *</label>
                  <select
                    required
                    value={posbinduForm.type}
                    onChange={(e) => setPosbinduForm({ ...posbinduForm, type: e.target.value as any })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    title="Tipe Pengecekan"
                  >
                    <option value="tensi">Tekanan Darah</option>
                    <option value="kolesterol">Kolesterol</option>
                    <option value="asamurat">Asam Urat</option>
                    <option value="guladarah">Gula Darah</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nama Pasien *</label>
                  <input
                    type="text"
                    required
                    value={posbinduForm.userName}
                    onChange={(e) => setPosbinduForm({ ...posbinduForm, userName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Masukkan nama pasien"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">RT *</label>
                    <select
                      required
                      value={posbinduForm.rt}
                      onChange={(e) => setPosbinduForm({ ...posbinduForm, rt: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      title="Pilih RT"
                    >
                      <option value="">Pilih RT</option>
                      {['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20'].map(rt => (
                        <option key={rt} value={rt}>RT {rt}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">RW *</label>
                    <select
                      required
                      value={posbinduForm.rw}
                      onChange={(e) => setPosbinduForm({ ...posbinduForm, rw: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      title="Pilih RW"
                    >
                      <option value="">Pilih RW</option>
                      {['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20'].map(rw => (
                        <option key={rw} value={rw}>RW {rw}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Kelurahan *</label>
                  <input
                    type="text"
                    required
                    value={posbinduForm.kelurahan}
                    onChange={(e) => setPosbinduForm({ ...posbinduForm, kelurahan: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Masukkan nama kelurahan"
                  />
                </div>

                {posbinduForm.type === 'tensi' && (
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Sistolik (mmHg) *</label>
                      <input
                        type="number"
                        required
                        value={posbinduForm.sistolik}
                        onChange={(e) => setPosbinduForm({ ...posbinduForm, sistolik: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="120"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Diastolik (mmHg) *</label>
                      <input
                        type="number"
                        required
                        value={posbinduForm.diastolik}
                        onChange={(e) => setPosbinduForm({ ...posbinduForm, diastolik: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="80"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Nadi (bpm) *</label>
                      <input
                        type="number"
                        required
                        value={posbinduForm.nadi}
                        onChange={(e) => setPosbinduForm({ ...posbinduForm, nadi: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="72"
                      />
                    </div>
                  </div>
                )}

                {posbinduForm.type === 'kolesterol' && (
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Total (mg/dL) *</label>
                      <input
                        type="number"
                        required
                        value={posbinduForm.total}
                        onChange={(e) => setPosbinduForm({ ...posbinduForm, total: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="200"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">LDL (mg/dL) *</label>
                      <input
                        type="number"
                        required
                        value={posbinduForm.ldl}
                        onChange={(e) => setPosbinduForm({ ...posbinduForm, ldl: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="130"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">HDL (mg/dL) *</label>
                      <input
                        type="number"
                        required
                        value={posbinduForm.hdl}
                        onChange={(e) => setPosbinduForm({ ...posbinduForm, hdl: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Trigliserida (mg/dL) *</label>
                      <input
                        type="number"
                        required
                        value={posbinduForm.trigliserida}
                        onChange={(e) => setPosbinduForm({ ...posbinduForm, trigliserida: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="150"
                      />
                    </div>
                  </div>
                )}

                {(posbinduForm.type === 'asamurat' || posbinduForm.type === 'guladarah') && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Nilai (mg/dL) *</label>
                      <input
                        type="number"
                        step="0.1"
                        required
                        value={posbinduForm.value}
                        onChange={(e) => setPosbinduForm({ ...posbinduForm, value: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="6.0"
                      />
                    </div>
                    {posbinduForm.type === 'asamurat' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Jenis Kelamin *</label>
                        <select
                          required
                          value={posbinduForm.gender}
                          onChange={(e) => setPosbinduForm({ ...posbinduForm, gender: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          title="Jenis Kelamin"
                        >
                          <option value="pria">Pria</option>
                          <option value="wanita">Wanita</option>
                        </select>
                      </div>
                    )}
                  </>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsPosbinduModalOpen(false)}
                    className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    Simpan Data
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Form for Edit Health Data */}
      {isHealthEditModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-800">Edit Data Kesehatan</h3>
                <button
                  onClick={() => setIsHealthEditModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Tutup modal"
                  aria-label="Tutup modal"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              <form onSubmit={handleEditHealth} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nama Warga *</label>
                  <input
                    type="text"
                    required
                    value={healthEditForm.userName}
                    onChange={(e) => setHealthEditForm({ ...healthEditForm, userName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Masukkan nama warga"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">RT *</label>
                    <select
                      required
                      value={healthEditForm.rt}
                      onChange={(e) => setHealthEditForm({ ...healthEditForm, rt: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      title="Pilih RT"
                    >
                      <option value="">Pilih RT</option>
                      {['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20'].map(rt => (
                        <option key={rt} value={rt}>RT {rt}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">RW *</label>
                    <select
                      required
                      value={healthEditForm.rw}
                      onChange={(e) => setHealthEditForm({ ...healthEditForm, rw: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      title="Pilih RW"
                    >
                      <option value="">Pilih RW</option>
                      {['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20'].map(rw => (
                        <option key={rw} value={rw}>RW {rw}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {healthEditForm.type === 'tensi' && (
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Sistolik (mmHg) *</label>
                      <input
                        type="number"
                        required
                        value={healthEditForm.sistolik}
                        onChange={(e) => setHealthEditForm({ ...healthEditForm, sistolik: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="120"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Diastolik (mmHg) *</label>
                      <input
                        type="number"
                        required
                        value={healthEditForm.diastolik}
                        onChange={(e) => setHealthEditForm({ ...healthEditForm, diastolik: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="80"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Nadi (bpm) *</label>
                      <input
                        type="number"
                        required
                        value={healthEditForm.nadi}
                        onChange={(e) => setHealthEditForm({ ...healthEditForm, nadi: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="72"
                      />
                    </div>
                  </div>
                )}

                {healthEditForm.type === 'kolesterol' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Total (mg/dL) *</label>
                      <input
                        type="number"
                        required
                        value={healthEditForm.total}
                        onChange={(e) => setHealthEditForm({ ...healthEditForm, total: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="200"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">LDL (mg/dL) *</label>
                      <input
                        type="number"
                        required
                        value={healthEditForm.ldl}
                        onChange={(e) => setHealthEditForm({ ...healthEditForm, ldl: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="130"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">HDL (mg/dL) *</label>
                      <input
                        type="number"
                        required
                        value={healthEditForm.hdl}
                        onChange={(e) => setHealthEditForm({ ...healthEditForm, hdl: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Trigliserida (mg/dL) *</label>
                      <input
                        type="number"
                        required
                        value={healthEditForm.trigliserida}
                        onChange={(e) => setHealthEditForm({ ...healthEditForm, trigliserida: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="150"
                      />
                    </div>
                  </div>
                )}

                {(healthEditForm.type === 'asamurat' || healthEditForm.type === 'guladarah') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nilai (mg/dL) *</label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={healthEditForm.value}
                      onChange={(e) => setHealthEditForm({ ...healthEditForm, value: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={healthEditForm.type === 'asamurat' ? '6.0' : '100'}
                    />
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsHealthEditModalOpen(false)}
                    className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    Simpan Perubahan
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Form for Edit Attendance */}
      {isAttendanceEditModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-800">Edit Data Absensi</h3>
                <button
                  onClick={() => setIsAttendanceEditModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Tutup modal"
                  aria-label="Tutup modal"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              <form onSubmit={handleEditAttendance} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nama *</label>
                  <input
                    type="text"
                    required
                    value={attendanceForm.nama}
                    onChange={(e) => setAttendanceForm({ ...attendanceForm, nama: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Masukkan nama"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">NIK</label>
                    <input
                      type="text"
                      value={attendanceForm.nik}
                      onChange={(e) => setAttendanceForm({ ...attendanceForm, nik: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Masukkan NIK"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Umur</label>
                    <input
                      type="number"
                      value={attendanceForm.umur}
                      onChange={(e) => setAttendanceForm({ ...attendanceForm, umur: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Umur"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">RT *</label>
                    <select
                      required
                      value={attendanceForm.rt}
                      onChange={(e) => setAttendanceForm({ ...attendanceForm, rt: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      title="Pilih RT"
                    >
                      <option value="">Pilih RT</option>
                      {['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20'].map(rt => (
                        <option key={rt} value={rt}>RT {rt}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">RW *</label>
                    <select
                      required
                      value={attendanceForm.rw}
                      onChange={(e) => setAttendanceForm({ ...attendanceForm, rw: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      title="Pilih RW"
                    >
                      <option value="">Pilih RW</option>
                      {['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20'].map(rw => (
                        <option key={rw} value={rw}>RW {rw}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Alamat</label>
                  <input
                    type="text"
                    value={attendanceForm.alamat}
                    onChange={(e) => setAttendanceForm({ ...attendanceForm, alamat: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Masukkan alamat"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsAttendanceEditModalOpen(false)}
                    className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    Simpan Perubahan
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
