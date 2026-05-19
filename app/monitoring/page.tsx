'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp, Search, Filter, AlertCircle, Plus, Edit, Trash2, Activity, Users, Download } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import Link from 'next/link'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

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
    if (filterRW && normalizeRTRW(r.rw) !== normalizeRTRW(filterRW)) return false
    if (filterRT && normalizeRTRW(r.rt) !== normalizeRTRW(filterRT)) return false
    if (searchNama && r.userName && !r.userName.toLowerCase().includes(searchNama.toLowerCase())) return false
    return true
  })

  const getStats = (source: string) => {
    const readings = filteredReadings(source)
    return {
      hipertensi: readings.filter(r => r.type === 'tensi' && (parseInt(r.sistolik) > 140 || parseInt(r.diastolik) > 90)).length,
      gulaTinggi: readings.filter(r => r.type === 'guladarah' && parseInt(r.value) > 160).length,
      kolesterolTinggi: readings.filter(r => r.type === 'kolesterol' && parseInt(r.total) > 240).length,
      asamUratTinggi: readings.filter(r => r.type === 'asamurat' && parseFloat(r.value) > 7).length,
    }
  }

  const handlePosbinduSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const newReading: any = {
        type: posbinduForm.type, source: 'posbindu',
        userName: posbinduForm.userName, rt: posbinduForm.rt, rw: posbinduForm.rw,
        kelurahan: posbinduForm.kelurahan, timestamp: new Date().toISOString()
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
              <button onClick={() => exportMonitoringToPDF(source)} className="flex items-center gap-1 px-3 py-1.5 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 transition-colors">
                <Download className="w-3 h-3" /> PDF
              </button>
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
            ) : readings.map((reading) => (
              <div key={reading.id} className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-gray-800">{reading.userName || 'Unknown'}</p>
                    <p className="text-xs text-gray-500">RW {reading.rw || '-'} / RT {reading.rt || '-'}</p>
                    <p className="text-xs text-gray-400">{new Date(reading.timestamp).toLocaleDateString('id-ID')}</p>
                  </div>
                  <div className="flex items-center gap-2">
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
              </div>
            ))}
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
