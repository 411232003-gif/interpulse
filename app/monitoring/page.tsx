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
  const [healthReadingsDetails, setHealthReadingsDetails] = useState<Record<string, any[]>>({})
  const [residentsData, setResidentsData] = useState<Record<string, any>>({})
  const [selectedMonth, setSelectedMonth] = useState('april')
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false)
  const [rwExportDropdown, setRwExportDropdown] = useState<string | null>(null)
  
  // Filters for health examination chart
  const [filterRW, setFilterRW] = useState<string>('all')
  const [filterRT, setFilterRT] = useState<string>('all')
  const [filterHealthType, setFilterHealthType] = useState<string>('kolesterol')
  const [filterDate, setFilterDate] = useState<string>('')
  
  // Filters for data table
  const [tableFilterRW, setTableFilterRW] = useState<string>('all')
  const [tableFilterRT, setTableFilterRT] = useState<string>('all')
  const [tableSearchTerm, setTableSearchTerm] = useState<string>('')

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

  // Fetch residents data for names and NIK
  useEffect(() => {
    const residentsRef = collection(db, 'residents')
    const unsubscribe = onSnapshot(residentsRef, (snapshot) => {
      const data: Record<string, any> = {}
      const nameMap: Record<string, any> = {} // For name-based matching
      snapshot.docs.forEach(doc => {
        const d = doc.data()
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
    return () => unsubscribe()
  }, [])

  // Fetch TB/BB data
  const [tbbbData, setTbbbData] = useState<Record<string, any[]>>({})
  useEffect(() => {
    const tbbbRef = collection(db, 'tbbb')
    const unsubscribe = onSnapshot(tbbbRef, (snapshot) => {
      const data: Record<string, any[]> = {}
      Object.keys(rwTargets).forEach(rw => {
        data[rw] = []
      })
      snapshot.docs.forEach(doc => {
        const d = doc.data()
        let rw = d.rw
        if (rw !== undefined) {
          rw = String(rw).padStart(2, '0')
        }
        if (rw && data[rw]) {
          data[rw].push({ ...d, id: doc.id })
        }
      })
      setTbbbData(data)
    })
    return () => unsubscribe()
  }, [])

  // Health status calculation functions
  const getHealthStatus = (type: string, value: number) => {
    if (type === 'kolesterol') {
      if (value < 200) return { status: 'Normal', color: 'bg-green-500', textColor: 'text-green-700' }
      if (value < 240) return { status: 'Batas', color: 'bg-yellow-500', textColor: 'text-yellow-700' }
      return { status: 'Tinggi', color: 'bg-red-500', textColor: 'text-red-700' }
    }
    if (type === 'tensi') {
      if (value < 120) return { status: 'Normal', color: 'bg-green-500', textColor: 'text-green-700' }
      if (value < 140) return { status: 'Batas', color: 'bg-yellow-500', textColor: 'text-yellow-700' }
      return { status: 'Tinggi', color: 'bg-red-500', textColor: 'text-red-700' }
    }
    if (type === 'guladarah') {
      if (value < 100) return { status: 'Normal', color: 'bg-green-500', textColor: 'text-green-700' }
      if (value < 126) return { status: 'Batas', color: 'bg-yellow-500', textColor: 'text-yellow-700' }
      return { status: 'Tinggi', color: 'bg-red-500', textColor: 'text-red-700' }
    }
    if (type === 'asamurat') {
      if (value < 7) return { status: 'Normal', color: 'bg-green-500', textColor: 'text-green-700' }
      if (value < 9) return { status: 'Batas', color: 'bg-yellow-500', textColor: 'text-yellow-700' }
      return { status: 'Tinggi', color: 'bg-red-500', textColor: 'text-red-700' }
    }
    return { status: 'Normal', color: 'bg-green-500', textColor: 'text-green-700' }
  }

  // Calculate health status distribution for filtered data
  const getHealthStatusDistribution = () => {
    const distribution = { rendah: 0, normal: 0, batas: 0, tinggi: 0 }
    
    Object.entries(healthReadingsDetails).forEach(([rw, readings]) => {
      if (filterRW !== 'all' && rw !== filterRW) return
      
      readings.forEach(reading => {
        if (reading.type !== filterHealthType) return
        
        const month = new Date(reading.timestamp).toLocaleString('id-ID', { month: 'long' }).toLowerCase()
        if (month !== selectedMonth) return
        
        const value = reading.value || 0
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

  // Get filtered table data
  const getTableData = () => {
    const data: any[] = []
    
    Object.entries(healthReadingsDetails).forEach(([rw, readings]) => {
      // Filter by RW
      if (tableFilterRW !== 'all' && rw !== tableFilterRW) return
      
      readings.forEach(reading => {
        const resident = residentsData[reading.userId] || residentsData[reading.nik] || {}
        
        // Filter by RT
        if (tableFilterRT !== 'all' && resident.rt !== tableFilterRT) return
        
        // Filter by search term
        if (tableSearchTerm) {
          const searchLower = tableSearchTerm.toLowerCase()
          const matchesName = resident.nama?.toLowerCase().includes(searchLower)
          const matchesNIK = resident.nik?.includes(searchLower)
          if (!matchesName && !matchesNIK) return
        }
        
        data.push({
          nik: resident.nik || reading.nik || '-',
          nama: resident.nama || reading.nama || '-',
          tglLahir: resident.birthDate || '-',
          umur: resident.umur || '-',
          alamat: resident.alamat || '-',
          jenisKelamin: resident.jenisKelamin || '-',
          tb: tbbbData[resident.nik]?.tb || '-',
          bb: tbbbData[resident.nik]?.bb || '-',
          lp: tbbbData[resident.nik]?.lp || '-',
          td: reading.type === 'tensi' ? reading.value : '-',
          gds: reading.type === 'guladarah' ? reading.value : '-',
          imt: tbbbData[resident.nik] ? (tbbbData[resident.nik].bb / ((tbbbData[resident.nik].tb / 100) ** 2)).toFixed(1) : '-',
          ua: reading.type === 'asamurat' ? reading.value : '-',
          col: reading.type === 'kolesterol' ? reading.value : '-',
          nadi: reading.nadi || '-',
        })
      })
    })
    
    return data
  }

  // Fetch detailed health readings for per-RW export
  useEffect(() => {
    const healthReadingsRef = collection(db, 'healthReadings')
    const unsubscribe = onSnapshot(healthReadingsRef, (snapshot) => {
      const data: Record<string, any[]> = {}
      
      Object.keys(rwTargets).forEach(rw => {
        data[rw] = []
      })
      
      snapshot.docs.forEach(doc => {
        const d = doc.data()
        if (!d || !d.timestamp) return
        let rw = d.rw
        
        // Normalize RW to match rwTargets format (01, 02, etc.)
        if (rw !== undefined) {
          rw = String(rw).padStart(2, '0')
        }
        
        if (rw && data[rw]) {
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

  // Per-RW export functions
  const exportRWToPDF = (rw: string) => {
    const doc = new jsPDF()
    
    // Header
    doc.setFillColor(79, 70, 229)
    doc.rect(0, 0, 210, 40, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(22)
    doc.setFont('helvetica', 'bold')
    doc.text(`Pemeriksaan Kesehatan RW ${rw}`, 105, 20, { align: 'center' })
    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.text(`Kelurahan Duris Selatan - ${monthLabels[selectedMonth]} ${new Date().getFullYear()}`, 105, 30, { align: 'center' })
    
    // Filter data for selected RW and month
    const rwData = healthReadingsDetails[rw] || []
    const monthData = rwData.filter(d => {
      const month = new Date(d.timestamp).toLocaleString('id-ID', { month: 'long' }).toLowerCase()
      return month === selectedMonth
    })
    
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(10)
    doc.text(`Total Pemeriksaan: ${monthData.length}`, 14, 50)
    
    // Table data - merge with residents data (no grouping, each reading as separate row)
    const tableData = monthData.map(d => {
      const resident = residentsData[d.userId] || residentsData[d.nik] || residentsData[d.residentId] || 
                      (d.nama ? residentsData[d.nama.toLowerCase()] : {}) || 
                      (d.userName ? residentsData[d.userName.toLowerCase()] : {}) || {}
      return [
        resident.nama || d.nama || d.userName || '-',
        resident.nik || d.nik || '-',
        d.type || '-',
        d.timestamp ? new Date(d.timestamp).toLocaleDateString('id-ID') : '-'
      ]
    })
    
    autoTable(doc, {
      startY: 55,
      head: [['Nama', 'NIK', 'Jenis Pemeriksaan', 'Tanggal']],
      body: tableData,
      styles: {
        fontSize: 9,
        cellPadding: 3,
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
    
    doc.save(`pemeriksaan-rw-${rw}-${selectedMonth}.pdf`)
  }

  const exportRWToExcel = (rw: string) => {
    const rwData = healthReadingsDetails[rw] || []
    const monthData = rwData.filter(d => {
      const month = new Date(d.timestamp).toLocaleString('id-ID', { month: 'long' }).toLowerCase()
      return month === selectedMonth
    })
    
    // No grouping, each reading as separate row
    const data = monthData.map(d => {
      const resident = residentsData[d.userId] || residentsData[d.nik] || residentsData[d.residentId] || 
                      (d.nama ? residentsData[d.nama.toLowerCase()] : {}) || 
                      (d.userName ? residentsData[d.userName.toLowerCase()] : {}) || {}
      return {
        'Nama': resident.nama || d.nama || d.userName || '-',
        'NIK': resident.nik || d.nik || '-',
        'Jenis Pemeriksaan': d.type || '-',
        'Tanggal': d.timestamp ? new Date(d.timestamp).toLocaleDateString('id-ID') : '-',
        'RW': d.rw || '-'
      }
    })
    
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, `RW ${rw}`)
    
    ws['!cols'] = [
      { wch: 25 },
      { wch: 18 },
      { wch: 18 },
      { wch: 15 },
      { wch: 10 },
    ]
    
    XLSX.writeFile(wb, `pemeriksaan-rw-${rw}-${selectedMonth}.xlsx`)
  }

  const exportRWToWhatsApp = (rw: string) => {
    const rwData = healthReadingsDetails[rw] || []
    const monthData = rwData.filter(d => {
      const month = new Date(d.timestamp).toLocaleString('id-ID', { month: 'long' }).toLowerCase()
      return month === selectedMonth
    })
    
    let message = `📊 *PEMERIKSAAN KESEHATAN RW ${rw}*\n`
    message += `🏥 Kelurahan Duris Selatan\n`
    message += `📅 ${monthLabels[selectedMonth]} ${new Date().getFullYear()}\n\n`
    message += `━━━━━━━━━━━━━━━━━━━━\n\n`
    message += `📈 *RINGKASAN DATA*\n`
    message += `• Total Pemeriksaan: ${monthData.length}\n\n`
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

        {/* Tables Section */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-600" />
                <span className="font-semibold text-gray-800 text-sm">Rekapitulasi Hasil Pemeriksaan</span>
              </div>
              <button className="bg-gray-800 hover:bg-gray-900 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors">
                Export
              </button>
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
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: seg.color }}></div>
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
                      <td className="px-3 py-2 border-t">Total Pemeriksaan</td>
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
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                <span className="font-semibold text-gray-800 text-sm">Rekapitulasi Partisipasi Warga</span>
              </div>
              <button className="bg-gray-800 hover:bg-gray-900 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors">
                Export
              </button>
            </div>
            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-gray-200">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b">Wilayah</th>
                    <th className="px-3 py-2 text-center font-semibold text-gray-700 border-b">Hadir / Partisipasi</th>
                    <th className="px-3 py-2 text-center font-semibold text-gray-700 border-b">Total Target Warga</th>
                    <th className="px-3 py-2 text-center font-semibold text-gray-700 border-b">Capaian</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(rwTargets).sort(([a], [b]) => parseInt(a) - parseInt(b)).map(([rw, target]) => {
                    const attendance = attendanceData[rw]?.[selectedMonth] || 0
                    const percentage = target > 0 ? ((attendance / target) * 100).toFixed(0) : '0'
                    const percentageNum = parseFloat(percentage)
                    const colorClass = percentageNum >= 80 ? 'text-green-600' : percentageNum >= 60 ? 'text-yellow-600' : 'text-red-600'
                    return (
                      <tr key={rw} className="border-b">
                        <td className="px-3 py-2">RW {rw}</td>
                        <td className="px-3 py-2 text-center">{attendance}</td>
                        <td className="px-3 py-2 text-center">{target}</td>
                        <td className={`px-3 py-2 text-center font-bold ${colorClass}`}>{percentage}%</td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot className="bg-gray-50 font-bold">
                  <tr>
                    <td className="px-3 py-2 border-t">Total Kelurahan</td>
                    <td className="px-3 py-2 text-center border-t">
                      {Object.entries(rwTargets).reduce((sum, [rw]) => sum + (attendanceData[rw]?.[selectedMonth] || 0), 0)}
                    </td>
                    <td className="px-3 py-2 text-center border-t">
                      {Object.values(rwTargets).reduce((sum, target) => sum + target, 0)}
                    </td>
                    <td className="px-3 py-2 text-center border-t">
                      {(() => {
                        const totalAttendance = Object.entries(rwTargets).reduce((sum, [rw]) => sum + (attendanceData[rw]?.[selectedMonth] || 0), 0)
                        const totalTarget = Object.values(rwTargets).reduce((sum, target) => sum + target, 0)
                        return totalTarget > 0 ? ((totalAttendance / totalTarget) * 100).toFixed(0) : '0'
                      })()}%
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Table 3: Data Kesehatan Warga */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-600" />
                <span className="font-semibold text-gray-800 text-sm">Data Kesehatan Warga</span>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-gray-600">RW</label>
                  <select
                    value={tableFilterRW}
                    onChange={(e) => setTableFilterRW(e.target.value)}
                    className="text-sm border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    title="Filter RW Tabel"
                  >
                    <option value="all">Semua RW</option>
                    {Object.keys(rwTargets).sort((a, b) => parseInt(a) - parseInt(b)).map(rw => (
                      <option key={rw} value={rw}>RW {rw}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-gray-600">RT</label>
                  <select
                    value={tableFilterRT}
                    onChange={(e) => setTableFilterRT(e.target.value)}
                    className="text-sm border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    title="Filter RT Tabel"
                  >
                    <option value="all">Semua RT</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(rt => (
                      <option key={rt} value={String(rt)}>RT {rt}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-gray-600">Nama / NIK</label>
                  <input
                    type="text"
                    value={tableSearchTerm}
                    onChange={(e) => setTableSearchTerm(e.target.value)}
                    placeholder="Cari data warga..."
                    className="text-sm border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-32"
                  />
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
                  {getTableData().slice(0, 10).map((row, i) => (
                    <tr key={i} className="border-b hover:bg-gray-50">
                      <td className="px-2 py-2 font-medium">{row.nama}</td>
                      <td className="px-2 py-2">{row.nik}</td>
                      <td className="px-2 py-2">{row.tglLahir}</td>
                      <td className="px-2 py-2">{row.umur}</td>
                      <td className="px-2 py-2">{row.alamat}</td>
                      <td className="px-2 py-2">{row.jenisKelamin}</td>
                      <td className="px-2 py-2">{row.tb}</td>
                      <td className="px-2 py-2">{row.bb}</td>
                      <td className="px-2 py-2">{row.lp}</td>
                      <td className="px-2 py-2">{row.td}</td>
                      <td className="px-2 py-2">{row.gds}</td>
                      <td className="px-2 py-2">{row.imt}</td>
                      <td className="px-2 py-2">{row.ua}</td>
                      <td className="px-2 py-2">{row.col}</td>
                      <td className="px-2 py-2">{row.nadi}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
      </div>
    </div>
  )
}
