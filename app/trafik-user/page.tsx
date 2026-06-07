'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, Heart, Droplet, Activity, TrendingUp, Download, FileText, User, Clock } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import BackButton from '@/components/BackButton'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import Link from 'next/link'

const months = ['januari','februari','maret','april','mei','juni','juli','agustus','september','oktober','november','desember']
const monthLabels: Record<string, string> = {
  januari:'Jan', februari:'Feb', maret:'Mar', april:'Apr', mei:'Mei', juni:'Jun',
  juli:'Jul', agustus:'Agu', september:'Sep', oktober:'Okt', november:'Nov', desember:'Des'
}

const monthFullNames: Record<string, string> = {
  januari:'Januari', februari:'Februari', maret:'Maret', april:'April', mei:'Mei', juni:'Juni',
  juli:'Juli', agustus:'Agustus', september:'September', oktober:'Oktober', november:'November', desember:'Desember'
}

interface HealthReading {
  id: string
  type: string
  timestamp: string
  source: string
  rw: string
  nik: string
  [key: string]: any
}

interface MonthlyData {
  month: string
  readings: HealthReading[]
}

export default function TrafikUser() {
  const router = useRouter()
  const { userProfile, loading: authLoading } = useAuth()
  const [healthReadings, setHealthReadings] = useState<HealthReading[]>([])
  const [monthlyData, setMonthlyData] = useState<Record<string, HealthReading[]>>({})
  const [selectedMonth, setSelectedMonth] = useState(months[new Date().getMonth()])
  const [showExportDropdown, setShowExportDropdown] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  // Fetch user's health readings from Firebase (real data from admin)
  useEffect(() => {
    if (!userProfile?.nik) return

    const healthReadingsRef = collection(db, 'healthReadings')
    const q = query(healthReadingsRef, where('nik', '==', userProfile.nik))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as HealthReading[]
      // Filter to only include data from posbindu (admin input) to avoid duplicates
      const filteredData = data.filter(d => d.source === 'posbindu')
      // Remove duplicates based on timestamp and type
      const uniqueData = filteredData.filter((item, index, self) =>
        index === self.findIndex((t) =>
          t.timestamp === item.timestamp && t.type === item.type
        )
      )
      
      // Group by month
      const grouped: Record<string, HealthReading[]> = {}
      months.forEach(m => { grouped[m] = [] })
      
      uniqueData.forEach(reading => {
        const month = new Date(reading.timestamp).toLocaleString('id-ID', { month: 'long' }).toLowerCase()
        if (grouped[month]) {
          grouped[month].push(reading)
        }
      })
      
      setHealthReadings(uniqueData)
      setMonthlyData(grouped)
    })

    return () => unsubscribe()
  }, [userProfile?.nik])

  // Show loading while auth state is being determined
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold">Memuat data kesehatan...</p>
        </div>
      </div>
    )
  }

  const userMonthData = monthlyData[selectedMonth] || []
  const totalReadings = healthReadings.length
  const monthsWithData = Object.values(monthlyData).filter(m => m.length > 0).length

  const formatReadingValue = (reading: HealthReading) => {
    if (reading.type === 'tensi') return `${reading.sistolik}/${reading.diastolik} mmHg`
    if (reading.type === 'kolesterol') return `${reading.total} mg/dL`
    return `${reading.nilai || '-'} mg/dL`
  }

  const getHealthStatus = (reading: HealthReading) => {
    const value = reading.type === 'tensi' ? reading.sistolik : 
                  reading.type === 'kolesterol' ? reading.total : 
                  reading.nilai
    
    if (reading.type === 'tensi') {
      if (value < 120) return { status: 'Rendah', color: 'text-blue-600', bg: 'bg-blue-100' }
      if (value < 130) return { status: 'Normal', color: 'text-green-600', bg: 'bg-green-100' }
      if (value < 140) return { status: 'Pra-Hipertensi', color: 'text-yellow-600', bg: 'bg-yellow-100' }
      return { status: 'Hipertensi', color: 'text-red-600', bg: 'bg-red-100' }
    }
    if (reading.type === 'kolesterol') {
      if (value < 200) return { status: 'Normal', color: 'text-green-600', bg: 'bg-green-100' }
      return { status: 'Tinggi', color: 'text-red-600', bg: 'bg-red-100' }
    }
    if (reading.type === 'guladarah') {
      if (value < 100) return { status: 'Normal', color: 'text-green-600', bg: 'bg-green-100' }
      if (value < 126) return { status: 'Pra-Diabetes', color: 'text-yellow-600', bg: 'bg-yellow-100' }
      return { status: 'Tinggi', color: 'text-red-600', bg: 'bg-red-100' }
    }
    if (reading.type === 'asamurat') {
      const threshold = userProfile?.gender === 'P' ? 6 : 7
      if (value <= threshold) return { status: 'Normal', color: 'text-green-600', bg: 'bg-green-100' }
      return { status: 'Tinggi', color: 'text-red-600', bg: 'bg-red-100' }
    }
    return { status: 'Normal', color: 'text-green-600', bg: 'bg-green-100' }
  }

  const getIconForType = (type: string) => {
    switch(type) {
      case 'tensi': return <Heart className="w-6 h-6" />
      case 'kolesterol': return <Droplet className="w-6 h-6" />
      case 'guladarah': return <Activity className="w-6 h-6" />
      case 'asamurat': return <TrendingUp className="w-6 h-6" />
      default: return <Activity className="w-6 h-6" />
    }
  }

  const getColorForType = (type: string) => {
    switch(type) {
      case 'tensi': return 'from-red-500 to-rose-600'
      case 'kolesterol': return 'from-yellow-500 to-amber-600'
      case 'guladarah': return 'from-blue-500 to-cyan-600'
      case 'asamurat': return 'from-orange-500 to-red-600'
      default: return 'from-gray-500 to-gray-600'
    }
  }

  const handleExportExcel = () => {
    if (!userProfile) return
    setIsExporting(true)
    try {
      const rows = userMonthData.map(r => ({
        Tanggal: new Date(r.timestamp).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
        Pemeriksaan: r.type.charAt(0).toUpperCase() + r.type.slice(1),
        Nilai: formatReadingValue(r),
        RW: r.rw || userProfile.rw,
      }))
      const ws = XLSX.utils.json_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Data Kesehatan')
      XLSX.writeFile(wb, `riwayat-kesehatan-${monthFullNames[selectedMonth]}-${new Date().getFullYear()}.xlsx`)
    } catch (error) {
      console.error('Error exporting Excel:', error)
    } finally {
      setIsExporting(false)
      setShowExportDropdown(false)
    }
  }

  const handleExportPDF = () => {
    if (!userProfile) return
    setIsExporting(true)
    try {
      const doc = new jsPDF()
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text('Riwayat Kesehatan Pribadi', 14, 20)
      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')
      doc.text(`Nama: ${userProfile.name || '-'}`, 14, 30)
      doc.text(`NIK: ${userProfile.nik || '-'}`, 14, 38)
      doc.text(`RW: ${userProfile.rw || '-'}`, 14, 46)
      doc.text(`Periode: ${monthFullNames[selectedMonth]} ${new Date().getFullYear()}`, 14, 54)
      
      autoTable(doc, {
        startY: 62,
        head: [['Tanggal', 'Pemeriksaan', 'Nilai', 'RW']],
        body: userMonthData.map(r => [
          new Date(r.timestamp).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
          r.type.charAt(0).toUpperCase() + r.type.slice(1),
          formatReadingValue(r),
          r.rw || userProfile.rw,
        ]),
        headStyles: { fillColor: [79, 70, 229] },
        styles: { fontSize: 10 },
      })
      doc.save(`riwayat-kesehatan-${monthFullNames[selectedMonth]}-${new Date().getFullYear()}.pdf`)
    } catch (error) {
      console.error('Error exporting PDF:', error)
    } finally {
      setIsExporting(false)
      setShowExportDropdown(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 pb-24">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <BackButton onClick={() => router.push('/')} />
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
              <User className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-gray-900">Riwayat Kesehatan</h1>
              <p className="text-gray-600 font-semibold mt-1">Data pemeriksaan kesehatan Anda</p>
            </div>
          </div>
        </div>

        {/* User Info Card */}
        <div className="bg-white rounded-3xl shadow-xl p-6 mb-6 border-2 border-indigo-100">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-4 border border-indigo-100">
              <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Nama</p>
              <p className="text-lg font-extrabold text-gray-900 mt-1 break-words">{userProfile?.name || '-'}</p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-4 border border-purple-100">
              <p className="text-xs font-bold text-purple-600 uppercase tracking-wider">NIK</p>
              <p className="text-lg font-extrabold text-gray-900 mt-1 break-all">{userProfile?.nik || '-'}</p>
            </div>
            <div className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-2xl p-4 border border-pink-100">
              <p className="text-xs font-bold text-pink-600 uppercase tracking-wider">RW</p>
              <p className="text-lg font-extrabold text-gray-900 mt-1">{userProfile?.rw || '-'}</p>
            </div>
            <div className="bg-gradient-to-br from-rose-50 to-orange-50 rounded-2xl p-4 border border-rose-100">
              <p className="text-xs font-bold text-rose-600 uppercase tracking-wider">Total Data</p>
              <p className="text-lg font-extrabold text-gray-900 mt-1">{totalReadings}</p>
            </div>
          </div>
        </div>

        {/* Month Selector */}
        <div className="bg-white rounded-3xl shadow-xl p-6 mb-6 border-2 border-indigo-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
              <Calendar className="w-6 h-6 text-indigo-600" />
              Pilih Bulan
            </h2>
            <div className="relative">
              <button
                onClick={() => setShowExportDropdown(!showExportDropdown)}
                disabled={isExporting || userMonthData.length === 0}
                className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                <Download className="w-5 h-5" />
                {isExporting ? 'Mengekspor...' : 'Export'}
              </button>
              {showExportDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-2xl border-2 border-indigo-100 z-10 overflow-hidden">
                  <button
                    onClick={handleExportExcel}
                    disabled={isExporting}
                    className="w-full px-4 py-3 text-left hover:bg-indigo-50 flex items-center gap-3 disabled:opacity-50 font-semibold text-gray-700 transition-colors border-b border-gray-100"
                  >
                    <FileText className="w-5 h-5 text-green-600" /> Excel
                  </button>
                  <button
                    onClick={handleExportPDF}
                    disabled={isExporting}
                    className="w-full px-4 py-3 text-left hover:bg-indigo-50 flex items-center gap-3 disabled:opacity-50 font-semibold text-gray-700 transition-colors"
                  >
                    <FileText className="w-5 h-5 text-red-600" /> PDF
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {months.map(month => (
              <button
                key={month}
                onClick={() => setSelectedMonth(month)}
                className={`px-3 py-3 rounded-xl font-bold transition-all text-sm ${
                  selectedMonth === month
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg scale-105'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {monthLabels[month]}
              </button>
            ))}
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-3xl p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold opacity-90 uppercase tracking-wider">Total Pemeriksaan</p>
                <p className="text-4xl font-extrabold mt-2">{totalReadings}</p>
              </div>
              <Activity className="w-12 h-12 opacity-80" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-purple-500 to-pink-600 text-white rounded-3xl p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold opacity-90 uppercase tracking-wider">Bulan dengan Data</p>
                <p className="text-4xl font-extrabold mt-2">{monthsWithData}</p>
              </div>
              <Calendar className="w-12 h-12 opacity-80" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-pink-500 to-rose-600 text-white rounded-3xl p-6 shadow-xl col-span-2 md:col-span-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold opacity-90 uppercase tracking-wider">Data Bulan Ini</p>
                <p className="text-4xl font-extrabold mt-2">{userMonthData.length}</p>
              </div>
              <Clock className="w-12 h-12 opacity-80" />
            </div>
          </div>
        </div>

        {/* Health Data List */}
        <div className="bg-white rounded-3xl shadow-xl p-6 border-2 border-indigo-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-extrabold text-gray-900 flex items-center gap-3">
              <Heart className="w-7 h-7 text-indigo-600" />
              Data {monthFullNames[selectedMonth]} {new Date().getFullYear()}
            </h2>
            <span className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-full font-bold text-sm">
              {userMonthData.length} Pemeriksaan
            </span>
          </div>

          {userMonthData.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-10 h-10 text-gray-400" />
              </div>
              <p className="text-xl font-bold text-gray-600 mb-2">Belum Ada Data</p>
              <p className="text-gray-500 font-semibold">Data kesehatan untuk bulan ini belum tersedia</p>
              <p className="text-sm text-gray-400 mt-2">Data akan muncul setelah admin melakukan input pemeriksaan kesehatan Anda</p>
            </div>
          ) : (
            <div className="space-y-4">
              {userMonthData.map((reading) => {
                const status = getHealthStatus(reading)
                return (
                  <div key={reading.id} className="bg-gradient-to-r from-gray-50 to-white rounded-2xl p-5 border-2 border-gray-100 hover:border-indigo-200 transition-all shadow-md hover:shadow-lg">
                    <div className="flex items-start gap-4">
                      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${getColorForType(reading.type)} flex items-center justify-center text-white shadow-lg flex-shrink-0`}>
                        {getIconForType(reading.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <p className="text-lg font-extrabold text-gray-900 capitalize">
                              {reading.type === 'tensi' ? 'Tekanan Darah' :
                               reading.type === 'kolesterol' ? 'Kolesterol' :
                               reading.type === 'guladarah' ? 'Gula Darah' :
                               reading.type === 'asamurat' ? 'Asam Urat' : reading.type}
                            </p>
                            <p className="text-sm font-bold text-gray-500 flex items-center gap-1 mt-1">
                              <Clock className="w-4 h-4" />
                              {new Date(reading.timestamp).toLocaleDateString('id-ID', { 
                                day: 'numeric', 
                                month: 'long', 
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-extrabold ${status.bg} ${status.color} whitespace-nowrap`}>
                            {status.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-4">
                          <p className="text-2xl font-extrabold text-indigo-600">
                            {formatReadingValue(reading)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
