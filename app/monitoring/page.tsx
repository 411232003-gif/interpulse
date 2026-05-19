'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp, Search, Filter, AlertCircle, Plus, Edit, Trash2, Activity, Users, Download, TrendingUp } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, where, orderBy, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import Link from 'next/link'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

// ── Kategorisasi Kesehatan ─────────────────────────────────────────
const getTensiCategory = (sistolik: number, diastolik: number) => {
  if (sistolik < 90 || diastolik < 60) return { label: 'Rendah', color: 'text-blue-600', bg: 'bg-blue-100', border: 'border-blue-300' }
  if (sistolik <= 119 && diastolik <= 79) return { label: 'Normal', color: 'text-green-600', bg: 'bg-green-100', border: 'border-green-300' }
  if (sistolik <= 139 || diastolik <= 89) return { label: 'Pre-Hipertensi', color: 'text-yellow-600', bg: 'bg-yellow-100', border: 'border-yellow-300' }
  return { label: 'Hipertensi', color: 'text-red-600', bg: 'bg-red-100', border: 'border-red-300' }
}

const getGulaCategory = (value: number) => {
  if (value < 70) return { label: 'Rendah', color: 'text-blue-600', bg: 'bg-blue-100' }
  if (value <= 99) return { label: 'Normal', color: 'text-green-600', bg: 'bg-green-100' }
  if (value <= 160) return { label: 'Pre-Diabetes', color: 'text-yellow-600', bg: 'bg-yellow-100' }
  return { label: 'Diabetes', color: 'text-red-600', bg: 'bg-red-100' }
}

const getKolesterolCategory = (total: number) => {
  if (total < 150) return { label: 'Rendah', color: 'text-blue-600', bg: 'bg-blue-100' }
  if (total <= 199) return { label: 'Normal', color: 'text-green-600', bg: 'bg-green-100' }
  if (total <= 239) return { label: 'Batas Tinggi', color: 'text-yellow-600', bg: 'bg-yellow-100' }
  return { label: 'Tinggi', color: 'text-red-600', bg: 'bg-red-100' }
}

const getAsamUratCategory = (value: number, gender: string) => {
  const max = gender === 'pria' ? 7.0 : 6.0
  if (value < 2.5) return { label: 'Rendah', color: 'text-blue-600', bg: 'bg-blue-100' }
  if (value <= max) return { label: 'Normal', color: 'text-green-600', bg: 'bg-green-100' }
  if (value <= max + 1) return { label: 'Batas Tinggi', color: 'text-yellow-600', bg: 'bg-yellow-100' }
  return { label: 'Tinggi', color: 'text-red-600', bg: 'bg-red-100' }
}

const get4GAdvice = (reading: any): string[] => {
  const advice: string[] = []
  if (reading.type === 'tensi') {
    const cat = getTensiCategory(parseInt(reading.sistolik), parseInt(reading.diastolik))
    if (cat.label === 'Hipertensi' || cat.label === 'Pre-Hipertensi') {
      advice.push('🧂 Batasi Garam', '🍳 Batasi Gorengan', '🥩 Batasi Gajih (Lemak)')
    }
  } else if (reading.type === 'guladarah') {
    const cat = getGulaCategory(parseInt(reading.value))
    if (cat.label === 'Diabetes' || cat.label === 'Pre-Diabetes') {
      advice.push('🍬 Batasi Gula', '🍳 Batasi Gorengan', '🥩 Batasi Gajih (Lemak)')
    }
  } else if (reading.type === 'kolesterol') {
    const cat = getKolesterolCategory(parseInt(reading.total))
    if (cat.label === 'Tinggi' || cat.label === 'Batas Tinggi') {
      advice.push('🥩 Batasi Gajih (Lemak)', '🍳 Batasi Gorengan')
    }
  } else if (reading.type === 'asamurat') {
    const cat = getAsamUratCategory(parseFloat(reading.value), reading.gender || 'pria')
    if (cat.label === 'Tinggi' || cat.label === 'Batas Tinggi') {
      advice.push('🥩 Batasi Gajih (Lemak)', '🍳 Batasi Gorengan', '🍬 Batasi Gula')
    }
  }
  return advice
}

const getReadingCategory = (reading: any) => {
  if (reading.type === 'tensi') return getTensiCategory(parseInt(reading.sistolik), parseInt(reading.diastolik))
  if (reading.type === 'guladarah') return getGulaCategory(parseInt(reading.value))
  if (reading.type === 'kolesterol') return getKolesterolCategory(parseInt(reading.total))
  if (reading.type === 'asamurat') return getAsamUratCategory(parseFloat(reading.value), reading.gender || 'pria')
  return { label: '-', color: 'text-gray-600', bg: 'bg-gray-100' }
}

export default function MonitoringPage() {
  const { isAdmin } = useAuth()
  const [pribadiOpen, setPribadiOpen] = useState(false)
  const [posbinduOpen, setPosbinduOpen] = useState(false)
  const [healthReadings, setHealthReadings] = useState<any[]>([])
  const [filterRW, setFilterRW] = useState('')
  const [filterRT, setFilterRT] = useState('')
  const [searchNama, setSearchNama] = useState('')
  const [isPosbinduModalOpen, setIsPosbinduModalOpen] = useState(false)
  const [isHealthEditModalOpen, setIsHealthEditModalOpen] = useState(false)
  const [editingHealth, setEditingHealth] = useState<any>(null)
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false)
  const [showGrafikGula, setShowGrafikGula] = useState(false)
  const [grafikFilterNama, setGrafikFilterNama] = useState('')
  const [posbinduForm, setPosbinduForm] = useState({
    type: 'tensi', userName: '', rt: '', rw: '', kelurahan: '',
    sistolik: '', diastolik: '', nadi: '', total: '', ldl: '', hdl: '',
    trigliserida: '', value: '', gender: 'pria'
  })
  const [healthEditForm, setHealthEditForm] = useState({
    type: 'tensi', userName: '', rt: '', rw: '',
    sistolik: '', diastolik: '', nadi: '', total: '', ldl: '', hdl: '',
    trigliserida: '', value: ''
  })

  const normalizeRTRW = (value: string) => value ? value.toString().padStart(2, '0') : ''

  useEffect(() => {
    const readingsRef = collection(db, 'healthReadings')
    const unsubscribe = onSnapshot(readingsRef, (snapshot) => {
      setHealthReadings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })))
    })
    return () => unsubscribe()
  }, [])

  const filteredReadings = (source: string) => healthReadings.filter(r => {
    if (r.source !== source) return false
    // Filter 1 minggu untuk monitoring pribadi
    if (source === 'pribadi') {
      const oneWeekAgo = new Date()
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
      const readingDate = new Date(r.timestamp)
      if (readingDate < oneWeekAgo) return false
    }
    if (filterRW && normalizeRTRW(r.rw) !== normalizeRTRW(filterRW)) return false
    if (filterRT && normalizeRTRW(r.rt) !== normalizeRTRW(filterRT)) return false
    if (searchNama && r.userName && !r.userName.toLowerCase().includes(searchNama.toLowerCase())) return false
    return true
  })

  const getStats = (source: string) => {
    const readings = filteredReadings(source)
    return {
      hipertensi: readings.filter(r => {
        if (r.type !== 'tensi') return false
        const cat = getTensiCategory(parseInt(r.sistolik), parseInt(r.diastolik))
        return cat.label === 'Hipertensi' || cat.label === 'Pre-Hipertensi'
      }).length,
      gulaTinggi: readings.filter(r => {
        if (r.type !== 'guladarah') return false
        const cat = getGulaCategory(parseInt(r.value))
        return cat.label === 'Diabetes' || cat.label === 'Pre-Diabetes'
      }).length,
      kolesterolTinggi: readings.filter(r => {
        if (r.type !== 'kolesterol') return false
        const cat = getKolesterolCategory(parseInt(r.total))
        return cat.label === 'Tinggi' || cat.label === 'Batas Tinggi'
      }).length,
      asamUratTinggi: readings.filter(r => {
        if (r.type !== 'asamurat') return false
        const cat = getAsamUratCategory(parseFloat(r.value), r.gender || 'pria')
        return cat.label === 'Tinggi' || cat.label === 'Batas Tinggi'
      }).length,
    }
  }

  const getGulaChartData = (nama: string) => {
    return healthReadings
      .filter(r => r.type === 'guladarah' && (!nama || (r.userName || '').toLowerCase().includes(nama.toLowerCase())))
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .map(r => ({
        tanggal: new Date(r.timestamp).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }),
        nilai: parseInt(r.value),
        nama: r.userName || 'Unknown',
      }))
  }

  const getRecordNumber = async (rw: string) => {
    const q = query(collection(db, 'healthReadings'), where('rw', '==', rw))
    const snap = await getDocs(q)
    return `${snap.size + 1}/${rw}`
  }

  const handlePosbinduSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const recordNum = await getRecordNumber(posbinduForm.rw)
      const newReading: any = {
        type: posbinduForm.type, source: 'posbindu',
        userName: posbinduForm.userName, rt: posbinduForm.rt, rw: posbinduForm.rw,
        kelurahan: posbinduForm.kelurahan, timestamp: new Date().toISOString(),
        recordNumber: recordNum
      }
      if (posbinduForm.type === 'tensi') Object.assign(newReading, { sistolik: posbinduForm.sistolik, diastolik: posbinduForm.diastolik, nadi: posbinduForm.nadi })
      else if (posbinduForm.type === 'kolesterol') Object.assign(newReading, { total: posbinduForm.total, ldl: posbinduForm.ldl, hdl: posbinduForm.hdl, trigliserida: posbinduForm.trigliserida })
      else Object.assign(newReading, { value: posbinduForm.value })
      await addDoc(collection(db, 'healthReadings'), newReading)
      setIsPosbinduModalOpen(false)
      setPosbinduForm({ type: 'tensi', userName: '', rt: '', rw: '', kelurahan: '', sistolik: '', diastolik: '', nadi: '', total: '', ldl: '', hdl: '', trigliserida: '', value: '', gender: 'pria' })
      alert('Data posbindu berhasil disimpan!')
    } catch { alert('Gagal menyimpan data.') }
  }

  const openEditHealthModal = (reading: any) => {
    setEditingHealth(reading)
    setHealthEditForm({ type: reading.type, userName: reading.userName || '', rt: reading.rt || '', rw: reading.rw || '', sistolik: reading.sistolik || '', diastolik: reading.diastolik || '', nadi: reading.nadi || '', total: reading.total || '', ldl: reading.ldl || '', hdl: reading.hdl || '', trigliserida: reading.trigliserida || '', value: reading.value || '' })
    setIsHealthEditModalOpen(true)
  }

  const handleEditHealth = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingHealth) return
    try {
      const updated: any = { type: healthEditForm.type, userName: healthEditForm.userName, rt: healthEditForm.rt, rw: healthEditForm.rw }
      if (healthEditForm.type === 'tensi') Object.assign(updated, { sistolik: healthEditForm.sistolik, diastolik: healthEditForm.diastolik, nadi: healthEditForm.nadi })
      else if (healthEditForm.type === 'kolesterol') Object.assign(updated, { total: healthEditForm.total, ldl: healthEditForm.ldl, hdl: healthEditForm.hdl, trigliserida: healthEditForm.trigliserida })
      else Object.assign(updated, { value: healthEditForm.value })
      await updateDoc(doc(db, 'healthReadings', editingHealth.id), updated)
      setIsHealthEditModalOpen(false)
      setEditingHealth(null)
    } catch { alert('Gagal memperbarui data.') }
  }

  const exportMonitoringToPDF = (source: string) => {
    const doc = new jsPDF()
    const readings = filteredReadings(source)
    const sourceName = source === 'pribadi' ? 'Pribadi' : 'Posbindu'
    
    doc.setFillColor(37, 99, 235)
    doc.rect(0, 0, 210, 40, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(22)
    doc.setFont('helvetica', 'bold')
    doc.text(`Monitoring Kesehatan ${sourceName}`, 105, 20, { align: 'center' })
    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.text(`Kelurahan Duris Selatan - ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, 105, 30, { align: 'center' })
    
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(10)
    doc.text(`Total Data: ${readings.length}`, 14, 50)
    
    const tableData = readings.map(r => [
      r.userName || 'Unknown',
      `RW ${r.rw || '-'}/RT ${r.rt || '-'}`,
      r.type,
      r.type === 'tensi' ? `${r.sistolik}/${r.diastolik}` : r.type === 'kolesterol' ? r.total : r.value || '-',
      new Date(r.timestamp).toLocaleDateString('id-ID')
    ])
    
    autoTable(doc, {
      startY: 55,
      head: [['Nama', 'RW/RT', 'Jenis', 'Nilai', 'Tanggal']],
      body: tableData,
      styles: {
        fontSize: 8,
        cellPadding: 3,
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
    
    doc.save(`monitoring-${source}.pdf`)
  }

  const exportMonitoringToExcel = (source: string) => {
    const readings = filteredReadings(source)
    const sourceName = source === 'pribadi' ? 'Pribadi' : 'Posbindu'
    
    const data = readings.map(r => ({
      'Nama': r.userName || 'Unknown',
      'RW': r.rw || '-',
      'RT': r.rt || '-',
      'Jenis Pemeriksaan': r.type,
      'Nilai': r.type === 'tensi' ? `${r.sistolik}/${r.diastolik}` : r.type === 'kolesterol' ? r.total : r.value || '-',
      'Tanggal': new Date(r.timestamp).toLocaleDateString('id-ID'),
      'Waktu': new Date(r.timestamp).toLocaleTimeString('id-ID'),
    }))
    
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, `Monitoring ${sourceName}`)
    
    ws['!cols'] = [
      { wch: 20 },
      { wch: 5 },
      { wch: 5 },
      { wch: 15 },
      { wch: 10 },
      { wch: 15 },
      { wch: 10 },
    ]
    
    XLSX.writeFile(wb, `monitoring-${source}.xlsx`)
  }

  const exportMonitoringToWhatsApp = (source: string) => {
    const readings = filteredReadings(source)
    const sourceName = source === 'pribadi' ? 'Pribadi' : 'Posbindu'
    
    let message = `📊 *MONITORING KESEHATAN ${sourceName.toUpperCase()}*\n`
    message += `🏥 Kelurahan Duris Selatan\n`
    message += `📅 ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}\n\n`
    message += `━━━━━━━━━━━━━━━━━━━━\n\n`
    message += `📈 *RINGKASAN DATA*\n`
    message += `• Total Data: ${readings.length}\n\n`
    message += `━━━━━━━━━━━━━━━━━━━━\n\n`
    message += `📋 *DATA DETAIL*\n\n`
    
    readings.forEach((r, index) => {
      message += `${index + 1}. ${r.userName || 'Unknown'}\n`
      message += `   RW/RT: ${r.rw || '-'}/${r.rt || '-'}\n`
      message += `   Jenis: ${r.type}\n`
      message += `   Nilai: ${r.type === 'tensi' ? `${r.sistolik}/${r.diastolik}` : r.type === 'kolesterol' ? r.total : r.value || '-'}\n`
      message += `   Tanggal: ${new Date(r.timestamp).toLocaleDateString('id-ID')}\n\n`
    })
    
    message += `━━━━━━━━━━━━━━━━━━━━\n`
    message += `📱 InterPulse - Aplikasi Kesehatan Terpadu\n`
    
    const encodedMessage = encodeURIComponent(message)
    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank')
  }

  const handleDeleteHealth = async (id: string) => {
    if (!confirm('Hapus data ini?')) return
    try { await deleteDoc(doc(db, 'healthReadings', id)) } catch { alert('Gagal menghapus.') }
  }

  const ReadingsList = ({ source }: { source: string }) => {
    const readings = filteredReadings(source)
    const stats = getStats(source)
    return (
      <div className="space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Hipertensi', value: stats.hipertensi, color: 'text-red-600', bg: 'bg-red-50' },
            { label: 'Gula Tinggi', value: stats.gulaTinggi, color: 'text-orange-600', bg: 'bg-orange-50' },
            { label: 'Kolesterol Tinggi', value: stats.kolesterolTinggi, color: 'text-yellow-600', bg: 'bg-yellow-50' },
            { label: 'Asam Urat Tinggi', value: stats.asamUratTinggi, color: 'text-purple-600', bg: 'bg-purple-50' },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-xl p-3`}>
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className={`w-4 h-4 ${s.color}`} />
                <span className="text-gray-600 text-xs">{s.label}</span>
              </div>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500">Orang</p>
            </div>
          ))}
        </div>

        {/* List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <h4 className="font-semibold text-gray-800">Data Kesehatan ({readings.length})</h4>
            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-gray-600 text-white rounded-lg text-sm hover:bg-gray-700 transition-colors"
                >
                  <Download className="w-3 h-3" /> Export
                </button>
                {exportDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-200 z-50">
                    <button
                      onClick={() => { exportMonitoringToPDF(source); setExportDropdownOpen(false); }}
                      className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors first:rounded-t-xl"
                    >
                      <svg className="w-5 h-5 text-red-500" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4zm-3 9h-2v-2h2v2zm0-4h-2V7h2v2z"/>
                      </svg>
                      <span className="text-sm text-gray-700">Export PDF</span>
                    </button>
                    <button
                      onClick={() => { exportMonitoringToExcel(source); setExportDropdownOpen(false); }}
                      className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                    >
                      <svg className="w-5 h-5 text-green-600" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4zM4 22h16v-2H4v2zm0-4h16v-2H4v2zm0-4h16v-2H4v2zm0-4h16V8H4v2z"/>
                      </svg>
                      <span className="text-sm text-gray-700">Export Excel</span>
                    </button>
                    <button
                      onClick={() => { exportMonitoringToWhatsApp(source); setExportDropdownOpen(false); }}
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
              {isAdmin && source === 'posbindu' && (
                <button onClick={() => setIsPosbinduModalOpen(true)} className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm">
                  <Plus className="w-3 h-3" /> Tambah
                </button>
              )}
            </div>
          </div>
            <div className="divide-y divide-gray-50">
            {readings.length === 0 ? (
              <p className="text-center py-8 text-gray-400 text-sm">Belum ada data</p>
            ) : readings.map((reading) => {
              const cat = getReadingCategory(reading)
              const advice = get4GAdvice(reading)
              return (
              <div key={reading.id} className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-gray-800">{reading.userName || 'Unknown'}</p>
                      {reading.recordNumber && <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-mono">#{reading.recordNumber}</span>}
                    </div>
                    <p className="text-xs text-gray-500">RW {reading.rw || '-'} / RT {reading.rt || '-'}</p>
                    <p className="text-xs text-gray-400">{new Date(reading.timestamp).toLocaleDateString('id-ID')}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${cat.bg} ${cat.color}`}>{cat.label}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${reading.type === 'tensi' ? 'bg-red-100 text-red-700' : reading.type === 'kolesterol' ? 'bg-yellow-100 text-yellow-700' : reading.type === 'asamurat' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                      {reading.type === 'tensi' ? 'Tensi' : reading.type === 'kolesterol' ? 'Kolesterol' : reading.type === 'asamurat' ? 'Asam Urat' : 'Gula'}
                    </span>
                    {isAdmin && (
                      <div className="flex gap-1">
                        <button onClick={() => openEditHealthModal(reading)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleDeleteHealth(reading.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-600">
                  {reading.type === 'tensi' && <span>{reading.sistolik}/{reading.diastolik} mmHg • Nadi: {reading.nadi} bpm</span>}
                  {reading.type === 'kolesterol' && <span>Total: {reading.total} • LDL: {reading.ldl} • HDL: {reading.hdl} mg/dL</span>}
                  {(reading.type === 'asamurat' || reading.type === 'guladarah') && <span>Nilai: {reading.value} mg/dL</span>}
                </div>
                {advice.length > 0 && (
                  <div className="mt-2 bg-orange-50 border border-orange-200 rounded-lg p-2">
                    <p className="text-xs font-semibold text-orange-700 mb-1">⚠️ Anjuran Batasi 4G:</p>
                    <div className="flex flex-wrap gap-1">
                      {advice.map((a, i) => (
                        <span key={i} className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">{a}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )})}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 rounded-b-3xl shadow-lg">
        <div className="flex items-center gap-3 mb-1">
          <Link href="/" className="text-indigo-200 hover:text-white text-sm">← Beranda</Link>
        </div>
        <h1 className="text-2xl font-bold">Monitoring Kesehatan</h1>
        <p className="text-indigo-100 text-sm mt-1">Pantau data kesehatan warga</p>
      </div>

      <div className="px-4 mt-6 space-y-4">
        {/* Grafik Tren Gula Darah */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <button
            onClick={() => setShowGrafikGula(!showGrafikGula)}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-gray-800">Grafik Tren Gula Darah</p>
                <p className="text-xs text-gray-500">Visualisasi perkembangan kadar gula</p>
              </div>
            </div>
            {showGrafikGula ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
          </button>
          {showGrafikGula && (
            <div className="p-4 border-t border-gray-100 bg-gray-50 space-y-3">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Filter nama warga..."
                  value={grafikFilterNama}
                  onChange={e => setGrafikFilterNama(e.target.value)}
                  className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {/* Legenda zona warna */}
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full">&lt; 100 Normal</span>
                <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full">100–160 Pre-Diabetes</span>
                <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full">&gt; 160 Diabetes</span>
              </div>
              {getGulaChartData(grafikFilterNama).length === 0 ? (
                <p className="text-center py-6 text-gray-400 text-sm">Belum ada data gula darah</p>
              ) : (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={getGulaChartData(grafikFilterNama)} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="tanggal" tick={{ fontSize: 10 }} />
                      <YAxis domain={[0, 300]} tick={{ fontSize: 10 }} />
                      <Tooltip
                        contentStyle={{ fontSize: 11, borderRadius: 8 }}
                        formatter={(v: any) => [`${v} mg/dL`, 'Gula Darah']}
                      />
                      {/* Zona warna */}
                      <ReferenceLine y={100} stroke="#22c55e" strokeDasharray="4 4" label={{ value: '100', position: 'right', fontSize: 9, fill: '#22c55e' }} />
                      <ReferenceLine y={160} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: '160', position: 'right', fontSize: 9, fill: '#f59e0b' }} />
                      <Line type="monotone" dataKey="nilai" stroke="#6366f1" strokeWidth={2} dot={{ r: 4, fill: '#6366f1' }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Filter */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-indigo-600" />
            <span className="font-semibold text-gray-800 text-sm">Filter</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <select value={filterRW} onChange={e => setFilterRW(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">Semua RW</option>
              {['01','02','03','04','05','06','07','08','09','10'].map(rw => <option key={rw} value={rw}>RW {rw}</option>)}
            </select>
            <select value={filterRT} onChange={e => setFilterRT(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">Semua RT</option>
              {['01','02','03','04','05','06','07','08','09','10'].map(rt => <option key={rt} value={rt}>RT {rt}</option>)}
            </select>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Cari nama..." value={searchNama} onChange={e => setSearchNama(e.target.value)} className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
        </div>

        {/* Accordion: Monitoring Pribadi */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <button
            onClick={() => setPribadiOpen(!pribadiOpen)}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                <Activity className="w-5 h-5 text-indigo-600" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-gray-800">Monitoring Pribadi</p>
                <p className="text-xs text-gray-500">{filteredReadings('pribadi').length} data</p>
              </div>
            </div>
            {pribadiOpen ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
          </button>
          {pribadiOpen && (
            <div className="p-4 border-t border-gray-100 bg-gray-50">
              <ReadingsList source="pribadi" />
            </div>
          )}
        </div>

        {/* Accordion: Monitoring Posbindu */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <button
            onClick={() => setPosbinduOpen(!posbinduOpen)}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-gray-800">Monitoring Posbindu</p>
                <p className="text-xs text-gray-500">{filteredReadings('posbindu').length} data</p>
              </div>
            </div>
            {posbinduOpen ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
          </button>
          {posbinduOpen && (
            <div className="p-4 border-t border-gray-100 bg-gray-50">
              <ReadingsList source="posbindu" />
            </div>
          )}
        </div>
      </div>

      {/* Tambah Data Posbindu Modal */}
      {isPosbinduModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
          <div className="bg-white rounded-t-3xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">Tambah Data Posbindu</h3>
            <form onSubmit={handlePosbinduSubmit} className="space-y-3">
              <select value={posbinduForm.type} onChange={e => setPosbinduForm(p => ({ ...p, type: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                <option value="tensi">Tekanan Darah</option>
                <option value="kolesterol">Kolesterol</option>
                <option value="asamurat">Asam Urat</option>
                <option value="guladarah">Gula Darah</option>
              </select>
              <input placeholder="Nama warga" value={posbinduForm.userName} onChange={e => setPosbinduForm(p => ({ ...p, userName: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" required />
              <div className="grid grid-cols-3 gap-2">
                <input placeholder="RT" value={posbinduForm.rt} onChange={e => setPosbinduForm(p => ({ ...p, rt: e.target.value }))} className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                <input placeholder="RW" value={posbinduForm.rw} onChange={e => setPosbinduForm(p => ({ ...p, rw: e.target.value }))} className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                <input placeholder="Kelurahan" value={posbinduForm.kelurahan} onChange={e => setPosbinduForm(p => ({ ...p, kelurahan: e.target.value }))} className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
              {posbinduForm.type === 'tensi' && (
                <div className="grid grid-cols-3 gap-2">
                  <input placeholder="Sistolik" value={posbinduForm.sistolik} onChange={e => setPosbinduForm(p => ({ ...p, sistolik: e.target.value }))} className="px-3 py-2 border border-gray-200 rounded-lg text-sm" required />
                  <input placeholder="Diastolik" value={posbinduForm.diastolik} onChange={e => setPosbinduForm(p => ({ ...p, diastolik: e.target.value }))} className="px-3 py-2 border border-gray-200 rounded-lg text-sm" required />
                  <input placeholder="Nadi" value={posbinduForm.nadi} onChange={e => setPosbinduForm(p => ({ ...p, nadi: e.target.value }))} className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
              )}
              {posbinduForm.type === 'kolesterol' && (
                <div className="grid grid-cols-2 gap-2">
                  <input placeholder="Total" value={posbinduForm.total} onChange={e => setPosbinduForm(p => ({ ...p, total: e.target.value }))} className="px-3 py-2 border border-gray-200 rounded-lg text-sm" required />
                  <input placeholder="LDL" value={posbinduForm.ldl} onChange={e => setPosbinduForm(p => ({ ...p, ldl: e.target.value }))} className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                  <input placeholder="HDL" value={posbinduForm.hdl} onChange={e => setPosbinduForm(p => ({ ...p, hdl: e.target.value }))} className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                  <input placeholder="Trigliserida" value={posbinduForm.trigliserida} onChange={e => setPosbinduForm(p => ({ ...p, trigliserida: e.target.value }))} className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
              )}
              {(posbinduForm.type === 'asamurat' || posbinduForm.type === 'guladarah') && (
                <input placeholder="Nilai (mg/dL)" value={posbinduForm.value} onChange={e => setPosbinduForm(p => ({ ...p, value: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" required />
              )}
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setIsPosbinduModalOpen(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm">Batal</button>
                <button type="submit" className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Health Modal */}
      {isHealthEditModalOpen && editingHealth && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
          <div className="bg-white rounded-t-3xl w-full max-w-lg p-6">
            <h3 className="text-lg font-bold mb-4">Edit Data Kesehatan</h3>
            <form onSubmit={handleEditHealth} className="space-y-3">
              <input placeholder="Nama" value={healthEditForm.userName} onChange={e => setHealthEditForm(h => ({ ...h, userName: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              {healthEditForm.type === 'tensi' && (
                <div className="grid grid-cols-3 gap-2">
                  <input placeholder="Sistolik" value={healthEditForm.sistolik} onChange={e => setHealthEditForm(h => ({ ...h, sistolik: e.target.value }))} className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                  <input placeholder="Diastolik" value={healthEditForm.diastolik} onChange={e => setHealthEditForm(h => ({ ...h, diastolik: e.target.value }))} className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                  <input placeholder="Nadi" value={healthEditForm.nadi} onChange={e => setHealthEditForm(h => ({ ...h, nadi: e.target.value }))} className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
              )}
              {(healthEditForm.type === 'asamurat' || healthEditForm.type === 'guladarah') && (
                <input placeholder="Nilai" value={healthEditForm.value} onChange={e => setHealthEditForm(h => ({ ...h, value: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              )}
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setIsHealthEditModalOpen(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm">Batal</button>
                <button type="submit" className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
