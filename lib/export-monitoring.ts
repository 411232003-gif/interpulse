import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { db } from './firebase'
import { collection, query, where, getDocs } from 'firebase/firestore'

// Category colors and categorization functions
export const categoryColors: Record<string, { bg: string; text: string; rgb: [number, number, number] }> = {
  rendah: { bg: '#DBEAFE', text: '#1E40AF', rgb: [219, 234, 254] },
  normal: { bg: '#DCFCE7', text: '#15803D', rgb: [220, 252, 231] },
  batasTinggi: { bg: '#FEF3C7', text: '#B45309', rgb: [254, 243, 199] },
  tinggi: { bg: '#FEE2E2', text: '#991B1B', rgb: [254, 226, 226] }
}

// Get category for health readings
export function getCategory(type: string, value: number | string): 'rendah' | 'normal' | 'batasTinggi' | 'tinggi' {
  if (typeof value === 'string') value = parseFloat(value)
  
  switch (type) {
    case 'tensi':
      if (value < 120) return 'normal'
      if (value < 140) return 'batasTinggi'
      return 'tinggi'
    case 'guladarah':
    case 'gds':
      if (value < 100) return 'normal'
      if (value < 126) return 'batasTinggi'
      return 'tinggi'
    case 'kolesterol':
      if (value < 200) return 'normal'
      if (value < 240) return 'batasTinggi'
      return 'tinggi'
    case 'asamurat':
      if (value < 6) return 'rendah'
      if (value < 7) return 'normal'
      if (value < 8.5) return 'batasTinggi'
      return 'tinggi'
    case 'imt':
      if (value < 18.5) return 'rendah'
      if (value < 25) return 'normal'
      if (value < 30) return 'batasTinggi'
      return 'tinggi'
    case 'nadi':
      if (value < 60) return 'rendah'
      if (value < 100) return 'normal'
      if (value < 120) return 'batasTinggi'
      return 'tinggi'
    default:
      return 'normal'
  }
}

// Fetch all residents data
export async function fetchResidents(kelurahan: string) {
  const residentsRef = collection(db, 'residents')
  const q = query(residentsRef, where('kelurahan', '==', kelurahan))
  const snapshot = await getDocs(q)
  
  return snapshot.docs.map(doc => {
    const data = doc.data()
    return {
      id: doc.id,
      nama: data.nama || '',
      nik: data.nik || '',
      rw: data.rw || '',
      rt: data.rt || '',
      birthDate: data.birthDate || '',
      umur: data.umur || '',
      alamat: data.alamat || '',
      jenisKelamin: data.jenisKelamin || '',
      kelurahan: data.kelurahan || ''
    }
  }).sort((a, b) => parseInt(a.rw) - parseInt(b.rw))
}

// Fetch health readings
export async function fetchHealthReadings(kelurahan: string) {
  const healthRef = collection(db, 'healthReadings')
  const q = query(healthRef, where('kelurahan', '==', kelurahan))
  const snapshot = await getDocs(q)
  
  return snapshot.docs.map(doc => {
    const data = doc.data()
    return {
      id: doc.id,
      nik: data.nik || '',
      rw: data.rw || '',
      rt: data.rt || '',
      type: data.type || '',
      timestamp: data.timestamp || '',
      nilai: data.nilai || '',
      sistolik: data.sistolik || '',
      diastolik: data.diastolik || '',
      total: data.total || '',
      ...data
    }
  })
}

// Create sheet 1: Daftar Warga
export function createDaftarWargaSheet(residents: any[]) {
  const data = residents.map(r => ({
    Nama: r.nama,
    NIK: r.nik,
    RW: r.rw,
    RT: r.rt,
    'Tgl Lahir': r.birthDate,
    Umur: r.umur,
    Alamat: r.alamat,
    'Jenis Kelamin': r.jenisKelamin
  }))
  
  const ws = XLSX.utils.json_to_sheet(data)
  ws['!cols'] = [
    { wch: 20 }, // Nama
    { wch: 15 }, // NIK
    { wch: 8 },  // RW
    { wch: 8 },  // RT
    { wch: 12 }, // Tgl Lahir
    { wch: 8 },  // Umur
    { wch: 20 }, // Alamat
    { wch: 15 }  // Jenis Kelamin
  ]
  
  return ws
}

// Create sheet 2: Kehadiran per RW
export function createKehadiranSheet(residents: any[], healthReadings: any[]) {
  const rwMap: Record<string, { terdaftar: number; diperiksa: Set<string>; target: number }> = {}
  
  // Count registered residents per RW
  residents.forEach(r => {
    if (!rwMap[r.rw]) {
      rwMap[r.rw] = { terdaftar: 0, diperiksa: new Set(), target: 80 }
    }
    rwMap[r.rw].terdaftar++
  })
  
  // Count examined per RW
  healthReadings.forEach(h => {
    if (h.rw && rwMap[h.rw]) {
      rwMap[h.rw].diperiksa.add(h.nik)
    }
  })
  
  const data = Object.entries(rwMap)
    .sort(([a], [b]) => parseInt(a) - parseInt(b))
    .map(([rw, stats]) => ({
      RW: rw,
      'Jumlah Warga Diperiksa': stats.diperiksa.size,
      'Jumlah Warga Terdaftar': stats.terdaftar,
      Target: stats.target,
      'Persentase (%)': stats.terdaftar > 0 
        ? Math.round((stats.diperiksa.size / stats.terdaftar) * 100) 
        : 0
    }))
  
  const ws = XLSX.utils.json_to_sheet(data)
  ws['!cols'] = [
    { wch: 8 },  // RW
    { wch: 20 }, // Jumlah Diperiksa
    { wch: 20 }, // Jumlah Terdaftar
    { wch: 8 },  // Target
    { wch: 15 }  // Persentase
  ]
  
  return ws
}

// Create sheet 3: Tren Bulanan
export function createTrenBulananSheet(healthReadings: any[]) {
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
                 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
  const monthsLower = months.map(m => m.toLowerCase())
  
  const rwMonthMap: Record<string, Record<number, Set<string>>> = {}
  
  // Group by RW and month
  healthReadings.forEach(h => {
    const date = new Date(h.timestamp)
    const monthIndex = date.getMonth()
    const rw = h.rw || 'Unknown'
    
    if (!rwMonthMap[rw]) {
      rwMonthMap[rw] = {}
      for (let i = 0; i < 12; i++) rwMonthMap[rw][i] = new Set()
    }
    
    rwMonthMap[rw][monthIndex].add(h.nik)
  })
  
  const data = Object.entries(rwMonthMap)
    .sort(([a], [b]) => parseInt(a) - parseInt(b))
    .map(([rw, monthData]) => {
      const row: any = { RW: rw }
      let total = 0
      
      for (let i = 0; i < 12; i++) {
        row[months[i]] = monthData[i]?.size || 0
        total += row[months[i]]
      }
      
      row['Total'] = total
      return row
    })
  
  const ws = XLSX.utils.json_to_sheet(data)
  ws['!cols'] = [
    { wch: 8 },  // RW
    ...months.map(() => ({ wch: 10 })), // Bulan
    { wch: 10 }  // Total
  ]
  
  return ws
}

// Create sheet 4: Rekapitulasi Hasil Pemeriksaan
export function createRekapitulasiSheet(healthReadings: any[]) {
  const jenisMap: Record<string, string> = {
    'tensi': 'Tensi',
    'kolesterol': 'Kolesterol',
    'guladarah': 'Gula Darah',
    'gds': 'Gula Darah',
    'asamurat': 'Asam Urat',
    'imt': 'IMT',
    'nadi': 'Nadi',
    'tb': 'TB',
    'bb': 'BB',
    'lp': 'LP'
  }
  
  const rwTypeMap: Record<string, Record<string, { rendah: number; normal: number; batasTinggi: number; tinggi: number }>> = {}
  
  healthReadings.forEach(h => {
    const rw = h.rw || 'Unknown'
    const type = jenisMap[h.type] || h.type
    
    if (!rwTypeMap[rw]) rwTypeMap[rw] = {}
    if (!rwTypeMap[rw][type]) {
      rwTypeMap[rw][type] = { rendah: 0, normal: 0, batasTinggi: 0, tinggi: 0 }
    }
    
    const category = getCategory(h.type, h.nilai || h.total || 0)
    rwTypeMap[rw][type][category]++
  })
  
  const data = Object.entries(rwTypeMap)
    .sort(([a], [b]) => parseInt(a) - parseInt(b))
    .flatMap(([rw, types]) => {
      return Object.entries(types)
        .map(([type, stats]) => ({
          RW: rw,
          'Jenis Pemeriksaan': type,
          Rendah: stats.rendah,
          Normal: stats.normal,
          'Batas Tinggi': stats.batasTinggi,
          Tinggi: stats.tinggi,
          Total: stats.rendah + stats.normal + stats.batasTinggi + stats.tinggi
        }))
    })
  
  const ws = XLSX.utils.json_to_sheet(data)
  ws['!cols'] = [
    { wch: 8 },  // RW
    { wch: 20 }, // Jenis Pemeriksaan
    { wch: 10 }, // Rendah
    { wch: 10 }, // Normal
    { wch: 15 }, // Batas Tinggi
    { wch: 10 }, // Tinggi
    { wch: 10 }  // Total
  ]
  
  return ws
}

// Create sheet 5: Data Kesehatan Warga
export function createDataKesehatanWargaSheet(residents: any[], healthReadings: any[]) {
  // Create map of latest health readings by NIK and type
  const latestReadingsMap: Record<string, Record<string, any>> = {}
  
  healthReadings.forEach(h => {
    if (!latestReadingsMap[h.nik]) latestReadingsMap[h.nik] = {}
    
    const existing = latestReadingsMap[h.nik][h.type]
    const isNewer = !existing || new Date(h.timestamp) > new Date(existing.timestamp)
    
    if (isNewer) {
      latestReadingsMap[h.nik][h.type] = h
    }
  })
  
  const data = residents.map(r => {
    const readings = latestReadingsMap[r.nik] || {}
    
    return {
      Nama: r.nama,
      NIK: r.nik,
      RW: r.rw,
      RT: r.rt,
      'Tgl Lahir': r.birthDate,
      Umur: r.umur,
      Alamat: r.alamat,
      'Jenis Kelamin': r.jenisKelamin,
      TB: readings.tb?.nilai || '-',
      BB: readings.bb?.nilai || '-',
      LP: readings.lp?.nilai || '-',
      TD: readings.tensi ? `${readings.tensi.sistolik}/${readings.tensi.diastolik}` : '-',
      GDS: readings.gds?.nilai || readings.guladarah?.nilai || '-',
      IMT: readings.imt?.nilai || '-',
      UA: readings.asamurat?.nilai || '-',
      COL: readings.kolesterol?.total || '-',
      Nadi: readings.nadi?.nilai || '-'
    }
  }).sort((a, b) => parseInt(a.RW) - parseInt(b.RW))
  
  const ws = XLSX.utils.json_to_sheet(data)
  ws['!cols'] = [
    { wch: 20 }, // Nama
    { wch: 15 }, // NIK
    { wch: 8 },  // RW
    { wch: 8 },  // RT
    { wch: 12 }, // Tgl Lahir
    { wch: 8 },  // Umur
    { wch: 20 }, // Alamat
    { wch: 15 }, // Jenis Kelamin
    { wch: 8 },  // TB
    { wch: 8 },  // BB
    { wch: 8 },  // LP
    { wch: 12 }, // TD
    { wch: 8 },  // GDS
    { wch: 8 },  // IMT
    { wch: 8 },  // UA
    { wch: 8 },  // COL
    { wch: 8 }   // Nadi
  ]
  
  return ws
}

// Main export function
export async function exportMonitoring(userProfile: any, month: number, year: number) {
  const kelurahan = userProfile.kelurahan || 'Unknown'
  
  try {
    // Fetch all data
    const residents = await fetchResidents(kelurahan)
    const healthReadings = await fetchHealthReadings(kelurahan)
    
    // Create workbook with 5 sheets
    const wb = XLSX.utils.book_new()
    
    XLSX.utils.book_append_sheet(wb, createDaftarWargaSheet(residents), 'Daftar Warga')
    XLSX.utils.book_append_sheet(wb, createKehadiranSheet(residents, healthReadings), 'Kehadiran per RW')
    XLSX.utils.book_append_sheet(wb, createTrenBulananSheet(healthReadings), 'Tren Bulanan')
    XLSX.utils.book_append_sheet(wb, createRekapitulasiSheet(healthReadings), 'Rekapitulasi')
    XLSX.utils.book_append_sheet(wb, createDataKesehatanWargaSheet(residents, healthReadings), 'Data Kesehatan Warga')
    
    // Generate filename
    const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
                       'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
    const monthName = monthNames[month] || monthNames[new Date().getMonth()]
    const fileName = `monitoring-kesehatan-${monthName}-${year}.xlsx`
    
    XLSX.writeFile(wb, fileName)
    return true
  } catch (error) {
    console.error('Error exporting to Excel:', error)
    return false
  }
}

// Export to PDF
export async function exportMonitoringPDF(userProfile: any, month: number, year: number) {
  const kelurahan = userProfile.kelurahan || 'Unknown'
  
  try {
    const residents = await fetchResidents(kelurahan)
    const healthReadings = await fetchHealthReadings(kelurahan)
    
    const doc = new jsPDF()
    let currentY = 20
    
    const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
                       'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
    const monthName = monthNames[month] || monthNames[new Date().getMonth()]
    
    // Header
    doc.setFillColor(20, 184, 166)
    doc.rect(0, 0, 210, 25, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('Laporan Monitoring Kesehatan', 105, 10, { align: 'center' })
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.text(`Kelurahan ${kelurahan} | ${monthName} ${year}`, 105, 18, { align: 'center' })
    
    currentY = 35
    
    // Sheet 1: Daftar Warga
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('1. Daftar Warga', 14, currentY)
    currentY += 5
    
    const daftarWargaData = residents.map(r => [
      r.nama, r.nik, r.rw, r.rt, r.birthDate, r.umur, r.alamat, r.jenisKelamin
    ])
    
    autoTable(doc, {
      head: [['Nama', 'NIK', 'RW', 'RT', 'Tgl Lahir', 'Umur', 'Alamat', 'Jenis Kelamin']],
      body: daftarWargaData,
      startY: currentY,
      theme: 'grid',
      headStyles: { fillColor: [20, 184, 166], textColor: [255, 255, 255] },
      styles: { fontSize: 8 },
      columnStyles: { 0: { cellWidth: 25 }, 1: { cellWidth: 18 } }
    })
    
    currentY = (doc as any).lastAutoTable.finalY + 10
    
    // Sheet 2: Kehadiran per RW
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('2. Kehadiran per RW', 14, currentY)
    currentY += 5
    
    const rwMap: Record<string, { terdaftar: number; diperiksa: Set<string> }> = {}
    residents.forEach(r => {
      if (!rwMap[r.rw]) rwMap[r.rw] = { terdaftar: 0, diperiksa: new Set() }
      rwMap[r.rw].terdaftar++
    })
    healthReadings.forEach(h => {
      if (h.rw && rwMap[h.rw]) rwMap[h.rw].diperiksa.add(h.nik)
    })
    
    const kehadiranData = Object.entries(rwMap)
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .map(([rw, stats]) => [
        rw,
        stats.diperiksa.size,
        stats.terdaftar,
        80,
        Math.round((stats.diperiksa.size / stats.terdaftar) * 100) + '%'
      ])
    
    autoTable(doc, {
      head: [['RW', 'Diperiksa', 'Terdaftar', 'Target', 'Persentase']],
      body: kehadiranData,
      startY: currentY,
      theme: 'grid',
      headStyles: { fillColor: [20, 184, 166], textColor: [255, 255, 255] },
      styles: { fontSize: 10 }
    })
    
    currentY = (doc as any).lastAutoTable.finalY + 10
    
    // Continue with other sheets as needed...
    // For PDF, we're simplifying and showing the most important sheets
    
    const fileName = `monitoring-kesehatan-${monthName}-${year}.pdf`
    doc.save(fileName)
    return true
  } catch (error) {
    console.error('Error exporting to PDF:', error)
    return false
  }
}
