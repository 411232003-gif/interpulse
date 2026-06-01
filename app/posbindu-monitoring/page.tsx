'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { collection, doc, addDoc, updateDoc, deleteDoc, getDocs, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Users, History, Search, Filter, Plus, Edit, Trash2, X, AlertCircle, TrendingUp, Target, UserPlus, Calendar, Activity, ArrowLeft, CheckCircle, Download, FileText, MessageSquare, ChevronDown, Info, ArrowRight } from 'lucide-react'
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
  password?: string
}

// Mock data for attendance
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
  const [activeTab, setActiveTab] = useState<'datawarga'>('datawarga')
  const [autoFillFromProfile, setAutoFillFromProfile] = useState(false)
  const [filterRW, setFilterRW] = useState<string>('')
  const [filterRT, setFilterRT] = useState<string>('')
  const [filterUmur, setFilterUmur] = useState<string>('')
  const [searchNama, setSearchNama] = useState('')
  const [residents, setResidents] = useState<Resident[]>([])
  const [selectedResidents, setSelectedResidents] = useState<Set<string>>(new Set())
  const [isSelectionMode, setIsSelectionMode] = useState(false)
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
    password: '',
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
  const [attendanceData, setAttendanceData] = useState<Record<string, Record<string, number>>>(mockAttendance)
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
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 4000)
  }
  const [healthTypeFilter, setHealthTypeFilter] = useState<string>('all')
  const [healthTypeDropdownOpen, setHealthTypeDropdownOpen] = useState(false)
  const [healthReadings, setHealthReadings] = useState<Record<string, any>>({})
  const [tbbbData, setTbbbData] = useState<Record<string, any>>({})
  const [todayAttendance, setTodayAttendance] = useState<Record<string, any>>({})

  // Fetch residents from Firestore
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
        const seenIds = new Set(residentsData.map(r => r.id))
        
        usersData.forEach(user => {
          // Exclude admin users from resident list
          if (user.role === 'admin') return
          
          if (user.nik && !mergedData.find(r => r.nik === user.nik)) {
            // Add user as resident if not already exists
            const age = user.birthDate ? calculateAge(user.birthDate) : 0
            // Use a unique key combining uid and prefix to avoid conflicts
            const uniqueId = `user_${user.uid}`
            if (!seenIds.has(uniqueId)) {
              mergedData.push({
                id: uniqueId,
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
              seenIds.add(uniqueId)
            }
          }
        })
        
        setResidents(mergedData)
      }, (error) => {
        console.error('Error fetching users:', error)
        setResidents(residentsData)
      })
      
      return () => unsubscribeUsers()
    }, (error) => {
      console.error('Error fetching residents:', error)
      setResidents([])
    })
    
    return () => unsubscribeResidents()
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
  }, [autoFillFromProfile, userProfile])

  // Fetch attendance from Firestore - REAL TIME SYNC
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
      setAttendanceData(attendanceData)
    }, (error) => {
      console.error('Error fetching attendance:', error)
      setAttendanceData(mockAttendance)
    })
    return () => unsubscribe()
  }, [])

  // Fetch health readings for today
  useEffect(() => {
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    
    const healthRef = collection(db, 'healthReadings')
    const unsubscribe = onSnapshot(healthRef, (snapshot) => {
      const data: Record<string, any> = {}
      snapshot.docs.forEach(doc => {
        const d = doc.data()
        const nik = d.userId || d.nik
        if (nik && d.timestamp && d.timestamp.startsWith(todayStr)) {
          data[nik] = { ...d, id: doc.id }
        }
      })
      setHealthReadings(data)
    })
    return () => unsubscribe()
  }, [])

  // Fetch TB/BB data for today
  useEffect(() => {
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    
    const tbbbRef = collection(db, 'tb-bb')
    const unsubscribe = onSnapshot(tbbbRef, (snapshot) => {
      const data: Record<string, any> = {}
      snapshot.docs.forEach(doc => {
        const d = doc.data()
        const nik = d.nik
        if (nik && d.timestamp && d.timestamp.startsWith(todayStr)) {
          data[nik] = { ...d, id: doc.id }
        }
      })
      setTbbbData(data)
    })
    return () => unsubscribe()
  }, [])

  // Fetch today's attendance
  useEffect(() => {
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    
    const attendanceRef = collection(db, 'attendance')
    const unsubscribe = onSnapshot(attendanceRef, (snapshot) => {
      const data: Record<string, any> = {}
      snapshot.docs.forEach(doc => {
        const d = doc.data()
        const nik = d.nik
        if (nik && d.timestamp && d.timestamp.startsWith(todayStr)) {
          data[nik] = { ...d, id: doc.id, timestamp: d.timestamp }
        }
      })
      setTodayAttendance(data)
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

  const generatePIN = (): string => {
    return Math.floor(100000 + Math.random() * 900000).toString()
  }

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
          alamat: residentForm.alamat
        })
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Gagal menambahkan warga')
      }

      setIsModalOpen(false)
      resetResidentForm()

      // Show detailed notification
      showNotification('success', `Akun user berhasil dibuat! Nama: ${data.user.name}, NIK: ${data.user.nik}, PIN: ${data.user.password}. User dapat login dengan NIK dan PIN tersebut.`)
    } catch (error: any) {
      console.error('Error adding resident:', error)
      showNotification('error', error.message || 'Gagal menambahkan warga. Pastikan NIK belum terdaftar.')
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

      // Update resident document
      await updateDoc(doc(db, 'residents', editingResident.id), updatedResident)

      // Sync to users collection if user exists
      try {
        const usersQuery = query(collection(db, 'users'), where('nik', '==', editingResident.nik))
        const usersSnapshot = await getDocs(usersQuery)

        if (!usersSnapshot.empty) {
          const userDoc = usersSnapshot.docs[0]
          await updateDoc(doc(db, 'users', userDoc.id), {
            name: residentForm.nama,
            nik: residentForm.nik,
            rt: residentForm.rt,
            rw: residentForm.rw,
            alamat: residentForm.alamat
          })
        }
      } catch (syncError) {
        console.error('Error syncing to users collection:', syncError)
        // Don't fail the entire operation if sync fails
      }

      // Update PIN (required)
      if (residentForm.password && residentForm.password.length === 6) {
        const response = await fetch('/api/update-pin', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ nik: residentForm.nik, newPin: residentForm.password })
        })

        const data = await response.json()
        if (!data.success) {
          showNotification('error', 'Data warga diperbarui, tetapi PIN gagal diupdate')
        } else {
          showNotification('success', 'Data warga dan PIN berhasil diperbarui')
        }
      } else {
        showNotification('error', 'PIN wajib diisi (6 digit)')
        return
      }

      setIsModalOpen(false)
      setEditingResident(null)
      resetResidentForm()
    } catch (error) {
      console.error('Error updating resident:', error)
      showNotification('error', 'Gagal memperbarui data warga')
    }
  }

  const handleDeleteResident = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus data warga ini? Ini akan menghapus semua data user termasuk akun login.')) return
    try {
      const resident = residents.find(r => r.id === id)
      if (!resident || !resident.nik) {
        showNotification('error', 'Data warga tidak ditemukan')
        return
      }

      const response = await fetch('/api/delete-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ nik: resident.nik })
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Gagal menghapus user')
      }

      showNotification('success', 'Data warga dan akun user berhasil dihapus')
    } catch (error: any) {
      console.error('Error deleting resident:', error)
      showNotification('error', error.message || 'Gagal menghapus data warga')
    }
  }

  const handleBulkDelete = async () => {
    if (selectedResidents.size === 0) {
      showNotification('info', 'Pilih minimal satu warga untuk dihapus')
      return
    }
    if (!confirm(`Apakah Anda yakin ingin menghapus ${selectedResidents.size} data warga? Ini akan menghapus semua data user termasuk akun login.`)) return

    try {
      let successCount = 0
      let failCount = 0

      for (const id of selectedResidents) {
        const resident = residents.find(r => r.id === id)
        if (!resident || !resident.nik) {
          failCount++
          continue
        }

        try {
          const response = await fetch('/api/delete-user', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ nik: resident.nik })
          })

          const data = await response.json()
          if (data.success) {
            successCount++
          } else {
            failCount++
          }
        } catch (error) {
          console.error('Error deleting user:', error)
          failCount++
        }
      }

      setSelectedResidents(new Set())
      setIsSelectionMode(false)

      if (failCount === 0) {
        showNotification('success', `${successCount} data warga dan akun user berhasil dihapus`)
      } else if (successCount === 0) {
        showNotification('error', 'Gagal menghapus semua data warga')
      } else {
        showNotification('error', `${successCount} berhasil dihapus, ${failCount} gagal`)
      }
    } catch (error) {
      console.error('Error bulk deleting residents:', error)
      showNotification('error', 'Gagal menghapus data warga')
    }
  }

  const handleSelectResident = (id: string) => {
    const newSelected = new Set(selectedResidents)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedResidents(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedResidents.size === filteredResidents.length) {
      setSelectedResidents(new Set())
    } else {
      setSelectedResidents(new Set(filteredResidents.map(r => r.id)))
    }
  }

  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode)
    setSelectedResidents(new Set())
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
      password: resident.password || '',
    })
    setIsModalOpen(true)
  }

  // Attendance CRUD functions
  const handleDeleteAttendance = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus data absensi ini?')) return
    try {
      await deleteDoc(doc(db, 'attendance', id))
      showNotification('success', 'Data absensi berhasil dihapus')
    } catch (error) {
      console.error('Error deleting attendance:', error)
      showNotification('error', 'Gagal menghapus data absensi')
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
      showNotification('success', 'Data absensi berhasil diperbarui')
    } catch (error) {
      console.error('Error updating attendance:', error)
      showNotification('error', 'Gagal memperbarui data absensi')
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
      password: '',
    })
  }

  // Helper function to normalize RT/RW values for comparison
  // Handles both formats: "01" and "1" should match
  const normalizeRTRW = (value: string): string => {
    return value ? value.toString().padStart(2, '0') : ''
  }

  // Filter residents based on criteria and sort by latest attendance
  const filteredResidents = residents
    .filter(resident => {
      if (filterRW && normalizeRTRW(resident.rw) !== normalizeRTRW(filterRW)) return false
      if (filterRT && normalizeRTRW(resident.rt) !== normalizeRTRW(filterRT)) return false
      if (filterUmur) {
        const age = resident.umur
        if (filterUmur === '0-20' && (age < 0 || age > 20)) return false
        if (filterUmur === '21-50' && (age < 21 || age > 50)) return false
        if (filterUmur === '51-60' && (age < 51 || age > 60)) return false
        if (filterUmur === '60+' && age < 60) return false
      }
      if (searchNama) {
        const searchLower = searchNama.toLowerCase()
        const matchesName = resident.nama?.toLowerCase().includes(searchLower)
        const matchesNIK = resident.nik?.includes(searchLower)
        if (!matchesName && !matchesNIK) return false
      }
      return true
    })
    .map(resident => ({
      ...resident,
      healthData: healthReadings[resident.nik] || null,
      tbbbData: tbbbData[resident.nik] || null,
      attendanceData: todayAttendance[resident.nik] || null
    }))
    .sort((a, b) => {
      // Sort by attendance timestamp (latest first)
      const aTime = a.attendanceData?.timestamp ? new Date(a.attendanceData.timestamp).getTime() : 0
      const bTime = b.attendanceData?.timestamp ? new Date(b.attendanceData.timestamp).getTime() : 0
      return bTime - aTime
    })

  // Export to PDF
  const exportToPDF = () => {
    const doc = new jsPDF()
    const kelurahan = userProfile?.kelurahan || 'Duri Selatan'
    
    // Header with gradient background
    doc.setFillColor(37, 99, 235)
    doc.rect(0, 0, 210, 40, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(22)
    doc.setFont('helvetica', 'bold')
    doc.text('Data Warga Posbindu', 105, 20, { align: 'center' })
    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.text(`Kelurahan ${kelurahan} - ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, 105, 30, { align: 'center' })
    
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
    const kelurahan = userProfile?.kelurahan || 'Duri Selatan'
    const total = filteredResidents.length
    const elderly = filteredResidents.filter(r => r.umur >= 60).length
    
    let message = `📊 *DATA WARGA POSBINDU*\n`
    message += `🏥 Kelurahan ${kelurahan}\n`
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
    const kelurahan = userProfile?.kelurahan || 'Duri Selatan'
    
    doc.setFillColor(37, 99, 235)
    doc.rect(0, 0, 210, 40, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(22)
    doc.setFont('helvetica', 'bold')
    doc.text('Riwayat Absensi', 105, 20, { align: 'center' })
    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.text(`Kelurahan ${kelurahan} - ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, 105, 30, { align: 'center' })
    
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
    const kelurahan = userProfile?.kelurahan || 'Duri Selatan'
    const filteredAttendance = attendanceList
      .filter(att => {
        if (attendanceFilter.rw && att.rw !== attendanceFilter.rw) return false
        if (attendanceFilter.rt && att.rt !== attendanceFilter.rt) return false
        if (attendanceFilter.search && !att.nama.toLowerCase().includes(attendanceFilter.search.toLowerCase())) return false
        return true
      })
    
    let message = `📊 *RIWAYAT ABSENSI POSBINDU*\n`
    message += `🏥 Kelurahan ${kelurahan}\n`
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
      
      const currentMonth = new Date().toLocaleString('id-ID', { month: 'long' }).toLowerCase()
      const currentYear = new Date().getFullYear()
      
      // Check if attendance record exists for this NIK in current month
      const existingAttendanceQuery = query(
        collection(db, 'attendance'),
        where('nik', '==', checkInForm.nik)
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
      
      if (existingDocId) {
        // Update existing record
        await updateDoc(doc(db, 'attendance', existingDocId), checkInData)
      } else {
        // Create new record
        await addDoc(collection(db, 'attendance'), checkInData)
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
      showNotification('success', 'Absensi berhasil disimpan!')
    } catch (error) {
      console.error('Error saving attendance:', error)
      showNotification('error', 'Gagal menyimpan absensi')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
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
              title="Tutup notifikasi"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-b-3xl shadow-lg">
        <div className="flex items-center gap-4 mb-2">
          <button
            onClick={() => router.push('/monev-posbindu')}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            title="Kembali ke Monev Posbindu"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-bold">{isAdmin ? 'Data Warga' : 'Absensi Posbindu'}</h1>
        </div>
        <p className="text-blue-100 text-sm ml-10">{isAdmin ? 'Daftar warga kelurahan Duri Selatan' : 'Silakan isi form absensi saat datang ke Posbindu'}</p>
      </div>


      <div className="px-4 mt-6">
        {/* Data Warga Tab */}
        {activeTab === 'datawarga' && (
          <div className="space-y-4">
            {/* Summary + Export + Add Button */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1">
                <div className="bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl px-4 py-3 shadow-md flex-1">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-white" />
                    <div>
                      <span className="text-white font-bold text-lg">{filteredResidents.length}</span>
                      <span className="text-blue-100 text-xs ml-1">warga ditemukan</span>
                    </div>
                  </div>
                </div>
                {selectedResidents.size === 0 && (
                  <div className="flex items-center gap-2">
                    {isSelectionMode ? (
                      <button
                        onClick={toggleSelectionMode}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
                      >
                        <X className="w-4 h-4" />
                        Batal
                      </button>
                    ) : (
                      <button
                        onClick={toggleSelectionMode}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Pilih
                      </button>
                    )}
                  </div>
                )}
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
                <div className="relative col-span-2">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="text" placeholder="Cari nama atau NIK..." value={searchNama} onChange={e => setSearchNama(e.target.value)} className="w-full pl-7 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
            </div>

            {/* Bulk Actions Bar */}
            {selectedResidents.size > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center justify-between">
                <p className="text-sm text-blue-800 font-medium">
                  {selectedResidents.size} warga dipilih
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleBulkDelete}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                  >
                    <Trash2 className="w-4 h-4" />
                    Hapus
                  </button>
                  <button
                    onClick={toggleSelectionMode}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
                  >
                    <X className="w-4 h-4" />
                    Batal
                  </button>
                </div>
              </div>
            )}

            {/* Resident Cards */}
            <div className="space-y-3">
              {filteredResidents.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Belum ada data warga</p>
                </div>
              ) : (
                <>
                  {isSelectionMode && (
                    <>
                      {/* Select All Checkbox */}
                      <div className="flex items-center gap-2 px-2">
                        <input
                          type="checkbox"
                          checked={selectedResidents.size === filteredResidents.length && filteredResidents.length > 0}
                          onChange={handleSelectAll}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                          aria-label="Pilih semua warga"
                          title="Pilih semua warga"
                        />
                        <span className="text-sm text-gray-600">Pilih Semua</span>
                      </div>
                    </>
                  )}
                  {filteredResidents.map(resident => (
                    <div key={resident.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-start gap-3 flex-1">
                          {isSelectionMode && (
                            <input
                              type="checkbox"
                              checked={selectedResidents.has(resident.id)}
                              onChange={() => handleSelectResident(resident.id)}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 mt-1"
                              aria-label={`Pilih ${resident.nama}`}
                              title={`Pilih ${resident.nama}`}
                            />
                          )}
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-gray-800">{resident.nama}</p>
                              {resident.attendanceData && (
                                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">Hadir</span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500">NIK: {resident.nik}</p>
                            {resident.password && (
                              <p className="text-xs text-blue-600 font-medium mt-0.5">PIN: {resident.password}</p>
                            )}
                            <div className="flex gap-3 mt-1 text-xs text-gray-600">
                              <span>RW {resident.rw} / RT {resident.rt}</span>
                              <span>{resident.umur} tahun</span>
                              <span>{resident.jenisKelamin === 'L' ? 'Laki-laki' : 'Perempuan'}</span>
                            </div>
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

                  {/* Health Data Section */}
                  {(resident.tbbbData || resident.healthData) && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      {/* TB/BB/LP Data */}
                      {resident.tbbbData && (
                        <div className="mb-2">
                          <p className="text-xs font-medium text-gray-700 mb-1">TB/BB/LP:</p>
                          <div className="flex gap-2 text-xs text-gray-600">
                            <span>TB: {resident.tbbbData.tinggiBadan} cm</span>
                            <span>BB: {resident.tbbbData.beratBadan} kg</span>
                            <span>LP: {resident.tbbbData.lingkarPinggang} cm</span>
                          </div>
                        </div>
                      )}
                      
                      {/* Health Readings */}
                      {resident.healthData && (
                        <div>
                          <p className="text-xs font-medium text-gray-700 mb-1">Pemeriksaan Kesehatan:</p>
                          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                            {resident.healthData.systolic && resident.healthData.diastolic && (
                              <span>Tensi: {resident.healthData.systolic}/{resident.healthData.diastolic} mmHg</span>
                            )}
                            {resident.healthData.kolesterol && (
                              <span>Kolesterol: {resident.healthData.kolesterol} mg/dL</span>
                            )}
                            {resident.healthData.asamUrat && (
                              <span>Asam Urat: {resident.healthData.asamUrat} mg/dL</span>
                            )}
                            {resident.healthData.gulaDarah && (
                              <span>Gula Darah: {resident.healthData.gulaDarah} mg/dL</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
                </>
              )}
            </div>

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
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nama Lengkap</label>
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">NIK</label>
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
                    <label className="block text-xs font-medium text-gray-700 mb-1">RT</label>
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
                    <label className="block text-xs font-medium text-gray-700 mb-1">RW</label>
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
                    <label className="block text-xs font-medium text-gray-700 mb-1">Tanggal Lahir</label>
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">Jenis Kelamin</label>
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">Alamat</label>
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

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800 font-medium mb-2">ℹ️ Informasi Akun</p>
                  <p className="text-xs text-blue-700">Username akan dibuat otomatis menggunakan NIK. PIN akan dibuat otomatis (6 digit unik) dan ditampilkan setelah data berhasil disimpan.</p>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nama</label>
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">RT</label>
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">RW</label>
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
