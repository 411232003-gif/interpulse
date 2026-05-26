'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp, Search, Filter, AlertCircle, Plus, Edit, Trash2, Activity, Users, Download, TrendingUp, Heart, Droplet, Thermometer, Target } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, where, orderBy, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import Link from 'next/link'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

const rwTargets: Record<string, number> = {
  '01': 32, '02': 65, '03': 60, '04': 60, '05': 70, '06': 33, '07': 40, '08': 35, '09': 45, '10': 38
}

const months = ['januari','februari','maret','april','mei','juni','juli','agustus','september','oktober','november','desember']
const monthLabels: Record<string, string> = {
  januari:'Jan', februari:'Feb', maret:'Mar', april:'Apr', mei:'Mei', juni:'Jun',
  juli:'Jul', agustus:'Agu', september:'Sep', oktober:'Okt', november:'Nov', desember:'Des'
}

export default function MonitoringPage() {
  const { isAdmin } = useAuth()
  const [healthReadings, setHealthReadings] = useState<Record<string, Record<string, number>>>({})
  const [healthTypeDistribution, setHealthTypeDistribution] = useState<Record<string, number>>({})
  const [attendanceData, setAttendanceData] = useState<Record<string, Record<string, number>>>({})
  const [selectedMonth, setSelectedMonth] = useState('april')
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false)

  // Fetch health readings data from healthReadings collection
  useEffect(() => {
    const healthReadingsRef = collection(db, 'healthReadings')
    const unsubscribe = onSnapshot(healthReadingsRef, (snapshot) => {
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
          if (data[rw][month] !== undefined) data[rw][month]++
        }
      })

      setHealthReadings(data)
    })
    return () => unsubscribe()
  }, [])

  // Calculate health type distribution for selected month
  useEffect(() => {
    const typeDist: Record<string, number> = { tensi: 0, kolesterol: 0, asamurat: 0, guladarah: 0 }

    Object.entries(healthReadings).forEach(([rw, monthsData]) => {
      const count = monthsData[selectedMonth] || 0
      // For simplicity, distribute the count evenly among types if we don't have type data per month
      // In a real implementation, you'd need to track type per reading
    })

    // For now, calculate from all readings (you may need to modify data structure to track type per month)
    const healthReadingsRef = collection(db, 'healthReadings')
    const unsubscribe = onSnapshot(healthReadingsRef, (snapshot) => {
      const filteredTypeDist: Record<string, number> = { tensi: 0, kolesterol: 0, asamurat: 0, guladarah: 0 }

      snapshot.docs.forEach(doc => {
        const d = doc.data()
        if (!d || !d.timestamp) return
        const type = d.type
        const month = new Date(d.timestamp).toLocaleString('id-ID', { month: 'long' }).toLowerCase()
        if (type && filteredTypeDist[type] !== undefined && month === selectedMonth) {
          filteredTypeDist[type]++
        }
      })

      setHealthTypeDistribution(filteredTypeDist)
    })
    return () => unsubscribe()
  }, [selectedMonth])

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
          if (data[rw][month] !== undefined) data[rw][month]++
        }
      })
      
      setAttendanceData(data)
    })
    return () => unsubscribe()
  }, [])

  const totalReadings = Object.entries(healthReadings).reduce((sum, [rw, months_data]) => {
    return sum + (months_data[selectedMonth] || 0)
  }, 0)

  const totalAttendance = Object.entries(attendanceData).reduce((sum, [rw, months_data]) => {
    return sum + (months_data[selectedMonth] || 0)
  }, 0)

  const totalTarget = Object.values(rwTargets).reduce((sum, target) => sum + target, 0)
  const attendancePercentage = totalTarget > 0 ? ((totalAttendance / totalTarget) * 100).toFixed(1) : '0'
  const healthPercentage = totalTarget > 0 ? ((totalReadings / totalTarget) * 100).toFixed(1) : '0'

  const exportToPDF = () => {
    const doc = new jsPDF()

    // Header
    doc.setFillColor(79, 70, 229)
    doc.rect(0, 0, 210, 40, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(22)
    doc.setFont('helvetica', 'bold')
    doc.text('Monitoring Kesehatan', 105, 20, { align: 'center' })
    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.text(`Kelurahan Duris Selatan - ${monthLabels[selectedMonth]} ${new Date().getFullYear()}`, 105, 30, { align: 'center' })

    doc.setTextColor(0, 0, 0)
    doc.setFontSize(10)
    doc.text(`Total Pemeriksaan: ${totalReadings}`, 14, 50)

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

    const tableData = Object.entries(rwTargets).map(([rw, target]) => {
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
      head: [['RW', 'Jumlah Pemeriksaan', 'Target', 'Persentase']],
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
      head: [['Bulan', 'Total Pemeriksaan']],
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
    const rwData = Object.entries(rwTargets).map(([rw, target]) => {
      const readings = healthReadings[rw] || {}
      const count = readings[selectedMonth] || 0
      const percentage = target > 0 ? ((count / target) * 100).toFixed(2) : '0'
      return {
        'RW': rw,
        'Jumlah Pemeriksaan': count,
        'Target': target,
        'Persentase (%)': parseFloat(percentage),
        'Status': count >= target ? 'Tercapai' : 'Belum Tercapai'
      }
    })

    // Sheet 2: Monthly Trend Data
    const monthlyData = months.map(m => {
      const total = Object.entries(healthReadings).reduce((s, [, d]) => s + (d[m] || 0), 0)
      const totalTarget = Object.values(rwTargets).reduce((s, t) => s + t, 0)
      const percentage = totalTarget > 0 ? ((total / totalTarget) * 100).toFixed(2) : '0'
      return {
        'Bulan': monthLabels[m],
        'Total Pemeriksaan': total,
        'Total Target': totalTarget,
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
    let message = `📊 *MONITORING KESEHATAN*\n`
    message += `🏥 Kelurahan Duris Selatan\n`
    message += `📅 ${monthLabels[selectedMonth]} ${new Date().getFullYear()}\n\n`
    message += `━━━━━━━━━━━━━━━━━━━━\n\n`
    message += `📈 *RINGKASAN DATA*\n`
    message += `• Total Pemeriksaan: ${totalReadings}\n\n`
    
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
    Object.entries(rwTargets).sort(([a], [b]) => parseInt(a) - parseInt(b)).forEach(([rw, target]) => {
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
    
    message += `\n━━━━━━━━━━━━━━━━━━━━\n`
    message += `📱 InterPulse - Aplikasi Kesehatan Terpadu\n`

    const encodedMessage = encodeURIComponent(message)
    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank')
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 rounded-b-3xl shadow-lg">
        <div className="flex items-center gap-3 mb-1">
          <Link href="/monev-posbindu" className="text-indigo-200 hover:text-white text-sm">← Monev Posbindu</Link>
        </div>
        <h1 className="text-2xl font-bold">Laporan</h1>
        <p className="text-indigo-100 text-sm mt-1">Pantau data kesehatan warga</p>
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

        {/* 3 Modern Charts */}
        <div className="space-y-4">
          {/* Chart 1: Circular Health Type Distribution */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-600" />
                <span className="font-semibold text-gray-800 text-sm">Distribusi Jenis Pemeriksaan</span>
              </div>
              <span className="text-xs text-gray-500">Total: {Object.values(healthTypeDistribution).reduce((a, b) => a + b, 0)}</span>
            </div>
            <div className="flex items-center justify-center gap-6">
              {/* Circular Progress Chart */}
              <div className="relative w-40 h-40">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  {/* Background circle */}
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="12" />
                  {/* Tensi segment */}
                  {healthTypeDistribution.tensi > 0 && (
                    <circle
                      cx="50" cy="50" r="40"
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="12"
                      strokeDasharray={`${(healthTypeDistribution.tensi / Object.values(healthTypeDistribution).reduce((a, b) => a + b, 0)) * 251.2} 251.2`}
                      strokeLinecap="round"
                    />
                  )}
                  {/* Kolesterol segment */}
                  {healthTypeDistribution.kolesterol > 0 && (
                    <circle
                      cx="50" cy="50" r="40"
                      fill="none"
                      stroke="#eab308"
                      strokeWidth="12"
                      strokeDasharray={`${(healthTypeDistribution.kolesterol / Object.values(healthTypeDistribution).reduce((a, b) => a + b, 0)) * 251.2} 251.2`}
                      strokeDashoffset={`-${(healthTypeDistribution.tensi / Object.values(healthTypeDistribution).reduce((a, b) => a + b, 0)) * 251.2}`}
                      strokeLinecap="round"
                    />
                  )}
                  {/* Asam Urat segment */}
                  {healthTypeDistribution.asamurat > 0 && (
                    <circle
                      cx="50" cy="50" r="40"
                      fill="none"
                      stroke="#a855f7"
                      strokeWidth="12"
                      strokeDasharray={`${(healthTypeDistribution.asamurat / Object.values(healthTypeDistribution).reduce((a, b) => a + b, 0)) * 251.2} 251.2`}
                      strokeDashoffset={`-${((healthTypeDistribution.tensi + healthTypeDistribution.kolesterol) / Object.values(healthTypeDistribution).reduce((a, b) => a + b, 0)) * 251.2}`}
                      strokeLinecap="round"
                    />
                  )}
                  {/* Gula Darah segment */}
                  {healthTypeDistribution.guladarah > 0 && (
                    <circle
                      cx="50" cy="50" r="40"
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="12"
                      strokeDasharray={`${(healthTypeDistribution.guladarah / Object.values(healthTypeDistribution).reduce((a, b) => a + b, 0)) * 251.2} 251.2`}
                      strokeDashoffset={`-${((healthTypeDistribution.tensi + healthTypeDistribution.kolesterol + healthTypeDistribution.asamurat) / Object.values(healthTypeDistribution).reduce((a, b) => a + b, 0)) * 251.2}`}
                      strokeLinecap="round"
                    />
                  )}
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-800">{Object.values(healthTypeDistribution).reduce((a, b) => a + b, 0)}</p>
                    <p className="text-[10px] text-gray-500">Total</p>
                  </div>
                </div>
              </div>
              {/* Legend */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span className="text-xs text-gray-600">Tekanan Darah: {healthTypeDistribution.tensi}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <span className="text-xs text-gray-600">Kolesterol: {healthTypeDistribution.kolesterol}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                  <span className="text-xs text-gray-600">Asam Urat: {healthTypeDistribution.asamurat}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span className="text-xs text-gray-600">Gula Darah: {healthTypeDistribution.guladarah}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Chart 2: Per-RW Cards (like Partisipasi) */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-600" />
              Pemeriksaan per RW
            </h3>
            {Object.entries(rwTargets).sort(([a], [b]) => parseInt(a) - parseInt(b)).map(([rw, target]) => {
              const readings = healthReadings[rw] || {}
              const count = readings[selectedMonth] || 0
              const pctNum = target > 0 ? Math.min((count / target) * 100, 100) : 0
              const pct = pctNum.toFixed(1)
              const barColor = pctNum >= 80 ? 'bg-green-500' : pctNum >= 60 ? 'bg-yellow-500' : 'bg-red-500'
              const badgeColor = pctNum >= 80 ? 'bg-green-100 text-green-700' : pctNum >= 60 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
              return (
                <div key={rw} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center">
                        <Target className="w-4 h-4 text-indigo-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">RW {rw}</p>
                        <p className="text-xs text-gray-500">{count} / {target} PMT</p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${badgeColor}`}>{pct}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${barColor} rounded-full transition-all duration-500`}
                      style={{ width: `${Math.min(pctNum, 100)}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Chart 3: Per-RW Line Chart */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-600" />
                <span className="font-semibold text-gray-800 text-sm">Trafik Pemeriksaan per RW</span>
              </div>
              <span className="text-xs text-gray-500">Bulan: {monthLabels[selectedMonth]}</span>
            </div>
            <div className="relative h-40">
              {/* Grid lines */}
              <div className="absolute inset-0 flex flex-col justify-between">
                <div className="border-b border-gray-200"></div>
                <div className="border-b border-gray-200"></div>
                <div className="border-b border-gray-200"></div>
                <div className="border-b border-gray-200"></div>
              </div>
              {/* Chart */}
              <svg className="w-full h-full" viewBox="0 0 300 150" preserveAspectRatio="none">
                {/* Area fill */}
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {(() => {
                  const rwList = Object.keys(rwTargets).sort((a, b) => parseInt(a) - parseInt(b))
                  const dataPoints = rwList.map((rw, i) => {
                    const readings = healthReadings[rw] || {}
                    const count = readings[selectedMonth] || 0
                    const maxVal = Math.max(...rwList.map(r => (healthReadings[r] || {})[selectedMonth] || 0), 1)
                    const y = 140 - ((count / maxVal) * 120)
                    const x = (i / (rwList.length - 1)) * 280 + 10
                    return { x, y, count, rw }
                  })
                  const pathD = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
                  const areaD = `${pathD} L ${dataPoints[dataPoints.length - 1].x} 140 L ${dataPoints[0].x} 140 Z`
                  return (
                    <g>
                      <path d={areaD} fill="url(#gradient)" />
                      <path d={pathD} fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="5,5" />
                      {dataPoints.map((p, i) => (
                        <g key={i}>
                          <circle cx={p.x} cy={p.y} r={4} fill="#6366f1" stroke="#fff" strokeWidth="2" />
                          <text x={p.x} y={p.y - 10} textAnchor="middle" fontSize="8" fill="#6b7280">{p.count}</text>
                        </g>
                      ))}
                    </g>
                  )
                })()}
              </svg>
              {/* X-axis labels */}
              <div className="absolute bottom-0 left-0 right-0 flex justify-between px-1">
                {Object.keys(rwTargets).sort((a, b) => parseInt(a) - parseInt(b)).map((rw) => (
                  <span key={rw} className="text-[8px] text-gray-400">
                    RW {rw}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
