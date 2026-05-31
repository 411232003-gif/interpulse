'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import BigNumpad from '@/components/BigNumpad'
import { Activity, CheckCircle, AlertCircle, XCircle, Download, MoreVertical, FileText, MessageCircle, Trash2, ArrowLeft } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

type HealthType = 'tensi' | 'kolesterol' | 'asamurat' | 'guladarah'
type Step = 'select' | 'input' | 'result'

interface HealthReading {
  id: string
  type: HealthType
  timestamp: string
  data: Record<string, string>
  result: any
}

export default function FascaCatatan() {
  const router = useRouter()
  const { userProfile, loading: authLoading } = useAuth()

  const [healthType, setHealthType] = useState<HealthType | null>(null)
  const [step, setStep] = useState<Step>('select')
  const [currentInput, setCurrentInput] = useState('')
  const [inputIndex, setInputIndex] = useState(0)
  const [saving, setSaving] = useState(false)
  const [data, setData] = useState<Record<string, string>>({})
  const [result, setResult] = useState<any>(null)
  const [healthReadings, setHealthReadings] = useState<HealthReading[]>([])
  const [showExportDropdown, setShowExportDropdown] = useState(false)

  // Load health readings from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('fascaUserReadings')
    if (saved) {
      try {
        setHealthReadings(JSON.parse(saved))
      } catch (e) {
        console.error('Error parsing fascaUserReadings:', e)
        localStorage.removeItem('fascaUserReadings')
      }
    }
  }, [])

  // Save health readings to localStorage
  useEffect(() => {
    if (healthReadings.length > 0) {
      localStorage.setItem('fascaUserReadings', JSON.stringify(healthReadings))
    }
  }, [healthReadings])

  // Show loading while auth state is being determined
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat...</p>
        </div>
      </div>
    )
  }

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

  // Validation functions
  const validateBloodPressure = (sys: number, dia: number) => {
    if (sys < 90 || dia < 60) return { title: 'Hipotensi', color: 'text-yellow-600', bgColor: 'bg-yellow-50', icon: <AlertCircle className="w-16 h-16 text-yellow-600" />, message: 'Tekanan Darah Rendah', advice: 'Perbanyak konsumsi air dan garam, istirahat yang cukup' }
    if (sys >= 120 && sys <= 130 && dia >= 70 && dia <= 85) return { title: 'Normal', color: 'text-green-600', bgColor: 'bg-green-50', icon: <CheckCircle className="w-16 h-16 text-green-600" />, message: 'Tekanan Darah Normal', advice: 'Pertahankan pola hidup sehat' }
    if (sys >= 130 && sys <= 139 && dia >= 85 && dia <= 89) return { title: 'Pra-Hipertensi', color: 'text-yellow-600', bgColor: 'bg-yellow-50', icon: <AlertCircle className="w-16 h-16 text-yellow-600" />, message: 'Pra-Hipertensi', advice: 'Kurangi garam dan konsumsi makanan sehat' }
    if (sys > 140 || dia > 90) return { title: 'Hipertensi', color: 'text-red-600', bgColor: 'bg-red-50', icon: <XCircle className="w-16 h-16 text-red-600" />, message: 'Hipertensi', advice: 'Segera konsultasi dokter' }
    return { title: 'Perlu Perhatian', color: 'text-orange-600', bgColor: 'bg-orange-50', icon: <AlertCircle className="w-16 h-16 text-orange-600" />, message: 'Perlu Monitoring', advice: 'Pantau tekanan darah secara rutin' }
  }

  const validateBloodSugar = (nilai: number) => {
    if (nilai < 70) return { title: 'Hipoglikemia', color: 'text-red-600', bgColor: 'bg-red-50', icon: <XCircle className="w-16 h-16 text-red-600" />, message: 'Gula Darah Rendah', advice: 'Segera konsumsi makanan manis' }
    if (nilai < 100) return { title: 'Normal', color: 'text-green-600', bgColor: 'bg-green-50', icon: <CheckCircle className="w-16 h-16 text-green-600" />, message: 'Gula Darah Normal', advice: 'Pertahankan pola makan sehat' }
    if (nilai < 126) return { title: 'Pra-Diabetes', color: 'text-yellow-600', bgColor: 'bg-yellow-50', icon: <AlertCircle className="w-16 h-16 text-yellow-600" />, message: 'Pra-Diabetes', advice: 'Kurangi gula dan karbohidrat' }
    return { title: 'Diabetes', color: 'text-red-600', bgColor: 'bg-red-50', icon: <XCircle className="w-16 h-16 text-red-600" />, message: 'Diabetes', advice: 'Segera konsultasi dokter' }
  }

  const validateCholesterol = (total: number) => {
    if (total < 200) return { title: 'Normal', color: 'text-green-600', bgColor: 'bg-green-50', icon: <CheckCircle className="w-16 h-16 text-green-600" />, message: 'Kolesterol Normal', advice: 'Pertahankan pola makan sehat' }
    return { title: 'Tinggi', color: 'text-red-600', bgColor: 'bg-red-50', icon: <XCircle className="w-16 h-16 text-red-600" />, message: 'Kolesterol Tinggi', advice: 'Konsultasi dokter, kurangi makanan berlemak' }
  }

  const validateUricAcid = (nilai: number, gender: string) => {
    const isMale = gender === 'L' || gender === 'Laki-laki'
    const threshold = isMale ? 7 : 6
    if (nilai <= threshold) return { title: 'Normal', color: 'text-green-600', bgColor: 'bg-green-50', icon: <CheckCircle className="w-16 h-16 text-green-600" />, message: 'Asam Urat Normal', advice: 'Pertahankan pola makan sehat' }
    return { title: 'Tinggi', color: 'text-red-600', bgColor: 'bg-red-50', icon: <XCircle className="w-16 h-16 text-red-600" />, message: 'Asam Urat Tinggi', advice: 'Konsultasi dokter, kurangi makanan purin' }
  }

  // CRUD functions
  const handleDeleteReading = (readingId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus data ini?')) return
    setHealthReadings(prev => prev.filter(r => r.id !== readingId))
  }

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

  const saveData = (allData: Record<string, string>) => {
    setSaving(true)
    const timestamp = new Date().toISOString()

    let validationResult: any = null

    // Validate based on health type
    if (healthType === 'tensi') {
      const sys = parseInt(allData.sistolik)
      const dia = parseInt(allData.diastolik)
      validationResult = validateBloodPressure(sys, dia)
    } else if (healthType === 'guladarah') {
      const nilai = parseInt(allData.nilai)
      validationResult = validateBloodSugar(nilai)
    } else if (healthType === 'kolesterol') {
      const total = parseInt(allData.total)
      validationResult = validateCholesterol(total)
    } else if (healthType === 'asamurat') {
      const nilai = parseInt(allData.nilai)
      const gender = userProfile?.gender || 'L'
      validationResult = validateUricAcid(nilai, gender)
    }

    const newReading: HealthReading = {
      id: Date.now().toString(),
      type: healthType!,
      timestamp,
      data: allData,
      result: validationResult
    }

    setHealthReadings(prev => [newReading, ...prev])
    setResult(validationResult)
    setStep('result')
    setSaving(false)
  }

  const resetForm = () => {
    setHealthType(null)
    setStep('select')
    setCurrentInput('')
    setInputIndex(0)
    setData({})
    setResult(null)
  }

  // Export functions
  const exportToPDF = () => {
    if (!userProfile) return
    
    const doc = new jsPDF()
    doc.setFontSize(18)
    doc.text(`FASCA - Catatan Kesehatan Pribadi`, 14, 20)
    doc.setFontSize(11)
    doc.text(`Nama: ${userProfile.name}`, 14, 30)
    doc.text(`NIK: ${userProfile.nik}`, 14, 38)
    doc.text(`Tanggal Export: ${new Date().toLocaleDateString('id-ID')}`, 14, 46)
    doc.text(`Catatan: Data ini hanya tersimpan di browser dan akan hilang saat logout`, 14, 54)
    
    const tableData = healthReadings.map(r => [
      new Date(r.timestamp).toLocaleDateString('id-ID'),
      healthConfig[r.type].title,
      r.type === 'tensi' ? `${r.data.sistolik}/${r.data.diastolik} mmHg` :
      r.type === 'kolesterol' ? `${r.data.total} mg/dL` :
      `${r.data.nilai} mg/dL`,
      r.result?.title || '-'
    ])
    
    autoTable(doc, {
      head: [['Tanggal', 'Jenis Pemeriksaan', 'Nilai', 'Hasil']],
      body: tableData,
      startY: 65,
    })
    
    doc.save(`fasca-catatan-${userProfile.name}.pdf`)
    setShowExportDropdown(false)
  }

  const exportToExcel = () => {
    if (!userProfile) return
    
    const excelData = healthReadings.map(r => ({
      Tanggal: new Date(r.timestamp).toLocaleDateString('id-ID'),
      Jenis: healthConfig[r.type].title,
      Nilai: r.type === 'tensi' ? `${r.data.sistolik}/${r.data.diastolik} mmHg` :
             r.type === 'kolesterol' ? `${r.data.total} mg/dL` :
             `${r.data.nilai} mg/dL`,
      Hasil: r.result?.title || '-'
    }))
    
    const ws = XLSX.utils.json_to_sheet(excelData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Catatan Kesehatan')
    XLSX.writeFile(wb, `fasca-catatan-${userProfile.name}.xlsx`)
    setShowExportDropdown(false)
  }

  const exportToWhatsApp = () => {
    if (!userProfile) return
    
    let message = `*FASCA - Catatan Kesehatan Pribadi*\n`
    message += `Nama: ${userProfile.name}\n`
    message += `NIK: ${userProfile.nik}\n`
    message += `Tanggal Export: ${new Date().toLocaleDateString('id-ID')}\n\n`
    message += `*Data Kesehatan:*\n\n`
    
    healthReadings.forEach(r => {
      message += `📅 ${new Date(r.timestamp).toLocaleDateString('id-ID')}\n`
      message += `🏥 ${healthConfig[r.type].title}\n`
      message += `📊 ${r.type === 'tensi' ? `${r.data.sistolik}/${r.data.diastolik} mmHg` :
                 r.type === 'kolesterol' ? `${r.data.total} mg/dL` :
                 `${r.data.nilai} mg/dL`}\n`
      message += `✅ ${r.result?.title || '-'}\n\n`
    })
    
    const encodedMessage = encodeURIComponent(message)
    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank')
    setShowExportDropdown(false)
  }

  if (step === 'select') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-6 flex items-center gap-4">
            <button
              onClick={() => router.push('/')}
              className="p-2 rounded-lg bg-white shadow-md hover:bg-gray-50 transition-colors"
              title="Kembali ke Beranda"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">FASCA</h1>
              <p className="text-gray-600 mt-1">Fasilitas Catatan - Catatan Kesehatan Pribadi</p>
            </div>
          </div>

          {/* Health Type Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {(Object.keys(healthConfig) as HealthType[]).map((type) => {
              const config = healthConfig[type]
              return (
                <button
                  key={type}
                  onClick={() => {
                    setHealthType(type)
                    setStep('input')
                  }}
                  className={`bg-gradient-to-br ${config.color} text-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105`}
                >
                  <div className="text-4xl mb-3">{config.icon}</div>
                  <h3 className="text-xl font-bold">{config.title}</h3>
                </button>
              )
            })}
          </div>

          {/* History */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">Riwayat Catatan</h2>
              <div className="relative">
                <button
                  onClick={() => setShowExportDropdown(!showExportDropdown)}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Export
                </button>
                {showExportDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border z-10">
                    <button onClick={exportToPDF} className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2">
                      <FileText className="w-4 h-4" /> PDF
                    </button>
                    <button onClick={exportToExcel} className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2">
                      <FileText className="w-4 h-4" /> Excel
                    </button>
                    <button onClick={exportToWhatsApp} className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2">
                      <MessageCircle className="w-4 h-4" /> WhatsApp
                    </button>
                  </div>
                )}
              </div>
            </div>

            {healthReadings.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Belum ada catatan kesehatan</p>
            ) : (
              <div className="space-y-3">
                {healthReadings.map((reading) => (
                  <div key={reading.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{healthConfig[reading.type].icon}</span>
                        <div>
                          <p className="font-semibold text-gray-800">{healthConfig[reading.type].title}</p>
                          <p className="text-sm text-gray-500">{new Date(reading.timestamp).toLocaleDateString('id-ID')}</p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {reading.type === 'tensi' ? `${reading.data.sistolik}/${reading.data.diastolik} mmHg` :
                         reading.type === 'kolesterol' ? `${reading.data.total} mg/dL` :
                         `${reading.data.nilai} mg/dL`}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${reading.result?.bgColor} ${reading.result?.color}`}>
                        {reading.result?.title}
                      </span>
                      <button
                        onClick={() => handleDeleteReading(reading.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Hapus catatan"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (step === 'input') {
    const config = healthConfig[healthType!]
    const currentField = config.fields[inputIndex]

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 flex items-center justify-center">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">{config.title}</h2>
                <p className="text-gray-500">{currentField.label}</p>
              </div>
              <span className="text-4xl">{config.icon}</span>
            </div>

            <div className="mb-6">
              <div className="bg-gray-100 rounded-xl p-4 mb-4">
                <input
                  type="text"
                  value={currentInput}
                  readOnly
                  className="w-full text-center text-3xl font-bold bg-transparent outline-none"
                  placeholder="0"
                />
                <p className="text-center text-gray-500 text-sm mt-2">{currentField.unit}</p>
              </div>

              <BigNumpad
                onNumberClick={handleNumber}
                onDelete={handleDelete}
                onClear={handleClear}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={resetForm}
                className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-300 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleNext}
                disabled={currentInput.length === 0 || saving}
                className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-600 hover:to-indigo-700 transition-all disabled:opacity-50"
              >
                {saving ? 'Menyimpan...' : inputIndex < config.fields.length - 1 ? 'Lanjut' : 'Selesai'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (step === 'result') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 flex items-center justify-center">
        <div className="max-w-md w-full">
          <div className={`bg-white rounded-2xl shadow-xl p-8 ${result?.bgColor}`}>
            <div className="text-center">
              <div className="flex justify-center mb-4">
                {result?.icon}
              </div>
              <h2 className={`text-3xl font-bold ${result?.color} mb-2`}>{result?.title}</h2>
              <p className="text-gray-600 mb-4">{result?.message}</p>
              <p className="text-sm text-gray-500 mb-6">{result?.advice}</p>

              <button
                onClick={resetForm}
                className="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-600 hover:to-indigo-700 transition-all"
              >
                Input Lagi
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return null
}
