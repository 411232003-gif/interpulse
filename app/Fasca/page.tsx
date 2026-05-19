'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import BigNumpad from '@/components/BigNumpad'
import { Activity, CheckCircle, AlertCircle, XCircle, Search, Filter, Stethoscope } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { collection, addDoc, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'

type HealthType = 'tensi' | 'kolesterol' | 'asamurat' | 'guladarah'
type Step = 'select' | 'input' | 'result'

interface Resident {
  id: string
  nama: string
  nik: string
  rw: string
  rt: string
  umur: number
  jenisKelamin: 'L' | 'P'
}

export default function CatatKesehatan() {
  const router = useRouter()
  const { isAdmin, userProfile } = useAuth()
  
  // Table & Filter state
  const [residents, setResidents] = useState<Resident[]>([])
  const [filterRW, setFilterRW] = useState('')
  const [filterRT, setFilterRT] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedResident, setSelectedResident] = useState<Resident | null>(null)
  const [showFascaModal, setShowFascaModal] = useState(false)

  // Fasca form state
  const [healthType, setHealthType] = useState<HealthType | null>(null)
  const [step, setStep] = useState<Step>('select')
  const [currentInput, setCurrentInput] = useState('')
  const [inputIndex, setInputIndex] = useState(0)
  const [saving, setSaving] = useState(false)
  const [data, setData] = useState<Record<string, string>>({})
  const [result, setResult] = useState<any>(null)

  const healthConfig: Record<HealthType, { icon: string; title: string; color: string; fields: { key: string; label: string; unit: string }[] }> = {
    tensi: {
      icon: '❤️',
      title: 'Tekanan Darah',
      color: 'from-red-500 to-pink-600',
      fields: [
        { key: 'sistolik', label: 'Sistolik (Atas)', unit: 'mmHg' },
        { key: 'diastolik', label: 'Diastolik (Bawah)', unit: 'mmHg' },
        { key: 'nadi', label: 'Detak Jantung', unit: 'bpm' }
      ]
    },
    kolesterol: {
      icon: '🧈',
      title: 'Kolesterol',
      color: 'from-yellow-500 to-orange-600',
      fields: [
        { key: 'total', label: 'Kolesterol Total', unit: 'mg/dL' },
        { key: 'ldl', label: 'LDL (Jahat)', unit: 'mg/dL' },
        { key: 'hdl', label: 'HDL (Baik)', unit: 'mg/dL' },
        { key: 'trigliserida', label: 'Trigliserida', unit: 'mg/dL' }
      ]
    },
    asamurat: {
      icon: '🔥',
      title: 'Asam Urat',
      color: 'from-orange-500 to-red-600',
      fields: [
        { key: 'nilai', label: 'Nilai Asam Urat', unit: 'mg/dL' }
      ]
    },
    guladarah: {
      icon: '🍯',
      title: 'Gula Darah',
      color: 'from-blue-500 to-cyan-600',
      fields: [
        { key: 'nilai', label: 'Nilai Gula Darah', unit: 'mg/dL' }
      ]
    }
  }

  // Load residents from database
  useEffect(() => {
    const q = collection(db, 'residents')
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Resident[]
      setResidents(data)
    })
    return () => unsubscribe()
  }, [])

  // Filter residents
  const filteredResidents = residents.filter(r => {
    const rwMatch = !filterRW || r.rw === filterRW
    const rtMatch = !filterRT || r.rt === filterRT
    const searchMatch = !searchQuery || 
      r.nama.toLowerCase().includes(searchQuery.toLowerCase()) || 
      r.nik.includes(searchQuery)
    return rwMatch && rtMatch && searchMatch
  })

  // Fasca form handlers
  const handleNumber = (num: string) => {
    if (currentInput.length < 3) setCurrentInput(prev => prev + num)
  }

  const handleDelete = () => setCurrentInput(prev => prev.slice(0, -1))
  const handleClear = () => setCurrentInput('')

  const handleNext = () => {
    if (!healthType || currentInput.length === 0) return
    
    const config = healthConfig[healthType]
    const currentField = config.fields[inputIndex]
    
    setData(prev => ({ ...prev, [currentField.key]: currentInput }))
    
    if (inputIndex < config.fields.length - 1) {
      setInputIndex(prev => prev + 1)
      setCurrentInput('')
    } else {
      saveData({ ...data, [currentField.key]: currentInput })
    }
  }

  const saveData = async (allData: Record<string, string>) => {
    if (!selectedResident) return
    setSaving(true)
    const timestamp = new Date().toISOString()
    
    const userInfo = {
      uid: selectedResident.id,
      name: selectedResident.nama,
      rt: selectedResident.rt,
      rw: selectedResident.rw,
      kelurahan: userProfile?.kelurahan || '-'
    }
    
    let newReading: any
    let validationResult: any

    if (healthType === 'tensi') {
      const sys = parseInt(allData.sistolik)
      const dia = parseInt(allData.diastolik)
      newReading = { 
        type: 'tensi', 
        ...allData, 
        timestamp, 
        userId: userInfo.uid,
        userName: userInfo.name, 
        rt: userInfo.rt, 
        rw: userInfo.rw, 
        kelurahan: userInfo.kelurahan,
        source: 'posbindu'
      }
      
      if (sys < 90 || dia < 60) validationResult = { status: 'low', title: 'Tensi Rendah', color: 'text-blue-700', bgColor: 'bg-gradient-to-br from-blue-100 to-blue-200', icon: <AlertCircle className="w-24 h-24 text-blue-600" />, message: `${sys}/${dia} mmHg`, advice: 'Tensi rendah. Jangan lupa makan teratur dan minum air putih.' }
      else if (sys < 120 && dia < 80) validationResult = { status: 'normal', title: 'Tensi Normal', color: 'text-green-700', bgColor: 'bg-gradient-to-br from-green-100 to-green-200', icon: <CheckCircle className="w-24 h-24 text-green-600" />, message: `${sys}/${dia} mmHg`, advice: 'Bagus! Tensi normal. Pertahankan pola hidup sehat!' }
      else if (sys < 140 && dia < 90) validationResult = { status: 'warning', title: 'Tensi Tinggi', color: 'text-yellow-700', bgColor: 'bg-gradient-to-br from-yellow-100 to-yellow-200', icon: <AlertCircle className="w-24 h-24 text-yellow-600" />, message: `${sys}/${dia} mmHg`, advice: 'Tensi tinggi. Kurangi garam dan gorengan.' }
      else validationResult = { status: 'danger', title: 'Hipertensi', color: 'text-red-700', bgColor: 'bg-gradient-to-br from-red-100 to-red-200', icon: <XCircle className="w-24 h-24 text-red-600" />, message: `${sys}/${dia} mmHg`, advice: 'Hipertensi! Segera istirahat dan konsultasi dokter.' }
      
    } else if (healthType === 'kolesterol') {
      const total = parseInt(allData.total)
      newReading = { 
        type: 'kolesterol', 
        ...allData, 
        timestamp, 
        userId: userInfo.uid,
        userName: userInfo.name, 
        rt: userInfo.rt, 
        rw: userInfo.rw, 
        kelurahan: userInfo.kelurahan,
        source: 'posbindu'
      }
      
      if (total < 200) validationResult = { status: 'normal', title: 'Kolesterol Normal', color: 'text-green-700', bgColor: 'bg-gradient-to-br from-green-100 to-green-200', icon: <CheckCircle className="w-24 h-24 text-green-600" />, message: `${total} mg/dL`, advice: 'Kolesterol normal. Pertahankan!' }
      else if (total < 240) validationResult = { status: 'warning', title: 'Kolesterol Batas', color: 'text-yellow-700', bgColor: 'bg-gradient-to-br from-yellow-100 to-yellow-200', icon: <AlertCircle className="w-24 h-24 text-yellow-600" />, message: `${total} mg/dL`, advice: 'Kolesterol mendekati tinggi. Kurangi lemak.' }
      else validationResult = { status: 'danger', title: 'Kolesterol Tinggi', color: 'text-red-700', bgColor: 'bg-gradient-to-br from-red-100 to-red-200', icon: <XCircle className="w-24 h-24 text-red-600" />, message: `${total} mg/dL`, advice: 'Kolesterol tinggi! Segera ke dokter.' }
      
    } else if (healthType === 'asamurat') {
      const val = parseFloat(allData.nilai)
      newReading = { 
        type: 'asamurat', 
        value: allData.nilai, 
        gender: selectedResident.jenisKelamin === 'L' ? 'pria' : 'wanita', 
        timestamp, 
        userId: userInfo.uid,
        userName: userInfo.name, 
        rt: userInfo.rt, 
        rw: userInfo.rw, 
        kelurahan: userInfo.kelurahan,
        source: 'posbindu'
      }
      
      if (val <= (selectedResident.jenisKelamin === 'L' ? 7 : 6)) validationResult = { status: 'normal', title: 'Asam Urat Normal', color: 'text-green-700', bgColor: 'bg-gradient-to-br from-green-100 to-green-200', icon: <CheckCircle className="w-24 h-24 text-green-600" />, message: `${val} mg/dL`, advice: 'Asam urat normal. Pertahankan!' }
      else if (val <= (selectedResident.jenisKelamin === 'L' ? 8 : 7)) validationResult = { status: 'warning', title: 'Asam Urat Batas', color: 'text-yellow-700', bgColor: 'bg-gradient-to-br from-yellow-100 to-yellow-200', icon: <AlertCircle className="w-24 h-24 text-yellow-600" />, message: `${val} mg/dL`, advice: 'Asam urat mendekati tinggi. Hindari jeroan.' }
      else validationResult = { status: 'danger', title: 'Asam Urat Tinggi', color: 'text-red-700', bgColor: 'bg-gradient-to-br from-red-100 to-red-200', icon: <XCircle className="w-24 h-24 text-red-600" />, message: `${val} mg/dL`, advice: 'Asam urat tinggi! Segera ke dokter.' }
      
    } else {
      const val = parseInt(allData.nilai)
      newReading = { 
        type: 'guladarah', 
        value: allData.nilai, 
        condition: 'puasa', 
        timestamp, 
        userId: userInfo.uid,
        userName: userInfo.name, 
        rt: userInfo.rt, 
        rw: userInfo.rw, 
        kelurahan: userInfo.kelurahan,
        source: 'posbindu'
      }
      
      if (val < 100) validationResult = { status: 'normal', title: 'Gula Darah Normal', color: 'text-green-700', bgColor: 'bg-gradient-to-br from-green-100 to-green-200', icon: <CheckCircle className="w-24 h-24 text-green-600" />, message: `${val} mg/dL`, advice: 'Gula darah normal. Pertahankan!' }
      else if (val < 126) validationResult = { status: 'warning', title: 'Prediabetes', color: 'text-yellow-700', bgColor: 'bg-gradient-to-br from-yellow-100 to-yellow-200', icon: <AlertCircle className="w-24 h-24 text-yellow-600" />, message: `${val} mg/dL`, advice: 'Prediabetes. Kurangi gula dan karbohidrat.' }
      else validationResult = { status: 'danger', title: 'Diabetes', color: 'text-red-700', bgColor: 'bg-gradient-to-br from-red-100 to-red-200', icon: <XCircle className="w-24 h-24 text-red-600" />, message: `${val} mg/dL`, advice: 'Diabetes! Segera ke dokter.' }
    }

    try {
      await addDoc(collection(db, 'healthReadings'), newReading)
      setResult(validationResult)
      setStep('result')
    } catch (error) {
      console.error('Error saving to Firestore:', error)
      alert('Gagal menyimpan data. Coba lagi.')
    } finally {
      setSaving(false)
    }
  }

  const handleBack = () => {
    if (step === 'input') {
      if (inputIndex > 0) {
        setInputIndex(prev => prev - 1)
        const prevField = healthConfig[healthType!].fields[inputIndex - 1]
        setCurrentInput(data[prevField.key] || '')
      } else {
        setStep('select')
        setHealthType(null)
        setData({})
        setCurrentInput('')
      }
    }
  }

  const handleCloseFascaModal = () => {
    setShowFascaModal(false)
    setSelectedResident(null)
    setHealthType(null)
    setStep('select')
    setCurrentInput('')
    setInputIndex(0)
    setData({})
    setResult(null)
  }

  const openFascaModal = (resident: Resident) => {
    setSelectedResident(resident)
    setShowFascaModal(true)
  }

  // Main table view
  if (!showFascaModal) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 pb-24">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <button onClick={() => router.push('/')} className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-xl transition-all">← Kembali</button>
                <h1 className="text-2xl font-bold text-gray-800">Input Kesehatan Warga</h1>
              </div>
            </div>

            {/* Filters */}
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Filter className="w-4 h-4 text-gray-600" />
                <span className="font-semibold text-gray-700 text-sm">Filter</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <select value={filterRW} onChange={e => setFilterRW(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Semua RW</option>
                  {['01','02','03','04','05','06','07','08','09','10'].map(rw => <option key={rw} value={rw}>RW {rw}</option>)}
                </select>
                <select value={filterRT} onChange={e => setFilterRT(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Semua RT</option>
                  {['01','02','03','04','05','06','07','08','09','10'].map(rt => <option key={rt} value={rt}>RT {rt}</option>)}
                </select>
                <div className="md:col-span-2 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="text" placeholder="Cari nama atau NIK..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
            </div>

            {/* Residents Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Nama</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">NIK</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">RW/RT</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Umur</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Jenis Kelamin</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredResidents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-400">Tidak ada data warga</td>
                    </tr>
                  ) : filteredResidents.map(r => (
                    <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800">{r.nama}</td>
                      <td className="px-4 py-3 text-gray-600">{r.nik}</td>
                      <td className="px-4 py-3 text-gray-600">RW {r.rw} / RT {r.rt}</td>
                      <td className="px-4 py-3 text-gray-600">{r.umur} th</td>
                      <td className="px-4 py-3 text-gray-600">{r.jenisKelamin === 'L' ? 'Laki-laki' : 'Perempuan'}</td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => openFascaModal(r)} className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium">
                          <Stethoscope className="w-3.5 h-3.5" />
                          Input Kesehatan
                        </button>
                      </td>
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

  // Fasca Modal
  const config = healthType ? healthConfig[healthType] : null
  const currentField = config?.fields[inputIndex]

  if (step === 'select') {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-800">Input Kesehatan: {selectedResident?.nama}</h2>
            <button onClick={handleCloseFascaModal} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
          </div>

          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mb-3 shadow-lg">
              <Activity className="w-8 h-8 text-white" />
            </div>
            <p className="text-gray-600">Pilih jenis pemeriksaan</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {(Object.keys(healthConfig) as HealthType[]).map((type) => (
              <button
                key={type}
                onClick={() => { setHealthType(type); setStep('input'); setInputIndex(0); setCurrentInput(''); setData({}) }}
                className={`p-4 rounded-xl bg-gradient-to-br ${healthConfig[type].color} text-white shadow-lg active:scale-95 transition-all text-left`}
              >
                <span className="text-3xl mb-2 block">{healthConfig[type].icon}</span>
                <h3 className="font-bold">{healthConfig[type].title}</h3>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (step === 'result' && result) {
    return (
      <div className={`fixed inset-0 ${result.bgColor} flex items-center justify-center z-50 p-4`}>
        <div className="bg-white rounded-3xl shadow-2xl p-8 text-center w-full max-w-2xl">
          <div className="flex justify-center mb-6">{result.icon}</div>
          <h1 className={`text-4xl font-bold ${result.color} mb-4`}>{result.title}</h1>
          <div className="bg-gray-100 rounded-2xl p-6 mb-6">
            <p className="text-gray-600 text-xl mb-2">Hasil:</p>
            <p className={`text-5xl font-bold ${result.color}`}>{result.message}</p>
          </div>
          <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4 mb-8">
            <p className="text-lg text-gray-800 leading-relaxed">{result.advice}</p>
          </div>
          <button onClick={handleCloseFascaModal} className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-xl font-bold py-4 rounded-2xl shadow-lg active:scale-95 transition-all">Selesai</button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <button onClick={handleBack} className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold px-4 py-2 rounded-xl active:scale-95 transition-all">← Kembali</button>
          <div className="bg-blue-100 text-blue-700 text-xl font-bold px-4 py-2 rounded-xl">{inputIndex + 1}/{config?.fields.length}</div>
          <button onClick={handleCloseFascaModal} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
        </div>

        <div className="text-center mb-4">
          <div className="flex justify-center mb-2 text-blue-600">
            <span className="text-5xl">{config?.icon}</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-1">{currentField?.label}</h2>
          <p className="text-gray-600">{config?.title} - Step {inputIndex + 1}</p>
          <p className="text-sm text-gray-500 mt-1">Warga: {selectedResident?.nama}</p>
        </div>

        <div className="bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl p-6 mb-4 border-2 border-blue-300">
          <div className="text-center">
            <p className="text-6xl font-bold text-blue-700 min-h-[80px] flex items-center justify-center">{currentInput || '---'}</p>
            <p className="text-xl text-gray-600 mt-4">{currentField?.unit}</p>
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          {config?.fields.map((_, i) => (
            <div key={i} className={`flex-1 h-2 rounded-full ${i <= inputIndex ? 'bg-blue-500' : 'bg-gray-300'}`} />
          ))}
        </div>

        <BigNumpad onNumberClick={handleNumber} onDelete={handleDelete} onClear={handleClear} />

        <button
          onClick={handleNext}
          disabled={currentInput.length === 0}
          className={`w-full mt-4 text-2xl font-bold py-5 rounded-2xl shadow-lg active:scale-95 transition-all ${
            currentInput.length === 0 ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white'
          }`}
        >
          {inputIndex === (config?.fields.length || 1) - 1 ? 'Simpan & Lihat Hasil' : 'Lanjut →'}
        </button>
      </div>
    </div>
  )
}
