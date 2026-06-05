'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Activity, Users, Download, FileText, MessageCircle, Calendar, Heart, Droplet, Thermometer, Target, ArrowLeft } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

const months = ['januari','februari','maret','april','mei','juni','juli','agustus','september','oktober','november','desember']
const monthLabels: Record<string, string> = {
  januari:'Jan', februari:'Feb', maret:'Mar', april:'Apr', mei:'Mei', juni:'Jun',
  juli:'Jul', agustus:'Agu', september:'Sep', oktober:'Okt', november:'Nov', desember:'Des'
}

interface HealthReading {
  id: string
  type: string
  timestamp: string
  source: string
  rw: string
  [key: string]: any
}

export default function TrafikUser() {
  const router = useRouter()
  const { userProfile, loading: authLoading } = useAuth()
  const [healthReadings, setHealthReadings] = useState<any[]>([])
  const [rwHealthData, setRwHealthData] = useState<Record<string, number>>({})
  const [selectedMonth, setSelectedMonth] = useState('april')
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
      console.log('[TrafikUser] User health readings loaded:', {
        userNIK: userProfile.nik,
        count: data.length,
        filteredCount: filteredData.length,
        uniqueCount: uniqueData.length,
        items: uniqueData.map(d => ({ type: d.type, timestamp: d.timestamp, source: d.source, rw: d.rw }))
      })
      setHealthReadings(uniqueData)
    })

    return () => unsubscribe()
  }, [userProfile?.nik])

  // Fetch RW-level health data (aggregated, not individual data)
  useEffect(() => {
    if (!userProfile?.rw) return

    const healthReadingsRef = collection(db, 'healthReadings')
    const unsubscribe = onSnapshot(healthReadingsRef, (snapshot) => {
      const data: Record<string, number> = {}
      months.forEach(m => { data[m] = 0 })

      let totalDocs = 0
      let matchedDocs = 0

      snapshot.docs.forEach(doc => {
        const d = doc.data()
        totalDocs++
        if (!d || !d.timestamp) return
        const rw = d.rw
        const source = d.source
        // Only aggregate data for user's RW and from posbindu (admin input)
        if (rw === userProfile.rw && source === 'posbindu') {
          matchedDocs++
          const month = new Date(d.timestamp).toLocaleString('id-ID', { month: 'long' }).toLowerCase()
          if (data[month] !== undefined) data[month]++
        }
      })

      console.log('[TrafikUser] RW health data aggregation:', {
        userRW: userProfile.rw,
        totalDocs,
        matchedDocs,
        result: data
      })

      setRwHealthData(data)
    })

    return () => unsubscribe()
  }, [userProfile?.rw])

  // Show loading while auth state is being determined
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat...</p>
        </div>
      </div>
    )
  }

  const userMonthData = healthReadings.filter(r => {
    const month = new Date(r.timestamp).toLocaleString('id-ID', { month: 'long' }).toLowerCase()
    return month === selectedMonth
  })

  const monthNamesId = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
  const exportFileBase = `trafik-kesehatan-${monthNamesId[months.indexOf(selectedMonth)]}-${new Date().getFullYear()}`

  const formatReadingValue = (reading: HealthReading) => {
    if (reading.type === 'tensi') return `${reading.sistolik}/${reading.diastolik} mmHg`
    if (reading.type === 'kolesterol') return `${reading.total} mg/dL`
    return `${reading.nilai || '-'} mg/dL`
  }

  const handleExportExcel = () => {
    if (!userProfile) return
    setIsExporting(true)
    try {
      const rows = userMonthData.map(r => ({
        Tanggal: new Date(r.timestamp).toLocaleDateString('id-ID'),
        Pemeriksaan: r.type,
        Nilai: formatReadingValue(r),
        RW: r.rw || userProfile.rw,
      }))
      const ws = XLSX.utils.json_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Data Kesehatan')
      XLSX.writeFile(wb, `${exportFileBase}.xlsx`)
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
      doc.setFontSize(14)
      doc.text('Laporan Trafik Kesehatan Pribadi', 14, 18)
      doc.setFontSize(10)
      doc.text(`${userProfile.name || '-'} | RW ${userProfile.rw} | ${monthLabels[selectedMonth]} ${new Date().getFullYear()}`, 14, 26)
      autoTable(doc, {
        startY: 32,
        head: [['Tanggal', 'Pemeriksaan', 'Nilai', 'RW']],
        body: userMonthData.map(r => [
          new Date(r.timestamp).toLocaleDateString('id-ID'),
          r.type,
          formatReadingValue(r),
          r.rw || userProfile.rw,
        ]),
      })
      doc.save(`${exportFileBase}.pdf`)
    } catch (error) {
      console.error('Error exporting PDF:', error)
    } finally {
      setIsExporting(false)
      setShowExportDropdown(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Trafik Kesehatan</h1>
            <p className="text-gray-600 mt-1">Riwayat kesehatan pribadi dan trafik RW {userProfile?.rw}</p>
          </div>
        </div>

        {/* Month Selector */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex flex-wrap gap-2">
            {months.map(month => (
              <button
                key={month}
                onClick={() => setSelectedMonth(month)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  selectedMonth === month
                    ? 'bg-gradient-to-r from-teal-500 to-cyan-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {monthLabels[month]}
              </button>
            ))}
          </div>
        </div>

        {/* RW-level Overview - Ringkasan */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Users className="w-5 h-5 text-teal-600" />
                Ringkasan Kesehatan RW {userProfile?.rw}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {monthLabels[selectedMonth]} {new Date().getFullYear()}
              </p>
            </div>
            <div className="relative">
              <button
                onClick={() => setShowExportDropdown(!showExportDropdown)}
                disabled={isExporting}
                className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                {isExporting ? 'Mengekspor...' : 'Export'}
              </button>
              {showExportDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border z-10">
                  <button
                    onClick={handleExportExcel}
                    disabled={isExporting}
                    className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2 disabled:opacity-50"
                  >
                    <FileText className="w-4 h-4" /> Excel
                  </button>
                  <button
                    onClick={handleExportPDF}
                    disabled={isExporting}
                    className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2 disabled:opacity-50"
                  >
                    <FileText className="w-4 h-4" /> PDF
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-teal-500 to-cyan-600 text-white p-6 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-80">Total Pemeriksaan</p>
                  <p className="text-3xl font-bold mt-1">{rwHealthData[selectedMonth] || 0}</p>
                </div>
                <Activity className="w-10 h-10 opacity-80" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white p-6 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-80">Data Pribadi</p>
                  <p className="text-3xl font-bold mt-1">{userMonthData.length}</p>
                </div>
                <Heart className="w-10 h-10 opacity-80" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-pink-600 text-white p-6 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-80">RW Anda</p>
                  <p className="text-3xl font-bold mt-1">{userProfile?.rw}</p>
                </div>
                <Target className="w-10 h-10 opacity-80" />
              </div>
            </div>
          </div>

          {/* Monthly Chart */}
          <div className="mt-6">
            <h3 className="font-semibold text-gray-800 mb-3">Trafik Bulanan RW {userProfile?.rw}</h3>
            <div className="flex items-end gap-2 h-40">
              {months.map(month => {
                const value = rwHealthData[month] || 0
                const maxValue = Math.max(...Object.values(rwHealthData), 1)
                const height = (value / maxValue) * 100
                return (
                  <div key={month} className="flex-1 flex flex-col items-center">
                    <div
                      className={`w-full rounded-t-lg transition-all ${
                        selectedMonth === month
                          ? 'bg-gradient-to-t from-teal-500 to-cyan-600'
                          : 'bg-gray-200'
                      }`}
                      style={{ height: `${Math.max(height, 5)}%` }}
                      role="img"
                      aria-label={`Grafik ${monthLabels[month]}: ${value} pemeriksaan`}
                      aria-hidden="true"
                    />
                    <p className="text-xs text-gray-600 mt-2">{monthLabels[month]}</p>
                    <p className="text-xs font-semibold text-gray-800">{value}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Personal Health Data */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Heart className="w-5 h-5 text-teal-600" />
              Data Kesehatan Pribadi
            </h2>
          </div>

          {userMonthData.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">Belum ada data kesehatan untuk bulan {monthLabels[selectedMonth]}</p>
              <p className="text-sm text-gray-400 mt-1">Data akan muncul setelah admin input pemeriksaan kesehatan Anda</p>
            </div>
          ) : (
            <div className="space-y-3">
              {userMonthData.map((reading) => (
                <div key={reading.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {reading.type === 'tensi' && <Heart className="w-5 h-5 text-red-500" />}
                      {reading.type === 'kolesterol' && <Droplet className="w-5 h-5 text-yellow-500" />}
                      {reading.type === 'asamurat' && <Thermometer className="w-5 h-5 text-orange-500" />}
                      {reading.type === 'guladarah' && <Target className="w-5 h-5 text-blue-500" />}
                      <div>
                        <p className="font-semibold text-gray-800 capitalize">{reading.type || 'Pemeriksaan'}</p>
                        <p className="text-sm text-gray-500">{new Date(reading.timestamp).toLocaleDateString('id-ID')}</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {reading.type === 'tensi' ? `${reading.sistolik}/${reading.diastolik} mmHg` :
                       reading.type === 'kolesterol' ? `${reading.total} mg/dL` :
                       `${reading.nilai || '-'} mg/dL`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
