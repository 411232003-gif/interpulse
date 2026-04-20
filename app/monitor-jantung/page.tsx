'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Heart, Activity, TrendingUp, TrendingDown, AlertCircle, Calendar, Filter, Download, ArrowLeft } from 'lucide-react'

interface TensiReading {
  sistolik: string
  diastolik: string
  nadi: string
  timestamp: Date
}

interface DailyTensiData {
  date: string
  readings: TensiReading[]
  avgSistolik: number
  avgDiastolik: number
  avgNadi: number
}

export default function RiwayatTensi() {
  const [readings, setReadings] = useState<TensiReading[]>([])
  const [filteredData, setFilteredData] = useState<DailyTensiData[]>([])
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [showFilter, setShowFilter] = useState<boolean>(false)

  // Initialize dates - default to last 7 days
  useEffect(() => {
    const today = new Date()
    const weekAgo = new Date(today)
    weekAgo.setDate(today.getDate() - 7)
    
    const todayStr = today.toISOString().split('T')[0]
    const weekAgoStr = weekAgo.toISOString().split('T')[0]
    
    setEndDate(todayStr)
    setStartDate(weekAgoStr)
  }, [])

  // Load data from localStorage
  useEffect(() => {
    const loadData = () => {
      const existingData = localStorage.getItem('tensiReadings')
      if (existingData) {
        const parsedData = JSON.parse(existingData)
        const readingsWithDates = parsedData.map((reading: any) => ({
          ...reading,
          timestamp: new Date(reading.timestamp)
        }))
        setReadings(readingsWithDates)
      }
    }

    loadData()
    
    // Listen for storage changes
    const handleStorageChange = () => {
      loadData()
    }
    
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  // Filter and process data when dates change
  useEffect(() => {
    if (startDate && endDate && readings.length > 0) {
      processFilteredData()
    }
  }, [startDate, endDate, readings])

  const processFilteredData = () => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    
    // Filter readings by date range
    const filteredReadings = readings.filter(reading => {
      const readingDate = new Date(reading.timestamp)
      return readingDate >= start && readingDate <= end
    })

    // Group by date
    const groupedByDate: { [key: string]: TensiReading[] } = {}
    
    filteredReadings.forEach(reading => {
      const dateStr = reading.timestamp.toISOString().split('T')[0]
      if (!groupedByDate[dateStr]) {
        groupedByDate[dateStr] = []
      }
      groupedByDate[dateStr].push(reading)
    })

    // Calculate daily averages
    const dailyData: DailyTensiData[] = Object.entries(groupedByDate).map(([date, dayReadings]) => {
      const avgSistolik = Math.round(
        dayReadings.reduce((sum, r) => sum + parseInt(r.sistolik), 0) / dayReadings.length
      )
      const avgDiastolik = Math.round(
        dayReadings.reduce((sum, r) => sum + parseInt(r.diastolik), 0) / dayReadings.length
      )
      const avgNadi = Math.round(
        dayReadings.reduce((sum, r) => sum + parseInt(r.nadi), 0) / dayReadings.length
      )

      return {
        date,
        readings: dayReadings,
        avgSistolik,
        avgDiastolik,
        avgNadi
      }
    })

    // Sort by date
    dailyData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    
    setFilteredData(dailyData)
  }

  const getTensiStatus = (sistolik: number, diastolik: number) => {
    if (sistolik < 90 || diastolik < 60) {
      return { status: 'Rendah', color: 'text-blue-600', bg: 'bg-blue-100', icon: <TrendingDown className="w-4 h-4" /> }
    }
    if (sistolik < 120 && diastolik < 80) {
      return { status: 'Normal', color: 'text-green-600', bg: 'bg-green-100', icon: <Activity className="w-4 h-4" /> }
    }
    if (sistolik < 140 && diastolik < 90) {
      return { status: 'Pra-Hipertensi', color: 'text-yellow-600', bg: 'bg-yellow-100', icon: <AlertCircle className="w-4 h-4" /> }
    }
    return { status: 'Hipertensi', color: 'text-red-600', bg: 'bg-red-100', icon: <TrendingUp className="w-4 h-4" /> }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
    
    return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]}`
  }

  const exportToWhatsApp = () => {
    if (filteredData.length === 0) return

    let report = `📊 *LAPORAN TENSI DARAH*\n`
    report += `📅 Periode: ${formatDate(startDate)} - ${formatDate(endDate)}\n\n`

    filteredData.forEach(day => {
      const status = getTensiStatus(day.avgSistolik, day.avgDiastolik)
      report += `📌 ${formatDate(day.date)}\n`
      report += `💉 Tensi: ${day.avgSistolik}/${day.avgDiastolik} mmHg (${status.status})\n`
      report += `❤️ Nadi: ${day.avgNadi} bpm\n`
      report += `📈 Jumlah pengukuran: ${day.readings.length} kali\n\n`
    })

    // Calculate overall averages
    const totalReadings = filteredData.reduce((sum, day) => sum + day.readings.length, 0)
    const overallAvgSistolik = Math.round(
      filteredData.reduce((sum, day) => sum + day.avgSistolik * day.readings.length, 0) / totalReadings
    )
    const overallAvgDiastolik = Math.round(
      filteredData.reduce((sum, day) => sum + day.avgDiastolik * day.readings.length, 0) / totalReadings
    )
    const overallAvgNadi = Math.round(
      filteredData.reduce((sum, day) => sum + day.avgNadi * day.readings.length, 0) / totalReadings
    )

    const overallStatus = getTensiStatus(overallAvgSistolik, overallAvgDiastolik)
    
    report += `📈 *RINGKASAN*\n`
    report += `💉 Rata-rata Tensi: ${overallAvgSistolik}/${overallAvgDiastolik} mmHg (${overallStatus.status})\n`
    report += `❤️ Rata-rata Nadi: ${overallAvgNadi} bpm\n`
    report += `📊 Total pengukuran: ${totalReadings} kali\n`

    // Open WhatsApp with pre-filled message
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(report)}`
    window.open(whatsappUrl, '_blank')
  }

  // Simple Chart Component
  const SimpleChart = ({ data }: { data: DailyTensiData[] }) => {
    if (data.length === 0) return null

    const maxSistolik = Math.max(...data.map(d => d.avgSistolik))
    const maxDiastolik = Math.max(...data.map(d => d.avgDiastolik))
    const maxValue = Math.max(maxSistolik, maxDiastolik, 180)

    return (
      <div className="relative h-64 bg-white rounded-lg p-4 border">
        {/* Grid lines */}
        <div className="absolute inset-0">
          {[0, 1, 2, 3, 4].map(i => (
            <div
              key={i}
              className={`absolute w-full border-t border-gray-200 ${
                i === 0 ? 'top-0' : i === 1 ? 'top-[25%]' : i === 2 ? 'top-[50%]' : i === 3 ? 'top-[75%]' : 'top-full'
              }`}
            >
              <span className="text-xs text-gray-500 absolute -left-8 -top-2">
                {Math.round(maxValue - (i * maxValue / 4))}
              </span>
            </div>
          ))}
        </div>

        {/* Sistolik line */}
        <svg className="absolute inset-0" width="100%" height="100%">
          <polyline
            points={data.map((d, i) => {
              const x = (i / (data.length - 1)) * 100
              const y = ((maxValue - d.avgSistolik) / maxValue) * 100
              return `${x}%,${y}%`
            }).join(' ')}
            fill="none"
            stroke="#ef4444"
            strokeWidth="3"
          />
          {data.map((d, i) => {
            const x = (i / (data.length - 1)) * 100
            const y = ((maxValue - d.avgSistolik) / maxValue) * 100
            return (
              <circle key={`sys-${i}`} cx={`${x}%`} cy={`${y}%`} r="4" fill="#ef4444" />
            )
          })}
        </svg>

        {/* Diastolik line */}
        <svg className="absolute inset-0" width="100%" height="100%">
          <polyline
            points={data.map((d, i) => {
              const x = (i / (data.length - 1)) * 100
              const y = ((maxValue - d.avgDiastolik) / maxValue) * 100
              return `${x}%,${y}%`
            }).join(' ')}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="3"
          />
          {data.map((d, i) => {
            const x = (i / (data.length - 1)) * 100
            const y = ((maxValue - d.avgDiastolik) / maxValue) * 100
            return (
              <circle key={`dia-${i}`} cx={`${x}%`} cy={`${y}%`} r="4" fill="#3b82f6" />
            )
          })}
        </svg>

        {/* Legend */}
        <div className="absolute top-2 right-2 flex gap-4 bg-white p-2 rounded border">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span className="text-xs">Sistolik</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span className="text-xs">Diastolik</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white">
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/" className="p-3 hover:bg-white/50 rounded-full ml-2" aria-label="Kembali ke beranda">
            <ArrowLeft className="w-6 h-6" />
          </Link>
        </div>
        
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Riwayat Tensi Darah</h1>
          <p className="text-gray-600">Lihat grafik dan riwayat pengukuran tensi darah Anda</p>
        </div>

        {/* Filter Section */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Filter Tanggal
              </CardTitle>
              <Button
                variant="outline"
                onClick={() => setShowFilter(!showFilter)}
              >
                {showFilter ? 'Sembunyikan' : 'Tampilkan'}
              </Button>
            </div>
          </CardHeader>
          {showFilter && (
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 mb-2">
                    Dari Tanggal
                  </label>
                  <input
                    id="start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    max={endDate}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="end-date" className="block text-sm font-medium text-gray-700 mb-2">
                    Sampai Tanggal
                  </label>
                  <input
                    id="end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={exportToWhatsApp}
                    className="w-full bg-green-600 hover:bg-green-700"
                    disabled={filteredData.length === 0}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Kirim ke WA
                  </Button>
                </div>
              </div>
              <div className="mt-4 text-sm text-gray-600">
                📅 Maksimal rentang filter: 7 hari
              </div>
            </CardContent>
          )}
        </Card>

        {/* Chart Section */}
        {filteredData.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Grafik Tensi Darah
              </CardTitle>
              <CardDescription>
                Periode: {formatDate(startDate)} - {formatDate(endDate)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SimpleChart data={filteredData} />
            </CardContent>
          </Card>
        )}

        {/* Data Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Riwayat Pengukuran
            </CardTitle>
            <CardDescription>
              {filteredData.length > 0 
                ? `Menampilkan ${filteredData.length} hari dengan ${filteredData.reduce((sum, day) => sum + day.readings.length, 0)} pengukuran`
                : 'Belum ada data pengukuran dalam periode ini'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredData.length > 0 ? (
              <div className="space-y-4">
                {filteredData.map((day) => {
                  const status = getTensiStatus(day.avgSistolik, day.avgDiastolik)
                  return (
                    <div key={day.date} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-lg">{formatDate(day.date)}</h3>
                          <p className="text-sm text-gray-600">{day.readings.length} pengukuran</p>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-sm font-medium ${status.bg} ${status.color}`}>
                          {status.icon}
                          <span className="ml-1">{status.status}</span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                        <div className="text-center p-3 bg-red-50 rounded-lg">
                          <p className="text-sm text-gray-600">Sistolik</p>
                          <p className="text-2xl font-bold text-red-600">{day.avgSistolik}</p>
                          <p className="text-xs text-gray-500">mmHg</p>
                        </div>
                        <div className="text-center p-3 bg-blue-50 rounded-lg">
                          <p className="text-sm text-gray-600">Diastolik</p>
                          <p className="text-2xl font-bold text-blue-600">{day.avgDiastolik}</p>
                          <p className="text-xs text-gray-500">mmHg</p>
                        </div>
                        <div className="text-center p-3 bg-pink-50 rounded-lg">
                          <p className="text-sm text-gray-600">Nadi</p>
                          <p className="text-2xl font-bold text-pink-600">{day.avgNadi}</p>
                          <p className="text-xs text-gray-500">bpm</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-700">Detail Pengukuran:</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                          {day.readings.map((reading, index) => (
                            <div key={index} className="text-xs bg-gray-50 p-2 rounded">
                              <span className="text-gray-600">
                                {new Date(reading.timestamp).toLocaleTimeString('id-ID', { 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                })}
                              </span>
                              <span className="ml-2 font-medium">
                                {reading.sistolik}/{reading.diastolik} - {reading.nadi} bpm
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="bg-gray-100 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                  <Heart className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">Belum Ada Data</h3>
                <p className="text-gray-500 mb-4">
                  Belum ada pengukuran tensi dalam periode yang dipilih
                </p>
                <Button
                  onClick={() => window.location.href = '/Fasca'}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Activity className="w-4 h-4 mr-2" />
                  Catat Kesehatan
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
