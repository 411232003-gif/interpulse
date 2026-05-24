'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, Users, Target, Calendar, Download } from 'lucide-react'
import { collection, onSnapshot } from 'firebase/firestore'
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

export default function PartisipasiPage() {
  const [elderlyAttendance, setElderlyAttendance] = useState<Record<string, Record<string, number>>>({})
  const [residentsPerRW, setResidentsPerRW] = useState<Record<string, number>>({})
  const [selectedMonth, setSelectedMonth] = useState('april')
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false)

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
        const rw = d.rw
        if (rw && data[rw]) {
          const month = new Date(d.timestamp).toLocaleString('id-ID', { month: 'long' }).toLowerCase()
          if (data[rw][month] !== undefined) data[rw][month]++
        }
      })
      setElderlyAttendance(data)
    })
    return () => unsubscribe()
  }, [])

  // Fetch residents count per RW from attendance and healthReadings in selected month
  useEffect(() => {
    const attendanceRef = collection(db, 'attendance')
    const healthReadingsRef = collection(db, 'healthReadings')
    
    const counts: Record<string, number> = {}
    
    Object.keys(rwTargets).forEach(rw => {
      counts[rw] = 0
    })
    
    // Fetch and count from attendance in selected month
    const unsubscribeAttendance = onSnapshot(attendanceRef, (attendanceSnapshot) => {
      attendanceSnapshot.docs.forEach(doc => {
        const d = doc.data()
        const rw = d.rw
        const timestamp = d.timestamp
        if (rw && counts[rw] !== undefined && timestamp) {
          const month = new Date(timestamp).toLocaleString('id-ID', { month: 'long' }).toLowerCase()
          if (month === selectedMonth) {
            counts[rw]++
          }
        }
      })
      
      // Fetch and count from healthReadings in selected month
      const unsubscribeHealth = onSnapshot(healthReadingsRef, (healthSnapshot) => {
        healthSnapshot.docs.forEach(doc => {
          const d = doc.data()
          const rw = d.rw
          const timestamp = d.timestamp
          if (rw && counts[rw] !== undefined && timestamp) {
            const month = new Date(timestamp).toLocaleString('id-ID', { month: 'long' }).toLowerCase()
            if (month === selectedMonth) {
              counts[rw]++
            }
          }
        })
        setResidentsPerRW(counts)
      }, (error) => {
        console.error('Error fetching healthReadings:', error)
        setResidentsPerRW(counts)
      })
      
      return () => unsubscribeHealth()
    }, (error) => {
      console.error('Error fetching attendance:', error)
      setResidentsPerRW(counts)
    })
    
    return () => unsubscribeAttendance()
  }, [selectedMonth])

  const totalTarget = Object.values(residentsPerRW).reduce((a, b) => a + b, 0)
  const totalAttendance = Object.entries(elderlyAttendance).reduce((sum, [rw, months_data]) => {
    return sum + (months_data[selectedMonth] || 0)
  }, 0)
  const overallPctNum = totalTarget > 0 ? (totalAttendance / totalTarget) * 100 : 0
  const overallPct = Math.min(overallPctNum, 100).toFixed(1)

  const exportToPDF = () => {
    const doc = new jsPDF()

    doc.setFillColor(37, 99, 235)
    doc.rect(0, 0, 210, 40, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(22)
    doc.setFont('helvetica', 'bold')
    doc.text('Partisipasi Warga', 105, 20, { align: 'center' })
    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.text(`Kelurahan Duris Selatan - ${monthLabels[selectedMonth]} ${new Date().getFullYear()}`, 105, 30, { align: 'center' })

    doc.setTextColor(0, 0, 0)
    doc.setFontSize(10)
    doc.text(`Total Warga: ${totalTarget}`, 14, 50)
    doc.text(`Total Hadir: ${totalAttendance} (${overallPct}%)`, 14, 58)

    const tableData = Object.entries(rwTargets).map(([rw, _]) => {
      const attendance = elderlyAttendance[rw] || {}
      const count = attendance[selectedMonth] || 0
      const totalResidents = residentsPerRW[rw] || 0
      const pctNum = totalResidents > 0 ? Math.min((count / totalResidents) * 100, 100) : 0
      const pct = pctNum.toFixed(1)
      return [
        `RW ${rw}`,
        totalResidents,
        count,
        `${pct}%`,
        pctNum >= 100 ? 'Terpenuhi' : pctNum >= 80 ? 'Hampir' : 'Belum'
      ]
    })

    autoTable(doc, {
      startY: 65,
      head: [['RW', 'Total Warga', 'Hadir', 'Persentase', 'Status']],
      body: tableData,
      styles: {
        fontSize: 10,
        cellPadding: 4,
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

    doc.save(`partisipasi-${selectedMonth}.pdf`)
  }

  const exportToExcel = () => {
    const data = Object.entries(rwTargets).map(([rw, _]) => {
      const attendance = elderlyAttendance[rw] || {}
      const count = attendance[selectedMonth] || 0
      const totalResidents = residentsPerRW[rw] || 0
      const pct = totalResidents > 0 ? Math.round((count / totalResidents) * 100) : 0
      return {
        'RW': rw,
        'Total Warga': totalResidents,
        'Hadir': count,
        'Persentase': `${pct}%`,
        'Status': pct >= 100 ? 'Terpenuhi' : pct >= 80 ? 'Hampir' : 'Belum'
      }
    })

    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Partisipasi')

    ws['!cols'] = [
      { wch: 10 },
      { wch: 12 },
      { wch: 10 },
      { wch: 12 },
      { wch: 12 },
    ]

    XLSX.writeFile(wb, `partisipasi-${selectedMonth}.xlsx`)
  }

  const exportToWhatsApp = () => {
    let message = `📊 *PARTISIPASI WARGA POSBINDU*\n`
    message += `🏥 Kelurahan Duris Selatan\n`
    message += `📅 ${monthLabels[selectedMonth]} ${new Date().getFullYear()}\n\n`
    message += `━━━━━━━━━━━━━━━━━━━━\n\n`
    message += `📈 *RINGKASAN DATA*\n`
    message += `• Total Warga: ${totalTarget}\n`
    message += `• Total Hadir: ${totalAttendance}\n`
    message += `• Capaian: ${overallPct}%\n\n`
    message += `━━━━━━━━━━━━━━━━━━━━\n\n`
    message += `📋 *DATA DETAIL PER RW*\n\n`

    Object.entries(rwTargets).forEach(([rw, _]) => {
      const attendance = elderlyAttendance[rw] || {}
      const count = attendance[selectedMonth] || 0
      const totalResidents = residentsPerRW[rw] || 0
      const pct = totalResidents > 0 ? Math.round((count / totalResidents) * 100) : 0
      message += `RW ${rw}:\n`
      message += `   Total Warga: ${totalResidents} | Hadir: ${count}\n`
      message += `   Capaian: ${pct}%\n\n`
    })

    message += `━━━━━━━━━━━━━━━━━━━━\n`
    message += `📱 InterPulse - Aplikasi Kesehatan Terpadu\n`

    const encodedMessage = encodeURIComponent(message)
    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank')
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-teal-600 text-white p-6 rounded-b-3xl shadow-lg">
        <div className="flex items-center gap-3 mb-1">
          <Link href="/" className="text-green-200 hover:text-white text-sm">← Beranda</Link>
        </div>
        <h1 className="text-2xl font-bold">Partisipasi</h1>
        <p className="text-green-100 text-sm mt-1">Trafik kehadiran warga Posbindu</p>
      </div>

      <div className="px-4 mt-6 space-y-4">
        {/* Month Filter */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-green-600" />
            <span className="font-semibold text-gray-800 text-sm">Pilih Bulan</span>
          </div>
          <div className="grid grid-cols-6 gap-1.5">
            {months.map(m => (
              <button
                key={m}
                onClick={() => setSelectedMonth(m)}
                className={`py-1.5 rounded-lg text-xs font-medium transition-all ${selectedMonth === m ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {monthLabels[m]}
              </button>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div className="bg-gradient-to-r from-green-600 to-teal-600 rounded-2xl p-4 text-white">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Ringkasan - {selectedMonth.charAt(0).toUpperCase() + selectedMonth.slice(1)}</h3>
            <div className="relative">
              <button
                onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
                className="bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
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
            <div>
              <p className="text-green-100 text-xs">Total Hadir</p>
              <p className="text-2xl font-bold">{totalAttendance}</p>
            </div>
            <div>
              <p className="text-green-100 text-xs">Total Warga</p>
              <p className="text-2xl font-bold">{totalTarget}</p>
            </div>
            <div>
              <p className="text-green-100 text-xs">Capaian</p>
              <p className="text-2xl font-bold">{overallPct}%</p>
            </div>
          </div>
          {/* Overall progress bar */}
          <div className="mt-3">
            <div className="h-2 bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-500"
                style={{ width: `${Math.min(overallPctNum, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Per-RW Cards */}
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <Users className="w-4 h-4 text-green-600" />
            Partisipasi per RW
          </h3>
          {Object.entries(rwTargets).sort(([a], [b]) => parseInt(a) - parseInt(b)).map(([rw, _]) => {
            const hadir = elderlyAttendance[rw]?.[selectedMonth] || 0
            const totalResidents = residentsPerRW[rw] || 0
            const pctNum = totalResidents > 0 ? Math.min((hadir / totalResidents) * 100, 100) : 0
            const pct = pctNum.toFixed(1)
            const barColor = pctNum >= 80 ? 'bg-green-500' : pctNum >= 60 ? 'bg-yellow-500' : 'bg-red-500'
            const badgeColor = pctNum >= 80 ? 'bg-green-100 text-green-700' : pctNum >= 60 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
            return (
              <div key={rw} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center">
                      <Target className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">RW {rw}</p>
                      <p className="text-xs text-gray-500">{hadir} / {totalResidents} warga</p>
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

        {/* Trend info */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <span className="font-semibold text-gray-800 text-sm">Trafik Kehadiran</span>
          </div>
          <div className="grid grid-cols-6 gap-1">
            {months.map(m => {
              const total = Object.entries(elderlyAttendance).reduce((s, [, d]) => s + (d[m] || 0), 0)
              const maxVal = Math.max(...months.map(mo => Object.entries(elderlyAttendance).reduce((s, [, d]) => s + (d[mo] || 0), 0)), 1)
              const height = Math.round((total / maxVal) * 60)
              return (
                <div key={m} className="flex flex-col items-center gap-1">
                  <span className="text-[9px] text-gray-500">{total}</span>
                  <div className="w-full bg-gray-100 rounded-t" style={{ height: 64 }}>
                    <div
                      className={`w-full rounded-t transition-all duration-500 ${m === selectedMonth ? 'bg-green-500' : 'bg-green-200'}`}
                      style={{ height, marginTop: 64 - height }}
                    />
                  </div>
                  <span className="text-[8px] text-gray-400">{monthLabels[m]}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
