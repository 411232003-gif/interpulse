'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import BigNumpad from '@/components/BigNumpad'
import { Heart, Activity, TrendingUp, CheckCircle, AlertCircle, XCircle, History } from 'lucide-react'

type InputStep = 'sistolik' | 'diastolik' | 'nadi' | 'result'

interface TensiReading {
  sistolik: string
  diastolik: string
  nadi: string
  timestamp: Date
}

interface ValidationResult {
  status: 'normal' | 'prehipertensi' | 'hipertensi' | 'rendah'
  color: string
  bgColor: string
  icon: React.ReactNode
  title: string
  message: string
  advice: string
}

export default function CatatTensi() {
  const router = useRouter()
  const [step, setStep] = useState<InputStep>('sistolik')
  const [sistolik, setSistolik] = useState('')
  const [diastolik, setDiastolik] = useState('')
  const [nadi, setNadi] = useState('')
  const [result, setResult] = useState<ValidationResult | null>(null)

  const handleNumberClick = (num: string) => {
    if (step === 'sistolik') {
      if (sistolik.length < 3) setSistolik(sistolik + num)
    } else if (step === 'diastolik') {
      if (diastolik.length < 3) setDiastolik(diastolik + num)
    } else if (step === 'nadi') {
      if (nadi.length < 3) setNadi(nadi + num)
    }
  }

  const handleDelete = () => {
    if (step === 'sistolik') {
      setSistolik(sistolik.slice(0, -1))
    } else if (step === 'diastolik') {
      setDiastolik(diastolik.slice(0, -1))
    } else if (step === 'nadi') {
      setNadi(nadi.slice(0, -1))
    }
  }

  const handleClear = () => {
    if (step === 'sistolik') {
      setSistolik('')
    } else if (step === 'diastolik') {
      setDiastolik('')
    } else if (step === 'nadi') {
      setNadi('')
    }
  }

  const validateAndSave = () => {
    const sys = parseInt(sistolik)
    const dia = parseInt(diastolik)
    const pulse = parseInt(nadi)

    let validationResult: ValidationResult

    // Validasi berdasarkan standar medis
    if (sys < 90 || dia < 60) {
      // Tensi Rendah
      validationResult = {
        status: 'rendah',
        color: 'text-blue-700',
        bgColor: 'bg-gradient-to-br from-blue-100 to-blue-200',
        icon: <AlertCircle className="w-24 h-24 text-blue-600" />,
        title: 'Tensi Rendah',
        message: `${sys}/${dia} mmHg`,
        advice: 'Tensi Ibu agak rendah. Jangan lupa makan teratur dan minum air putih yang cukup ya, Bu!'
      }
    } else if (sys < 120 && dia < 80) {
      // Normal
      validationResult = {
        status: 'normal',
        color: 'text-green-700',
        bgColor: 'bg-gradient-to-br from-green-100 to-green-200',
        icon: <CheckCircle className="w-24 h-24 text-green-600" />,
        title: 'Tensi Normal',
        message: `${sys}/${dia} mmHg`,
        advice: 'Bagus sekali, Bu! Tensi Ibu normal. Pertahankan pola hidup sehat ya!'
      }
    } else if (sys < 140 && dia < 90) {
      // Pra-Hipertensi
      validationResult = {
        status: 'prehipertensi',
        color: 'text-yellow-700',
        bgColor: 'bg-gradient-to-br from-yellow-100 to-yellow-200',
        icon: <AlertCircle className="w-24 h-24 text-yellow-600" />,
        title: 'Tensi Agak Tinggi',
        message: `${sys}/${dia} mmHg`,
        advice: 'Tensi Ibu agak tinggi, Bu. Kurangi makanan asin dan gorengan hari ini ya. Jangan lupa olahraga ringan!'
      }
    } else {
      // Hipertensi
      validationResult = {
        status: 'hipertensi',
        color: 'text-red-700',
        bgColor: 'bg-gradient-to-br from-red-100 to-red-200',
        icon: <XCircle className="w-24 h-24 text-red-600" />,
        title: 'Tensi Tinggi',
        message: `${sys}/${dia} mmHg`,
        advice: 'Tensi Ibu tinggi, Bu! Segera istirahat dan minum obat jika sudah waktunya. Jika tidak membaik, hubungi dokter ya!'
      }
    }

    // Simpan ke localStorage
    const reading: TensiReading = {
      sistolik,
      diastolik,
      nadi,
      timestamp: new Date()
    }

    const existingData = localStorage.getItem('tensiReadings')
    const readings = existingData ? JSON.parse(existingData) : []
    readings.push(reading)
    localStorage.setItem('tensiReadings', JSON.stringify(readings))

    setResult(validationResult)
    setStep('result')
  }

  const handleNext = () => {
    if (step === 'sistolik' && sistolik.length > 0) {
      setStep('diastolik')
    } else if (step === 'diastolik' && diastolik.length > 0) {
      setStep('nadi')
    } else if (step === 'nadi' && nadi.length > 0) {
      validateAndSave()
    }
  }

  const handleBack = () => {
    if (step === 'diastolik') {
      setStep('sistolik')
    } else if (step === 'nadi') {
      setStep('diastolik')
    } else if (step === 'sistolik') {
      router.push('/')
    }
  }

  const handleClose = () => {
    // Reset semua
    setSistolik('')
    setDiastolik('')
    setNadi('')
    setResult(null)
    setStep('sistolik')
    router.push('/')
  }

  const getCurrentValue = () => {
    if (step === 'sistolik') return sistolik
    if (step === 'diastolik') return diastolik
    if (step === 'nadi') return nadi
    return ''
  }

  const getCurrentLabel = () => {
    if (step === 'sistolik') return 'Angka Atas (Sistolik)'
    if (step === 'diastolik') return 'Angka Bawah (Diastolik)'
    if (step === 'nadi') return 'Detak Jantung (Nadi)'
    return ''
  }

  const getCurrentIcon = () => {
    if (step === 'sistolik') return <TrendingUp className="w-12 h-12" />
    if (step === 'diastolik') return <Activity className="w-12 h-12" />
    if (step === 'nadi') return <Heart className="w-12 h-12" />
    return null
  }

  const getStepNumber = () => {
    if (step === 'sistolik') return '1'
    if (step === 'diastolik') return '2'
    if (step === 'nadi') return '3'
    return ''
  }

  if (step === 'result' && result) {
    return (
      <div className={`min-h-screen ${result.bgColor} flex items-center justify-center p-6`}>
        <div className="max-w-2xl w-full">
          <div className="bg-white rounded-3xl shadow-2xl p-12 text-center">
            <div className="flex justify-center mb-6">
              {result.icon}
            </div>
            
            <h1 className={`text-5xl font-bold ${result.color} mb-4`}>
              {result.title}
            </h1>
            
            <div className="bg-gray-100 rounded-2xl p-8 mb-6">
              <p className="text-gray-600 text-2xl mb-2">Hasil Pengukuran:</p>
              <p className={`text-6xl font-bold ${result.color}`}>
                {result.message}
              </p>
              <p className="text-gray-600 text-xl mt-4">
                Nadi: {nadi} bpm
              </p>
            </div>

            <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6 mb-8">
              <p className="text-2xl text-gray-800 leading-relaxed">
                {result.advice}
              </p>
            </div>

            <div className="flex gap-3">
              <Link href="/riwayat-tensi" className="flex-1">
                <button className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-xl font-bold py-4 rounded-2xl shadow-lg active:scale-95 transition-all duration-150">
                  Lihat Riwayat
                </button>
              </Link>
              <button
                onClick={handleClose}
                className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-xl font-bold py-4 rounded-2xl shadow-lg active:scale-95 transition-all duration-150"
              >
                Catat Lagi
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-3 sm:p-6 pb-nav">
      <div className="mobile-container">
        {/* Header - Mobile Optimized */}
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-lg sm:shadow-xl p-4 sm:p-8 mb-4 sm:mb-6">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <button
              onClick={handleBack}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 text-base sm:text-xl font-bold px-4 sm:px-6 py-2 sm:py-3 rounded-xl active:scale-95 transition-all duration-150 touch-target"
            >
              ← Kembali
            </button>
            <div className="flex items-center gap-2">
              <Link href="/riwayat-tensi">
                <button className="bg-blue-100 hover:bg-blue-200 text-blue-700 text-sm sm:text-base font-bold px-3 sm:px-4 py-2 sm:py-3 rounded-xl transition-all duration-150 touch-target flex items-center gap-2">
                  <History className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="hidden sm:inline">Riwayat</span>
                </button>
              </Link>
              <div className="bg-blue-100 text-blue-700 text-lg sm:text-2xl font-bold px-4 sm:px-6 py-2 sm:py-3 rounded-xl">
                {getStepNumber()}/3
              </div>
            </div>
          </div>

          <div className="text-center mb-4 sm:mb-8">
            <div className="flex justify-center mb-2 sm:mb-4 text-blue-600">
              {getCurrentIcon()}
            </div>
            <h2 className="text-xl sm:text-3xl font-bold text-gray-800 mb-1 sm:mb-2">
              {getCurrentLabel()}
            </h2>
            <p className="text-sm sm:text-xl text-gray-600">
              Masukkan angka dengan menekan tombol
            </p>
          </div>

          {/* Display Box - Mobile Optimized */}
          <div className="bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl sm:rounded-2xl p-4 sm:p-8 mb-4 sm:mb-6 border-2 sm:border-4 border-blue-300">
            <div className="text-center">
              <p className="text-5xl sm:text-8xl font-bold text-blue-700 min-h-[80px] sm:min-h-[120px] flex items-center justify-center">
                {getCurrentValue() || '---'}
              </p>
              <p className="text-sm sm:text-2xl text-gray-600 mt-2 sm:mt-4">
                {step === 'sistolik' && 'mmHg (Tekanan Atas)'}
                {step === 'diastolik' && 'mmHg (Tekanan Bawah)'}
                {step === 'nadi' && 'bpm (Detak per Menit)'}
              </p>
            </div>
          </div>

          {/* Progress Indicator */}
          <div className="flex gap-2 mb-4 sm:mb-6">
            <div className={`flex-1 h-2 sm:h-3 rounded-full ${step === 'sistolik' || step === 'diastolik' || step === 'nadi' ? 'bg-blue-500' : 'bg-gray-300'}`} />
            <div className={`flex-1 h-2 sm:h-3 rounded-full ${step === 'diastolik' || step === 'nadi' ? 'bg-blue-500' : 'bg-gray-300'}`} />
            <div className={`flex-1 h-2 sm:h-3 rounded-full ${step === 'nadi' ? 'bg-blue-500' : 'bg-gray-300'}`} />
          </div>
        </div>

        {/* Numpad */}
        <BigNumpad
          onNumberClick={handleNumberClick}
          onDelete={handleDelete}
          onClear={handleClear}
        />

        {/* Next Button */}
        <button
          onClick={handleNext}
          disabled={getCurrentValue().length === 0}
          className={`w-full mt-6 text-3xl font-bold py-6 rounded-2xl shadow-lg active:scale-95 transition-all duration-150 ${
            getCurrentValue().length === 0
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white'
          }`}
        >
          {step === 'nadi' ? 'Simpan & Lihat Hasil' : 'Lanjut →'}
        </button>
      </div>
    </div>
  )
}
