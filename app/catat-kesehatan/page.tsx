'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import BigNumpad from '@/components/BigNumpad'
import { Activity, CheckCircle, AlertCircle, XCircle, History, Loader2 } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { collection, addDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

type HealthType = 'tensi' | 'kolesterol' | 'asamurat' | 'guladarah'
type Step = 'select' | 'input' | 'result'

export default function CatatKesehatan() {
  const router = useRouter()
  const { userProfile } = useAuth()
  const [healthType, setHealthType] = useState<HealthType | null>(null)
  const [step, setStep] = useState<Step>('select')
  const [currentInput, setCurrentInput] = useState('')
  const [inputIndex, setInputIndex] = useState(0)
  const [saving, setSaving] = useState(false)
  
  // Data storage
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
      // Save and show result
      saveData({ ...data, [currentField.key]: currentInput })
    }
  }

  const saveData = async (allData: Record<string, string>) => {
    setSaving(true)
    const timestamp = new Date().toISOString()
    
    // Get user info from auth context
    const userInfo = {
      uid: userProfile?.uid || 'unknown',
      name: userProfile?.name || 'Unknown',
      rt: userProfile?.rt || '-',
      rw: userProfile?.rw || '-',
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
        kelurahan: userInfo.kelurahan 
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
        kelurahan: userInfo.kelurahan 
      }
      
      if (total < 200) validationResult = { status: 'normal', title: 'Kolesterol Normal', color: 'text-green-700', bgColor: 'bg-gradient-to-br from-green-100 to-green-200', icon: <CheckCircle className="w-24 h-24 text-green-600" />, message: `${total} mg/dL`, advice: 'Kolesterol normal. Pertahankan!' }
      else if (total < 240) validationResult = { status: 'warning', title: 'Kolesterol Batas', color: 'text-yellow-700', bgColor: 'bg-gradient-to-br from-yellow-100 to-yellow-200', icon: <AlertCircle className="w-24 h-24 text-yellow-600" />, message: `${total} mg/dL`, advice: 'Kolesterol mendekati tinggi. Kurangi lemak.' }
      else validationResult = { status: 'danger', title: 'Kolesterol Tinggi', color: 'text-red-700', bgColor: 'bg-gradient-to-br from-red-100 to-red-200', icon: <XCircle className="w-24 h-24 text-red-600" />, message: `${total} mg/dL`, advice: 'Kolesterol tinggi! Segera ke dokter.' }
      
    } else if (healthType === 'asamurat') {
      const val = parseFloat(allData.nilai)
      newReading = { 
        type: 'asamurat', 
        value: allData.nilai, 
        gender: 'pria', 
        timestamp, 
        userId: userInfo.uid,
        userName: userInfo.name, 
        rt: userInfo.rt, 
        rw: userInfo.rw, 
        kelurahan: userInfo.kelurahan 
      }
      
      if (val <= 7) validationResult = { status: 'normal', title: 'Asam Urat Normal', color: 'text-green-700', bgColor: 'bg-gradient-to-br from-green-100 to-green-200', icon: <CheckCircle className="w-24 h-24 text-green-600" />, message: `${val} mg/dL`, advice: 'Asam urat normal. Pertahankan!' }
      else if (val <= 8) validationResult = { status: 'warning', title: 'Asam Urat Batas', color: 'text-yellow-700', bgColor: 'bg-gradient-to-br from-yellow-100 to-yellow-200', icon: <AlertCircle className="w-24 h-24 text-yellow-600" />, message: `${val} mg/dL`, advice: 'Asam urat mendekati tinggi. Hindari jeroan.' }
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
        kelurahan: userInfo.kelurahan 
      }
      
      if (val < 100) validationResult = { status: 'normal', title: 'Gula Darah Normal', color: 'text-green-700', bgColor: 'bg-gradient-to-br from-green-100 to-green-200', icon: <CheckCircle className="w-24 h-24 text-green-600" />, message: `${val} mg/dL`, advice: 'Gula darah normal. Pertahankan!' }
      else if (val < 126) validationResult = { status: 'warning', title: 'Prediabetes', color: 'text-yellow-700', bgColor: 'bg-gradient-to-br from-yellow-100 to-yellow-200', icon: <AlertCircle className="w-24 h-24 text-yellow-600" />, message: `${val} mg/dL`, advice: 'Prediabetes. Kurangi gula dan karbohidrat.' }
      else validationResult = { status: 'danger', title: 'Diabetes', color: 'text-red-700', bgColor: 'bg-gradient-to-br from-red-100 to-red-200', icon: <XCircle className="w-24 h-24 text-red-600" />, message: `${val} mg/dL`, advice: 'Diabetes! Segera ke dokter.' }
    }

    // Save to Firestore
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
    } else {
      router.push('/')
    }
  }

  const handleClose = () => {
    setHealthType(null)
    setStep('select')
    setCurrentInput('')
    setInputIndex(0)
    setData({})
    setResult(null)
    // Stay on current page, just reset to selection screen
  }

  // Selection screen
  if (step === 'select') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-3 sm:p-6 pb-nav">
        <div className="mobile-container">
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-lg sm:shadow-xl p-4 sm:p-8 mb-4 sm:mb-6">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <button onClick={() => router.push('/')} className="bg-gray-200 hover:bg-gray-300 text-gray-700 text-base sm:text-xl font-bold px-4 sm:px-6 py-2 sm:py-3 rounded-xl active:scale-95 transition-all">← Kembali</button>
              <Link href="/riwayat-tensi">
                <button className="bg-blue-100 hover:bg-blue-200 text-blue-700 text-sm sm:text-base font-bold px-3 sm:px-4 py-2 sm:py-3 rounded-xl transition-all flex items-center gap-2">
                  <History className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="hidden sm:inline">Riwayat</span>
                </button>
              </Link>
            </div>

            <div className="text-center mb-6 sm:mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mb-3 shadow-lg">
                <Activity className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Fasca</h1>
              <p className="text-sm sm:text-base text-gray-600">Pilih jenis pemeriksaan</p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {(Object.keys(healthConfig) as HealthType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => { setHealthType(type); setStep('input'); setInputIndex(0); setCurrentInput(''); setData({}) }}
                  className={`p-4 sm:p-6 rounded-2xl bg-gradient-to-br ${healthConfig[type].color} text-white shadow-lg active:scale-95 transition-all text-left`}
                >
                  <span className="text-3xl sm:text-4xl mb-2 block">{healthConfig[type].icon}</span>
                  <h3 className="font-bold text-lg sm:text-xl">{healthConfig[type].title}</h3>
                  <p className="text-xs sm:text-sm opacity-90">{healthConfig[type].fields.length} data</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Result screen
  if (step === 'result' && result) {
    return (
      <div className={`min-h-screen ${result.bgColor} flex items-center justify-center p-6`}>
        <div className="max-w-2xl w-full">
          <div className="bg-white rounded-3xl shadow-2xl p-8 sm:p-12 text-center">
            <div className="flex justify-center mb-6">{result.icon}</div>
            <h1 className={`text-4xl sm:text-5xl font-bold ${result.color} mb-4`}>{result.title}</h1>
            <div className="bg-gray-100 rounded-2xl p-6 sm:p-8 mb-6">
              <p className="text-gray-600 text-xl mb-2">Hasil:</p>
              <p className={`text-5xl sm:text-6xl font-bold ${result.color}`}>{result.message}</p>
            </div>
            <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4 sm:p-6 mb-8">
              <p className="text-lg sm:text-2xl text-gray-800 leading-relaxed">{result.advice}</p>
            </div>
            <div className="flex gap-3">
              <Link href="/riwayat-tensi" className="flex-1">
                <button className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-lg sm:text-xl font-bold py-4 rounded-2xl shadow-lg active:scale-95 transition-all">Lihat Riwayat</button>
              </Link>
              <button onClick={handleClose} className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-lg sm:text-xl font-bold py-4 rounded-2xl shadow-lg active:scale-95 transition-all">Catat Lagi</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Input screen
  const config = healthType ? healthConfig[healthType] : null
  const currentField = config?.fields[inputIndex]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-3 sm:p-6 pb-nav">
      <div className="mobile-container">
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-lg sm:shadow-xl p-4 sm:p-8 mb-4 sm:mb-6">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <button onClick={handleBack} className="bg-gray-200 hover:bg-gray-300 text-gray-700 text-base sm:text-xl font-bold px-4 sm:px-6 py-2 sm:py-3 rounded-xl active:scale-95 transition-all">← Kembali</button>
            <div className="bg-blue-100 text-blue-700 text-lg sm:text-2xl font-bold px-4 sm:px-6 py-2 sm:py-3 rounded-xl">{inputIndex + 1}/{config?.fields.length}</div>
          </div>

          <div className="text-center mb-4 sm:mb-8">
            <div className="flex justify-center mb-2 sm:mb-4 text-blue-600">
              <span className="text-5xl">{config?.icon}</span>
            </div>
            <h2 className="text-xl sm:text-3xl font-bold text-gray-800 mb-1 sm:mb-2">{currentField?.label}</h2>
            <p className="text-sm sm:text-xl text-gray-600">{config?.title} - Step {inputIndex + 1}</p>
          </div>

          <div className="bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl sm:rounded-2xl p-4 sm:p-8 mb-4 sm:mb-6 border-2 sm:border-4 border-blue-300">
            <div className="text-center">
              <p className="text-5xl sm:text-8xl font-bold text-blue-700 min-h-[80px] sm:min-h-[120px] flex items-center justify-center">{currentInput || '---'}</p>
              <p className="text-sm sm:text-2xl text-gray-600 mt-2 sm:mt-4">{currentField?.unit}</p>
            </div>
          </div>

          <div className="flex gap-2 mb-4 sm:mb-6">
            {config?.fields.map((_, i) => (
              <div key={i} className={`flex-1 h-2 sm:h-3 rounded-full ${i <= inputIndex ? 'bg-blue-500' : 'bg-gray-300'}`} />
            ))}
          </div>
        </div>

        <BigNumpad onNumberClick={handleNumber} onDelete={handleDelete} onClear={handleClear} />

        <button
          onClick={handleNext}
          disabled={currentInput.length === 0}
          className={`w-full mt-6 text-2xl sm:text-3xl font-bold py-5 sm:py-6 rounded-2xl shadow-lg active:scale-95 transition-all ${
            currentInput.length === 0 ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white'
          }`}
        >
          {inputIndex === (config?.fields.length || 1) - 1 ? 'Simpan & Lihat Hasil' : 'Lanjut →'}
        </button>
      </div>
    </div>
  )
}
