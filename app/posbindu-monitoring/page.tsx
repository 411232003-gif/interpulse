'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { collection, doc, addDoc, updateDoc, deleteDoc, getDocs, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Users, History, Search, Filter, Plus, Edit, Trash2, X, AlertCircle, TrendingUp, Target, UserPlus, Calendar, Activity, ArrowLeft, CheckCircle, Download, FileText, MessageSquare, ChevronDown } from 'lucide-react'
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
  birthDate: string
  umur: number
  jenisKelamin: 'L' | 'P'
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
  const [editingResident, setEditingResident] = useState<Resident | null>(null)
  const [residentForm, setResidentForm] = useState({
    nama: '',
    nik: '',
    rw: '',
    rt: '',
    birthDate: '',
    umur: '',
    jenisKelamin: 'L',
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
  const [attendanceList, setAttendanceList] = useState<any[]>([])
  const [attendanceFilter, setAttendanceFilter] = useState({ rw: '', rt: '', search: '' })
  const [attendancePage, setAttendancePage] = useState(1)
  const ITEMS_PER_PAGE = 20

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
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false)
  const [riwayatExportOpen, setRiwayatExportOpen] = useState(false)
  const [showSuccessNotification, setShowSuccessNotification] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

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

  // CRUD functions
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

  const handleAddResident = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const age = calculateAge(residentForm.birthDate)
      const newResident = {
        nama: residentForm.nama,
        nik: residentForm.nik,
        rw: residentForm.rw,
        rt: residentForm.rt,
        birthDate: residentForm.birthDate,
        umur: age,
        jenisKelamin: residentForm.jenisKelamin,
        alamat: residentForm.alamat,
      }
      await addDoc(collection(db, 'residents'), newResident)
      setIsModalOpen(false)
      resetResidentForm()
      setSuccessMessage('Data warga berhasil ditambahkan')
      setShowSuccessNotification(true)
      setTimeout(() => setShowSuccessNotification(false), 3000)
    } catch (error) {
      console.error('Error adding resident:', error)
      alert('Gagal menambahkan data warga')
    }
  }

  const handleEditResident = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingResident) return
    try {
      const age = calculateAge(residentForm.birthDate)
      const updatedResident = {
        nama: residentForm.nama,
        nik: residentForm.nik,
        rw: residentForm.rw,
        rt: residentForm.rt,
        birthDate: residentForm.birthDate,
        umur: age,
        jenisKelamin: residentForm.jenisKelamin,
        alamat: residentForm.alamat,
      }
      await updateDoc(doc(db, 'residents', editingResident.id), updatedResident)
      setIsModalOpen(false)
      setEditingResident(null)
      resetResidentForm()
      setSuccessMessage('Data warga berhasil diperbarui')
      setShowSuccessNotification(true)
      setTimeout(() => setShowSuccessNotification(false), 3000)
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
      birthDate: resident.birthDate || '',
      umur: resident.umur.toString(),
      jenisKelamin: resident.jenisKelamin,
      alamat: resident.alamat,
    })
    setIsModalOpen(true)
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

  const resetResidentForm = () => {
    setResidentForm({
      nama: '',
      nik: '',
      rw: '',
      rt: '',
      birthDate: '',
      umur: '',
      jenisKelamin: 'L',
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
      const age = resident.umur
      if (filterUmur === '0-20' && (age < 0 || age > 20)) return false
      if (filterUmur === '21-50' && (age < 21 || age > 50)) return false
      if (filterUmur === '51-60' && (age < 51 || age > 60)) return false
      if (filterUmur === '60+' && age < 60) return false
    }
    if (searchNama && resident.nama && !resident.nama.toLowerCase().includes(searchNama.toLowerCase())) return false
    return true
  })

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
      resident.alamat
    ])
    
    autoTable(doc, {
      startY: 55,
      head: [['Nama', 'NIK', 'RW/RT', 'Umur', 'Jenis Kelamin', 'Alamat']],
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
      { wch: 30 }, // Alamat
    ]
    
    XLSX.writeFile(wb, 'data-warga-posbindu.xlsx')
  }

  // Export to WhatsApp
  const exportToWhatsApp = () => {
    const total = filteredResidents.length
    const elderly = filteredResidents.filter(r => r.umur >= 60).length
    
    let message = `📊 *DATA WARGA POSBINDU*\n`
    message += `🏥 Kelurahan Duris Selatan\n`
    message += `📅 ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}\n\n`
    message += `━━━━━━━━━━━━━━━━━━━━\n\n`
    message += `📈 *RINGKASAN DATA*\n`
    message += `• Total Warga: ${total}\n`
    message += `• Lansia (60+): ${elderly}\n\n`
    message += `━━━━━━━━━━━━━━━━━━━━\n\n`
    message += `📋 *DATA DETAIL*\n\n`
    
    filteredResidents.forEach((resident, index) => {
      message += `${index + 1}. ${resident.nama}\n`
      message += `   NIK: ${resident.nik}\n`
      message += `   RW/RT: ${resident.rw}/${resident.rt} | Umur: ${resident.umur} th\n`
      message += `   Alamat: ${resident.alamat}\n\n`
    })
    
    message += `━━━━━━━━━━━━━━━━━━━━\n`
    message += `📱 InterPulse - Aplikasi Kesehatan Terpadu\n`
    
    const encodedMessage = encodeURIComponent(message)
    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank')
  }

  // Export Attendance to PDF
  const exportAttendanceToPDF = () => {
    const doc = new jsPDF()
    
    doc.setFillColor(37, 99, 235)
    doc.rect(0, 0, 210, 40, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(22)
    doc.setFont('helvetica', 'bold')
    doc.text('Riwayat Absensi', 105, 20, { align: 'center' })
    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.text(`Kelurahan Duris Selatan - ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, 105, 30, { align: 'center' })
    
    const filteredAttendance = attendanceList
      .filter(att => {
        if (attendanceFilter.rw && att.rw !== attendanceFilter.rw) return false
        if (attendanceFilter.rt && att.rt !== attendanceFilter.rt) return false
        if (attendanceFilter.search && !att.nama.toLowerCase().includes(attendanceFilter.search.toLowerCase())) return false
        return true
      })
    
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(10)
    doc.text(`Total Absensi: ${filteredAttendance.length}`, 14, 50)
    
    const tableData = filteredAttendance.map(att => [
      att.nama,
      att.nik,
      `RW ${att.rw}/RT ${att.rt}`,
      att.umur,
      att.alamat,
      new Date(att.timestamp).toLocaleDateString('id-ID'),
      new Date(att.timestamp).toLocaleTimeString('id-ID')
    ])
    
    autoTable(doc, {
      startY: 55,
      head: [['Nama', 'NIK', 'RW/RT', 'Umur', 'Alamat', 'Tanggal', 'Waktu']],
      body: tableData,
      styles: {
        fontSize: 7,
        cellPadding: 2,
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
    
    doc.save('riwayat-absensi.pdf')
  }

  // Export Attendance to Excel
  const exportAttendanceToExcel = () => {
    const filteredAttendance = attendanceList
      .filter(att => {
        if (attendanceFilter.rw && att.rw !== attendanceFilter.rw) return false
        if (attendanceFilter.rt && att.rt !== attendanceFilter.rt) return false
        if (attendanceFilter.search && !att.nama.toLowerCase().includes(attendanceFilter.search.toLowerCase())) return false
        return true
      })
    
    const data = filteredAttendance.map(att => ({
      'Nama': att.nama,
      'NIK': att.nik,
      'RW': att.rw,
      'RT': att.rt,
      'Umur': att.umur,
      'Alamat': att.alamat,
      'Tanggal': new Date(att.timestamp).toLocaleDateString('id-ID'),
      'Waktu': new Date(att.timestamp).toLocaleTimeString('id-ID'),
    }))
    
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Riwayat Absensi')
    
    ws['!cols'] = [
      { wch: 20 },
      { wch: 18 },
      { wch: 5 },
      { wch: 5 },
      { wch: 8 },
      { wch: 30 },
      { wch: 15 },
      { wch: 10 },
    ]
    
    XLSX.writeFile(wb, 'riwayat-absensi.xlsx')
  }

  // Export Attendance to WhatsApp
  const exportAttendanceToWhatsApp = () => {
    const filteredAttendance = attendanceList
      .filter(att => {
        if (attendanceFilter.rw && att.rw !== attendanceFilter.rw) return false
        if (attendanceFilter.rt && att.rt !== attendanceFilter.rt) return false
        if (attendanceFilter.search && !att.nama.toLowerCase().includes(attendanceFilter.search.toLowerCase())) return false
        return true
      })
    
    let message = `📊 *RIWAYAT ABSENSI POSBINDU*\n`
    message += `🏥 Kelurahan Duris Selatan\n`
    message += `📅 ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}\n\n`
    message += `━━━━━━━━━━━━━━━━━━━━\n\n`
    message += `📈 *RINGKASAN DATA*\n`
    message += `• Total Absensi: ${filteredAttendance.length}\n\n`
    message += `━━━━━━━━━━━━━━━━━━━━\n\n`
    message += `📋 *DATA DETAIL*\n\n`
    
    filteredAttendance.forEach((att, index) => {
      message += `${index + 1}. ${att.nama}\n`
      message += `   NIK: ${att.nik}\n`
      message += `   RW/RT: ${att.rw}/${att.rt} | Umur: ${att.umur} th\n`
      message += `   Alamat: ${att.alamat}\n`
      message += `   Tanggal: ${new Date(att.timestamp).toLocaleDateString('id-ID')}\n`
      message += `   Waktu: ${new Date(att.timestamp).toLocaleTimeString('id-ID')}\n\n`
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
      {/* Success Notification */}
      {showSuccessNotification && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-right">
          <div className="bg-white rounded-2xl shadow-2xl p-4 flex items-center gap-3 border-l-4 border-green-500">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-800">{successMessage}</p>
            </div>
          </div>
        </div>
      )}

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
              <Calendar className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">Absensi</span>
            </button>
          </div>
        </div>
      )}

      <div className="px-4 mt-6">
        {/* Data Warga Tab */}
        {activeTab === 'datawarga' && (
          <div className="space-y-4">
            {/* Summary + Export + Add Button */}
            <div className="flex items-center justify-between gap-3">
              <div className="bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl px-4 py-3 shadow-md flex-1">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-white" />
                  <div>
                    <span className="text-white font-bold text-lg">{filteredResidents.length}</span>
                    <span className="text-blue-100 text-xs ml-1">warga ditemukan</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Export Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
                    className="flex items-center justify-center w-12 h-12 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-2xl shadow-md hover:from-gray-700 hover:to-gray-800 transition-all"
                    title="Export Data"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                  {exportDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-200 z-50">
                      <button
                        onClick={() => { exportToPDF(); setExportDropdownOpen(false); }}
                        className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors first:rounded-t-xl"
                      >
                        <svg className="w-5 h-5 text-red-500" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4zm-3 9h-2v-2h2v2zm0-4h-2V7h2v2z"/>
                        </svg>
                        <span className="text-sm text-gray-700">Export PDF</span>
                      </button>
                      <button
                        onClick={() => { exportToExcel(); setExportDropdownOpen(false); }}
                        className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                      >
                        <svg className="w-5 h-5 text-green-600" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4zM4 22h16v-2H4v2zm0-4h16v-2H4v2zm0-4h16v-2H4v2zm0-4h16V8H4v2z"/>
                        </svg>
                        <span className="text-sm text-gray-700">Export Excel</span>
                      </button>
                      <button
                        onClick={() => { exportToWhatsApp(); setExportDropdownOpen(false); }}
                        className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors last:rounded-b-xl"
                      >
                        <svg className="w-5 h-5 text-green-500" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                        <span className="text-sm text-gray-700">Export WhatsApp</span>
                      </button>
                    </div>
                  )}
                </div>
                <button
                  onClick={openAddModal}
                  className="flex items-center justify-center w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-2xl shadow-md hover:from-blue-600 hover:to-indigo-700 transition-all"
                  title="Tambah Warga"
                >
                  <Plus className="w-5 h-5" />
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
                  <div className="flex items-start justify-between mb-3">
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
                </div>
              ))}
            </div>

          </div>
        )}

        {/* Riwayat Tab - Only for Admin */}
        {isAdmin && activeTab === 'riwayat' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-md">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-gray-800">Riwayat Absensi</h3>
                </div>
                {/* Export Dropdown for Absensi */}
                <div className="relative">
                  <button
                    onClick={() => setRiwayatExportOpen(!riwayatExportOpen)}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-600 text-white rounded-xl text-sm font-medium hover:bg-gray-700 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">Export</span>
                  </button>
                  {riwayatExportOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-200 z-50">
                      <button
                        onClick={() => { exportAttendanceToPDF(); setRiwayatExportOpen(false); }}
                        className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors first:rounded-t-xl"
                      >
                        <svg className="w-5 h-5 text-red-500" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4zm-3 9h-2v-2h2v2zm0-4h-2V7h2v2z"/>
                        </svg>
                        <span className="text-sm text-gray-700">Export PDF</span>
                      </button>
                      <button
                        onClick={() => { exportAttendanceToExcel(); setRiwayatExportOpen(false); }}
                        className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                      >
                        <svg className="w-5 h-5 text-green-600" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4zM4 22h16v-2H4v2zm0-4h16v-2H4v2zm0-4h16v-2H4v2zm0-4h16V8H4v2z"/>
                        </svg>
                        <span className="text-sm text-gray-700">Export Excel</span>
                      </button>
                      <button
                        onClick={() => { exportAttendanceToWhatsApp(); setRiwayatExportOpen(false); }}
                        className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors last:rounded-b-xl"
                      >
                        <svg className="w-5 h-5 text-green-500" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                        <span className="text-sm text-gray-700">Export WhatsApp</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Absensi Content */}
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
                  {editingResident ? 'Tambah Data Warga' : 'Tambah Data Warga'}
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
                    <div className="relative">
                      <input
                        type="date"
                        required
                        title="Tanggal Lahir"
                        value={residentForm.birthDate}
                        onChange={(e) => setResidentForm({ ...residentForm, birthDate: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {residentForm.birthDate && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-500 bg-white px-1.5 py-0.5 rounded border border-gray-200">
                          {calculateAge(residentForm.birthDate)} th
                        </div>
                      )}
                    </div>
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

                <div className="flex gap-3 pt-4 mt-4">
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
