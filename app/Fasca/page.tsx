'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import BigNumpad from '@/components/BigNumpad'
import { Activity, CheckCircle, AlertCircle, XCircle, Search, Filter, Stethoscope, Download, MoreVertical, FileText, Table, MessageCircle, PlusCircle, Edit2, Trash2, Info } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { collection, addDoc, onSnapshot, query, where, deleteDoc, doc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

type HealthType = 'tensi' | 'kolesterol' | 'asamurat' | 'guladarah' | 'all'
type Step = 'select' | 'input' | 'result'

interface Resident {
  id: string
  nama: string
  nik: string
  rw: string
  rt: string
  umur: number
  jenisKelamin: 'L' | 'P'
  birthDate?: string
}

interface TBBBData {
  nik: string
  tinggiBadan: number
  beratBadan: number
  lingkarPinggang: number
  timestamp: string
}

export default function CatatKesehatan() {
  const router = useRouter()
  const { isAdmin, userProfile, loading: authLoading } = useAuth()

  // Table & Filter state
  const [residents, setResidents] = useState<Resident[]>([])
  const [filterRW, setFilterRW] = useState('')
  const [filterRT, setFilterRT] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedResident, setSelectedResident] = useState<Resident | null>(null)
  const [showFascaModal, setShowFascaModal] = useState(false)
  const [healthReadings, setHealthReadings] = useState<any[]>([])
  const [todayReadingsForResident, setTodayReadingsForResident] = useState<any[]>([])
  const [isResetting, setIsResetting] = useState(false)
  const [tbbbData, setTbbbData] = useState<TBBBData[]>([])
  const [attendanceToday, setAttendanceToday] = useState<Set<string>>(new Set())
  const [todayAttendanceFull, setTodayAttendanceFull] = useState<any[]>([])

  // Fasca form state
  const [healthType, setHealthType] = useState<HealthType | null>(null)
  const [step, setStep] = useState<Step>('select')
  const [currentInput, setCurrentInput] = useState('')
  const [inputIndex, setInputIndex] = useState(0)
  const [saving, setSaving] = useState(false)
  const [data, setData] = useState<Record<string, string>>({})
  const [result, setResult] = useState<any>(null)
  const [showAllForm, setShowAllForm] = useState(false)
  const [showExportDropdown, setShowExportDropdown] = useState(false)
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 4000)
  }
  const exportDropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target as Node)) {
        setShowExportDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Load residents from database
  useEffect(() => {
    const q = collection(db, 'residents')
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Resident[]
      console.log('[Fasca] Residents loaded:', data.length, 'items')
      setResidents(data)
    })
    return () => unsubscribe()
  }, [])

  // Load health readings from database
  useEffect(() => {
    const q = collection(db, 'healthReadings')
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[]
      console.log('[Fasca] Health readings loaded:', data.length, 'items')
      console.log('[Fasca] Current user profile:', userProfile)
      if (userProfile) {
        const userReadings = data.filter(r => r.userId === userProfile.uid)
        console.log('[Fasca] User readings for', userProfile.uid, ':', userReadings.length, 'items')
      }
      setHealthReadings(data)
    })
    return () => unsubscribe()
  }, [userProfile])

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
      console.log('[Fasca] TB/BB data loaded:', data.length, 'items')
      console.log('[Fasca] TB/BB data:', data)
      setTbbbData(data)
    })
    return () => unsubscribe()
  }, [])

  // Load today's attendance
  useEffect(() => {
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]

    const attendanceRef = collection(db, 'attendance')
    const unsubscribe = onSnapshot(attendanceRef, (snapshot) => {
      const todayAttendance = new Set<string>()
      const fullData: any[] = []
      const seenNIKs = new Set<string>()
      snapshot.docs.forEach(doc => {
        const data = doc.data()
        if (data.timestamp && data.timestamp.startsWith(todayStr) && data.nik) {
          todayAttendance.add(data.nik)
          if (!seenNIKs.has(data.nik)) {
            seenNIKs.add(data.nik)
            fullData.push({ ...data, id: doc.id })
          }
        }
      })
      console.log('[Fasca] Today attendance loaded:', todayAttendance.size, 'NIKs:', Array.from(todayAttendance))
      setAttendanceToday(todayAttendance)
      setTodayAttendanceFull(fullData)
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

  // Export functions
  const exportToPDF = () => {
    if (!userProfile) return
    const userHealthData = healthReadings.filter(r => r.userId === userProfile.uid)
    
    const doc = new jsPDF()
    doc.setFontSize(18)
    doc.text(`Riwayat Kesehatan - ${userProfile.name}`, 14, 20)
    doc.setFontSize(11)
    doc.text(`NIK: ${userProfile.nik}`, 14, 30)
    doc.text(`Tanggal Export: ${new Date().toLocaleDateString('id-ID')}`, 14, 38)
    
    const tableData = userHealthData.map(r => [
      new Date(r.timestamp).toLocaleDateString('id-ID'),
      healthConfig[r.type as HealthType]?.title || r.type,
      r.type === 'tensi' ? `${r.sistolik}/${r.diastolik} mmHg` :
      r.type === 'kolesterol' ? `${r.total} mg/dL` :
      `${r.nilai} mg/dL`
    ])
    
    autoTable(doc, {
      head: [['Tanggal', 'Jenis Pemeriksaan', 'Nilai']],
      body: tableData,
      startY: 45,
    })
    
    doc.save(`riwayat-kesehatan-${userProfile.name}.pdf`)
    setShowExportDropdown(false)
  }

  const exportToExcel = () => {
    if (!userProfile) return
    const userHealthData = healthReadings.filter(r => r.userId === userProfile.uid)
    
    const excelData = userHealthData.map(r => ({
      Tanggal: new Date(r.timestamp).toLocaleDateString('id-ID'),
      Jenis: healthConfig[r.type as HealthType]?.title || r.type,
      Nilai: r.type === 'tensi' ? `${r.sistolik}/${r.diastolik} mmHg` :
             r.type === 'kolesterol' ? `${r.total} mg/dL` :
             `${r.nilai} mg/dL`
    }))
    
    const ws = XLSX.utils.json_to_sheet(excelData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Riwayat Kesehatan')
    XLSX.writeFile(wb, `riwayat-kesehatan-${userProfile.name}.xlsx`)
    setShowExportDropdown(false)
  }

  const exportToWhatsApp = () => {
    if (!userProfile) return
    const userHealthData = healthReadings.filter(r => r.userId === userProfile.uid)
    
    let message = `*Riwayat Kesehatan - ${userProfile.name}*\n`
    message += `NIK: ${userProfile.nik}\n`
    message += `Tanggal Export: ${new Date().toLocaleDateString('id-ID')}\n\n`
    message += `*Data Kesehatan:*\n\n`
    
    userHealthData.forEach(r => {
      message += `📅 ${new Date(r.timestamp).toLocaleDateString('id-ID')}\n`
      message += `🏥 ${healthConfig[r.type as HealthType]?.title || r.type}\n`
      message += `📊 ${r.type === 'tensi' ? `${r.sistolik}/${r.diastolik} mmHg` :
                 r.type === 'kolesterol' ? `${r.total} mg/dL` :
                 `${r.nilai} mg/dL`}\n\n`
    })
    
    const encodedMessage = encodeURIComponent(message)
    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank')
    setShowExportDropdown(false)
  }

  const healthConfig: Record<string, { icon: string; title: string; color: string; fields: { key: string; label: string; unit: string }[] }> = {
    tensi: {
      icon: '❤️',
      title: 'Tekanan Darah',
      color: 'from-red-500 to-pink-600',
      fields: [
        { key: 'sistolik', label: 'Sistolik (Atas)', unit: 'mmHg' },
        { key: 'diastolik', label: 'Diastolik (Bawah)', unit: 'mmHg' },
        { key: 'nadi', label: 'Detak Jantung', unit: 'bpm' }
      ]
    },
    kolesterol: {
      icon: '🧈',
      title: 'Kolesterol',
      color: 'from-yellow-500 to-orange-600',
      fields: [
        { key: 'total', label: 'Kolesterol Total', unit: 'mg/dL' },
        { key: 'ldl', label: 'LDL (Jahat)', unit: 'mg/dL' },
        { key: 'hdl', label: 'HDL (Baik)', unit: 'mg/dL' },
        { key: 'trigliserida', label: 'Trigliserida', unit: 'mg/dL' }
      ]
    },
    asamurat: {
      icon: '🔥',
      title: 'Asam Urat',
      color: 'from-orange-500 to-red-600',
      fields: [
        { key: 'nilai', label: 'Nilai Asam Urat', unit: 'mg/dL' }
      ]
    },
    guladarah: {
      icon: '🍯',
      title: 'Gula Darah',
      color: 'from-blue-500 to-cyan-600',
      fields: [
        { key: 'nilai', label: 'Nilai Gula Darah', unit: 'mg/dL' }
      ]
    }
  }

  // Check if resident has health data for today (all types)
  const getTodayReadings = (residentId: string) => {
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    console.log('[Fasca] Getting today readings for resident:', residentId)
    console.log('[Fasca] All health readings:', healthReadings)
    const todayReadings = healthReadings.filter(reading => {
      const match = reading.userId === residentId && 
      reading.timestamp.startsWith(todayStr) &&
      reading.source === 'posbindu'
      console.log('[Fasca] Reading check:', { 
        readingId: reading.id, 
        readingUserId: reading.userId, 
        residentId, 
        match,
        type: reading.type 
      })
      return match
    })
    console.log('[Fasca] Filtered today readings:', todayReadings)
    return {
      allTypes: ['tensi', 'kolesterol', 'asamurat', 'guladarah'].every(type => 
        todayReadings.some(r => r.type === type)
      ),
      readings: todayReadings
    }
  }

  // Check if resident has TB/BB data for today
  const getTodayTBBB = (nik: string) => {
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    const todayTBBB = tbbbData.find(tb => 
      tb.nik === nik && tb.timestamp.startsWith(todayStr)
    )
    return todayTBBB
  }

  // Build resident list from attendance + TB/BB data
  // Use residents collection data if available, otherwise use attendance record data
  const allEligibleResidents: Resident[] = Array.from(attendanceToday)
    .filter(nik => getTodayTBBB(nik) !== undefined)
    .map(nik => {
      const fromCollection = residents.find(r => r.nik === nik)
      if (fromCollection) return fromCollection
      const fromAttendance = todayAttendanceFull.find(a => a.nik === nik)
      if (fromAttendance) {
        return {
          id: fromAttendance.id || nik,
          nik: fromAttendance.nik,
          nama: fromAttendance.nama || 'Tanpa Nama',
          rw: fromAttendance.rw || '',
          rt: fromAttendance.rt || '',
          jenisKelamin: fromAttendance.jenisKelamin || '',
          umur: fromAttendance.umur || 0,
          alamat: fromAttendance.alamat || '',
        } as Resident
      }
      return null
    })
    .filter((r): r is Resident => r !== null)

  // Apply RW/RT/search filters
  const filteredResidents = allEligibleResidents.filter(r => {
    const rwMatch = !filterRW || r.rw === filterRW
    const rtMatch = !filterRT || r.rt === filterRT
    const searchMatch = !searchQuery ||
      r.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.nik.includes(searchQuery)
    return rwMatch && rtMatch && searchMatch
  })

  console.log('[Fasca] Total residents:', residents.length, 'Filtered residents:', filteredResidents.length)

  const sortedResidents = filteredResidents.sort((a, b) => {
    // Get latest TB/BB timestamp for each resident
    const getLatestTBBBTimestamp = (nik: string) => {
      const residentTBBB = tbbbData.filter(tb => tb.nik === nik)
      if (residentTBBB.length === 0) return 0
      return Math.max(...residentTBBB.map(tb => new Date(tb.timestamp).getTime()))
    }

    const aTimestamp = getLatestTBBBTimestamp(a.nik)
    const bTimestamp = getLatestTBBBTimestamp(b.nik)

    // Sort by latest TB/BB input (newest first)
    return bTimestamp - aTimestamp
  })

  console.log('[Fasca] Sorted residents:', sortedResidents.length, sortedResidents.map(r => ({ nama: r.nama, nik: r.nik })))

  // Validation functions
  const validateBloodPressure = (sys: number, dia: number) => {
    if (sys < 90 || dia < 60) return { title: 'Hipotensi', color: 'text-yellow-600', bgColor: 'bg-yellow-50', icon: <AlertCircle className="w-16 h-16 text-yellow-600" />, message: 'Tekanan Darah Rendah', advice: 'Perbanyak konsumsi air dan garam, istirahat yang cukup' }
    if (sys >= 120 && sys <= 130 && dia >= 70 && dia <= 85) return { title: 'Normal', color: 'text-green-600', bgColor: 'bg-green-50', icon: <CheckCircle className="w-16 h-16 text-green-600" />, message: 'Tekanan Darah Normal', advice: 'Pertahankan pola hidup sehat' }
    if (sys >= 130 && sys <= 139 && dia >= 85 && dia <= 89) return { title: 'Pra-Hipertensi', color: 'text-yellow-600', bgColor: 'bg-yellow-50', icon: <AlertCircle className="w-16 h-16 text-yellow-600" />, message: 'Pra-Hipertensi', advice: 'Kurangi garam dan konsumsi makanan sehat' }
    if (sys > 140 || dia > 90) return { title: 'Hipertensi', color: 'text-red-600', bgColor: 'bg-red-50', icon: <XCircle className="w-16 h-16 text-red-600" />, message: 'Hipertensi', advice: 'Segera konsultasi dokter' }
    return { title: 'Perlu Perhatian', color: 'text-orange-600', bgColor: 'bg-orange-50', icon: <AlertCircle className="w-16 h-16 text-orange-600" />, message: 'Perlu Monitoring', advice: 'Pantau tekanan darah secara rutin' }
  }

  const validateBloodSugar = (nilai: number) => {
    if (nilai < 70) return { title: 'Hipoglikemia', color: 'text-red-600', bgColor: 'bg-red-50', icon: <XCircle className="w-16 h-16 text-red-600" />, message: 'Gula Darah Rendah', advice: 'Segera konsumsi makanan manis' }
    if (nilai < 100) return { title: 'Normal', color: 'text-green-600', bgColor: 'bg-green-50', icon: <CheckCircle className="w-16 h-16 text-green-600" />, message: 'Gula Darah Normal', advice: 'Pertahankan pola makan sehat' }
    if (nilai < 126) return { title: 'Pra-Diabetes', color: 'text-yellow-600', bgColor: 'bg-yellow-50', icon: <AlertCircle className="w-16 h-16 text-yellow-600" />, message: 'Pra-Diabetes', advice: 'Kurangi gula dan karbohidrat' }
    return { title: 'Diabetes', color: 'text-red-600', bgColor: 'bg-red-50', icon: <XCircle className="w-16 h-16 text-red-600" />, message: 'Diabetes', advice: 'Segera konsultasi dokter' }
  }

  const validateCholesterol = (total: number) => {
    if (total < 200) return { title: 'Normal', color: 'text-green-600', bgColor: 'bg-green-50', icon: <CheckCircle className="w-16 h-16 text-green-600" />, message: 'Kolesterol Normal', advice: 'Pertahankan pola makan sehat' }
    return { title: 'Tinggi', color: 'text-red-600', bgColor: 'bg-red-50', icon: <XCircle className="w-16 h-16 text-red-600" />, message: 'Kolesterol Tinggi', advice: 'Konsultasi dokter, kurangi makanan berlemak' }
  }

  const validateUricAcid = (nilai: number, gender: string) => {
    const isMale = gender === 'L' || gender === 'Laki-laki'
    const threshold = isMale ? 7 : 6
    if (nilai <= threshold) return { title: 'Normal', color: 'text-green-600', bgColor: 'bg-green-50', icon: <CheckCircle className="w-16 h-16 text-green-600" />, message: 'Asam Urat Normal', advice: 'Pertahankan pola makan sehat' }
    return { title: 'Tinggi', color: 'text-red-600', bgColor: 'bg-red-50', icon: <XCircle className="w-16 h-16 text-red-600" />, message: 'Asam Urat Tinggi', advice: 'Konsultasi dokter, kurangi makanan purin' }
  }

  // CRUD functions
  const handleDeleteReading = async (readingId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus data ini?')) return
    try {
      await deleteDoc(doc(db, 'healthReadings', readingId))
      console.log('[Fasca] Reading deleted:', readingId)
    } catch (error) {
      console.error('[Fasca] Error deleting reading:', error)
    }
  }

  const handleEditReading = (reading: any) => {
    setSelectedResident({
      id: userProfile?.uid || '',
      nama: userProfile?.name || '',
      nik: userProfile?.nik || '',
      rw: userProfile?.rw || '',
      rt: userProfile?.rt || '',
      umur: 0,
      jenisKelamin: userProfile?.gender === 'Laki-laki' ? 'L' : 'P'
    })
    setHealthType(reading.type as HealthType)
    setStep('select')
    setShowFascaModal(true)
  }

  // Fasca form handlers
  const handleNumber = (num: string) => {
    if (currentInput.length < 3) setCurrentInput(prev => prev + num)
  }

  const handleDelete = () => setCurrentInput(prev => prev.slice(0, -1))
  const handleClear = () => setCurrentInput('')

  const handleNext = () => {
    if (!healthType || currentInput.length === 0) return
    
    const config = healthConfig[healthType]
    const currentField = config.fields[inputIndex]
    
    setData(prev => ({ ...prev, [currentField.key]: currentInput }))
    
    if (inputIndex < config.fields.length - 1) {
      setInputIndex(prev => prev + 1)
      setCurrentInput('')
    } else {
      saveData({ ...data, [currentField.key]: currentInput })
    }
  }

  const saveData = async (allData: Record<string, string>) => {
    if (!selectedResident) return
    setSaving(true)
    const timestamp = new Date().toISOString()

    const userInfo = {
      uid: selectedResident.id,
      nik: selectedResident.nik,
      name: selectedResident.nama,
      rt: selectedResident.rt,
      rw: selectedResident.rw,
      kelurahan: userProfile?.kelurahan || '-'
    }

    console.log('[Fasca] Saving data for resident:', selectedResident.nama, 'ID:', selectedResident.id)
    console.log('[Fasca] userInfo:', userInfo)
    console.log('[Fasca] userProfile.uid:', userProfile?.uid)
    console.log('[Fasca] Match check:', selectedResident.id === userProfile?.uid)
    console.log('[Fasca] healthType:', healthType)
    console.log('[Fasca] allData:', allData)

    try {
      if (healthType === 'all') {
        // Save all health readings at once
        const readings: any[] = []

        // Tekanan Darah
        if (allData.sistolik && allData.diastolik) {
          const sys = parseInt(allData.sistolik)
          const dia = parseInt(allData.diastolik)
          const nadi = parseInt(allData.nadi || '0')
          readings.push({
            type: 'tensi',
            sistolik: allData.sistolik,
            diastolik: allData.diastolik,
            nadi: allData.nadi,
            timestamp,
            userId: userInfo.uid,
            nik: userInfo.nik,
            userName: userInfo.name,
            rt: userInfo.rt,
            rw: userInfo.rw,
            kelurahan: userInfo.kelurahan,
            source: 'posbindu'
          })
        }

        // Gula Darah
        if (allData.guladarah) {
          readings.push({
            type: 'guladarah',
            nilai: allData.guladarah,
            timestamp,
            userId: userInfo.uid,
            nik: userInfo.nik,
            userName: userInfo.name,
            rt: userInfo.rt,
            rw: userInfo.rw,
            kelurahan: userInfo.kelurahan,
            source: 'posbindu'
          })
        }

        // Asam Urat
        if (allData.asamurat) {
          readings.push({
            type: 'asamurat',
            nilai: allData.asamurat,
            timestamp,
            userId: userInfo.uid,
            nik: userInfo.nik,
            userName: userInfo.name,
            rt: userInfo.rt,
            rw: userInfo.rw,
            kelurahan: userInfo.kelurahan,
            source: 'posbindu'
          })
        }

        // Kolesterol
        if (allData.kolesterol_total) {
          readings.push({
            type: 'kolesterol',
            total: allData.kolesterol_total,
            ldl: allData.kolesterol_ldl || '0',
            hdl: allData.kolesterol_hdl || '0',
            trigliserida: allData.kolesterol_trigliserida || '0',
            timestamp,
            userId: userInfo.uid,
            nik: userInfo.nik,
            userName: userInfo.name,
            rt: userInfo.rt,
            rw: userInfo.rw,
            kelurahan: userInfo.kelurahan,
            source: 'posbindu'
          })
        }

        // Save all readings
        for (const reading of readings) {
          await addDoc(collection(db, 'healthReadings'), reading)
        }

        setResult({
          title: 'Data Berhasil Disimpan',
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          icon: <CheckCircle className="w-16 h-16 text-green-600" />,
          message: `${readings.length} jenis pemeriksaan telah disimpan`,
          advice: 'Data kesehatan warga telah tercatat dan akan sinkron ke bagian trafik user',
          values: readings.map((r, i) => ({
            label: r.type === 'tensi' ? 'Tekanan Darah' :
                   r.type === 'guladarah' ? 'Gula Darah' :
                   r.type === 'asamurat' ? 'Asam Urat' : 'Kolesterol',
            value: r.type === 'tensi' ? `${r.sistolik}/${r.diastolik}` : r.nilai || r.total,
            unit: r.type === 'tensi' ? 'mmHg' : 'mg/dL'
          }))
        })
        setStep('result')
        setTodayReadingsForResident(prev => [...prev, ...readings])
      } else {
        // Original single type save logic
        let newReading: any
        let validationResult: any

        if (healthType === 'tensi') {
          const sys = parseInt(allData.sistolik)
          const dia = parseInt(allData.diastolik)
          const nadi = parseInt(allData.nadi)
          newReading = {
            type: 'tensi',
            ...allData,
            timestamp,
            userId: userInfo.uid,
            nik: userInfo.nik,
            userName: userInfo.name,
            rt: userInfo.rt,
            rw: userInfo.rw,
            kelurahan: userInfo.kelurahan,
            source: 'posbindu'
          }
          validationResult = validateBloodPressure(sys, dia)
          validationResult.values = [
            { label: 'Sistolik', value: sys, unit: 'mmHg' },
            { label: 'Diastolik', value: dia, unit: 'mmHg' },
            { label: 'Nadi', value: nadi, unit: 'bpm' }
          ]
        } else if (healthType === 'guladarah') {
          const nilai = parseInt(allData.nilai)
          newReading = {
            type: 'guladarah',
            ...allData,
            timestamp,
            userId: userInfo.uid,
            nik: userInfo.nik,
            userName: userInfo.name,
            rt: userInfo.rt,
            rw: userInfo.rw,
            kelurahan: userInfo.kelurahan,
            source: 'posbindu'
          }
          validationResult = validateBloodSugar(nilai)
          validationResult.values = [
            { label: 'Gula Darah', value: nilai, unit: 'mg/dL' }
          ]
        } else if (healthType === 'kolesterol') {
          const total = parseInt(allData.total)
          const ldl = parseInt(allData.ldl)
          const hdl = parseInt(allData.hdl)
          const trigliserida = parseInt(allData.trigliserida)
          newReading = {
            type: 'kolesterol',
            ...allData,
            timestamp,
            userId: userInfo.uid,
            nik: userInfo.nik,
            userName: userInfo.name,
            rt: userInfo.rt,
            rw: userInfo.rw,
            kelurahan: userInfo.kelurahan,
            source: 'posbindu'
          }
          validationResult = validateCholesterol(total)
          validationResult.values = [
            { label: 'Total', value: total, unit: 'mg/dL' },
            { label: 'LDL', value: ldl, unit: 'mg/dL' },
            { label: 'HDL', value: hdl, unit: 'mg/dL' },
            { label: 'Trigliserida', value: trigliserida, unit: 'mg/dL' }
          ]
        } else if (healthType === 'asamurat') {
          const nilai = parseFloat(allData.nilai)
          newReading = {
            type: 'asamurat',
            ...allData,
            timestamp,
            userId: userInfo.uid,
            nik: userInfo.nik,
            userName: userInfo.name,
            rt: userInfo.rt,
            rw: userInfo.rw,
            kelurahan: userInfo.kelurahan,
            source: 'posbindu'
          }

          validationResult = validateUricAcid(nilai, selectedResident.jenisKelamin)
          validationResult.values = [
            { label: 'Asam Urat', value: nilai, unit: 'mg/dL' }
          ]

        } else {
          const val = parseInt(allData.nilai)
          newReading = {
            type: 'guladarah',
            value: allData.nilai,
            condition: 'puasa',
            timestamp,
            userId: userInfo.uid,
            nik: userInfo.nik,
            userName: userInfo.name,
            rt: userInfo.rt,
            rw: userInfo.rw,
            kelurahan: userInfo.kelurahan,
            source: 'posbindu'
          }

          if (val < 100) validationResult = { status: 'normal', title: 'Gula Darah Normal', color: 'text-green-700', bgColor: 'bg-gradient-to-br from-green-100 to-green-200', icon: <CheckCircle className="w-24 h-24 text-green-600" />, message: `${val} mg/dL`, advice: 'Gula darah normal. Pertahankan!' }
          else if (val < 126) validationResult = { status: 'warning', title: 'Prediabetes', color: 'text-yellow-700', bgColor: 'bg-gradient-to-br from-yellow-100 to-yellow-200', icon: <AlertCircle className="w-24 h-24 text-yellow-600" />, message: `${val} mg/dL`, advice: 'Prediabetes. Kurangi gula dan karbohidrat.' }
          else validationResult = { status: 'danger', title: 'Diabetes', color: 'text-red-700', bgColor: 'bg-gradient-to-br from-red-100 to-red-200', icon: <XCircle className="w-24 h-24 text-red-600" />, message: `${val} mg/dL`, advice: 'Diabetes! Segera ke dokter.' }
        }

        await addDoc(collection(db, 'healthReadings'), newReading)
        setResult(validationResult)
        setStep('result')
        setTodayReadingsForResident(prev => [...prev, newReading])
      }
    } catch (error) {
      console.error('Error saving health reading:', error)
      showNotification('error', 'Gagal menyimpan data. Coba lagi.')
    } finally {
      setSaving(false)
    }
  }

  const handleBack = () => {
    if (step === 'input') {
      if (inputIndex > 0) {
        setInputIndex(prev => prev - 1)
        const prevField = healthConfig[healthType!].fields[inputIndex - 1]
        setCurrentInput(data[prevField.key] || '')
      } else {
        setStep('select')
        setHealthType(null)
        setData({})
        setCurrentInput('')
      }
    }
  }

  const handleCloseFascaModal = () => {
    setShowFascaModal(false)
    setSelectedResident(null)
    setHealthType(null)
    setStep('select')
    setCurrentInput('')
    setInputIndex(0)
    setData({})
    setResult(null)
  }

  const openFascaModal = (resident: Resident) => {
    console.log('[Fasca] Opening modal for resident:', resident.nama, 'ID:', resident.id)
    setSelectedResident(resident)
    // Clear previous readings first
    setTodayReadingsForResident([])
    const todayData = getTodayReadings(resident.id)
    setShowFascaModal(true)
    // Directly open all-in-one form
    setHealthType('all')
    setStep('input')
    setData({})
    if (todayData.readings.length > 0) {
      // Store all today's readings for THIS resident only
      console.log('[Fasca] Setting today readings for resident:', resident.id, todayData.readings)
      setTodayReadingsForResident(todayData.readings)
      // Pre-fill data from today's readings
      const prefilledData: Record<string, string> = {}
      todayData.readings.forEach(reading => {
        if (reading.type === 'tensi') {
          prefilledData.sistolik = reading.sistolik
          prefilledData.diastolik = reading.diastolik
          prefilledData.nadi = reading.nadi
        } else if (reading.type === 'guladarah') {
          prefilledData.guladarah = reading.nilai
        } else if (reading.type === 'asamurat') {
          prefilledData.asamurat = reading.nilai
        } else if (reading.type === 'kolesterol') {
          prefilledData.kolesterol_total = reading.total
          prefilledData.kolesterol_ldl = reading.ldl
          prefilledData.kolesterol_hdl = reading.hdl
          prefilledData.kolesterol_trigliserida = reading.trigliserida
        }
      })
      setData(prefilledData)
    } else {
      console.log('[Fasca] No today readings for resident:', resident.id)
    }
  }

  const handleResetTodayData = async () => {
    if (!selectedResident || todayReadingsForResident.length === 0) return
    setIsResetting(true)
    try {
      // Delete all today's readings for this resident
      for (const reading of todayReadingsForResident) {
        await deleteDoc(doc(db, 'healthReadings', reading.id))
      }
      setTodayReadingsForResident([])
      setData({})
      setCurrentInput('')
      setInputIndex(0)
      showNotification('success', 'Data hari ini berhasil dihapus')
    } catch (error) {
      console.error('Error deleting today data:', error)
      showNotification('error', 'Gagal menghapus data')
    } finally {
      setIsResetting(false)
    }
  }

  // Redirect non-admin users
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Akses Ditolak</h2>
          <p className="text-gray-600 mb-6">Halaman ini hanya dapat diakses oleh admin.</p>
          <button onClick={() => router.push('/monev-posbindu')} className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium">
            Kembali ke Monev Posbindu
          </button>
        </div>
      </div>
    )
  }

  // Main table view
  console.log('[Fasca] showFascaModal:', showFascaModal, 'sortedResidents.length:', sortedResidents.length)
  console.log('[Fasca] About to render table, sortedResidents:', sortedResidents.map(r => ({ nama: r.nama, nik: r.nik })))
  if (!showFascaModal) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 pb-24">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <button onClick={() => router.push('/monev-posbindu')} className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-1.5 rounded-lg transition-all text-sm">← Kembali</button>
                <h1 className="text-2xl font-bold text-gray-800">Input Kesehatan Warga</h1>
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
                <select value={filterRW} onChange={e => setFilterRW(e.target.value)} title="Filter RW" className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Semua RW</option>
                  {['01','02','03','04','05','06','07','08','09','10'].map(rw => <option key={rw} value={rw}>RW {rw}</option>)}
                </select>
                <select value={filterRT} onChange={e => setFilterRT(e.target.value)} title="Filter RT" className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
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
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">TB (cm)</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">BB (kg)</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">LP (cm)</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Nadi (bpm)</th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-700">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedResidents.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="px-4 py-8 text-center text-gray-400">Tidak ada warga yang sudah melakukan absensi dan input TB/BB hari ini</td>
                      </tr>
                    ) : sortedResidents.map(r => {
                      const todayTBBB = getTodayTBBB(r.nik)
                      const todayData = getTodayReadings(r.id)
                      const todayNadi = todayData.readings.find(reading => reading.type === 'tensi')?.nadi || '-'
                      return (
                        <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-800">{r.nama}</td>
                          <td className="px-4 py-3 text-gray-600">{r.nik}</td>
                          <td className="px-4 py-3 text-gray-600">RW {r.rw} / RT {r.rt}</td>
                          <td className="px-4 py-3 text-gray-600">{r.jenisKelamin === 'L' ? 'Laki-laki' : 'Perempuan'}</td>
                          <td className="px-4 py-3 text-gray-600">{r.umur} tahun</td>
                          <td className="px-4 py-3 text-gray-600">{todayTBBB?.tinggiBadan || '-'}</td>
                          <td className="px-4 py-3 text-gray-600">{todayTBBB?.beratBadan || '-'}</td>
                          <td className="px-4 py-3 text-gray-600">{todayTBBB?.lingkarPinggang || '-'}</td>
                          <td className="px-4 py-3 text-gray-600">{todayNadi}</td>
                          <td className="px-4 py-3 text-center">
                            <button onClick={() => openFascaModal(r)} className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium">
                              <Stethoscope className="w-3.5 h-3.5" />
                              Input Kesehatan
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

  // Fasca Modal
  const config = healthType ? healthConfig[healthType] : null
  const currentField = config?.fields[inputIndex]

  if (step === 'result' && result) {
    return (
      <div className={`fixed inset-0 ${result.bgColor} flex items-center justify-center z-50 p-4`}>
        <div className="bg-white rounded-3xl shadow-2xl p-8 text-center w-full max-w-2xl">
          <div className="flex justify-center mb-6">{result.icon}</div>
          <h1 className={`text-4xl font-bold ${result.color} mb-4`}>{result.title}</h1>
          
          {/* Display actual input values */}
          {result.values && (
            <div className="bg-gray-100 rounded-2xl p-6 mb-6">
              <p className="text-gray-600 text-xl mb-4">Nilai Input:</p>
              <div className="grid grid-cols-2 gap-4">
                {result.values.map((val: any, idx: number) => (
                  <div key={idx} className="bg-white rounded-xl p-4 shadow-sm">
                    <p className="text-sm text-gray-500">{val.label}</p>
                    <p className={`text-2xl font-bold ${result.color}`}>{val.value} {val.unit}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4 mb-8">
            <p className="text-lg text-gray-800 leading-relaxed">{result.advice}</p>
          </div>
          <button onClick={handleCloseFascaModal} className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-xl font-bold py-4 rounded-2xl shadow-lg active:scale-95 transition-all">Selesai</button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center z-50 p-4">
      {/* Modern Notification */}
      {notification && (
        <div className="fixed top-4 right-4 z-[100] animate-in slide-in-from-right">
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
              <XCircle className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-2xl p-4 sm:p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto my-4">
        <div className="flex items-center justify-between mb-4 sticky top-0 bg-white z-10 pb-2">
          <button onClick={handleCloseFascaModal} className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold px-3 py-2 sm:px-4 rounded-xl active:scale-95 transition-all text-sm sm:text-base">← Kembali</button>
          <div className="text-center flex-1 px-2">
            <div className="flex justify-center mb-2 text-blue-600">
              <span className="text-4xl sm:text-5xl">📋</span>
            </div>
            <h2 className="text-lg sm:text-2xl font-bold text-gray-800">Input Kesehatan: {selectedResident?.nama}</h2>
          </div>
          <div className="w-8 sm:w-16"></div>
        </div>

        <form onSubmit={(e) => {
          e.preventDefault()
          saveData(data)
        }} className="space-y-3 sm:space-y-4">
          {/* Tekanan Darah */}
          <div className="bg-red-50 rounded-xl p-3 sm:p-4 border border-red-200">
            <h3 className="font-bold text-red-700 mb-2 sm:mb-3 flex items-center gap-2 text-sm sm:text-base">
              <span className="text-lg sm:text-xl">❤️</span> Tekanan Darah
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Sistolik</label>
                <input
                  type="number"
                  value={data.sistolik || ''}
                  onChange={(e) => setData(prev => ({ ...prev, sistolik: e.target.value }))}
                  placeholder="120"
                  className="w-full px-2 sm:px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">mmHg</p>
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Diastolik</label>
                <input
                  type="number"
                  value={data.diastolik || ''}
                  onChange={(e) => setData(prev => ({ ...prev, diastolik: e.target.value }))}
                  placeholder="80"
                  className="w-full px-2 sm:px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">mmHg</p>
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Nadi</label>
                <input
                  type="number"
                  value={data.nadi || ''}
                  onChange={(e) => setData(prev => ({ ...prev, nadi: e.target.value }))}
                  placeholder="72"
                  className="w-full px-2 sm:px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">bpm</p>
              </div>
            </div>
          </div>

          {/* Gula Darah */}
          <div className="bg-blue-50 rounded-xl p-3 sm:p-4 border border-blue-200">
            <h3 className="font-bold text-blue-700 mb-2 sm:mb-3 flex items-center gap-2 text-sm sm:text-base">
              <span className="text-lg sm:text-xl">🍯</span> Gula Darah (GDS)
            </h3>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Nilai Gula Darah</label>
              <input
                type="number"
                value={data.guladarah || ''}
                onChange={(e) => setData(prev => ({ ...prev, guladarah: e.target.value }))}
                placeholder="100"
                className="w-full px-2 sm:px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">mg/dL</p>
            </div>
          </div>

          {/* Asam Urat */}
          <div className="bg-orange-50 rounded-xl p-3 sm:p-4 border border-orange-200">
            <h3 className="font-bold text-orange-700 mb-2 sm:mb-3 flex items-center gap-2 text-sm sm:text-base">
              <span className="text-lg sm:text-xl">🔥</span> Asam Urat (UA)
            </h3>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Nilai Asam Urat</label>
              <input
                type="number"
                value={data.asamurat || ''}
                onChange={(e) => setData(prev => ({ ...prev, asamurat: e.target.value }))}
                placeholder="6"
                className="w-full px-2 sm:px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">mg/dL</p>
            </div>
          </div>

          {/* Kolesterol */}
          <div className="bg-yellow-50 rounded-xl p-3 sm:p-4 border border-yellow-200">
            <h3 className="font-bold text-yellow-700 mb-2 sm:mb-3 flex items-center gap-2 text-sm sm:text-base">
              <span className="text-lg sm:text-xl">🧈</span> Kolesterol (COL)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Total</label>
                <input
                  type="number"
                  value={data.kolesterol_total || ''}
                  onChange={(e) => setData(prev => ({ ...prev, kolesterol_total: e.target.value }))}
                  placeholder="200"
                  className="w-full px-2 sm:px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">mg/dL</p>
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">LDL</label>
                <input
                  type="number"
                  value={data.kolesterol_ldl || ''}
                  onChange={(e) => setData(prev => ({ ...prev, kolesterol_ldl: e.target.value }))}
                  placeholder="100"
                  className="w-full px-2 sm:px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">mg/dL</p>
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">HDL</label>
                <input
                  type="number"
                  value={data.kolesterol_hdl || ''}
                  onChange={(e) => setData(prev => ({ ...prev, kolesterol_hdl: e.target.value }))}
                  placeholder="50"
                  className="w-full px-2 sm:px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">mg/dL</p>
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Trigliserida</label>
                <input
                  type="number"
                  value={data.kolesterol_trigliserida || ''}
                  onChange={(e) => setData(prev => ({ ...prev, kolesterol_trigliserida: e.target.value }))}
                  placeholder="150"
                  className="w-full px-2 sm:px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">mg/dL</p>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className={`w-full text-lg sm:text-xl font-bold py-3 sm:py-4 rounded-2xl shadow-lg active:scale-95 transition-all ${
              saving ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white'
            }`}
          >
            {saving ? 'Menyimpan...' : 'Simpan & Lihat Hasil'}
          </button>
        </form>
      </div>
    </div>
  )
}
