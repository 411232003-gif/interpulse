'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronUp, Search, Filter, AlertCircle, Plus, Edit, Trash2, Activity, Users, Download, TrendingUp, Heart, Droplet, Thermometer, Target, CheckCircle, X, Info } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import BackButton from '@/components/BackButton'
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, where, orderBy, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import Link from 'next/link'
import { exportMonitoringExcel, exportMonitoringPDF, type MonitoringExportContext, type HealthStatus } from '@/lib/export-monitoring'

const rwTargets: Record<string, number> = {
  '01': 32, '02': 65, '03': 60, '04': 60, '05': 70, '06': 33, '07': 0, '08': 0, '09': 0, '10': 0
}

const months = ['januari','februari','maret','april','mei','juni','juli','agustus','september','oktober','november','desember']
const monthLabels: Record<string, string> = {
  januari:'Jan', februari:'Feb', maret:'Mar', april:'Apr', mei:'Mei', juni:'Jun',
  juli:'Jul', agustus:'Agu', september:'Sep', oktober:'Okt', november:'Nov', desember:'Des'
}

const calculateAge = (birthDate: string): number => {
  if (!birthDate) return 0
  const birth = new Date(birthDate)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--
  return age
}

const normalizeGender = (gender?: string): string => {
  if (!gender) return '-'
  if (gender === 'P' || gender === 'Perempuan') return 'P'
  if (gender === 'L' || gender === 'Laki-laki') return 'L'
  return gender
}

export default function MonitoringPage() {
  const router = useRouter()
  const { isAdmin, userProfile } = useAuth()
  const [healthReadings, setHealthReadings] = useState<Record<string, Record<string, number>>>({})
  const [attendanceData, setAttendanceData] = useState<Record<string, Record<string, number>>>({})
  const [attendanceByNik, setAttendanceByNik] = useState<Record<string, any>>({})
  const [healthReadingsDetails, setHealthReadingsDetails] = useState<Record<string, any[]>>({})
  const [residentsData, setResidentsData] = useState<Record<string, any>>({})
  const [selectedMonth, setSelectedMonth] = useState(new Date().toLocaleString('id-ID', { month: 'long' }).toLowerCase())
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; nama: string; nik: string } | null>(null)
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false)
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)

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

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 4000)
  }

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

      const byNik: Record<string, any> = {}
      snapshot.docs.forEach(docSnap => {
        const d = docSnap.data()
        if (!d.nik) return
        if (!byNik[d.nik] || new Date(d.timestamp) > new Date(byNik[d.nik].timestamp)) {
          byNik[d.nik] = d
        }
      })
      setAttendanceByNik(byNik)
    })
    return () => unsubscribe()
  }, [residentsData])

  // Fetch residents + users data (merged, same as halaman Absensi)
  useEffect(() => {
    const residentsRef = collection(db, 'residents')
    const usersRef = collection(db, 'users')

    const unsubscribeUsers = onSnapshot(usersRef, (usersSnapshot) => {
      const adminUIDs = new Set<string>()
      usersSnapshot.docs.forEach(docSnap => {
        const user = docSnap.data()
        if (user.role === 'admin') {
          adminUIDs.add(docSnap.id)
          if (user.nik) adminUIDs.add(user.nik)
        }
      })

      const unsubscribeResidents = onSnapshot(residentsRef, (snapshot) => {
        const data: Record<string, any> = {}
        const nameMap: Record<string, any> = {}

        const storeResident = (entry: any) => {
          if (entry.id) data[entry.id] = entry
          if (entry.nik) data[entry.nik] = entry
          if (entry.uid) data[entry.uid] = entry
          if (entry.nama) nameMap[entry.nama.toLowerCase()] = entry
        }

        snapshot.docs.forEach(docSnap => {
          const d = docSnap.data()
          if (adminUIDs.has(docSnap.id) || (d.nik && adminUIDs.has(d.nik)) || (d.uid && adminUIDs.has(d.uid))) return
          storeResident({ ...d, id: docSnap.id })
        })

        usersSnapshot.docs.forEach(userDoc => {
          const user = userDoc.data()
          if (user.role === 'admin' || !user.nik) return

          const userEntry = {
            id: userDoc.id,
            uid: userDoc.id,
            nama: user.name || '',
            nik: user.nik,
            rw: user.rw || '',
            rt: user.rt || '',
            birthDate: user.birthDate || '',
            umur: user.birthDate ? calculateAge(user.birthDate) : 0,
            jenisKelamin: normalizeGender(user.gender),
            alamat: user.kelurahan || user.alamat || '',
          }

          const existing = data[user.nik] || data[userDoc.id]
          if (existing) {
            const merged = {
              ...existing,
              nama: existing.nama || userEntry.nama,
              rw: existing.rw || userEntry.rw,
              rt: existing.rt || userEntry.rt,
              birthDate: existing.birthDate || existing.tglLahir || userEntry.birthDate,
              umur: existing.umur || userEntry.umur,
              jenisKelamin: existing.jenisKelamin ? normalizeGender(existing.jenisKelamin) : userEntry.jenisKelamin,
              alamat: existing.alamat || userEntry.alamat,
            }
            storeResident(merged)
          } else {
            storeResident(userEntry)
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
  const getHealthStatus = (type: string, value: number, gender?: string): { status: HealthStatus; color: string; textColor: string } => {
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

        const resident = residentsData[nik] || residentsData[reading.userId] ||
          (reading.userName ? residentsData[reading.userName.toLowerCase()] : undefined)
        const attendance = attendanceByNik[nik]

        if (tableFilterRW !== 'all' && rw !== tableFilterRW) return
        const rtValue = resident?.rt || reading.rt || attendance?.rt || '-'
        if (tableFilterRT !== 'all' && rtValue !== tableFilterRT) return
        const namaValue = resident?.nama || reading.userName || attendance?.nama || '-'
        if (tableSearchTerm && !namaValue.toLowerCase().includes(tableSearchTerm.toLowerCase()) && !nik.includes(tableSearchTerm)) return

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

        const birthDate = resident?.birthDate || resident?.tglLahir || ''
        const umur = resident?.umur || attendance?.umur || (birthDate ? calculateAge(birthDate) : '-')

        data.push({
          nik,
          nama: namaValue,
          rw,
          rt: rtValue,
          tglLahir: birthDate || '-',
          umur: umur || '-',
          alamat: resident?.alamat || attendance?.alamat || '-',
          jenisKelamin: normalizeGender(resident?.jenisKelamin || resident?.gender),
          tb: tbbb?.tinggiBadan || '-',
          bb: tbbb?.beratBadan || '-',
          lp: tbbb?.lingkarPinggang || '-',
          td: tensiReading ? `${tensiReading.sistolik}/${tensiReading.diastolik}` : '-',
          gds: gdsReading?.nilai || '-',
          imt,
          ua: uaReading?.nilai || '-',
          col: colReading?.total || '-',
          nadi: tensiReading?.nadi || '-'
        })
      })
    })
    return data
  }, [selectedMonth, residentsData, attendanceByNik, tbbbData, healthReadingsDetails, tableFilterRW, tableFilterRT, tableSearchTerm])

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
    setShowBulkDeleteConfirm(true)
  }

  const confirmBulkDelete = async () => {
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
      setShowBulkDeleteConfirm(false)

      if (failCount === 0) {
        showNotification('success', `${successCount} data warga dan akun user berhasil dihapus`)
      } else if (successCount === 0) {
        showNotification('error', 'Gagal menghapus semua data warga')
      } else {
        showNotification('error', `${successCount} berhasil dihapus, ${failCount} gagal`)
      }
    } catch (error) {
      console.error('Error deleting residents:', error)
      showNotification('error', 'Gagal menghapus data warga')
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

  const buildExportContext = (): MonitoringExportContext => ({
    kelurahan: userProfile?.kelurahan || 'Duri Selatan',
    selectedMonth,
    selectedMonthLabel: monthLabels[selectedMonth],
    year: new Date().getFullYear(),
    months,
    monthLabels,
    rwList: Object.keys(customTargets),
    customTargets,
    healthReadings,
    healthReadingsDetails,
    attendanceData,
    residentsData,
    tableData,
    tbbbData,
    getHealthStatus,
  })

  const exportToPDF = () => {
    exportMonitoringPDF(buildExportContext())
    setExportDropdownOpen(false)
  }

  const exportToExcel = async () => {
    setExporting(true)
    try {
      await exportMonitoringExcel(buildExportContext())
    } finally {
      setExporting(false)
      setExportDropdownOpen(false)
    }
  }

  // Export functions for Rekapitulasi Partisipasi Warga per RW
  const exportAttendanceToPDF = (rw: string) => {
    // Filter data to only include the selected RW
    const filteredCtx = {
      ...buildExportContext(),
      rwList: [rw],
      customTargets: { [rw]: customTargets[rw] },
      attendanceData: { [rw]: attendanceData[rw] },
      healthReadings: { [rw]: healthReadings[rw] },
      healthReadingsDetails: { [rw]: healthReadingsDetails[rw] },
      residentsData: Object.fromEntries(
        Object.entries(residentsData).filter(([_, data]) => data?.rw === rw)
      ),
      tableData: tableData.filter(row => row.rw === rw),
      tbbbData: Object.fromEntries(
        Object.entries(tbbbData).filter(([_, records]) => {
          const rec = Array.isArray(records) ? records[0] : records
          return rec?.rw === rw
        })
      )
    }
    exportMonitoringPDF(filteredCtx)
  }

  const exportAttendanceToExcel = async (rw: string) => {
    // Filter data to only include the selected RW
    const filteredCtx = {
      ...buildExportContext(),
      rwList: [rw],
      customTargets: { [rw]: customTargets[rw] },
      attendanceData: { [rw]: attendanceData[rw] },
      healthReadings: { [rw]: healthReadings[rw] },
      healthReadingsDetails: { [rw]: healthReadingsDetails[rw] },
      residentsData: Object.fromEntries(
        Object.entries(residentsData).filter(([_, data]) => data?.rw === rw)
      ),
      tableData: tableData.filter(row => row.rw === rw),
      tbbbData: Object.fromEntries(
        Object.entries(tbbbData).filter(([_, records]) => {
          const rec = Array.isArray(records) ? records[0] : records
          return rec?.rw === rw
        })
      )
    }
    await exportMonitoringExcel(filteredCtx)
  }

  const exportAttendanceToWhatsApp = (rw: string) => {
    const attendance = attendanceData[rw]?.[selectedMonth] || 0
    const target = customTargets[rw] || 0
    const percentage = target > 0 ? ((attendance / target) * 100).toFixed(0) : '0'
    
    const message = `*REKAPITULASI PARTISIPASI WARGA*\n\n` +
      `RW: ${rw}\n` +
      `Bulan: ${monthLabels[selectedMonth]} ${new Date().getFullYear()}\n\n` +
      `📊 *Data Partisipasi:*\n` +
      `• Hadir/Partisipasi: ${attendance} warga\n` +
      `• Target Warga: ${target} warga\n` +
      `• Capaian: ${percentage}%\n\n` +
      `📱 Laporan generated via InterPulse System`
    
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, '_blank')
  }

  // State for dropdown per RW
  const [attendanceExportDropdown, setAttendanceExportDropdown] = useState<Record<string, boolean>>({})

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 rounded-b-3xl shadow-lg">
        <div className="flex items-center gap-4">
          <BackButton />
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
                disabled={exporting}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">{exporting ? 'Mengekspor...' : 'Export'}</span>
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
                    className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors last:rounded-b-xl"
                  >
                    <svg className="w-5 h-5 text-green-600" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4zM4 22h16v-2H4v2zm0-4h16v-2H4v2zm0-4h16v-2H4v2zm0-4h16V8H4v2z"/>
                    </svg>
                    <span className="text-sm text-gray-700">Export Excel</span>
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
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-4 h-4 text-indigo-600" />
              <span className="font-semibold text-gray-800 text-sm">Rekapitulasi Hasil Pemeriksaan</span>
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
                    <th className="px-3 py-2 text-center font-semibold text-gray-700 border-b">Wilayah</th>
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
                        <td className="px-3 py-2 text-center">RW {rw}</td>
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
                              onClick={() => setAttendanceExportDropdown(prev => ({ ...prev, [rw]: !prev[rw] }))}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
                            >
                              <Download className="w-3 h-3" />
                              <span>Export</span>
                            </button>
                            {attendanceExportDropdown[rw] && (
                              <div className="absolute left-1/2 -translate-x-1/2 mt-2 w-40 bg-white rounded-xl shadow-xl border border-gray-200 z-50">
                                <button
                                  onClick={() => { exportAttendanceToPDF(rw); setAttendanceExportDropdown(prev => ({ ...prev, [rw]: false })); }}
                                  className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors first:rounded-t-xl"
                                >
                                  <svg className="w-5 h-5 text-red-500" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4zm-3 9h-2v-2h2v2zm0-4h-2V7h2v2z"/>
                                  </svg>
                                  <span className="text-sm text-gray-700">Export PDF</span>
                                </button>
                                <button
                                  onClick={() => { exportAttendanceToExcel(rw); setAttendanceExportDropdown(prev => ({ ...prev, [rw]: false })); }}
                                  className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                                >
                                  <svg className="w-5 h-5 text-green-600" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4zM4 22h16v-2H4v2zm0-4h16v-2H4v2zm0-4h16v-2H4v2zm0-4h16V8H4v2z"/>
                                  </svg>
                                  <span className="text-sm text-gray-700">Export Excel</span>
                                </button>
                                <button
                                  onClick={() => { exportAttendanceToWhatsApp(rw); setAttendanceExportDropdown(prev => ({ ...prev, [rw]: false })); }}
                                  className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors last:rounded-b-xl"
                                >
                                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                                  </svg>
                                  <span className="text-sm text-gray-700">Export WA</span>
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
                    <td className="px-3 py-2 border-t"></td>
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

      {/* Modern Notification Banner */}
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

      {/* Modern Bulk Delete Confirmation Modal */}
      {showBulkDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
            {/* Header with gradient */}
            <div className="bg-gradient-to-r from-orange-500 to-amber-600 p-6 text-white">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                  <Trash2 className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Hapus Banyak Data</h3>
                  <p className="text-orange-100 text-sm mt-1">{selectedResidents.size} warga terpilih</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 mb-4">
                <p className="text-orange-800 text-sm font-medium mb-2">⚠️ Peringatan Penting</p>
                <p className="text-orange-700 text-xs leading-relaxed">
                  Tindakan ini akan menghapus {selectedResidents.size} data warga sekaligus termasuk akun login, riwayat kesehatan, dan data absensi. Tindakan ini tidak dapat dibatalkan.
                </p>
              </div>

              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-4 mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-bold text-gray-800">{selectedResidents.size}</p>
                    <p className="text-sm text-gray-500">Warga akan dihapus</p>
                  </div>
                  <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-amber-500 rounded-2xl flex items-center justify-center">
                    <Users className="w-8 h-8 text-white" />
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowBulkDeleteConfirm(false)}
                  className="flex-1 px-4 py-3 border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-medium hover:border-gray-300"
                >
                  Batal
                </button>
                <button
                  onClick={confirmBulkDelete}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-xl hover:from-orange-600 hover:to-amber-700 transition-all font-medium shadow-lg shadow-orange-500/30 hover:shadow-orange-500/40"
                >
                  Ya, Hapus Semua
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
