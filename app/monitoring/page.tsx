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

export default function MonitoringPage() {
  const { isAdmin } = useAuth()
  const [pribadiOpen, setPribadiOpen] = useState(false)
  const [posbinduOpen, setPosbinduOpen] = useState(false)
  const [attendanceList, setAttendanceList] = useState<any[]>([])
  const [filterRW, setFilterRW] = useState('')
  const [filterRT, setFilterRT] = useState('')
  const [searchNama, setSearchNama] = useState('')
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false)

  const normalizeRTRW = (value: string) => value ? value.toString().padStart(2, '0') : ''

  useEffect(() => {
    const attendanceRef = collection(db, 'attendance')
    const unsubscribe = onSnapshot(attendanceRef, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setAttendanceList(data)
    })
    return () => unsubscribe()
  }, [])

  const filteredAttendance = attendanceList.filter(r => {
    if (filterRW && normalizeRTRW(r.rw) !== normalizeRTRW(filterRW)) return false
    if (filterRT && normalizeRTRW(r.rt) !== normalizeRTRW(filterRT)) return false
    if (searchNama && r.nama && !r.nama.toLowerCase().includes(searchNama.toLowerCase())) return false
    return true
  })

  const exportAttendanceToPDF = () => {
    const doc = new jsPDF()
    
    doc.setFillColor(37, 99, 235)
    doc.rect(0, 0, 210, 40, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(22)
    doc.setFont('helvetica', 'bold')
    doc.text('Absensi Warga', 105, 20, { align: 'center' })
    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.text(`Kelurahan Duris Selatan - ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, 105, 30, { align: 'center' })
    
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(10)
    doc.text(`Total Absensi: ${filteredAttendance.length}`, 14, 50)
    
    const tableData = filteredAttendance.map(r => [
      r.nama || 'Unknown',
      r.nik || '-',
      `RW ${r.rw || '-'}/RT ${r.rt || '-'}`,
      r.umur || '-',
      r.alamat || '-',
      new Date(r.timestamp).toLocaleDateString('id-ID'),
      new Date(r.timestamp).toLocaleTimeString('id-ID')
    ])
    
    autoTable(doc, {
      startY: 55,
      head: [['Nama', 'NIK', 'RW/RT', 'Umur', 'Alamat', 'Tanggal', 'Waktu']],
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
    
    doc.save('absensi.pdf')
  }

  const exportAttendanceToExcel = () => {
    const data = filteredAttendance.map(r => ({
      'Nama': r.nama || 'Unknown',
      'NIK': r.nik || '-',
      'RW': r.rw || '-',
      'RT': r.rt || '-',
      'Umur': r.umur || '-',
      'Alamat': r.alamat || '-',
      'Tanggal': new Date(r.timestamp).toLocaleDateString('id-ID'),
      'Waktu': new Date(r.timestamp).toLocaleTimeString('id-ID'),
    }))
    
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Absensi')
    
    ws['!cols'] = [
      { wch: 20 },
      { wch: 18 },
      { wch: 5 },
      { wch: 5 },
      { wch: 8 },
      { wch: 30 },
      { wch: 15 },
      { wch: 10 },
    ]
    
    XLSX.writeFile(wb, 'absensi.xlsx')
  }

  const exportAttendanceToWhatsApp = () => {
    let message = `📊 *ABSENSI WARGA*\n`
    message += `🏥 Kelurahan Duris Selatan\n`
    message += `📅 ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}\n\n`
    message += `━━━━━━━━━━━━━━━━━━━━\n\n`
    message += `📈 *RINGKASAN DATA*\n`
    message += `• Total Absensi: ${filteredAttendance.length}\n\n`
    message += `━━━━━━━━━━━━━━━━━━━━\n\n`
    message += `📋 *DATA DETAIL*\n\n`
    
    filteredAttendance.forEach((r, index) => {
      message += `${index + 1}. ${r.nama || 'Unknown'}\n`
      message += `   NIK: ${r.nik || '-'}\n`
      message += `   RW/RT: ${r.rw || '-'}/${r.rt || '-'} | Umur: ${r.umur || '-'}\n`
      message += `   Alamat: ${r.alamat || '-'}\n`
      message += `   Tanggal: ${new Date(r.timestamp).toLocaleDateString('id-ID')}\n`
      message += `   Waktu: ${new Date(r.timestamp).toLocaleTimeString('id-ID')}\n\n`
    })
    
    message += `━━━━━━━━━━━━━━━━━━━━\n`
    message += `📱 InterPulse - Aplikasi Kesehatan Terpadu\n`
    
    const encodedMessage = encodeURIComponent(message)
    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank')
  }

  const AttendanceList = () => {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <h4 className="font-semibold text-gray-800">Data Absensi ({filteredAttendance.length})</h4>
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
                      onClick={() => { exportAttendanceToPDF(); setExportDropdownOpen(false); }}
                      className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors first:rounded-t-xl"
                    >
                      <svg className="w-5 h-5 text-red-500" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4zm-3 9h-2v-2h2v2zm0-4h-2V7h2v2z"/>
                      </svg>
                      <span className="text-sm text-gray-700">Export PDF</span>
                    </button>
                    <button
                      onClick={() => { exportAttendanceToExcel(); setExportDropdownOpen(false); }}
                      className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                    >
                      <svg className="w-5 h-5 text-green-600" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4zM4 22h16v-2H4v2zm0-4h16v-2H4v2zm0-4h16v-2H4v2zm0-4h16V8H4v2z"/>
                      </svg>
                      <span className="text-sm text-gray-700">Export Excel</span>
                    </button>
                    <button
                      onClick={() => { exportAttendanceToWhatsApp(); setExportDropdownOpen(false); }}
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
          </div>
          <div className="divide-y divide-gray-50">
            {filteredAttendance.length === 0 ? (
              <p className="text-center py-8 text-gray-400 text-sm">Belum ada data absensi</p>
            ) : filteredAttendance.map((attendance) => (
              <div key={attendance.id} className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">{attendance.nama || 'Unknown'}</p>
                    <p className="text-xs text-gray-500">NIK: {attendance.nik || '-'}</p>
                    <p className="text-xs text-gray-500">RW {attendance.rw || '-'} / RT {attendance.rt || '-'}</p>
                    <p className="text-xs text-gray-500">Umur: {attendance.umur || '-'}</p>
                    <p className="text-xs text-gray-400">{new Date(attendance.timestamp).toLocaleDateString('id-ID')} {new Date(attendance.timestamp).toLocaleTimeString('id-ID')}</p>
                  </div>
                  {isAdmin && (
                    <button onClick={() => handleDeleteHealth(attendance.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const handleDeleteHealth = async (id: string) => {
    if (!confirm('Hapus data ini?')) return
    try { await deleteDoc(doc(db, 'attendance', id)) } catch { alert('Gagal menghapus.') }
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

        {/* Absensi List */}
        <AttendanceList />
      </div>
    </div>
  )
}
