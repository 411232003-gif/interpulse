'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  History, 
  Download, 
  Share2, 
  FileSpreadsheet, 
  MessageCircle, 
  Trash2, 
  ChevronDown, 
  ChevronUp,
  Heart,
  Activity,
  Calendar,
  Clock,
  Filter,
  Search,
  CheckCircle,
  AlertCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowLeft
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { useAuth } from '@/lib/auth-context'
import { db } from '@/lib/firebase'
import { collection, query, onSnapshot, deleteDoc, doc, orderBy, where, getDocs } from 'firebase/firestore'

type HealthCheckType = 'tensi' | 'kolesterol' | 'asamurat' | 'guladarah'

interface BaseHealthReading {
  id: string
  type: HealthCheckType
  timestamp: string
  notes?: string
  userName?: string
  rt?: string
  rw?: string
  kelurahan?: string
}

interface TensiReading extends BaseHealthReading {
  type: 'tensi'
  sistolik: string
  diastolik: string
  nadi: string
}

interface KolesterolReading extends BaseHealthReading {
  type: 'kolesterol'
  total: string
  ldl: string
  hdl: string
  trigliserida: string
}

interface AsamUratReading extends BaseHealthReading {
  type: 'asamurat'
  value: string
  gender: 'pria' | 'wanita'
}

interface GulaDarahReading extends BaseHealthReading {
  type: 'guladarah'
  value: string
  condition: 'puasa' | 'sepuasa' | 'acak'
}

type HealthReading = TensiReading | KolesterolReading | AsamUratReading | GulaDarahReading

interface FilterState {
  startDate: string
  endDate: string
  status: 'all' | 'normal' | 'prehipertensi' | 'hipertensi' | 'rendah'
  type: HealthCheckType | 'all'
  rt: string
  rw: string
  kelurahan: string
}

export default function RiwayatKesehatan() {
  const { userProfile, isAdmin } = useAuth()
  const [readings, setReadings] = useState<HealthReading[]>([])
  const [filteredReadings, setFilteredReadings] = useState<HealthReading[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [activeTab, setActiveTab] = useState<HealthCheckType | 'all'>('all')
  const [filters, setFilters] = useState<FilterState>({
    startDate: '',
    endDate: '',
    status: 'all',
    type: 'all',
    rt: '',
    rw: '',
    kelurahan: ''
  })
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [isSelectionMode, setIsSelectionMode] = useState(false)

  useEffect(() => {
    loadReadings()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [readings, searchTerm, filters, activeTab])

  const loadReadings = () => {
    setIsLoading(true)
    
    try {
      // Build query based on user role
      let q
      if (isAdmin) {
        // Admin sees all data
        q = query(collection(db, 'healthReadings'), orderBy('timestamp', 'desc'))
      } else if (userProfile?.uid) {
        // User sees only their own data
        q = query(
          collection(db, 'healthReadings'), 
          where('userId', '==', userProfile.uid),
          orderBy('timestamp', 'desc')
        )
      } else {
        // No user logged in
        setIsLoading(false)
        return
      }
      
      // Subscribe to real-time updates
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const data: HealthReading[] = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as HealthReading[]
        setReadings(data)
        setIsLoading(false)
      }, (error) => {
        console.error('Error loading readings from Firestore:', error)
        setIsLoading(false)
      })
      
      return () => unsubscribe()
    } catch (error) {
      console.error('Error loading readings:', error)
      setIsLoading(false)
    }
  }

  // Status getters for each type
  const getTensiStatus = (sistolik: string, diastolik: string) => {
    const sys = parseInt(sistolik)
    const dia = parseInt(diastolik)
    
    if (sys < 90 || dia < 60) return { status: 'rendah', label: 'Rendah', color: 'text-blue-600', bgColor: 'bg-blue-100', icon: '💙' }
    if (sys < 120 && dia < 80) return { status: 'normal', label: 'Normal', color: 'text-green-600', bgColor: 'bg-green-100', icon: '💚' }
    if (sys < 140 && dia < 90) return { status: 'prehipertensi', label: 'Waspada', color: 'text-yellow-600', bgColor: 'bg-yellow-100', icon: '💛' }
    return { status: 'hipertensi', label: 'Tinggi', color: 'text-red-600', bgColor: 'bg-red-100', icon: '❤️' }
  }

  const getKolesterolStatus = (total: string, ldl: string, hdl: string) => {
    const totalVal = parseInt(total)
    const ldlVal = parseInt(ldl)
    const hdlVal = parseInt(hdl)
    
    if (totalVal < 200 && ldlVal < 130 && hdlVal >= 40) 
      return { label: 'Normal', color: 'text-green-600', bgColor: 'bg-green-100', icon: '💚' }
    if (totalVal < 240 && ldlVal < 160) 
      return { label: 'Batas', color: 'text-yellow-600', bgColor: 'bg-yellow-100', icon: '💛' }
    return { label: 'Tinggi', color: 'text-red-600', bgColor: 'bg-red-100', icon: '❤️' }
  }

  const getAsamUratStatus = (value: string, gender: 'pria' | 'wanita') => {
    const val = parseFloat(value)
    const normalMax = gender === 'pria' ? 7.0 : 6.0
    
    if (val <= normalMax) return { label: 'Normal', color: 'text-green-600', bgColor: 'bg-green-100', icon: '💚' }
    if (val <= normalMax + 1) return { label: 'Batas', color: 'text-yellow-600', bgColor: 'bg-yellow-100', icon: '💛' }
    return { label: 'Tinggi', color: 'text-red-600', bgColor: 'bg-red-100', icon: '❤️' }
  }

  const getGulaDarahStatus = (value: string, condition: 'puasa' | 'sepuasa' | 'acak') => {
    const val = parseInt(value)
    
    if (condition === 'puasa') {
      if (val < 100) return { label: 'Normal', color: 'text-green-600', bgColor: 'bg-green-100', icon: '💚' }
      if (val < 126) return { label: 'Prediabetes', color: 'text-yellow-600', bgColor: 'bg-yellow-100', icon: '💛' }
      return { label: 'Diabetes', color: 'text-red-600', bgColor: 'bg-red-100', icon: '❤️' }
    }
    if (val < 140) return { label: 'Normal', color: 'text-green-600', bgColor: 'bg-green-100', icon: '💚' }
    if (val < 200) return { label: 'Batas', color: 'text-yellow-600', bgColor: 'bg-yellow-100', icon: '💛' }
    return { label: 'Tinggi', color: 'text-red-600', bgColor: 'bg-red-100', icon: '❤️' }
  }

  const getTrend = (current: TensiReading, previous: TensiReading | null) => {
    if (!previous) return null
    const currentSys = parseInt(current.sistolik)
    const previousSys = parseInt(previous.sistolik)
    const diff = currentSys - previousSys
    
    if (diff > 5) return { icon: <TrendingUp className="w-4 h-4" />, label: 'Naik', color: 'text-red-500' }
    if (diff < -5) return { icon: <TrendingDown className="w-4 h-4" />, label: 'Turun', color: 'text-green-500' }
    return { icon: <Minus className="w-4 h-4" />, label: 'Stabil', color: 'text-gray-500' }
  }

  const applyFilters = () => {
    let result = [...readings]

    // Type filter
    if (activeTab !== 'all') {
      result = result.filter(r => r.type === activeTab)
    }

    // Search filter
    if (searchTerm) {
      result = result.filter(r => {
        const searchLower = searchTerm.toLowerCase()
        if (r.type === 'tensi') {
          return r.sistolik.includes(searchTerm) || r.diastolik.includes(searchTerm) || r.nadi.includes(searchTerm)
        }
        if (r.type === 'kolesterol') {
          return r.total.includes(searchTerm) || r.ldl.includes(searchTerm) || r.hdl.includes(searchTerm)
        }
        if (r.type === 'asamurat') {
          return r.value.includes(searchTerm)
        }
        if (r.type === 'guladarah') {
          return r.value.includes(searchTerm) || r.condition.toLowerCase().includes(searchLower)
        }
        return false
      })
    }

    // Date filter
    if (filters.startDate) {
      result = result.filter(r => new Date(r.timestamp) >= new Date(filters.startDate))
    }
    if (filters.endDate) {
      result = result.filter(r => new Date(r.timestamp) <= new Date(filters.endDate + 'T23:59:59'))
    }

    // Status filter (only for tensi)
    if (filters.status !== 'all' && activeTab === 'tensi') {
      result = result.filter(r => r.type === 'tensi' && getTensiStatus(r.sistolik, r.diastolik).status === filters.status)
    }

    // Location filters (RT, RW, Kelurahan)
    if (filters.rt) {
      result = result.filter(r => r.rt?.toLowerCase().includes(filters.rt.toLowerCase()))
    }
    if (filters.rw) {
      result = result.filter(r => r.rw?.toLowerCase().includes(filters.rw.toLowerCase()))
    }
    if (filters.kelurahan) {
      result = result.filter(r => r.kelurahan?.toLowerCase().includes(filters.kelurahan.toLowerCase()))
    }

    setFilteredReadings(result)
  }

  const deleteReading = async (id: string) => {
    if (confirm('Yakin ingin menghapus data ini?')) {
      try {
        await deleteDoc(doc(db, 'healthReadings', id))
        // Real-time listener will update the UI
      } catch (error) {
        console.error('Error deleting reading:', error)
        alert('Gagal menghapus data. Coba lagi.')
      }
    }
  }

  const deleteSelected = async () => {
    if (confirm(`Yakin ingin menghapus ${selectedItems.size} data?`)) {
      try {
        const deletePromises = Array.from(selectedItems).map(id => 
          deleteDoc(doc(db, 'healthReadings', id))
        )
        await Promise.all(deletePromises)
        // Real-time listener will update the UI
        setSelectedItems(new Set())
        setIsSelectionMode(false)
      } catch (error) {
        console.error('Error deleting selected readings:', error)
        alert('Gagal menghapus data. Coba lagi.')
      }
    }
  }

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedItems)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedItems(newSelected)
  }

  const exportToWhatsApp = (items: HealthReading[]) => {
    const message = formatForWhatsApp(items)
    const encoded = encodeURIComponent(message)
    window.open(`https://wa.me/?text=${encoded}`, '_blank')
  }

  const exportToExcel = (items: HealthReading[]) => {
    const type = items[0]?.type || 'tensi'
    let data: any[] = []
    let sheetName = ''
    let colWidths: any[] = []
    
    if (type === 'tensi') {
      const tensiItems = items.filter((i): i is TensiReading => i.type === 'tensi')
      data = tensiItems.map((item, index) => ({
        'No': index + 1,
        'Tanggal': formatDate(item.timestamp),
        'Waktu': formatTime(item.timestamp),
        'Nama User': item.userName || '-',
        'RT': item.rt || '-',
        'RW': item.rw || '-',
        'Kelurahan': item.kelurahan || '-',
        'Sistolik (mmHg)': item.sistolik,
        'Diastolik (mmHg)': item.diastolik,
        'Nadi (bpm)': item.nadi,
        'Status': getTensiStatus(item.sistolik, item.diastolik).label
      }))
      sheetName = 'Riwayat Tensi'
      colWidths = [{ wch: 5 }, { wch: 12 }, { wch: 10 }, { wch: 18 }, { wch: 8 }, { wch: 8 }, { wch: 18 }, { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 12 }]
    } else if (type === 'kolesterol') {
      const kolItems = items.filter((i): i is KolesterolReading => i.type === 'kolesterol')
      data = kolItems.map((item, index) => ({
        'No': index + 1,
        'Tanggal': formatDate(item.timestamp),
        'Waktu': formatTime(item.timestamp),
        'Nama User': item.userName || '-',
        'RT': item.rt || '-',
        'RW': item.rw || '-',
        'Kelurahan': item.kelurahan || '-',
        'Total (mg/dL)': item.total,
        'LDL (mg/dL)': item.ldl,
        'HDL (mg/dL)': item.hdl,
        'Trigliserida (mg/dL)': item.trigliserida,
        'Status': getKolesterolStatus(item.total, item.ldl, item.hdl).label
      }))
      sheetName = 'Riwayat Kolesterol'
      colWidths = [{ wch: 5 }, { wch: 12 }, { wch: 10 }, { wch: 18 }, { wch: 8 }, { wch: 8 }, { wch: 18 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 18 }, { wch: 12 }]
    } else if (type === 'asamurat') {
      const auItems = items.filter((i): i is AsamUratReading => i.type === 'asamurat')
      data = auItems.map((item, index) => ({
        'No': index + 1,
        'Tanggal': formatDate(item.timestamp),
        'Waktu': formatTime(item.timestamp),
        'Nama User': item.userName || '-',
        'RT': item.rt || '-',
        'RW': item.rw || '-',
        'Kelurahan': item.kelurahan || '-',
        'Nilai (mg/dL)': item.value,
        'Gender': item.gender,
        'Status': getAsamUratStatus(item.value, item.gender).label
      }))
      sheetName = 'Riwayat Asam Urat'
      colWidths = [{ wch: 5 }, { wch: 12 }, { wch: 10 }, { wch: 18 }, { wch: 8 }, { wch: 8 }, { wch: 18 }, { wch: 15 }, { wch: 12 }, { wch: 12 }]
    } else if (type === 'guladarah') {
      const gdItems = items.filter((i): i is GulaDarahReading => i.type === 'guladarah')
      data = gdItems.map((item, index) => ({
        'No': index + 1,
        'Tanggal': formatDate(item.timestamp),
        'Waktu': formatTime(item.timestamp),
        'Nama User': item.userName || '-',
        'RT': item.rt || '-',
        'RW': item.rw || '-',
        'Kelurahan': item.kelurahan || '-',
        'Nilai (mg/dL)': item.value,
        'Kondisi': item.condition,
        'Status': getGulaDarahStatus(item.value, item.condition).label
      }))
      sheetName = 'Riwayat Gula Darah'
      colWidths = [{ wch: 5 }, { wch: 12 }, { wch: 10 }, { wch: 18 }, { wch: 8 }, { wch: 8 }, { wch: 18 }, { wch: 15 }, { wch: 15 }, { wch: 12 }]
    }

    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, sheetName)
    ws['!cols'] = colWidths

    const fileName = `${sheetName.replace(/ /g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`
    XLSX.writeFile(wb, fileName)
  }

  const exportToCSV = (items: HealthReading[]) => {
    exportToExcel(items)
  }

  const shareAsText = (items: HealthReading[]) => {
    const text = formatForWhatsApp(items)
    navigator.clipboard.writeText(text).then(() => {
      alert('Data telah disalin ke clipboard!')
    })
  }

  const formatForWhatsApp = (items: HealthReading[]) => {
    const type = items[0]?.type || 'tensi'
    const typeLabels: Record<HealthCheckType, string> = {
      tensi: '📊 Riwayat Tensi',
      kolesterol: '🧈 Riwayat Kolesterol',
      asamurat: '🔥 Riwayat Asam Urat',
      guladarah: '🍯 Riwayat Gula Darah'
    }
    
    let message = `*${typeLabels[type as HealthCheckType] || 'Riwayat Kesehatan'}*\n`
    message += `*${new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}*\n`
    message += '━━━━━━━━━━━━━━━━\n\n'

    items.forEach((item, index) => {
      message += `*${index + 1}. ${formatDate(item.timestamp)} ${formatTime(item.timestamp)}*\n`
      
      // Add user info if available
      if (item.userName) {
        message += `👤 ${item.userName}`
        if (item.rt || item.rw || item.kelurahan) {
          message += ` (RT ${item.rt || '-'}/RW ${item.rw || '-'}, ${item.kelurahan || '-'})`
        }
        message += '\n'
      }
      
      if (item.type === 'tensi') {
        const status = getTensiStatus(item.sistolik, item.diastolik)
        message += `Sistolik: *${item.sistolik}* mmHg\n`
        message += `Diastolik: *${item.diastolik}* mmHg\n`
        message += `Nadi: *${item.nadi}* bpm\n`
        message += `Status: ${status.label}\n\n`
      } else if (item.type === 'kolesterol') {
        const status = getKolesterolStatus(item.total, item.ldl, item.hdl)
        message += `Total: *${item.total}* mg/dL\n`
        message += `LDL: *${item.ldl}* mg/dL\n`
        message += `HDL: *${item.hdl}* mg/dL\n`
        message += `Status: ${status.label}\n\n`
      } else if (item.type === 'asamurat') {
        const status = getAsamUratStatus(item.value, item.gender)
        message += `Nilai: *${item.value}* mg/dL\n`
        message += `Status: ${status.label}\n\n`
      } else if (item.type === 'guladarah') {
        const status = getGulaDarahStatus(item.value, item.condition)
        message += `Nilai: *${item.value}* mg/dL (${item.condition})\n`
        message += `Status: ${status.label}\n\n`
      }
    })

    message += '━━━━━━━━━━━━━━━━\n'
    message += '_Dicatat via InterPulse App_'
    return message
  }

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStats = () => {
    if (readings.length === 0) return null
    
    // Filter by active tab
    const filteredReadings = activeTab === 'all' ? readings : readings.filter(r => r.type === activeTab)
    
    if (filteredReadings.length === 0) return null

    // Common stats
    const stats: any = {
      total: filteredReadings.length
    }

    // Type-specific stats
    if (activeTab === 'tensi' || activeTab === 'all') {
      const tensiReadings = filteredReadings.filter((r): r is TensiReading => r.type === 'tensi')
      if (tensiReadings.length > 0) {
        const sistolikValues = tensiReadings.map(r => parseInt(r.sistolik))
        const diastolikValues = tensiReadings.map(r => parseInt(r.diastolik))
        stats.avgSistolik = Math.round(sistolikValues.reduce((a, b) => a + b, 0) / sistolikValues.length)
        stats.avgDiastolik = Math.round(diastolikValues.reduce((a, b) => a + b, 0) / diastolikValues.length)
        stats.normal = tensiReadings.filter(r => getTensiStatus(r.sistolik, r.diastolik).status === 'normal').length
        stats.hipertensi = tensiReadings.filter(r => getTensiStatus(r.sistolik, r.diastolik).status === 'hipertensi').length
        stats.rendah = tensiReadings.filter(r => getTensiStatus(r.sistolik, r.diastolik).status === 'rendah').length
        stats.waspada = tensiReadings.filter(r => getTensiStatus(r.sistolik, r.diastolik).status === 'prehipertensi').length
      }
    }

    if (activeTab === 'kolesterol') {
      const kolReadings = filteredReadings.filter((r): r is KolesterolReading => r.type === 'kolesterol')
      if (kolReadings.length > 0) {
        const totalValues = kolReadings.map(r => parseInt(r.total))
        const ldlValues = kolReadings.map(r => parseInt(r.ldl))
        stats.avgTotal = Math.round(totalValues.reduce((a, b) => a + b, 0) / totalValues.length)
        stats.avgLdl = Math.round(ldlValues.reduce((a, b) => a + b, 0) / ldlValues.length)
        stats.normal = kolReadings.filter(r => getKolesterolStatus(r.total, r.ldl, r.hdl).label === 'Normal').length
        stats.hipertensi = kolReadings.filter(r => getKolesterolStatus(r.total, r.ldl, r.hdl).label === 'Tinggi').length
        stats.waspada = kolReadings.filter(r => getKolesterolStatus(r.total, r.ldl, r.hdl).label === 'Batas').length
        stats.rendah = 0
      }
    }

    if (activeTab === 'asamurat') {
      const auReadings = filteredReadings.filter((r): r is AsamUratReading => r.type === 'asamurat')
      if (auReadings.length > 0) {
        const values = auReadings.map(r => parseFloat(r.value))
        stats.avgValue = (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1)
        stats.normal = auReadings.filter(r => getAsamUratStatus(r.value, r.gender).label === 'Normal').length
        stats.hipertensi = auReadings.filter(r => getAsamUratStatus(r.value, r.gender).label === 'Tinggi').length
        stats.waspada = auReadings.filter(r => getAsamUratStatus(r.value, r.gender).label === 'Batas').length
        stats.rendah = 0
      }
    }

    if (activeTab === 'guladarah') {
      const gdReadings = filteredReadings.filter((r): r is GulaDarahReading => r.type === 'guladarah')
      if (gdReadings.length > 0) {
        const values = gdReadings.map(r => parseInt(r.value))
        stats.avgValue = Math.round(values.reduce((a, b) => a + b, 0) / values.length)
        stats.normal = gdReadings.filter(r => getGulaDarahStatus(r.value, r.condition).label === 'Normal').length
        stats.hipertensi = gdReadings.filter(r => ['Diabetes', 'Tinggi'].includes(getGulaDarahStatus(r.value, r.condition).label)).length
        stats.waspada = gdReadings.filter(r => ['Prediabetes', 'Batas'].includes(getGulaDarahStatus(r.value, r.condition).label)).length
        stats.rendah = gdReadings.filter(r => getGulaDarahStatus(r.value, r.condition).label === 'Rendah').length
      }
    }

    return stats
  }

  const stats = getStats()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 pb-nav">
      <Link href="/" className="p-3 hover:bg-white/50 rounded-full ml-2" aria-label="Kembali ke beranda">
        <ArrowLeft className="w-6 h-6" />
      </Link>
      
      <div className="mobile-container py-4 sm:py-6">
        {/* Header */}
        <div className="text-center mb-6 px-2">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mb-3 shadow-lg">
            <History className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Riwayat Kesehatan</h1>
          <p className="text-sm text-gray-600">Lihat dan kelola semua data pemeriksaan kesehatan Anda</p>
        </div>

        {/* Type Tabs */}
        <div className="bg-white rounded-2xl shadow-md p-2 mb-4">
          <div className="grid grid-cols-5 gap-1">
            {[
              { key: 'all', label: 'Semua', icon: '📋' },
              { key: 'tensi', label: 'Tensi', icon: '❤️' },
              { key: 'kolesterol', label: 'Kolesterol', icon: '🧈' },
              { key: 'asamurat', label: 'Asam Urat', icon: '🔥' },
              { key: 'guladarah', label: 'Gula Darah', icon: '🍯' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as HealthCheckType | 'all')}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl text-xs font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span className="text-lg">{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="bg-white rounded-xl p-3 shadow-md">
              <p className="text-xs text-gray-500">Total Pemeriksaan</p>
              <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
            </div>
            {activeTab === 'tensi' && (
              <>
                <div className="bg-white rounded-xl p-3 shadow-md">
                  <p className="text-xs text-gray-500">Rata-rata Sistolik</p>
                  <p className="text-2xl font-bold text-indigo-600">{stats.avgSistolik || '-'}</p>
                </div>
                <div className="bg-white rounded-xl p-3 shadow-md">
                  <p className="text-xs text-gray-500">Rata-rata Diastolik</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.avgDiastolik || '-'}</p>
                </div>
              </>
            )}
            {activeTab === 'kolesterol' && (
              <>
                <div className="bg-white rounded-xl p-3 shadow-md">
                  <p className="text-xs text-gray-500">Rata-rata Total</p>
                  <p className="text-2xl font-bold text-indigo-600">{stats.avgTotal || '-'}</p>
                </div>
                <div className="bg-white rounded-xl p-3 shadow-md">
                  <p className="text-xs text-gray-500">Rata-rata LDL</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.avgLdl || '-'}</p>
                </div>
              </>
            )}
            {(activeTab === 'asamurat' || activeTab === 'guladarah') && (
              <>
                <div className="bg-white rounded-xl p-3 shadow-md">
                  <p className="text-xs text-gray-500">Rata-rata Nilai</p>
                  <p className="text-2xl font-bold text-indigo-600">{stats.avgValue || '-'}</p>
                </div>
                <div className="bg-white rounded-xl p-3 shadow-md">
                  <p className="text-xs text-gray-500">-</p>
                  <p className="text-2xl font-bold text-gray-400">-</p>
                </div>
              </>
            )}
            {activeTab === 'all' && (
              <>
                <div className="bg-white rounded-xl p-3 shadow-md">
                  <p className="text-xs text-gray-500">Data Tensi</p>
                  <p className="text-2xl font-bold text-indigo-600">{stats.avgSistolik || '-'}</p>
                </div>
                <div className="bg-white rounded-xl p-3 shadow-md">
                  <p className="text-xs text-gray-500">Rata-rata Diastolik</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.avgDiastolik || '-'}</p>
                </div>
              </>
            )}
            <div className="bg-white rounded-xl p-3 shadow-md">
              <p className="text-xs text-gray-500">Status Normal</p>
              <p className="text-2xl font-bold text-green-600">{stats.normal || 0}</p>
            </div>
          </div>
        )}

        {/* Status Distribution */}
        {stats && (
          <div className="bg-white rounded-2xl p-4 shadow-md mb-6">
            <p className="font-semibold text-gray-800 mb-3">Distribusi Status</p>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="bg-green-50 rounded-lg p-2">
                <p className="text-lg font-bold text-green-600">{stats.normal}</p>
                <p className="text-xs text-green-700">Normal</p>
              </div>
              <div className="bg-yellow-50 rounded-lg p-2">
                <p className="text-lg font-bold text-yellow-600">{stats.waspada}</p>
                <p className="text-xs text-yellow-700">Waspada</p>
              </div>
              <div className="bg-red-50 rounded-lg p-2">
                <p className="text-lg font-bold text-red-600">{stats.hipertensi}</p>
                <p className="text-xs text-red-700">Tinggi</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-2">
                <p className="text-lg font-bold text-blue-600">{stats.rendah}</p>
                <p className="text-xs text-blue-700">Rendah</p>
              </div>
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className="bg-white rounded-2xl shadow-md p-4 mb-4">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Cari data..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
            >
              <Filter className="w-4 h-4" />
              Filter
              {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            <button
              onClick={() => setIsSelectionMode(!isSelectionMode)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isSelectionMode ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              {isSelectionMode ? 'Batal' : 'Pilih Data'}
            </button>

            {isSelectionMode && selectedItems.size > 0 && (
              <button
                onClick={deleteSelected}
                className="flex items-center gap-2 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm font-medium transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Hapus ({selectedItems.size})
              </button>
            )}

            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg text-sm font-medium hover:shadow-md transition-all"
              >
                <Download className="w-4 h-4" />
                Export
              </button>

              {showExportMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 z-50">
                  <button
                    onClick={() => {
                      exportToWhatsApp(selectedItems.size > 0 ? readings.filter(r => selectedItems.has(r.id)) : filteredReadings)
                      setShowExportMenu(false)
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left first:rounded-t-xl"
                  >
                    <MessageCircle className="w-5 h-5 text-green-500" />
                    <span className="text-sm">WhatsApp</span>
                  </button>
                  <button
                    onClick={() => {
                      exportToExcel(selectedItems.size > 0 ? readings.filter(r => selectedItems.has(r.id)) : filteredReadings)
                      setShowExportMenu(false)
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left"
                  >
                    <FileSpreadsheet className="w-5 h-5 text-green-600" />
                    <span className="text-sm">Excel (.xlsx)</span>
                  </button>
                  <button
                    onClick={() => {
                      exportToCSV(selectedItems.size > 0 ? readings.filter(r => selectedItems.has(r.id)) : filteredReadings)
                      setShowExportMenu(false)
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left"
                  >
                    <FileSpreadsheet className="w-5 h-5 text-gray-600" />
                    <span className="text-sm">CSV</span>
                  </button>
                  <button
                    onClick={() => {
                      shareAsText(selectedItems.size > 0 ? readings.filter(r => selectedItems.has(r.id)) : filteredReadings)
                      setShowExportMenu(false)
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left last:rounded-b-xl"
                  >
                    <Share2 className="w-5 h-5 text-blue-500" />
                    <span className="text-sm">Salin Teks</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Filter Options */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Dari Tanggal</label>
                  <input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                    title="Pilih tanggal mulai"
                    aria-label="Pilih tanggal mulai"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Sampai Tanggal</label>
                  <input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                    title="Pilih tanggal akhir"
                    aria-label="Pilih tanggal akhir"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({...filters, status: e.target.value as FilterState['status']})}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  title="Filter Status"
                >
                  <option value="all">Semua Status</option>
                  <option value="normal">Normal</option>
                  <option value="prehipertensi">Waspada</option>
                  <option value="hipertensi">Tinggi</option>
                  <option value="rendah">Rendah</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Results Count */}
        <p className="text-sm text-gray-500 mb-3 px-1">
          Menampilkan {filteredReadings.length} dari {readings.length} data
        </p>

        {/* Readings List */}
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-500">Memuat data...</p>
          </div>
        ) : filteredReadings.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl shadow-md">
            <History className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">Belum ada data</p>
            <p className="text-sm text-gray-400">Ayo catat data kesehatan pertama Anda!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredReadings.map((reading, index) => {
              const isExpanded = expandedId === reading.id
              
              // Type icons (same as tabs)
              const typeIcons: Record<HealthCheckType, string> = {
                tensi: '❤️',
                kolesterol: '🧈',
                asamurat: '🔥',
                guladarah: '🍯'
              }
              
              // Get status based on type
              let status: any = { bgColor: 'bg-gray-100', color: 'text-gray-600', label: 'Unknown' }
              let displayValue = ''
              let details: any[] = []
              
              if (reading.type === 'tensi') {
                const tr = reading as TensiReading
                status = getTensiStatus(tr.sistolik, tr.diastolik)
                displayValue = `${tr.sistolik}/${tr.diastolik}`
                details = [
                  { label: 'Sistolik', value: tr.sistolik, unit: 'mmHg', icon: Activity },
                  { label: 'Diastolik', value: tr.diastolik, unit: 'mmHg', icon: Activity },
                  { label: 'Nadi', value: tr.nadi, unit: 'bpm', icon: Heart },
                ]
              } else if (reading.type === 'kolesterol') {
                const kr = reading as KolesterolReading
                status = getKolesterolStatus(kr.total, kr.ldl, kr.hdl)
                displayValue = `${kr.total} mg/dL`
                details = [
                  { label: 'Total', value: kr.total, unit: 'mg/dL', icon: Activity },
                  { label: 'LDL', value: kr.ldl, unit: 'mg/dL', icon: Activity },
                  { label: 'HDL', value: kr.hdl, unit: 'mg/dL', icon: Heart },
                  { label: 'Trigliserida', value: kr.trigliserida, unit: 'mg/dL', icon: Activity },
                ]
              } else if (reading.type === 'asamurat') {
                const ar = reading as AsamUratReading
                status = getAsamUratStatus(ar.value, ar.gender)
                displayValue = `${ar.value} mg/dL`
                details = [
                  { label: 'Nilai', value: ar.value, unit: 'mg/dL', icon: Activity },
                  { label: 'Gender', value: ar.gender, unit: '', icon: Heart },
                ]
              } else if (reading.type === 'guladarah') {
                const gr = reading as GulaDarahReading
                status = getGulaDarahStatus(gr.value, gr.condition)
                displayValue = `${gr.value} mg/dL`
                details = [
                  { label: 'Nilai', value: gr.value, unit: 'mg/dL', icon: Activity },
                  { label: 'Kondisi', value: gr.condition, unit: '', icon: Heart },
                ]
              }

              return (
                <div
                  key={reading.id}
                  className={`bg-white rounded-2xl shadow-md overflow-hidden transition-all ${
                    selectedItems.has(reading.id) ? 'ring-2 ring-blue-500' : ''
                  }`}
                >
                  <div className="p-4">
                    <div className="flex items-center gap-3">
                      {isSelectionMode && (
                        <button
                          onClick={() => toggleSelection(reading.id)}
                          title="Pilih item"
                          aria-label="Pilih item"
                          className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center ${
                            selectedItems.has(reading.id)
                              ? 'bg-blue-500 border-blue-500 text-white'
                              : 'border-gray-300'
                          }`}
                        >
                          {selectedItems.has(reading.id) && <CheckCircle className="w-4 h-4" />}
                        </button>
                      )}

                      <div className={`w-12 h-12 ${status.bgColor} rounded-xl flex items-center justify-center flex-shrink-0`}>
                        <span className="text-2xl">{typeIcons[reading.type]}</span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xl font-bold text-gray-800">
                            {displayValue}
                          </span>
                          <span className={`px-2 py-0.5 ${status.bgColor} ${status.color} rounded-full text-xs font-medium`}>
                            {status.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                          <span className="capitalize text-xs bg-gray-100 px-2 py-0.5 rounded">{reading.type}</span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {formatDate(reading.timestamp)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {formatTime(reading.timestamp)}
                          </span>
                        </div>
                        {reading.userName && (
                          <div className="flex items-center gap-2 text-xs text-teal-600 mt-2 bg-teal-50 px-2 py-1 rounded-lg inline-flex">
                            <span className="font-medium">{reading.userName}</span>
                            {(reading.rt || reading.rw || reading.kelurahan) && (
                              <span className="text-teal-500">• RT {reading.rt || '-'}/RW {reading.rw || '-'} • {reading.kelurahan || '-'}</span>
                            )}
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => setExpandedId(isExpanded ? null : reading.id)}
                        title={isExpanded ? "Tutup detail" : "Buka detail"}
                        aria-label={isExpanded ? "Tutup detail" : "Buka detail"}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                      </button>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <div className={`grid gap-4 mb-4 ${details.length <= 3 ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-4'}`}>
                          {details.map((detail, i) => {
                            const Icon = detail.icon
                            return (
                              <div key={i} className="text-center p-3 bg-gray-50 rounded-xl">
                                <Icon className="w-5 h-5 text-gray-400 mx-auto mb-1" />
                                <p className="text-xs text-gray-500">{detail.label}</p>
                                <p className="text-lg font-bold text-gray-800">{detail.value}</p>
                                {detail.unit && <p className="text-xs text-gray-400">{detail.unit}</p>}
                              </div>
                            )
                          })}
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => exportToWhatsApp([reading])}
                            className="flex-1 flex items-center justify-center gap-2 py-2 bg-green-50 hover:bg-green-100 text-green-700 rounded-xl text-sm font-medium transition-colors"
                          >
                            <MessageCircle className="w-4 h-4" />
                            Share WA
                          </button>
                          <button
                            onClick={() => deleteReading(reading.id)}
                            title="Hapus data"
                            aria-label="Hapus data"
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl text-sm font-medium transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
