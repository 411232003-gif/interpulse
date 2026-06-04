'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronUp, Search, Filter, AlertCircle, Plus, Edit, Trash2, Activity, Users, Download, TrendingUp, Heart, Droplet, Thermometer, Target, CheckCircle, X, ArrowLeft } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, where, orderBy, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import Link from 'next/link'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
const XLSXStyle = require('xlsx-js-style')

const rwTargets: Record<string, number> = {
  '01': 32, '02': 65, '03': 60, '04': 60, '05': 70, '06': 33, '07': 0, '08': 0, '09': 0, '10': 0
}

const months = ['januari','februari','maret','april','mei','juni','juli','agustus','september','oktober','november','desember']
const monthLabels: Record<string, string> = {
  januari:'Jan', februari:'Feb', maret:'Mar', april:'Apr', mei:'Mei', juni:'Jun',
  juli:'Jul', agustus:'Agu', september:'Sep', oktober:'Okt', november:'Nov', desember:'Des'
}

export default function MonitoringPage() {
  const router = useRouter()
  const { isAdmin, userProfile } = useAuth()
  const [healthReadings, setHealthReadings] = useState<Record<string, Record<string, number>>>({})
  const [attendanceData, setAttendanceData] = useState<Record<string, Record<string, number>>>({})
  const [healthReadingsDetails, setHealthReadingsDetails] = useState<Record<string, any[]>>({})
  const [residentsData, setResidentsData] = useState<Record<string, any>>({})
  const [selectedMonth, setSelectedMonth] = useState(new Date().toLocaleString('id-ID', { month: 'long' }).toLowerCase())
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false)
  const [rwExportDropdown, setRwExportDropdown] = useState<string | null>(null)
  const [attendanceExportDropdown, setAttendanceExportDropdown] = useState<string | null>(null)
  const [tableExportDropdown, setTableExportDropdown] = useState(false)
  const [healthDistExportDropdown, setHealthDistExportDropdown] = useState(false)
  
  // Editable targets per RW
  const [customTargets, setCustomTargets] = useState<Record<string, number>>({...rwTargets})
  const [editingTarget, setEditingTarget] = useState<string | null>(null)
  const [editTargetValue, setEditTargetValue] = useState<string>('')

  // Filters for health examination chart
  const [filterRW, setFilterRW] = useState<string>('all')
  const [filterRT, setFilterRT] = useState<string>('all')
  const [filterHealthType, setFilterHealthType] = useState<string>('kolesterol')
  const [filterDate, setFilterDate] = useState<string>('')
  
  // Filters for data table
  const [tableFilterRW, setTableFilterRW] = useState<string>('all')
  const [tableFilterRT, setTableFilterRT] = useState<string>('all')
  const [tableSearchTerm, setTableSearchTerm] = useState<string>('')
  const [tableFilterPemeriksaan, setTableFilterPemeriksaan] = useState<string>('all')
  const [tableFilterKategori, setTableFilterKategori] = useState<string>('all')
  const [tableKategoriDropdownOpen, setTableKategoriDropdownOpen] = useState(false)

  // Selection mode for Data Warga
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [selectedResidents, setSelectedResidents] = useState<Set<string>>(new Set())
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingResident, setEditingResident] = useState<any>(null)

  // Resident form state for editing
  const [residentForm, setResidentForm] = useState({
    nama: '',
    nik: '',
    rw: '',
    rt: '',
    birthDate: '',
    jenisKelamin: 'L' as 'L' | 'P',
    alamat: ''
  })

  // Toggle selection mode
  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode)
    setSelectedResidents(new Set())
  }

  // Toggle resident selection
  const toggleResidentSelection = (residentId: string) => {
    const newSelection = new Set(selectedResidents)
    if (newSelection.has(residentId)) {
      newSelection.delete(residentId)
    } else {
      newSelection.add(residentId)
    }
    setSelectedResidents(newSelection)
  }

  // Edit resident
  const editResident = (resident: any) => {
    setEditingResident(resident)
    setResidentForm({
      nama: resident.nama || '',
      nik: resident.nik || '',
      rw: resident.rw || '',
      rt: resident.rt || '',
      birthDate: resident.birthDate || resident.tglLahir || '',
      jenisKelamin: resident.jenisKelamin || 'L',
      alamat: resident.alamat || ''
    })
    setShowEditModal(true)
  }

  // Save edited resident
  const saveEditedResident = async (updatedData: any) => {
    try {
      const residentsRef = collection(db, 'residents')
      const q = query(residentsRef, where('nik', '==', editingResident.nik))
      const snapshot = await getDocs(q)
      snapshot.forEach(async (docSnapshot) => {
        await updateDoc(doc(db, 'residents', docSnapshot.id), updatedData)
      })
      setShowEditModal(false)
      setEditingResident(null)
      alert('Data warga berhasil diperbarui')
    } catch (error) {
      console.error('Error updating resident:', error)
      alert('Gagal memperbarui data warga')
    }
  }

  // Fetch health readings data from healthReadings collection
  useEffect(() => {
    const healthReadingsRef = collection(db, 'healthReadings')
    const unsubscribe = onSnapshot(healthReadingsRef, (snapshot) => {
      const data: Record<string, Record<string, number>> = {}

      Object.keys(rwTargets).forEach(rw => {
        data[rw] = {}
        months.forEach(m => { data[rw][m] = 0 })
      })

      // Track unique readings to avoid duplicates
      const uniqueReadings = new Set<string>()

      snapshot.docs.forEach(doc => {
        const d = doc.data()
        if (!d || !d.timestamp) return
        // Only include data from posbindu (admin input)
        if (d.source !== 'posbindu') return
        const rw = d.rw
        if (rw && data[rw]) {
          const month = new Date(d.timestamp).toLocaleString('id-ID', { month: 'long' }).toLowerCase()
          // Count unique residents per month per RW (4 types = 1 warga)
          const uniqueKey = `${d.nik}-${month}-${rw}`
          if (!uniqueReadings.has(uniqueKey) && data[rw][month] !== undefined) {
            uniqueReadings.add(uniqueKey)
            data[rw][month]++
          }
        }
      })

      setHealthReadings(data)
    })
    return () => unsubscribe()
  }, [residentsData])

  // Calculate health type distribution for selected month using useMemo
  const healthTypeDistribution = useMemo(() => {
    const filteredTypeDist: Record<string, number> = { tensi: 0, kolesterol: 0, asamurat: 0, guladarah: 0 }
    const uniqueReadings = new Set<string>()

    Object.values(healthReadingsDetails).flat().forEach(d => {
      if (!d || !d.timestamp) return
      // Only include data from posbindu (admin input)
      if (d.source !== 'posbindu') return
      const type = d.type
      const month = new Date(d.timestamp).toLocaleString('id-ID', { month: 'long' }).toLowerCase()
      // Create unique key based on timestamp, type, and nik to avoid duplicates
      const uniqueKey = `${d.timestamp}-${d.type}-${d.nik}`
      if (type && filteredTypeDist[type] !== undefined && month === selectedMonth && !uniqueReadings.has(uniqueKey)) {
        uniqueReadings.add(uniqueKey)
        filteredTypeDist[type]++
      }
    })

    return filteredTypeDist
  }, [selectedMonth, healthReadingsDetails])

  // Fetch attendance data from attendance collection
  useEffect(() => {
    const attendanceRef = collection(db, 'attendance')
    const unsubscribe = onSnapshot(attendanceRef, (snapshot) => {
      const data: Record<string, Record<string, number>> = {}

      Object.keys(rwTargets).forEach(rw => {
        data[rw] = {}
        months.forEach(m => { data[rw][m] = 0 })
      })

      snapshot.docs.forEach(doc => {
        const d = doc.data()
        if (!d || !d.timestamp) return
        const rw = d.rw
        if (rw && data[rw]) {
          const month = new Date(d.timestamp).toLocaleString('id-ID', { month: 'long' }).toLowerCase()
          if (data[rw][month] !== undefined) {
            data[rw][month]++
          }
        }
      })

      setAttendanceData(data)
    })
    return () => unsubscribe()
  }, [residentsData])

  // Fetch residents data for names and NIK
  useEffect(() => {
    const residentsRef = collection(db, 'residents')
    const usersRef = collection(db, 'users')

    // First fetch users to get admin UIDs
    const unsubscribeUsers = onSnapshot(usersRef, (usersSnapshot) => {
      const adminUIDs = new Set<string>()
      usersSnapshot.docs.forEach(doc => {
        const user = doc.data()
        if (user.role === 'admin') {
          adminUIDs.add(doc.id)
          if (user.nik) adminUIDs.add(user.nik)
        }
      })

      // Then fetch residents and filter out admin users
      const unsubscribeResidents = onSnapshot(residentsRef, (snapshot) => {
        const data: Record<string, any> = {}
        const nameMap: Record<string, any> = {} // For name-based matching
        snapshot.docs.forEach(doc => {
          const d = doc.data()

          // Skip if this resident is an admin
          if (adminUIDs.has(doc.id) || (d.nik && adminUIDs.has(d.nik)) || (d.uid && adminUIDs.has(d.uid))) {
            return
          }

          // Use document ID (which should be Firebase Auth UID), NIK, and uid field as keys
          data[doc.id] = { ...d, id: doc.id }
          if (d.nik) {
            data[d.nik] = { ...d, id: doc.id }
          }
          if (d.uid) {
            data[d.uid] = { ...d, id: doc.id }
          }
          // Also store by name for fallback matching
          if (d.nama) {
            nameMap[d.nama.toLowerCase()] = { ...d, id: doc.id }
          }
        })
        setResidentsData({ ...data, ...nameMap })
      })

      return () => unsubscribeResidents()
    })

    return () => unsubscribeUsers()
  }, [])

  // Fetch TB/BB data
  const [tbbbData, setTbbbData] = useState<Record<string, any[]>>({})
  useEffect(() => {
    const tbbbRef = collection(db, 'tb-bb')
    const unsubscribe = onSnapshot(tbbbRef, (snapshot) => {
      const data: Record<string, any[]> = {}
      snapshot.docs.forEach(doc => {
        const d = doc.data()
        if (d.nik) {
          if (!data[d.nik]) {
            data[d.nik] = []
          }
          data[d.nik].push({ ...d, id: doc.id })
        }
      })
      setTbbbData(data)
    })
    return () => unsubscribe()
  }, [])

  // Health status calculation functions
  const getHealthStatus = (type: string, value: number, gender?: string) => {
    if (type === 'kolesterol') {
      if (value < 200) return { status: 'Normal', color: 'bg-green-500', textColor: 'text-green-700' }
      return { status: 'Tinggi', color: 'bg-red-500', textColor: 'text-red-700' }
    }
    if (type === 'tensi') {
      if (value < 120) return { status: 'Rendah', color: 'bg-blue-500', textColor: 'text-blue-700' }
      if (value < 130) return { status: 'Normal', color: 'bg-green-500', textColor: 'text-green-700' }
      if (value < 140) return { status: 'Batas', color: 'bg-yellow-500', textColor: 'text-yellow-700' }
      return { status: 'Tinggi', color: 'bg-red-500', textColor: 'text-red-700' }
    }
    if (type === 'guladarah') {
      if (value < 100) return { status: 'Normal', color: 'bg-green-500', textColor: 'text-green-700' }
      if (value < 126) return { status: 'Batas', color: 'bg-yellow-500', textColor: 'text-yellow-700' }
      return { status: 'Tinggi', color: 'bg-red-500', textColor: 'text-red-700' }
    }
    if (type === 'asamurat') {
      const threshold = gender === 'P' ? 6 : 7
      if (value <= threshold) return { status: 'Normal', color: 'bg-green-500', textColor: 'text-green-700' }
      return { status: 'Tinggi', color: 'bg-red-500', textColor: 'text-red-700' }
    }
    if (type === 'imt') {
      if (value < 18.5) return { status: 'Rendah', color: 'bg-blue-500', textColor: 'text-blue-700' }
      if (value < 25) return { status: 'Normal', color: 'bg-green-500', textColor: 'text-green-700' }
      if (value < 30) return { status: 'Batas', color: 'bg-yellow-500', textColor: 'text-yellow-700' }
      return { status: 'Tinggi', color: 'bg-red-500', textColor: 'text-red-700' }
    }
    if (type === 'nadi') {
      if (value < 60) return { status: 'Rendah', color: 'bg-blue-500', textColor: 'text-blue-700' }
      if (value <= 100) return { status: 'Normal', color: 'bg-green-500', textColor: 'text-green-700' }
      if (value <= 110) return { status: 'Batas', color: 'bg-yellow-500', textColor: 'text-yellow-700' }
      return { status: 'Tinggi', color: 'bg-red-500', textColor: 'text-red-700' }
    }
    return { status: 'Normal', color: 'bg-green-500', textColor: 'text-green-700' }
  }

  // Calculate health status distribution for a specific type (used by export)
  const getDistributionForType = (healthType: string) => {
    const distribution = { rendah: 0, normal: 0, batas: 0, tinggi: 0 }

    if (healthType === 'nadi') {
      Object.entries(healthReadingsDetails).forEach(([, readings]) => {
        readings.forEach(reading => {
          if (reading.type !== 'tensi' || !reading.nadi) return
          const month = new Date(reading.timestamp).toLocaleString('id-ID', { month: 'long' }).toLowerCase()
          if (month !== selectedMonth) return
          const status = getHealthStatus('nadi', reading.nadi)
          if (status.status === 'Normal') distribution.normal++
          else if (status.status === 'Batas') distribution.batas++
          else if (status.status === 'Tinggi') distribution.tinggi++
          else distribution.rendah++
        })
      })
      return distribution
    }

    if (healthType === 'imt') {
      Object.entries(tbbbData).forEach(([nik, records]) => {
        const monthRecord = (records as any[]).find(t => {
          const month = new Date(t.timestamp).toLocaleString('id-ID', { month: 'long' }).toLowerCase()
          return month === selectedMonth
        })
        if (!monthRecord?.tinggiBadan || !monthRecord?.beratBadan) return
        const tbM = monthRecord.tinggiBadan / 100
        const imtVal = monthRecord.beratBadan / (tbM * tbM)
        const status = getHealthStatus('imt', imtVal)
        if (status.status === 'Normal') distribution.normal++
        else if (status.status === 'Batas') distribution.batas++
        else if (status.status === 'Tinggi') distribution.tinggi++
        else distribution.rendah++
      })
      return distribution
    }

    Object.entries(healthReadingsDetails).forEach(([, readings]) => {
      readings.forEach(reading => {
        if (reading.type !== healthType) return

        const month = new Date(reading.timestamp).toLocaleString('id-ID', { month: 'long' }).toLowerCase()
        if (month !== selectedMonth) return

        let value: number
        if (healthType === 'tensi') value = reading.sistolik || reading.value || 0
        else if (healthType === 'kolesterol') value = reading.total || reading.value || 0
        else value = reading.nilai || reading.value || 0
        const status = getHealthStatus(healthType, value)

        if (status.status === 'Normal') distribution.normal++
        else if (status.status === 'Batas') distribution.batas++
        else if (status.status === 'Tinggi') distribution.tinggi++
        else distribution.rendah++
      })
    })

    return distribution
  }

  // Calculate health status distribution for filtered data (uses current filterRW & filterHealthType)
  const getHealthStatusDistribution = () => {
    const distribution = { rendah: 0, normal: 0, batas: 0, tinggi: 0 }

    if (filterHealthType === 'nadi') {
      Object.entries(healthReadingsDetails).forEach(([rw, readings]) => {
        if (filterRW !== 'all' && rw !== filterRW) return
        readings.forEach(reading => {
          if (reading.type !== 'tensi' || !reading.nadi) return
          const month = new Date(reading.timestamp).toLocaleString('id-ID', { month: 'long' }).toLowerCase()
          if (month !== selectedMonth) return
          const status = getHealthStatus('nadi', reading.nadi)
          if (status.status === 'Normal') distribution.normal++
          else if (status.status === 'Batas') distribution.batas++
          else if (status.status === 'Tinggi') distribution.tinggi++
          else distribution.rendah++
        })
      })
      return distribution
    }

    if (filterHealthType === 'imt') {
      Object.entries(tbbbData).forEach(([nik, records]) => {
        const monthRecord = (records as any[]).find(t => {
          const month = new Date(t.timestamp).toLocaleString('id-ID', { month: 'long' }).toLowerCase()
          return month === selectedMonth
        })
        if (!monthRecord?.tinggiBadan || !monthRecord?.beratBadan) return
        const tbM = monthRecord.tinggiBadan / 100
        const imtVal = monthRecord.beratBadan / (tbM * tbM)
        const status = getHealthStatus('imt', imtVal)
        if (status.status === 'Normal') distribution.normal++
        else if (status.status === 'Batas') distribution.batas++
        else if (status.status === 'Tinggi') distribution.tinggi++
        else distribution.rendah++
      })
      return distribution
    }

    Object.entries(healthReadingsDetails).forEach(([rw, readings]) => {
      if (filterRW !== 'all' && rw !== filterRW) return

      readings.forEach(reading => {
        if (reading.type !== filterHealthType) return

        const month = new Date(reading.timestamp).toLocaleString('id-ID', { month: 'long' }).toLowerCase()
        if (month !== selectedMonth) return

        let value: number
        if (filterHealthType === 'tensi') value = reading.sistolik || reading.value || 0
        else if (filterHealthType === 'kolesterol') value = reading.total || reading.value || 0
        else value = reading.nilai || reading.value || 0
        const status = getHealthStatus(filterHealthType, value)

        if (status.status === 'Normal') distribution.normal++
        else if (status.status === 'Batas') distribution.batas++
        else if (status.status === 'Tinggi') distribution.tinggi++
        else distribution.rendah++
      })
    })

    return distribution
  }

  // Calculate participation per RW for selected month
  const getParticipationData = () => {
    const data: Record<string, number> = {}
    Object.keys(rwTargets).forEach(rw => {
      data[rw] = 0
    })
    
    Object.entries(attendanceData).forEach(([rw, months]) => {
      data[rw] = months[selectedMonth] || 0
    })
    
    return data
  }

  // Get filtered table data using useMemo
  const tableData = useMemo(() => {
    const data: any[] = []
    const uniqueResidents = new Set<string>()

    Object.entries(healthReadingsDetails).forEach(([rw, readings]: [string, any[]]) => {
      readings.forEach((reading: any) => {
        const nik = reading.nik
        if (!nik || uniqueResidents.has(nik)) return
        uniqueResidents.add(nik)

        const resident = residentsData[nik] || residentsData[reading.userId]
        if (tableFilterRW !== 'all' && rw !== tableFilterRW) return
        if (tableFilterRT !== 'all' && resident?.rt !== tableFilterRT) return
        if (tableSearchTerm && !resident?.nama?.toLowerCase().includes(tableSearchTerm.toLowerCase()) && !nik.includes(tableSearchTerm)) return

        const tbbbList = tbbbData[nik] || []
        const tbbb = tbbbList.find((t: any) => new Date(t.timestamp).toLocaleString('id-ID', { month: 'long' }).toLowerCase() === selectedMonth)
        const monthReadings = readings.filter((r: any) => r.nik === nik && new Date(r.timestamp).toLocaleString('id-ID', { month: 'long' }).toLowerCase() === selectedMonth)
        if (monthReadings.length === 0 && !tbbb) return

        const tensiReading = monthReadings.find((r: any) => r.type === 'tensi')
        const gdsReading = monthReadings.find((r: any) => r.type === 'guladarah')
        const uaReading = monthReadings.find((r: any) => r.type === 'asamurat')
        const colReading = monthReadings.find((r: any) => r.type === 'kolesterol')
        let imt = '-'
        if (tbbb?.tinggiBadan && tbbb?.beratBadan) imt = (tbbb.beratBadan / Math.pow(tbbb.tinggiBadan / 100, 2)).toFixed(1)

        data.push({
          nik, nama: resident?.nama || reading.userName || '-', rw, rt: resident?.rt || '-',
          tglLahir: resident?.birthDate || '-', umur: resident?.umur || '-', alamat: resident?.alamat || '-',
          jenisKelamin: resident?.jenisKelamin || '-', tb: tbbb?.tinggiBadan || '-', bb: tbbb?.beratBadan || '-',
          lp: tbbb?.lingkarPinggang || '-', td: tensiReading ? `${tensiReading.sistolik}/${tensiReading.diastolik}` : '-',
          gds: gdsReading?.nilai || '-', imt, ua: uaReading?.nilai || '-', col: colReading?.total || '-', nadi: tensiReading?.nadi || '-'
        })
      })
    })
    return data
  }, [selectedMonth, residentsData, tbbbData, healthReadingsDetails, tableFilterRW, tableFilterRT, tableSearchTerm])

  // Map pemeriksaan field to getHealthStatus type
  const fieldToHealthType: Record<string, string> = {
    td: 'tensi', gds: 'guladarah', imt: 'imt', ua: 'asamurat', col: 'kolesterol', nadi: 'nadi',
  }
  const kategoriToStatus: Record<string, string> = {
    rendah: 'Rendah', normal: 'Normal', batas: 'Batas', tinggi: 'Tinggi',
  }

  const getHealthCellClass = (field: string, value: string | number, gender?: string): string => {
    const v = String(value ?? '')
    if (!v || v === '-') return 'px-2 py-2'
    const numVal = field === 'td' ? parseInt(v.split('/')[0]) : parseFloat(v)
    if (isNaN(numVal)) return 'px-2 py-2'
    const type = fieldToHealthType[field]
    if (!type) return 'px-2 py-2'
    const { status } = getHealthStatus(type, numVal, gender)
    const map: Record<string, string> = {
      Rendah: 'bg-blue-100 text-blue-800 font-semibold',
      Normal: 'bg-green-100 text-green-800 font-semibold',
      Batas: 'bg-yellow-100 text-yellow-800 font-semibold',
      Tinggi: 'bg-red-100 text-red-800 font-semibold',
    }
    return `px-2 py-2 ${map[status] || ''}`
  }

  // Filtered display data (applies Pemeriksaan + Kategori filters on top of tableData)
  const displayTableData = useMemo(() => {
    if (tableFilterPemeriksaan === 'all') return tableData
    return tableData.filter(row => {
      let numVal: number | null = null
      if (tableFilterPemeriksaan === 'td') {
        const v = String(row.td || '')
        if (v !== '-') { const s = parseInt(v.split('/')[0]); numVal = isNaN(s) ? null : s }
      } else {
        const v = parseFloat(row[tableFilterPemeriksaan])
        numVal = isNaN(v) ? null : v
      }
      if (numVal === null) return false
      if (tableFilterKategori === 'all') return true
      const type = fieldToHealthType[tableFilterPemeriksaan]
      const status = getHealthStatus(type, numVal)
      return status.status === kategoriToStatus[tableFilterKategori]
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableData, tableFilterPemeriksaan, tableFilterKategori])

  // Select all residents
  const selectAllResidents = () => {
    const allIds = tableData.map(row => row.nik || row.id)
    setSelectedResidents(new Set(allIds))
  }

  // Deselect all residents
  const deselectAllResidents = () => {
    setSelectedResidents(new Set())
  }

  // Delete selected residents
  const deleteSelectedResidents = async () => {
    if (selectedResidents.size === 0) return

    if (!confirm(`Apakah Anda yakin ingin menghapus ${selectedResidents.size} data warga? Ini akan menghapus semua data user termasuk akun login.`)) {
      return
    }

    try {
      let successCount = 0
      let failCount = 0

      for (const residentId of selectedResidents) {
        try {
          const response = await fetch('/api/delete-user', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ nik: residentId })
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
        alert(`${successCount} data warga dan akun user berhasil dihapus`)
      } else if (successCount === 0) {
        alert('Gagal menghapus semua data warga')
      } else {
        alert(`${successCount} berhasil dihapus, ${failCount} gagal`)
      }
    } catch (error) {
      console.error('Error deleting residents:', error)
      alert('Gagal menghapus data warga')
    }
  }

  // Fetch detailed health readings for per-RW export
  useEffect(() => {
    const healthReadingsRef = collection(db, 'healthReadings')
    const unsubscribe = onSnapshot(healthReadingsRef, (snapshot) => {
      const data: Record<string, any[]> = {}

      Object.keys(rwTargets).forEach(rw => {
        data[rw] = []
      })

      // Track unique readings to avoid duplicates
      const uniqueReadings = new Set<string>()

      snapshot.docs.forEach(doc => {
        const d = doc.data()
        if (!d || !d.timestamp) return
        // Only include data from posbindu (admin input)
        if (d.source !== 'posbindu') return
        let rw = d.rw

        // Normalize RW to match rwTargets format (01, 02, etc.)
        if (rw !== undefined) {
          rw = String(rw).padStart(2, '0')
        }

        // Create unique key based on timestamp, type, and nik to avoid duplicates
        const uniqueKey = `${d.timestamp}-${d.type}-${d.nik}`

        if (rw && data[rw] && !uniqueReadings.has(uniqueKey)) {
          uniqueReadings.add(uniqueKey)
          data[rw].push({ ...d, id: doc.id })
        }
      })

      setHealthReadingsDetails(data)
    })
    return () => unsubscribe()
  }, [])

  const totalReadings = Object.entries(healthReadings).reduce((sum, [rw, months_data]) => {
    return sum + (months_data[selectedMonth] || 0)
  }, 0)

  const totalAttendance = Object.entries(attendanceData).reduce((sum, [rw, months_data]) => {
    return sum + (months_data[selectedMonth] || 0)
  }, 0)

  const totalTarget = Object.values(customTargets).reduce((sum, target) => sum + target, 0)
  const attendancePercentage = totalTarget > 0 ? ((totalAttendance / totalTarget) * 100).toFixed(1) : '0'
  const healthPercentage = totalTarget > 0 ? ((totalReadings / totalTarget) * 100).toFixed(1) : '0'

  const exportToPDF = () => {
    const doc = new jsPDF()
    const kelurahan = userProfile?.kelurahan || 'Duri Selatan'

    // Header
    doc.setFillColor(79, 70, 229)
    doc.rect(0, 0, 210, 40, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(22)
    doc.setFont('helvetica', 'bold')
    doc.text('Monitoring Kesehatan', 105, 20, { align: 'center' })
    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.text(`Kelurahan ${kelurahan} - ${monthLabels[selectedMonth]} ${new Date().getFullYear()}`, 105, 30, { align: 'center' })

    doc.setTextColor(0, 0, 0)
    doc.setFontSize(10)
    doc.text(`Total Warga Diperiksa: ${totalReadings}`, 14, 50)

    // Health Type Distribution
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Distribusi Jenis Pemeriksaan', 14, 60)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    
    const typeDistData = Object.entries(healthTypeDistribution).map(([type, count]) => {
      const labels: Record<string, string> = {
        tensi: 'Tekanan Darah',
        kolesterol: 'Kolesterol',
        asamurat: 'Asam Urat',
        guladarah: 'Gula Darah'
      }
      return [labels[type] || type, count]
    })

    autoTable(doc, {
      startY: 65,
      head: [['Jenis Pemeriksaan', 'Jumlah']],
      body: typeDistData,
      styles: {
        fontSize: 10,
        cellPadding: 4,
      },
      headStyles: {
        fillColor: [79, 70, 229],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [238, 242, 255],
      },
    })

    // Per-RW Data
    const finalY = (doc as any).lastAutoTable.finalY + 10
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Pemeriksaan per RW', 14, finalY)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')

    const tableData = Object.entries(customTargets)
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .map(([rw, target]) => {
        const readings = healthReadings[rw] || {}
        const count = readings[selectedMonth] || 0
        const percentage = target > 0 ? ((count / target) * 100).toFixed(1) : '0'
        return [
          `RW ${rw}`,
          count,
          target,
          `${percentage}%`,
        ]
      })

    autoTable(doc, {
      startY: finalY + 5,
      head: [['RW', 'Jumlah Warga Diperiksa', 'Target', 'Persentase']],
      body: tableData,
      styles: {
        fontSize: 10,
        cellPadding: 4,
      },
      headStyles: {
        fillColor: [79, 70, 229],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [238, 242, 255],
      },
    })

    // Monthly Trend Data
    const finalY2 = (doc as any).lastAutoTable.finalY + 10
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Trafik Pemeriksaan Bulanan', 14, finalY2)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')

    const monthlyData = months.map(m => {
      const total = Object.entries(healthReadings).reduce((s, [, d]) => s + (d[m] || 0), 0)
      return [monthLabels[m], total]
    })

    autoTable(doc, {
      startY: finalY2 + 5,
      head: [['Bulan', 'Total Warga Diperiksa']],
      body: monthlyData,
      styles: {
        fontSize: 10,
        cellPadding: 4,
      },
      headStyles: {
        fillColor: [79, 70, 229],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [238, 242, 255],
      },
    })

    doc.save(`monitoring-kesehatan-${selectedMonth}.pdf`)
  }

  const exportToExcel = () => {
    // Sheet 1: Per-RW Data for Selected Month
    const rwData = Object.entries(customTargets).map(([rw, target]) => {
      const readings = healthReadings[rw] || {}
      const count = readings[selectedMonth] || 0
      const percentage = target > 0 ? ((count / target) * 100).toFixed(2) : '0'
      return {
        'RW': rw,
        'Jumlah Warga Diperiksa': count,
        'Target': target,
        'Persentase (%)': parseFloat(percentage),
        'Status': count >= target ? 'Tercapai' : 'Belum Tercapai'
      }
    })

    // Sheet 2: Monthly Trend Data
    const monthlyData = months.map(m => {
      const total = Object.entries(healthReadings).reduce((s, [, d]) => s + (d[m] || 0), 0)
      const totalCustom = Object.values(customTargets).reduce((s, t) => s + t, 0)
      const percentage = totalCustom > 0 ? ((total / totalCustom) * 100).toFixed(2) : '0'
      return {
        'Bulan': monthLabels[m],
        'Total Warga Diperiksa': total,
        'Total Target': totalCustom,
        'Persentase (%)': parseFloat(percentage)
      }
    })

    // Sheet 3: Health Type Distribution
    const typeDistData = Object.entries(healthTypeDistribution).map(([type, count]) => {
      const labels: Record<string, string> = {
        tensi: 'Tekanan Darah',
        kolesterol: 'Kolesterol',
        asamurat: 'Asam Urat',
        guladarah: 'Gula Darah'
      }
      const percentage = totalReadings > 0 ? ((count / totalReadings) * 100).toFixed(2) : '0'
      return {
        'Jenis Pemeriksaan': labels[type] || type,
        'Jumlah': count,
        'Persentase (%)': parseFloat(percentage)
      }
    })

    // Create workbook with multiple sheets
    const wb = XLSX.utils.book_new()

    // Sheet 1: Per-RW
    const ws1 = XLSX.utils.json_to_sheet(rwData)
    ws1['!cols'] = [
      { wch: 10 },
      { wch: 18 },
      { wch: 10 },
      { wch: 15 },
      { wch: 15 },
    ]
    XLSX.utils.book_append_sheet(wb, ws1, 'Per RW')

    // Sheet 2: Monthly Trend
    const ws2 = XLSX.utils.json_to_sheet(monthlyData)
    ws2['!cols'] = [
      { wch: 12 },
      { wch: 18 },
      { wch: 15 },
      { wch: 15 },
    ]
    XLSX.utils.book_append_sheet(wb, ws2, 'Tren Bulanan')

    // Sheet 3: Health Type Distribution
    const ws3 = XLSX.utils.json_to_sheet(typeDistData)
    ws3['!cols'] = [
      { wch: 20 },
      { wch: 10 },
      { wch: 15 },
    ]
    XLSX.utils.book_append_sheet(wb, ws3, 'Jenis Pemeriksaan')

    XLSX.writeFile(wb, `monitoring-kesehatan-${selectedMonth}.xlsx`)
  }

  const exportToWhatsApp = () => {
    const kelurahan = userProfile?.kelurahan || 'Duri Selatan'
    let message = `📊 *MONITORING KESEHATAN*\n`
    message += `🏥 Kelurahan ${kelurahan}\n`
    message += `📅 ${monthLabels[selectedMonth]} ${new Date().getFullYear()}\n\n`
    message += `━━━━━━━━━━━━━━━━━━━━\n\n`
    message += `📈 *RINGKASAN DATA*\n`
    message += `• Total Warga Diperiksa: ${totalReadings}\n\n`
    
    // Health Type Distribution
    message += `📋 *DISTRIBUSI JENIS PEMERIKSAAN*\n\n`
    const typeLabels: Record<string, string> = {
      tensi: 'Tekanan Darah',
      kolesterol: 'Kolesterol',
      asamurat: 'Asam Urat',
      guladarah: 'Gula Darah'
    }
    Object.entries(healthTypeDistribution).forEach(([type, count]) => {
      const percentage = totalReadings > 0 ? ((count / totalReadings) * 100).toFixed(1) : '0'
      message += `• ${typeLabels[type] || type}: ${count} (${percentage}%)\n`
    })
    message += `\n`
    
    // Per-RW Data with Targets
    message += `📋 *DATA PER RW*\n\n`
    Object.entries(customTargets).sort(([a], [b]) => parseInt(a) - parseInt(b)).forEach(([rw, target]) => {
      const readings = healthReadings[rw] || {}
      const count = readings[selectedMonth] || 0
      const percentage = target > 0 ? ((count / target) * 100).toFixed(1) : '0'
      const status = count >= target ? '✅ Tercapai' : '❌ Belum'
      message += `RW ${rw}: ${count}/${target} (${percentage}%) ${status}\n`
    })
    message += `\n`
    
    // Monthly Trend Summary
    message += `📈 *TREN BULANAN TAHUN INI*\n\n`
    months.forEach(m => {
      const total = Object.entries(healthReadings).reduce((s, [, d]) => s + (d[m] || 0), 0)
      const icon = m === selectedMonth ? '👉' : '  '
      message += `${icon} ${monthLabels[m]}: ${total} pemeriksaan\n`
    })
    
    // Health Status Distribution
    const distWA = getHealthStatusDistribution()
    const distWATotal = distWA.rendah + distWA.normal + distWA.batas + distWA.tinggi
    const typeLabel = filterHealthType === 'kolesterol' ? 'Kolesterol' : filterHealthType === 'tensi' ? 'Tensi' : filterHealthType === 'guladarah' ? 'Gula Darah' : 'Asam Urat'
    message += `📊 *HASIL PEMERIKSAAN (${typeLabel})*\n\n`
    message += `• Rendah: ${distWA.rendah} (${distWATotal > 0 ? ((distWA.rendah / distWATotal) * 100).toFixed(1) : 0}%)\n`
    message += `• Normal: ${distWA.normal} (${distWATotal > 0 ? ((distWA.normal / distWATotal) * 100).toFixed(1) : 0}%)\n`
    message += `• Batas Tinggi: ${distWA.batas} (${distWATotal > 0 ? ((distWA.batas / distWATotal) * 100).toFixed(1) : 0}%)\n`
    message += `• Tinggi: ${distWA.tinggi} (${distWATotal > 0 ? ((distWA.tinggi / distWATotal) * 100).toFixed(1) : 0}%)\n`
    message += `• Total Warga: ${distWATotal}\n`

    message += `\n━━━━━━━━━━━━━━━━━━━━\n`
    message += `📱 InterPulse - Aplikasi Kesehatan Terpadu\n`

    const encodedMessage = encodeURIComponent(message)
    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank')
  }

  // Standalone export functions for Rekapitulasi Hasil Pemeriksaan
  const exportHealthDistToPDF = () => {
    const doc = new jsPDF()
    const kelurahan = userProfile?.kelurahan || 'Duri Selatan'
    const allTypes = [
      { key: 'tensi', label: 'Tekanan Darah (TD)' },
      { key: 'guladarah', label: 'Gula Darah (GDS)' },
      { key: 'imt', label: 'IMT' },
      { key: 'asamurat', label: 'Asam Urat (UA)' },
      { key: 'kolesterol', label: 'Kolesterol (COL)' },
      { key: 'nadi', label: 'Nadi' },
    ]

    doc.setFillColor(79, 70, 229)
    doc.rect(0, 0, 210, 40, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text('Rekapitulasi Hasil Pemeriksaan', 105, 18, { align: 'center' })
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.text(`${kelurahan} - ${monthLabels[selectedMonth]} ${new Date().getFullYear()}`, 105, 30, { align: 'center' })

    let startY = 48
    allTypes.forEach(({ key, label }, index) => {
      const dist = getDistributionForType(key)
      const distTotal = dist.rendah + dist.normal + dist.batas + dist.tinggi

      doc.setTextColor(0, 0, 0)
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text(label, 14, startY)

      autoTable(doc, {
        startY: startY + 5,
        head: [['Kategori Hasil', 'Jumlah Warga', 'Persentase']],
        body: [
          ['Rendah', dist.rendah, distTotal > 0 ? ((dist.rendah / distTotal) * 100).toFixed(2) + '%' : '0%'],
          ['Normal', dist.normal, distTotal > 0 ? ((dist.normal / distTotal) * 100).toFixed(2) + '%' : '0%'],
          ['Batas Tinggi', dist.batas, distTotal > 0 ? ((dist.batas / distTotal) * 100).toFixed(2) + '%' : '0%'],
          ['Tinggi', dist.tinggi, distTotal > 0 ? ((dist.tinggi / distTotal) * 100).toFixed(2) + '%' : '0%'],
          ['Total Warga', distTotal, '100%'],
        ],
        styles: { fontSize: 10, cellPadding: 3 },
        headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [238, 242, 255] },
      })

      startY = (doc as any).lastAutoTable.finalY + 12
      if (index < allTypes.length - 1 && startY > 220) {
        doc.addPage()
        startY = 15
      }
    })

    doc.save(`rekapitulasi-hasil-pemeriksaan-${selectedMonth}.pdf`)
  }

  const exportHealthDistToExcel = () => {
    const allTypes = [
      { key: 'tensi', label: 'Tekanan Darah (TD)' },
      { key: 'guladarah', label: 'Gula Darah (GDS)' },
      { key: 'imt', label: 'IMT' },
      { key: 'asamurat', label: 'Asam Urat (UA)' },
      { key: 'kolesterol', label: 'Kolesterol (COL)' },
      { key: 'nadi', label: 'Nadi' },
    ]
    const wb = XLSXStyle.utils.book_new()

    allTypes.forEach(({ key, label }) => {
      const dist = getDistributionForType(key)
      const distTotal = dist.rendah + dist.normal + dist.batas + dist.tinggi
      const data = [
        { 'Kategori': 'Rendah', 'Jumlah Warga': dist.rendah, 'Persentase (%)': distTotal > 0 ? parseFloat(((dist.rendah / distTotal) * 100).toFixed(2)) : 0 },
        { 'Kategori': 'Normal', 'Jumlah Warga': dist.normal, 'Persentase (%)': distTotal > 0 ? parseFloat(((dist.normal / distTotal) * 100).toFixed(2)) : 0 },
        { 'Kategori': 'Batas Tinggi', 'Jumlah Warga': dist.batas, 'Persentase (%)': distTotal > 0 ? parseFloat(((dist.batas / distTotal) * 100).toFixed(2)) : 0 },
        { 'Kategori': 'Tinggi', 'Jumlah Warga': dist.tinggi, 'Persentase (%)': distTotal > 0 ? parseFloat(((dist.tinggi / distTotal) * 100).toFixed(2)) : 0 },
      ]
      const ws = XLSXStyle.utils.json_to_sheet(data)
      ws['!cols'] = [{ wch: 15 }, { wch: 14 }, { wch: 14 }]
      XLSXStyle.utils.book_append_sheet(wb, ws, label)
    })

    XLSXStyle.writeFile(wb, `rekapitulasi-hasil-pemeriksaan-${selectedMonth}.xlsx`)
  }

  const exportHealthDistToWhatsApp = () => {
    const kelurahan = userProfile?.kelurahan || 'Duri Selatan'
    const allTypes = [
      { key: 'tensi', label: 'Tekanan Darah' },
      { key: 'kolesterol', label: 'Kolesterol' },
      { key: 'guladarah', label: 'Gula Darah' },
      { key: 'asamurat', label: 'Asam Urat' },
    ]

    let message = `📊 *REKAPITULASI HASIL PEMERIKSAAN*\n`
    message += `🏥 Kelurahan ${kelurahan}\n`
    message += `� ${monthLabels[selectedMonth]} ${new Date().getFullYear()}\n\n`
    message += `━━━━━━━━━━━━━━━━━━━━\n\n`

    allTypes.forEach(({ key, label }) => {
      const dist = getDistributionForType(key)
      const distTotal = dist.rendah + dist.normal + dist.batas + dist.tinggi
      message += `💊 *${label}*\n`
      message += `• Rendah: ${dist.rendah} (${distTotal > 0 ? ((dist.rendah / distTotal) * 100).toFixed(1) : 0}%)\n`
      message += `• Normal: ${dist.normal} (${distTotal > 0 ? ((dist.normal / distTotal) * 100).toFixed(1) : 0}%)\n`
      message += `• Batas Tinggi: ${dist.batas} (${distTotal > 0 ? ((dist.batas / distTotal) * 100).toFixed(1) : 0}%)\n`
      message += `• Tinggi: ${dist.tinggi} (${distTotal > 0 ? ((dist.tinggi / distTotal) * 100).toFixed(1) : 0}%)\n`
      message += `• Total Warga: ${distTotal}\n\n`
    })

    message += `━━━━━━━━━━━━━━━━━━━━\n`
    message += `📱 InterPulse - Aplikasi Kesehatan Terpadu\n`

    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank')
  }

  // Per-RW export functions for attendance
  const exportAttendanceToPDF = (rw: string) => {
    const doc = new jsPDF()
    const kelurahan = userProfile?.kelurahan || 'Duri Selatan'
    const filteredTableData = tableData.filter(row => row.rw === rw)

    // Header
    doc.setFillColor(79, 70, 229)
    doc.rect(0, 0, 210, 50, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(22)
    doc.setFont('helvetica', 'bold')
    doc.text('Data Kesehatan Warga', 105, 20, { align: 'center' })
    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.text(`Kelurahan ${kelurahan} - RW ${rw} - ${monthLabels[selectedMonth]} ${new Date().getFullYear()}`, 105, 30, { align: 'center' })

    doc.setTextColor(0, 0, 0)
    doc.setFontSize(10)
    doc.text(`Total Data: ${filteredTableData.length}`, 14, 60)

    // Table data
    const pdfData = filteredTableData.map(row => [
      row.nama,
      row.nik,
      row.rw,
      row.rt,
      row.tglLahir,
      row.umur,
      row.alamat,
      row.jenisKelamin,
      row.tb,
      row.bb,
      row.lp,
      row.td,
      row.gds,
      row.imt,
      row.ua,
      row.col,
      row.nadi
    ])

    const colTypePDF: Record<number, string> = { 11: 'tensi', 12: 'guladarah', 13: 'imt', 14: 'asamurat', 15: 'kolesterol', 16: 'nadi' }
    const statusBgPDF: Record<string, [number,number,number]> = { Rendah: [219,234,254], Normal: [220,252,231], Batas: [254,249,195], Tinggi: [254,226,226] }
    const statusTxtPDF: Record<string, [number,number,number]> = { Rendah: [29,78,216], Normal: [21,128,61], Batas: [161,98,7], Tinggi: [185,28,28] }

    autoTable(doc, {
      startY: 65,
      head: [['Nama', 'NIK', 'RW', 'RT', 'Tgl Lahir', 'Umur', 'Alamat', 'L/P', 'TB', 'BB', 'LP', 'TD', 'GDS', 'IMT', 'UA', 'COL', 'NADI']],
      body: pdfData,
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [238, 242, 255] },
      didParseCell: (data: any) => {
        if (data.section !== 'body') return
        const type = colTypePDF[data.column.index]
        if (!type) return
        const val = String(data.cell.raw ?? '')
        if (!val || val === '-') return
        const numVal = data.column.index === 11 ? parseInt(val.split('/')[0]) : parseFloat(val)
        if (isNaN(numVal)) return
        const rowGender = filteredTableData[data.row.index]?.jenisKelamin
        const { status } = getHealthStatus(type, numVal, rowGender)
        if (statusBgPDF[status]) {
          data.cell.styles.fillColor = statusBgPDF[status]
          data.cell.styles.textColor = statusTxtPDF[status]
          data.cell.styles.fontStyle = 'bold'
        }
      },
    })

    doc.save(`data-kesehatan-warga-rw-${rw}-${selectedMonth}.pdf`)
  }

  const exportAttendanceToExcel = (rw: string) => {
    const kelurahan = userProfile?.kelurahan || 'Duri Selatan'
    const filteredTableData = tableData.filter(row => row.rw === rw)

    const metaRows: (string | number)[][] = [
      [`DATA KESEHATAN WARGA - RW ${rw}`],
      [`Kelurahan: ${kelurahan}`, '', `Bulan: ${monthLabels[selectedMonth]} ${new Date().getFullYear()}`],
      [`Total Data: ${filteredTableData.length} warga`],
      []
    ]

    const header = ['Nama', 'NIK', 'Tgl Lahir', 'Umur', 'Alamat', 'L/P', 'TB', 'BB', 'LP', 'TD', 'GDS', 'IMT', 'UA', 'COL', 'NADI']
    const dataRows = filteredTableData.map((row: any) => [
      row.nama, row.nik, row.tglLahir, row.umur, row.alamat,
      row.jenisKelamin, row.tb, row.bb, row.lp,
      row.td, row.gds, row.imt, row.ua, row.col, row.nadi
    ])

    const ws = XLSXStyle.utils.aoa_to_sheet([...metaRows, header, ...dataRows])
    ws['!cols'] = [{ wch: 22 }, { wch: 18 }, { wch: 12 }, { wch: 6 }, { wch: 30 }, { wch: 5 }, { wch: 5 }, { wch: 5 }, { wch: 5 }, { wch: 9 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }]

    const xlsxHealthCols = [
      { colIdx: 9, field: 'td', type: 'tensi' },
      { colIdx: 10, field: 'gds', type: 'guladarah' },
      { colIdx: 11, field: 'imt', type: 'imt' },
      { colIdx: 12, field: 'ua', type: 'asamurat' },
      { colIdx: 13, field: 'col', type: 'kolesterol' },
      { colIdx: 14, field: 'nadi', type: 'nadi' },
    ]
    const xlsxFill: Record<string, string> = { Rendah: 'DBEAFE', Normal: 'DCFCE7', Batas: 'FEF9C3', Tinggi: 'FEE2E2' }
    const xlsxFont: Record<string, string> = { Rendah: '1D4ED8', Normal: '15803D', Batas: 'A16207', Tinggi: 'B91C1C' }
    const dataStartRow = metaRows.length + 2
    filteredTableData.forEach((row: any, i: number) => {
      const excelRow = dataStartRow + i
      xlsxHealthCols.forEach(({ colIdx, field, type }) => {
        const cellAddr = `${String.fromCharCode(65 + colIdx)}${excelRow}`
        if (!ws[cellAddr]) return
        const valStr = String(row[field] ?? '')
        if (!valStr || valStr === '-') return
        const numVal = field === 'td' ? parseInt(valStr.split('/')[0]) : parseFloat(valStr)
        if (isNaN(numVal)) return
        const { status } = getHealthStatus(type, numVal, row.jenisKelamin)
        if (xlsxFill[status]) {
          ws[cellAddr].s = { fill: { fgColor: { rgb: xlsxFill[status] } }, font: { color: { rgb: xlsxFont[status] }, bold: true } }
        }
      })
    })

    const wb = XLSXStyle.utils.book_new()
    XLSXStyle.utils.book_append_sheet(wb, ws, `Data Kesehatan Warga RW ${rw}`.slice(0, 31))
    XLSXStyle.writeFile(wb, `data-kesehatan-warga-rw-${rw}-${selectedMonth}.xlsx`)
  }

  const exportAttendanceToWhatsApp = (rw: string) => {
    const kelurahan = userProfile?.kelurahan || 'Duri Selatan'
    const filteredTableData = tableData.filter(row => row.rw === rw)

    let message = `📊 *DATA KESEHATAN WARGA RW ${rw}*\n`
    message += `🏥 Kelurahan ${kelurahan}\n`
    message += `📅 ${monthLabels[selectedMonth]} ${new Date().getFullYear()}\n\n`
    message += `━━━━━━━━━━━━━━━━━━━━\n\n`
    message += `📈 *RINGKASAN DATA*\n`
    message += `• Total Data: ${filteredTableData.length}\n\n`
    message += `━━━━━━━━━━━━━━━━━━━━\n\n`
    message += `🏥 *DATA KESEHATAN WARGA*\n\n`

    if (filteredTableData.length === 0) {
      message += `Belum ada data kesehatan untuk RW ${rw}.\n`
    } else {
      filteredTableData.forEach((row, index) => {
        message += `${index + 1}. ${row.nama}\n`
        message += `   NIK: ${row.nik}\n`
        message += `   Umur: ${row.umur}\n`
        message += `   Alamat: ${row.alamat}\n`
        message += `   L/P: ${row.jenisKelamin}\n`
        message += `   TB: ${row.tb} | BB: ${row.bb}\n`
        message += `   TD: ${row.td} | GDS: ${row.gds}\n`
        message += `   IMT: ${row.imt} | UA: ${row.ua}\n`
        message += `   COL: ${row.col} | NADI: ${row.nadi}\n\n`
      })
    }

    message += `━━━━━━━━━━━━━━━━━━━━\n`
    message += `📱 InterPulse - Aplikasi Kesehatan Terpadu\n`

    const encodedMessage = encodeURIComponent(message)
    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank')
  }

  // Per-RW export functions
  const exportRWToPDF = (rw: string) => {
    const doc = new jsPDF()
    const kelurahan = userProfile?.kelurahan || 'Duri Selatan'
    const headerH = 50

    doc.setFillColor(79, 70, 229)
    doc.rect(0, 0, 210, headerH, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(22)
    doc.setFont('helvetica', 'bold')
    doc.text(`Pemeriksaan Kesehatan RW ${rw}`, 105, 20, { align: 'center' })
    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.text(`Kelurahan ${kelurahan} - ${monthLabels[selectedMonth]} ${new Date().getFullYear()}`, 105, 32, { align: 'center' })

    const rwTableData = tableData.filter((row: any) => row.rw === rw)
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(9)
    doc.text(`Total Data: ${rwTableData.length} warga`, 14, headerH + 10)

    const pdfData = rwTableData.map((row: any) => [
      row.nama, row.nik, row.rw, row.rt, row.tglLahir, row.umur, row.alamat,
      row.jenisKelamin, row.tb, row.bb, row.lp, row.td, row.gds, row.imt, row.ua, row.col, row.nadi
    ])

    const colTypePDF: Record<number, string> = { 11: 'tensi', 12: 'guladarah', 13: 'imt', 14: 'asamurat', 15: 'kolesterol', 16: 'nadi' }
    const statusBgPDF: Record<string, [number,number,number]> = { Rendah: [219,234,254], Normal: [220,252,231], Batas: [254,249,195], Tinggi: [254,226,226] }
    const statusTxtPDF: Record<string, [number,number,number]> = { Rendah: [29,78,216], Normal: [21,128,61], Batas: [161,98,7], Tinggi: [185,28,28] }

    autoTable(doc, {
      startY: headerH + 14,
      head: [['Nama', 'NIK', 'RW', 'RT', 'Tgl Lahir', 'Umur', 'Alamat', 'L/P', 'TB', 'BB', 'LP', 'TD', 'GDS', 'IMT', 'UA', 'COL', 'NADI']],
      body: pdfData,
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [238, 242, 255] },
      didParseCell: (data: any) => {
        if (data.section !== 'body') return
        const type = colTypePDF[data.column.index]
        if (!type) return
        const val = String(data.cell.raw ?? '')
        if (!val || val === '-') return
        const numVal = data.column.index === 11 ? parseInt(val.split('/')[0]) : parseFloat(val)
        if (isNaN(numVal)) return
        const rowGender = rwTableData[data.row.index]?.jenisKelamin
        const { status } = getHealthStatus(type, numVal, rowGender)
        if (statusBgPDF[status]) {
          data.cell.styles.fillColor = statusBgPDF[status]
          data.cell.styles.textColor = statusTxtPDF[status]
          data.cell.styles.fontStyle = 'bold'
        }
      },
    })

    doc.save(`pemeriksaan-rw-${rw}-${selectedMonth}.pdf`)
  }

  const exportRWToExcel = (rw: string) => {
    const kelurahan = userProfile?.kelurahan || 'Duri Selatan'
    const rwTableData = tableData.filter((row: any) => row.rw === rw)

    const metaRows: (string | number)[][] = [
      [`DATA KESEHATAN WARGA - RW ${rw}`],
      [`Kelurahan: ${kelurahan}`, '', `Bulan: ${monthLabels[selectedMonth]} ${new Date().getFullYear()}`],
      [`Total Data: ${rwTableData.length} warga`],
      []
    ]

    const header = ['Nama', 'NIK', 'Tgl Lahir', 'Umur', 'Alamat', 'L/P', 'TB', 'BB', 'LP', 'TD', 'GDS', 'IMT', 'UA', 'COL', 'NADI']
    const dataRows = rwTableData.map((row: any) => [
      row.nama, row.nik, row.tglLahir, row.umur, row.alamat,
      row.jenisKelamin, row.tb, row.bb, row.lp,
      row.td, row.gds, row.imt, row.ua, row.col, row.nadi
    ])

    const ws = XLSXStyle.utils.aoa_to_sheet([...metaRows, header, ...dataRows])
    ws['!cols'] = [{ wch: 22 }, { wch: 18 }, { wch: 12 }, { wch: 6 }, { wch: 30 }, { wch: 5 }, { wch: 5 }, { wch: 5 }, { wch: 5 }, { wch: 9 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }]

    const xlsxHealthCols = [
      { colIdx: 9, field: 'td', type: 'tensi' },
      { colIdx: 10, field: 'gds', type: 'guladarah' },
      { colIdx: 11, field: 'imt', type: 'imt' },
      { colIdx: 12, field: 'ua', type: 'asamurat' },
      { colIdx: 13, field: 'col', type: 'kolesterol' },
      { colIdx: 14, field: 'nadi', type: 'nadi' },
    ]
    const xlsxFill: Record<string, string> = { Rendah: 'DBEAFE', Normal: 'DCFCE7', Batas: 'FEF9C3', Tinggi: 'FEE2E2' }
    const xlsxFont: Record<string, string> = { Rendah: '1D4ED8', Normal: '15803D', Batas: 'A16207', Tinggi: 'B91C1C' }
    const dataStartRow = metaRows.length + 2
    rwTableData.forEach((row: any, i: number) => {
      const excelRow = dataStartRow + i
      xlsxHealthCols.forEach(({ colIdx, field, type }) => {
        const cellAddr = `${String.fromCharCode(65 + colIdx)}${excelRow}`
        if (!ws[cellAddr]) return
        const valStr = String(row[field] ?? '')
        if (!valStr || valStr === '-') return
        const numVal = field === 'td' ? parseInt(valStr.split('/')[0]) : parseFloat(valStr)
        if (isNaN(numVal)) return
        const { status } = getHealthStatus(type, numVal, row.jenisKelamin)
        if (xlsxFill[status]) {
          ws[cellAddr].s = { fill: { fgColor: { rgb: xlsxFill[status] } }, font: { color: { rgb: xlsxFont[status] }, bold: true } }
        }
      })
    })

    const wb = XLSXStyle.utils.book_new()
    XLSXStyle.utils.book_append_sheet(wb, ws, `RW ${rw}`.slice(0, 31))
    XLSXStyle.writeFile(wb, `pemeriksaan-rw-${rw}-${selectedMonth}.xlsx`)
  }

  const exportRWToWhatsApp = (rw: string) => {
    const kelurahan = userProfile?.kelurahan || 'Duri Selatan'
    const rwData = healthReadingsDetails[rw] || []
    const monthData = rwData.filter(d => {
      const month = new Date(d.timestamp).toLocaleString('id-ID', { month: 'long' }).toLowerCase()
      return month === selectedMonth
    })
    
    let message = `📊 *PEMERIKSAAN KESEHATAN RW ${rw}*\n`
    message += `🏥 Kelurahan ${kelurahan}\n`
    message += `📅 ${monthLabels[selectedMonth]} ${new Date().getFullYear()}\n\n`
    message += `━━━━━━━━━━━━━━━━━━━━\n\n`
    message += `📈 *RINGKASAN DATA*\n`
    const uniqueWargaWA = new Set(monthData.map((d: any) => d.nik)).size
    message += `• Total Warga Diperiksa: ${uniqueWargaWA}\n\n`
    message += `📋 *DAFTAR WARGA YANG DIPERIKSA*\n\n`
    
    // No grouping, each reading as separate row
    monthData.forEach((d, i) => {
      const resident = residentsData[d.userId] || residentsData[d.nik] || residentsData[d.residentId] || 
                      (d.nama ? residentsData[d.nama.toLowerCase()] : {}) || 
                      (d.userName ? residentsData[d.userName.toLowerCase()] : {}) || {}
      message += `${i + 1}. ${resident.nama || d.nama || d.userName || '-'}\n`
      message += `   NIK: ${resident.nik || d.nik || '-'}\n`
      message += `   Jenis: ${d.type || '-'}\n`
      message += `   Tanggal: ${d.timestamp ? new Date(d.timestamp).toLocaleDateString('id-ID') : '-'}\n\n`
    })
    
    message += `━━━━━━━━━━━━━━━━━━━━\n`
    message += `📱 InterPulse - Aplikasi Kesehatan Terpadu\n`
    
    const encodedMessage = encodeURIComponent(message)
    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank')
  }

  // Export functions for Data Kesehatan Warga table
  const exportTableToPDF = () => {
    const doc = new jsPDF()
    const kelurahan = userProfile?.kelurahan || 'Duri Selatan'
    const pemLabels: Record<string, string> = { td: 'TD (Tensi)', gds: 'GDS (Gula Darah)', imt: 'IMT', ua: 'UA (Asam Urat)', col: 'COL (Kolesterol)', nadi: 'Nadi' }
    const katLabels: Record<string, string> = { rendah: 'Rendah', normal: 'Normal', batas: 'Batas Tinggi', tinggi: 'Tinggi' }
    const katColors: Record<string, [number,number,number]> = { rendah: [59,130,246], normal: [34,197,94], batas: [234,179,8], tinggi: [239,68,68] }
    const fieldToCol: Record<string, number> = { td: 11, gds: 12, imt: 13, ua: 14, col: 15, nadi: 16 }
    const hasFilter = tableFilterPemeriksaan !== 'all'
    const headerH = hasFilter ? 58 : 50

    doc.setFillColor(79, 70, 229)
    doc.rect(0, 0, 210, headerH, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text('Data Kesehatan Warga', 105, 16, { align: 'center' })
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Kelurahan ${kelurahan} - ${monthLabels[selectedMonth]} ${new Date().getFullYear()}`, 105, 25, { align: 'center' })

    if (hasFilter) {
      const katColor = tableFilterKategori !== 'all' ? katColors[tableFilterKategori] : [255,255,255]
      doc.setFillColor(255, 255, 255, 0.2)
      doc.setDrawColor(255, 255, 255)
      doc.roundedRect(14, 31, 182, 18, 3, 3, 'S')
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.text(`Filter Pemeriksaan: ${pemLabels[tableFilterPemeriksaan]}`, 20, 40)
      if (tableFilterKategori !== 'all') {
        doc.setTextColor(katColor[0], katColor[1], katColor[2])
        doc.text(`  |  Kategori: ${katLabels[tableFilterKategori]}`, 100, 40)
        doc.setTextColor(255, 255, 255)
      }
    }

    doc.setTextColor(0, 0, 0)
    doc.setFontSize(9)
    doc.text(`Total Data: ${displayTableData.length} warga`, 14, headerH + 10)

    const pdfData = displayTableData.map(row => [
      row.nama, row.nik, row.rw, row.rt, row.tglLahir, row.umur, row.alamat,
      row.jenisKelamin, row.tb, row.bb, row.lp, row.td, row.gds, row.imt, row.ua, row.col, row.nadi
    ])

    const colTypePDF: Record<number, string> = { 11: 'tensi', 12: 'guladarah', 13: 'imt', 14: 'asamurat', 15: 'kolesterol', 16: 'nadi' }
    const statusBgPDF: Record<string, [number,number,number]> = { Rendah: [219,234,254], Normal: [220,252,231], Batas: [254,249,195], Tinggi: [254,226,226] }
    const statusTxtPDF: Record<string, [number,number,number]> = { Rendah: [29,78,216], Normal: [21,128,61], Batas: [161,98,7], Tinggi: [185,28,28] }

    autoTable(doc, {
      startY: headerH + 14,
      head: [['Nama', 'NIK', 'RW', 'RT', 'Tgl Lahir', 'Umur', 'Alamat', 'L/P', 'TB', 'BB', 'LP', 'TD', 'GDS', 'IMT', 'UA', 'COL', 'NADI']],
      body: pdfData,
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [238, 242, 255] },
      didParseCell: (data: any) => {
        if (hasFilter && data.section === 'head' && data.column.index === fieldToCol[tableFilterPemeriksaan]) {
          const bg = tableFilterKategori !== 'all' ? katColors[tableFilterKategori] : [79, 70, 229]
          data.cell.styles.fillColor = bg
        }
        if (data.section !== 'body') return
        const type = colTypePDF[data.column.index]
        if (!type) return
        const val = String(data.cell.raw ?? '')
        if (!val || val === '-') return
        const numVal = data.column.index === 11 ? parseInt(val.split('/')[0]) : parseFloat(val)
        if (isNaN(numVal)) return
        const { status } = getHealthStatus(type, numVal)
        if (statusBgPDF[status]) {
          data.cell.styles.fillColor = statusBgPDF[status]
          data.cell.styles.textColor = statusTxtPDF[status]
          data.cell.styles.fontStyle = 'bold'
        }
      },
    })

    const suffix = hasFilter ? `-${tableFilterPemeriksaan}${tableFilterKategori !== 'all' ? '-' + tableFilterKategori : ''}` : ''
    doc.save(`data-kesehatan-warga-${selectedMonth}${suffix}.pdf`)
    setTableExportDropdown(false)
  }

  const exportTableToExcel = () => {
    const kelurahan = userProfile?.kelurahan || 'Duri Selatan'
    const pemLabels: Record<string, string> = { td: 'TD (Tensi)', gds: 'GDS (Gula Darah)', imt: 'IMT', ua: 'UA (Asam Urat)', col: 'COL (Kolesterol)', nadi: 'Nadi' }
    const katLabels: Record<string, string> = { rendah: 'Rendah', normal: 'Normal', batas: 'Batas Tinggi', tinggi: 'Tinggi' }
    const hasFilter = tableFilterPemeriksaan !== 'all'

    const metaRows: (string | number)[][] = [
      ['DATA KESEHATAN WARGA'],
      [`Kelurahan: ${kelurahan}`, '', `Bulan: ${monthLabels[selectedMonth]} ${new Date().getFullYear()}`],
    ]
    if (hasFilter) {
      metaRows.push([`Filter Pemeriksaan: ${pemLabels[tableFilterPemeriksaan]}`, '', `Kategori: ${tableFilterKategori !== 'all' ? katLabels[tableFilterKategori] : 'Semua'}`])
    }
    metaRows.push([`Total Data: ${displayTableData.length} warga`])
    metaRows.push([])

    const header = ['Nama', 'NIK', 'Tgl Lahir', 'Umur', 'Alamat', 'L/P', 'TB', 'BB', 'LP', 'TD', 'GDS', 'IMT', 'UA', 'COL', 'NADI']
    const dataRows = displayTableData.map(row => [
      row.nama, row.nik, row.tglLahir, row.umur, row.alamat,
      row.jenisKelamin, row.tb, row.bb, row.lp,
      row.td, row.gds, row.imt, row.ua, row.col, row.nadi
    ])

    const ws = XLSXStyle.utils.aoa_to_sheet([...metaRows, header, ...dataRows])
    ws['!cols'] = [{ wch: 22 }, { wch: 18 }, { wch: 12 }, { wch: 6 }, { wch: 30 }, { wch: 5 }, { wch: 5 }, { wch: 5 }, { wch: 5 }, { wch: 9 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }]

    const xlsxHealthCols = [
      { colIdx: 9, field: 'td', type: 'tensi' },
      { colIdx: 10, field: 'gds', type: 'guladarah' },
      { colIdx: 11, field: 'imt', type: 'imt' },
      { colIdx: 12, field: 'ua', type: 'asamurat' },
      { colIdx: 13, field: 'col', type: 'kolesterol' },
      { colIdx: 14, field: 'nadi', type: 'nadi' },
    ]
    const xlsxFill: Record<string, string> = { Rendah: 'DBEAFE', Normal: 'DCFCE7', Batas: 'FEF9C3', Tinggi: 'FEE2E2' }
    const xlsxFont: Record<string, string> = { Rendah: '1D4ED8', Normal: '15803D', Batas: 'A16207', Tinggi: 'B91C1C' }
    const dataStartRow = metaRows.length + 2
    displayTableData.forEach((row: any, i: number) => {
      const excelRow = dataStartRow + i
      xlsxHealthCols.forEach(({ colIdx, field, type }) => {
        const cellAddr = `${String.fromCharCode(65 + colIdx)}${excelRow}`
        if (!ws[cellAddr]) return
        const valStr = String((row as any)[field] ?? '')
        if (!valStr || valStr === '-') return
        const numVal = field === 'td' ? parseInt(valStr.split('/')[0]) : parseFloat(valStr)
        if (isNaN(numVal)) return
        const { status } = getHealthStatus(type, numVal)
        if (xlsxFill[status]) {
          ws[cellAddr].s = { fill: { fgColor: { rgb: xlsxFill[status] } }, font: { color: { rgb: xlsxFont[status] }, bold: true } }
        }
      })
    })

    const wb = XLSXStyle.utils.book_new()
    const sheetName = hasFilter ? `${pemLabels[tableFilterPemeriksaan].split(' ')[0]}${tableFilterKategori !== 'all' ? '-' + katLabels[tableFilterKategori] : ''}` : 'Data Kesehatan Warga'
    XLSXStyle.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31))

    const suffix = hasFilter ? `-${tableFilterPemeriksaan}${tableFilterKategori !== 'all' ? '-' + tableFilterKategori : ''}` : ''
    XLSXStyle.writeFile(wb, `data-kesehatan-warga-${selectedMonth}${suffix}.xlsx`)
    setTableExportDropdown(false)
  }

  const exportTableToWhatsApp = () => {
    const kelurahan = userProfile?.kelurahan || 'Duri Selatan'
    const filteredTableData = displayTableData
    const pemLabels: Record<string, string> = { td: 'TD (Tensi)', gds: 'GDS (Gula Darah)', imt: 'IMT', ua: 'UA (Asam Urat)', col: 'COL (Kolesterol)', nadi: 'Nadi' }
    const katEmoji: Record<string, string> = { rendah: '🔵 Rendah', normal: '🟢 Normal', batas: '🟡 Batas Tinggi', tinggi: '🔴 Tinggi' }
    const hasFilter = tableFilterPemeriksaan !== 'all'

    let message = `📊 *DATA KESEHATAN WARGA*\n`
    message += `🏥 Kelurahan ${kelurahan}\n`
    message += `📅 ${monthLabels[selectedMonth]} ${new Date().getFullYear()}\n`
    if (hasFilter) {
      message += `🔍 Filter: *${pemLabels[tableFilterPemeriksaan]}*`
      if (tableFilterKategori !== 'all') message += ` → ${katEmoji[tableFilterKategori]}`
      message += `\n`
    }
    message += `\n━━━━━━━━━━━━━━━━━━━━\n\n`
    message += `📈 *RINGKASAN DATA*\n`
    message += `• Total Warga: ${filteredTableData.length}\n\n`
    message += `━━━━━━━━━━━━━━━━━━━━\n\n`
    message += `🏥 *DAFTAR WARGA*\n\n`
    
    filteredTableData.slice(0, 20).forEach(row => {
      message += `� ${row.nama}\n`
      message += `🆔 NIK: ${row.nik}\n`
      message += `🎂 Umur: ${row.umur}\n`
      message += `📍 Alamat: ${row.alamat}\n`
      message += `🏥 TB: ${row.tb} | BB: ${row.bb} | LP: ${row.lp}\n`
      message += `💓 TD: ${row.td} | GDS: ${row.gds} | IMT: ${row.imt}\n\n`
    })
    
    if (filteredTableData.length > 20) {
      message += `... dan ${filteredTableData.length - 20} data lainnya\n\n`
    }
    
    message += `━━━━━━━━━━━━━━━━━━━━\n`
    message += `� InterPulse - Aplikasi Kesehatan Terpadu\n`
    
    const encodedMessage = encodeURIComponent(message)
    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank')
    setTableExportDropdown(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 rounded-b-3xl shadow-lg">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            aria-label="Kembali"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-2xl font-bold">Laporan</h1>
            <p className="text-indigo-100 text-sm mt-1">Pantau data kesehatan warga</p>
          </div>
        </div>
      </div>

      <div className="px-4 mt-6 space-y-4">
        {/* Ringkasan - Bulan Section */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-600" />
              <span className="font-semibold text-gray-800">Ringkasan - {monthLabels[selectedMonth]}</span>
            </div>
            <div className="relative">
              <button
                onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Export</span>
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
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-blue-600" />
                <span className="text-sm text-gray-600">Total Hadir</span>
              </div>
              <p className="text-2xl font-bold text-gray-800">{totalAttendance}</p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-5 h-5 text-green-600" />
                <span className="text-sm text-gray-600">Total Warga (Target)</span>
              </div>
              <p className="text-2xl font-bold text-gray-800">{totalTarget}</p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-100">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-purple-600" />
                <span className="text-sm text-gray-600">Capaian</span>
              </div>
              <p className="text-2xl font-bold text-gray-800">{attendancePercentage}%</p>
            </div>
          </div>
        </div>

        {/* Month Filter */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4 text-indigo-600" />
            <span className="font-semibold text-gray-800 text-sm">Pilih Bulan</span>
          </div>
          <div className="grid grid-cols-6 gap-1.5">
            {months.map(m => (
              <button
                key={m}
                onClick={() => setSelectedMonth(m)}
                className={`py-1.5 rounded-lg text-xs font-medium transition-all ${selectedMonth === m ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {monthLabels[m]}
              </button>
            ))}
          </div>
        </div>

        {/* Tables Section */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-600" />
                <span className="font-semibold text-gray-800 text-sm">Rekapitulasi Hasil Pemeriksaan</span>
              </div>
              <div className="relative">
                <button
                  onClick={() => setHealthDistExportDropdown(!healthDistExportDropdown)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export
                </button>
                {healthDistExportDropdown && (
                  <div className="absolute right-0 mt-2 w-44 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
                    <div className="px-3 py-1.5 bg-indigo-50 border-b border-gray-100">
                      <p className="text-xs font-semibold text-indigo-700">Pilih Format</p>
                    </div>
                    <button onClick={() => { exportHealthDistToPDF(); setHealthDistExportDropdown(false); }} className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-red-50 transition-colors text-xs">
                      <div className="w-6 h-6 bg-red-100 rounded flex items-center justify-center"><svg className="w-3.5 h-3.5 text-red-600" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4zm-3 9h-2v-2h2v2zm0-4h-2V7h2v2z"/></svg></div>
                      <span className="text-gray-700">PDF</span>
                    </button>
                    <button onClick={() => { exportHealthDistToExcel(); setHealthDistExportDropdown(false); }} className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-green-50 transition-colors text-xs">
                      <div className="w-6 h-6 bg-green-100 rounded flex items-center justify-center"><svg className="w-3.5 h-3.5 text-green-700" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4zM4 22h16v-2H4v2zm0-4h16v-2H4v2zm0-4h16v-2H4v2zm0-4h16V8H4v2z"/></svg></div>
                      <span className="text-gray-700">Excel</span>
                    </button>
                    <button onClick={() => { exportHealthDistToWhatsApp(); setHealthDistExportDropdown(false); }} className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-emerald-50 transition-colors text-xs">
                      <div className="w-6 h-6 bg-emerald-100 rounded flex items-center justify-center"><svg className="w-3.5 h-3.5 text-emerald-600" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg></div>
                      <span className="text-gray-700">WhatsApp</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
            {/* Filters */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">RW</label>
                <select
                  value={filterRW}
                  onChange={(e) => setFilterRW(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  title="Filter RW"
                >
                  <option value="all">Semua RW</option>
                  {Object.keys(rwTargets).sort((a, b) => parseInt(a) - parseInt(b)).map(rw => (
                    <option key={rw} value={rw}>RW {rw}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">RT</label>
                <select
                  value={filterRT}
                  onChange={(e) => setFilterRT(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  title="Filter RT"
                >
                  <option value="all">Semua RT</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(rt => (
                    <option key={rt} value={String(rt)}>RT {rt}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Pemeriksaan</label>
                <select
                  value={filterHealthType}
                  onChange={(e) => setFilterHealthType(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  title="Filter Jenis Pemeriksaan"
                >
                  <option value="kolesterol">Kolesterol</option>
                  <option value="tensi">Tensi</option>
                  <option value="guladarah">Gula Darah</option>
                  <option value="asamurat">Asam Urat</option>
                  <option value="nadi">Nadi</option>
                  <option value="imt">IMT</option>
                </select>
              </div>
            </div>
            {/* Pie Chart + Table */}
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Pie Chart */}
              <div className="lg:w-1/3">
                {(() => {
                  const distribution = getHealthStatusDistribution()
                  const total = distribution.rendah + distribution.normal + distribution.batas + distribution.tinggi
                  const data = [
                    { label: 'Rendah', count: distribution.rendah, color: '#3b82f6' },
                    { label: 'Normal', count: distribution.normal, color: '#22c55e' },
                    { label: 'Batas Tinggi', count: distribution.batas, color: '#eab308' },
                    { label: 'Tinggi', count: distribution.tinggi, color: '#ef4444' }
                  ]
                  const colors = data.map(d => d.color)
                  const counts = data.map(d => d.count)
                  
                  let cumulativePercent = 0
                  const segments = data.map((d, i) => {
                    const percent = total > 0 ? (d.count / total) * 100 : 0
                    const startPercent = cumulativePercent
                    cumulativePercent += percent
                    return { ...d, percent, startPercent }
                  })
                  
                  return (
                    <div className="flex flex-col items-center">
                      <div className="relative w-40 h-40">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                          <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="20" />
                          {segments.map((seg, i) => (
                            seg.count > 0 && (
                              <circle
                                key={i}
                                cx="50" cy="50" r="40"
                                fill="none"
                                stroke={seg.color}
                                strokeWidth="20"
                                strokeDasharray={`${(seg.percent / 100) * 251.2} 251.2`}
                                strokeDashoffset={`-${(seg.startPercent / 100) * 251.2}`}
                                strokeLinecap="round"
                              />
                            )
                          ))}
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center">
                            <p className="text-2xl font-bold text-gray-800">{total}</p>
                            <p className="text-[10px] text-gray-500">Total</p>
                          </div>
                        </div>
                      </div>
                      {/* Legend */}
                      <div className="mt-4 space-y-2">
                        {segments.map((seg, i) => (
                          seg.count > 0 && (
                            <div key={i} className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: seg.color }}
                                role="presentation"
                                aria-hidden="true"
                              ></div>
                              <span className="text-xs text-gray-600">{seg.label}: {seg.count}</span>
                            </div>
                          )
                        ))}
                      </div>
                    </div>
                  )
                })()}
              </div>
              
              {/* Table */}
              <div className="lg:w-2/3 overflow-x-auto">
                <table className="w-full text-sm border border-gray-200">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b">Kategori Hasil</th>
                      <th className="px-3 py-2 text-center font-semibold text-gray-700 border-b">Jumlah Warga</th>
                      <th className="px-3 py-2 text-center font-semibold text-gray-700 border-b">Persentase</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const distribution = getHealthStatusDistribution()
                      const total = distribution.rendah + distribution.normal + distribution.batas + distribution.tinggi
                      const rows = [
                        { label: 'Rendah', count: distribution.rendah, badge: 'bg-blue-100 text-blue-800' },
                        { label: 'Normal', count: distribution.normal, badge: 'bg-green-100 text-green-800' },
                        { label: 'Batas Tinggi', count: distribution.batas, badge: 'bg-yellow-100 text-yellow-800' },
                        { label: 'Tinggi', count: distribution.tinggi, badge: 'bg-red-100 text-red-800' }
                      ]
                      return rows.map((row, i) => (
                        <tr key={i} className="border-b">
                          <td className="px-3 py-2">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${row.badge}`}>{row.label}</span>
                          </td>
                          <td className="px-3 py-2 text-center">{row.count}</td>
                          <td className="px-3 py-2 text-center">{total > 0 ? ((row.count / total) * 100).toFixed(2) : '0.00'}%</td>
                        </tr>
                      ))
                    })()}
                  </tbody>
                  <tfoot className="bg-gray-50 font-bold">
                    <tr>
                      <td className="px-3 py-2 border-t">Total Warga</td>
                      <td className="px-3 py-2 text-center border-t">
                        {(() => {
                          const distribution = getHealthStatusDistribution()
                          return distribution.rendah + distribution.normal + distribution.batas + distribution.tinggi
                        })()}
                      </td>
                      <td className="px-3 py-2 text-center border-t">100%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>

          {/* Table 2: Rekapitulasi Partisipasi Warga */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-4 h-4 text-indigo-600" />
              <span className="font-semibold text-gray-800 text-sm">Rekapitulasi Partisipasi Warga</span>
            </div>
            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-gray-200">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b">Wilayah</th>
                    <th className="px-3 py-2 text-center font-semibold text-gray-700 border-b">Hadir / Partisipasi</th>
                    <th className="px-3 py-2 text-center font-semibold text-gray-700 border-b">
                      <span>Total Target Warga</span>
                      <span className="ml-1 text-xs font-normal text-indigo-400">(klik untuk edit)</span>
                    </th>
                    <th className="px-3 py-2 text-center font-semibold text-gray-700 border-b">Capaian</th>
                    <th className="px-3 py-2 text-center font-semibold text-gray-700 border-b">Export</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(customTargets).sort(([a], [b]) => parseInt(a) - parseInt(b)).map(([rw, target]) => {
                    const attendance = attendanceData[rw]?.[selectedMonth] || 0
                    const percentage = target > 0 ? ((attendance / target) * 100).toFixed(0) : '0'
                    const percentageNum = parseFloat(percentage)
                    const colorClass = percentageNum >= 80 ? 'text-green-600' : percentageNum >= 60 ? 'text-yellow-600' : 'text-red-600'
                    return (
                      <tr key={rw} className="border-b">
                        <td className="px-3 py-2">RW {rw}</td>
                        <td className="px-3 py-2 text-center">{attendance}</td>
                        <td className="px-3 py-2 text-center">
                          {editingTarget === rw ? (
                            <input
                              type="number"
                              title="Edit total target warga"
                              placeholder="Target"
                              value={editTargetValue}
                              onChange={e => setEditTargetValue(e.target.value)}
                              onBlur={() => {
                                const val = parseInt(editTargetValue)
                                if (!isNaN(val) && val >= 0) {
                                  setCustomTargets(prev => ({ ...prev, [rw]: val }))
                                }
                                setEditingTarget(null)
                              }}
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  const val = parseInt(editTargetValue)
                                  if (!isNaN(val) && val >= 0) {
                                    setCustomTargets(prev => ({ ...prev, [rw]: val }))
                                  }
                                  setEditingTarget(null)
                                }
                                if (e.key === 'Escape') setEditingTarget(null)
                              }}
                              autoFocus
                              className="w-16 text-center border border-indigo-300 rounded px-1 py-0.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          ) : (
                            <button
                              onClick={() => { setEditingTarget(rw); setEditTargetValue(String(target)) }}
                              className="group flex items-center justify-center gap-1 w-full hover:text-indigo-600"
                              title="Klik untuk edit target"
                            >
                              <span>{target}</span>
                              <svg className="w-3 h-3 opacity-0 group-hover:opacity-100 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                            </button>
                          )}
                        </td>
                        <td className={`px-3 py-2 text-center font-bold ${colorClass}`}>{percentage}%</td>
                        <td className="px-3 py-2 text-center">
                          <div className="relative inline-block">
                            <button
                              onClick={() => setAttendanceExportDropdown(attendanceExportDropdown === rw ? null : rw)}
                              className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="Export"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            {attendanceExportDropdown === rw && (
                              <div className="absolute right-0 mt-2 w-40 bg-white rounded-xl shadow-xl border border-gray-200 z-50">
                                <button
                                  onClick={() => { exportAttendanceToPDF(rw); setAttendanceExportDropdown(null); }}
                                  className="flex items-center gap-3 w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors first:rounded-t-xl text-xs"
                                >
                                  <svg className="w-4 h-4 text-red-500" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4zm-3 9h-2v-2h2v2zm0-4h-2V7h2v2z"/>
                                  </svg>
                                  <span className="text-gray-700">PDF</span>
                                </button>
                                <button
                                  onClick={() => { exportAttendanceToExcel(rw); setAttendanceExportDropdown(null); }}
                                  className="flex items-center gap-3 w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors text-xs"
                                >
                                  <svg className="w-4 h-4 text-green-600" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4zM4 22h16v-2H4v2zm0-4h16v-2H4v2zm0-4h16v-2H4v2zm0-4h16V8H4v2z"/>
                                  </svg>
                                  <span className="text-gray-700">Excel</span>
                                </button>
                                <button
                                  onClick={() => { exportAttendanceToWhatsApp(rw); setAttendanceExportDropdown(null); }}
                                  className="flex items-center gap-3 w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors last:rounded-b-xl text-xs"
                                >
                                  <svg className="w-4 h-4 text-green-500" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                                  </svg>
                                  <span className="text-gray-700">WhatsApp</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot className="bg-gray-50 font-bold">
                  <tr>
                    <td className="px-3 py-2 border-t">Total Kelurahan</td>
                    <td className="px-3 py-2 text-center border-t">
                      {Object.entries(customTargets).reduce((sum, [rw]) => sum + (attendanceData[rw]?.[selectedMonth] || 0), 0)}
                    </td>
                    <td className="px-3 py-2 text-center border-t">
                      {Object.values(customTargets).reduce((sum, target) => sum + target, 0)}
                    </td>
                    <td className="px-3 py-2 text-center border-t">
                      {(() => {
                        const totalAtt = Object.entries(customTargets).reduce((sum, [rw]) => sum + (attendanceData[rw]?.[selectedMonth] || 0), 0)
                        const totalTgt = Object.values(customTargets).reduce((sum, target) => sum + target, 0)
                        return totalTgt > 0 ? ((totalAtt / totalTgt) * 100).toFixed(0) : '0'
                      })()}%
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Table 3: Data Kesehatan Warga */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="mb-3">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2 mt-0.5">
                  <Activity className="w-4 h-4 text-indigo-600" />
                  <span className="font-semibold text-gray-800 text-sm">Data Kesehatan Warga</span>
                </div>
                {/* Right: export button + search (desktop only) */}
                <div className="flex flex-col items-end gap-1.5">
                  <div className="relative">
                    <button
                      onClick={() => setTableExportDropdown(!tableExportDropdown)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Export
                    </button>
                    {tableExportDropdown && (
                      <div className="absolute right-0 mt-2 w-44 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
                        <div className="px-3 py-1.5 bg-indigo-50 border-b border-gray-100">
                          <p className="text-xs font-semibold text-indigo-700">Pilih Format</p>
                        </div>
                        <button onClick={() => { exportTableToPDF(); setTableExportDropdown(false); }} className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-red-50 transition-colors text-xs">
                          <div className="w-6 h-6 bg-red-100 rounded flex items-center justify-center"><svg className="w-3.5 h-3.5 text-red-600" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4zm-3 9h-2v-2h2v2zm0-4h-2V7h2v2z"/></svg></div>
                          <span className="text-gray-700">PDF</span>
                        </button>
                        <button onClick={() => { exportTableToExcel(); setTableExportDropdown(false); }} className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-green-50 transition-colors text-xs">
                          <div className="w-6 h-6 bg-green-100 rounded flex items-center justify-center"><svg className="w-3.5 h-3.5 text-green-700" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4zM4 22h16v-2H4v2zm0-4h16v-2H4v2zm0-4h16v-2H4v2zm0-4h16V8H4v2z"/></svg></div>
                          <span className="text-gray-700">Excel</span>
                        </button>
                        <button onClick={() => { exportTableToWhatsApp(); setTableExportDropdown(false); }} className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-emerald-50 transition-colors text-xs">
                          <div className="w-6 h-6 bg-emerald-100 rounded flex items-center justify-center"><svg className="w-3.5 h-3.5 text-emerald-600" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg></div>
                          <span className="text-gray-700">WhatsApp</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                {/* RW */}
                <div className="flex items-center gap-1">
                  <label className="text-xs font-medium text-gray-500 whitespace-nowrap">RW</label>
                  <select value={tableFilterRW} onChange={(e) => setTableFilterRW(e.target.value)} title="Filter RW" className="text-xs border border-gray-200 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white">
                    <option value="all">Semua</option>
                    {Object.keys(rwTargets).sort((a, b) => parseInt(a) - parseInt(b)).map(rw => (
                      <option key={rw} value={rw}>{rw}</option>
                    ))}
                  </select>
                </div>
                {/* RT */}
                <div className="flex items-center gap-1">
                  <label className="text-xs font-medium text-gray-500 whitespace-nowrap">RT</label>
                  <select value={tableFilterRT} onChange={(e) => setTableFilterRT(e.target.value)} title="Filter RT" className="text-xs border border-gray-200 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white">
                    <option value="all">Semua</option>
                    {[1,2,3,4,5,6,7,8,9,10].map(rt => (
                      <option key={rt} value={String(rt)}>{rt}</option>
                    ))}
                  </select>
                </div>
                {/* Pemeriksaan */}
                <div className="flex items-center gap-1">
                  <label className="text-xs font-medium text-gray-500 whitespace-nowrap">Pemeriksaan</label>
                  <select value={tableFilterPemeriksaan} onChange={(e) => { setTableFilterPemeriksaan(e.target.value); setTableFilterKategori('all') }} title="Filter Pemeriksaan" className="text-xs border border-gray-200 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white">
                    <option value="all">Semua</option>
                    <option value="td">TD</option>
                    <option value="gds">GDS</option>
                    <option value="imt">IMT</option>
                    <option value="ua">UA</option>
                    <option value="col">COL</option>
                    <option value="nadi">NADI</option>
                  </select>
                </div>
                {/* Kategori Hasil – custom colored dropdown */}
                {tableFilterPemeriksaan !== 'all' && (
                  <div className="flex items-center gap-1 relative">
                    <label className="text-xs font-medium text-gray-500 whitespace-nowrap">Kategori</label>
                    <button
                      onClick={() => setTableKategoriDropdownOpen(!tableKategoriDropdownOpen)}
                      className={`text-xs border rounded px-1.5 py-1 flex items-center gap-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                        tableFilterKategori === 'rendah' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                        tableFilterKategori === 'normal' ? 'bg-green-100 text-green-800 border-green-200' :
                        tableFilterKategori === 'batas' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                        tableFilterKategori === 'tinggi' ? 'bg-red-100 text-red-800 border-red-200' :
                        'bg-white text-gray-700 border-gray-200'
                      }`}
                    >
                      {tableFilterKategori === 'all' ? 'Semua' :
                       tableFilterKategori === 'rendah' ? 'Rendah' :
                       tableFilterKategori === 'normal' ? 'Normal' :
                       tableFilterKategori === 'batas' ? 'Batas Tinggi' : 'Tinggi'}
                      <svg className="w-2.5 h-2.5 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    {tableKategoriDropdownOpen && (
                      <div className="absolute left-0 top-full mt-1 w-32 bg-white rounded-lg shadow-xl border border-gray-100 z-50 overflow-hidden">
                        <button onClick={() => { setTableFilterKategori('all'); setTableKategoriDropdownOpen(false) }} className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors">Semua</button>
                        <button onClick={() => { setTableFilterKategori('rendah'); setTableKategoriDropdownOpen(false) }} className="w-full text-left px-3 py-2 text-xs bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors">Rendah</button>
                        <button onClick={() => { setTableFilterKategori('normal'); setTableKategoriDropdownOpen(false) }} className="w-full text-left px-3 py-2 text-xs bg-green-100 text-green-800 hover:bg-green-200 transition-colors">Normal</button>
                        <button onClick={() => { setTableFilterKategori('batas'); setTableKategoriDropdownOpen(false) }} className="w-full text-left px-3 py-2 text-xs bg-yellow-100 text-yellow-800 hover:bg-yellow-200 transition-colors">Batas Tinggi</button>
                        <button onClick={() => { setTableFilterKategori('tinggi'); setTableKategoriDropdownOpen(false) }} className="w-full text-left px-3 py-2 text-xs bg-red-100 text-red-800 hover:bg-red-200 transition-colors">Tinggi</button>
                      </div>
                    )}
                  </div>
                )}
                {/* Nama/NIK – always visible, right-aligned */}
                <div className="flex items-center gap-1 ml-auto">
                  <label className="text-xs font-medium text-gray-500 whitespace-nowrap">Nama/NIK</label>
                  <input type="text" value={tableSearchTerm} onChange={(e) => setTableSearchTerm(e.target.value)} placeholder="Cari..." title="Cari nama atau NIK" className="text-xs border border-gray-200 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-28" />
                </div>
              </div>
            </div>
            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs border border-gray-200">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-2 py-2 text-left font-semibold text-gray-700 border-b">Nama</th>
                    <th className="px-2 py-2 text-left font-semibold text-gray-700 border-b">NIK</th>
                    <th className="px-2 py-2 text-left font-semibold text-gray-700 border-b">RW</th>
                    <th className="px-2 py-2 text-left font-semibold text-gray-700 border-b">RT</th>
                    <th className="px-2 py-2 text-left font-semibold text-gray-700 border-b">Tgl Lahir</th>
                    <th className="px-2 py-2 text-left font-semibold text-gray-700 border-b">Umur</th>
                    <th className="px-2 py-2 text-left font-semibold text-gray-700 border-b">Alamat</th>
                    <th className="px-2 py-2 text-left font-semibold text-gray-700 border-b">L/P</th>
                    <th className="px-2 py-2 text-left font-semibold text-gray-700 border-b">TB</th>
                    <th className="px-2 py-2 text-left font-semibold text-gray-700 border-b">BB</th>
                    <th className="px-2 py-2 text-left font-semibold text-gray-700 border-b">LP</th>
                    <th className="px-2 py-2 text-left font-semibold text-gray-700 border-b">TD</th>
                    <th className="px-2 py-2 text-left font-semibold text-gray-700 border-b">GDS</th>
                    <th className="px-2 py-2 text-left font-semibold text-gray-700 border-b">IMT</th>
                    <th className="px-2 py-2 text-left font-semibold text-gray-700 border-b">UA</th>
                    <th className="px-2 py-2 text-left font-semibold text-gray-700 border-b">COL</th>
                    <th className="px-2 py-2 text-left font-semibold text-gray-700 border-b">NADI</th>
                  </tr>
                </thead>
                <tbody>
                  {displayTableData.slice(0, 10).map((row, i) => (
                    <tr key={i} className="border-b hover:bg-gray-50">
                      <td className="px-2 py-2 font-medium">{row.nama}</td>
                      <td className="px-2 py-2">{row.nik}</td>
                      <td className="px-2 py-2">{row.rw}</td>
                      <td className="px-2 py-2">{row.rt}</td>
                      <td className="px-2 py-2">{row.tglLahir}</td>
                      <td className="px-2 py-2">{row.umur}</td>
                      <td className="px-2 py-2">{row.alamat}</td>
                      <td className="px-2 py-2">{row.jenisKelamin}</td>
                      <td className="px-2 py-2">{row.tb}</td>
                      <td className="px-2 py-2">{row.bb}</td>
                      <td className="px-2 py-2">{row.lp}</td>
                      <td className={getHealthCellClass('td', row.td)}>{row.td}</td>
                      <td className={getHealthCellClass('gds', row.gds)}>{row.gds}</td>
                      <td className={getHealthCellClass('imt', row.imt)}>{row.imt}</td>
                      <td className={getHealthCellClass('ua', row.ua, row.jenisKelamin)}>{row.ua}</td>
                      <td className={getHealthCellClass('col', row.col)}>{row.col}</td>
                      <td className={getHealthCellClass('nadi', row.nadi)}>{row.nadi}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Edit Modal */}
          {showEditModal && editingResident && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-800">Edit Data Warga</h3>
                  <button
                    onClick={() => {
                      setShowEditModal(false)
                      setEditingResident(null)
                    }}
                    className="text-gray-400 hover:text-gray-600"
                    aria-label="Tutup modal"
                    title="Tutup modal"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nama</label>
                    <input
                      type="text"
                      value={residentForm.nama}
                      onChange={(e) => setResidentForm({ ...residentForm, nama: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      aria-label="Nama warga"
                      placeholder="Masukkan nama lengkap"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">NIK</label>
                    <input
                      type="text"
                      value={residentForm.nik}
                      disabled
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-100 text-gray-500"
                      aria-label="NIK warga"
                      placeholder="NIK tidak dapat diubah"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">RW</label>
                      <input
                        type="text"
                        value={residentForm.rw}
                        onChange={(e) => setResidentForm({ ...residentForm, rw: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        aria-label="RW"
                        placeholder="01"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">RT</label>
                      <input
                        type="text"
                        value={residentForm.rt}
                        onChange={(e) => setResidentForm({ ...residentForm, rt: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        aria-label="RT"
                        placeholder="01"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Lahir</label>
                    <input
                      type="date"
                      value={residentForm.birthDate}
                      onChange={(e) => setResidentForm({ ...residentForm, birthDate: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      aria-label="Tanggal lahir"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Jenis Kelamin</label>
                    <select
                      value={residentForm.jenisKelamin}
                      onChange={(e) => setResidentForm({ ...residentForm, jenisKelamin: e.target.value as 'L' | 'P' })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      aria-label="Jenis kelamin"
                      title="Pilih jenis kelamin"
                    >
                      <option value="L">Laki-laki</option>
                      <option value="P">Perempuan</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Alamat</label>
                    <textarea
                      value={residentForm.alamat}
                      onChange={(e) => setResidentForm({ ...residentForm, alamat: e.target.value })}
                      aria-label="Alamat"
                      placeholder="Masukkan alamat lengkap"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      rows={3}
                    />
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => {
                        setShowEditModal(false)
                        setEditingResident(null)
                      }}
                      className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                    >
                      Batal
                    </button>
                    <button
                      onClick={() => saveEditedResident(residentForm)}
                      className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                    >
                      Simpan
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
      </div>
    </div>
  )
}
