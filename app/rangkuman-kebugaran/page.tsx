'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, AlertCircle, Scale, Ruler, Activity, TrendingUp } from 'lucide-react'

export default function RangkumanKebugaran() {
  const [isMobile, setIsMobile] = useState(false)
  const [height, setHeight] = useState('')
  const [weight, setWeight] = useState('')
  const [bmi, setBmi] = useState<number | null>(null)
  const [bmiCategory, setBmiCategory] = useState('')
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const calculateBMI = () => {
    const h = parseFloat(height)
    const w = parseFloat(weight)
    
    if (h && w && h > 0) {
      const heightInMeters = h / 100
      const bmiValue = w / (heightInMeters * heightInMeters)
      setBmi(bmiValue)
      
      let category = ''
      if (bmiValue < 18.5) category = 'Kurus'
      else if (bmiValue < 25) category = 'Normal'
      else if (bmiValue < 30) category = 'Gemuk'
      else category = 'Obesitas'
      
      setBmiCategory(category)
      
      // Trigger animation
      setIsAnimating(true)
      setTimeout(() => setIsAnimating(false), 1000)
    }
  }

  const idealWeight = () => {
    const h = parseFloat(height)
    if (h) {
      const heightInMeters = h / 100
      const minIdeal = 18.5 * (heightInMeters * heightInMeters)
      const maxIdeal = 24.9 * (heightInMeters * heightInMeters)
      return `${minIdeal.toFixed(1)} - ${maxIdeal.toFixed(1)} kg`
    }
    return '-'
  }

  const features = [
    {
      icon: AlertCircle,
      title: 'Risiko Kesehatan',
      description: 'Cek risiko penyakit berdasarkan kondisi fisik',
      color: 'from-red-500 to-orange-500',
      bgColor: 'bg-red-50'
    },
    {
      icon: Scale,
      title: 'Atur Berat Badan',
      description: 'Target dan rencana penurunan berat badan',
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-blue-50'
    },
    {
      icon: Activity,
      title: 'Cek Berat & Tinggi',
      description: 'Kalkulator BMI dengan animasi',
      color: 'from-green-500 to-emerald-500',
      bgColor: 'bg-green-50'
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 pb-24">
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <Link href="/tips" className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors" aria-label="Kembali ke tips">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div className="mt-0">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent mb-2">
              Rangkuman Kebugaran
            </h1>
            <p className="text-base text-gray-600">
              Pantau dan kelola kesehatan fisik Anda
            </p>
          </div>
        </div>

        {/* Features Grid */}
        <div className={isMobile ? "grid grid-cols-2 gap-4 mb-6" : "grid grid-cols-3 gap-4 mb-6"}>
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <Link
                key={index}
                href="#"
                className="group"
                onClick={(e) => {
                  e.preventDefault()
                  if (index === 2) {
                    document.getElementById('bmi-calculator')?.scrollIntoView({ behavior: 'smooth' })
                  }
                }}
              >
                <div className={`${feature.bgColor} rounded-2xl p-4 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 border border-white/50`}>
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} p-2.5 mb-3 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="w-full h-full text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-800 mb-1 group-hover:text-teal-600 transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-xs text-gray-600 line-clamp-2">
                    {feature.description}
                  </p>
                </div>
              </Link>
            )
          })}
        </div>

        {/* BMI Calculator Section */}
        <div id="bmi-calculator" className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Activity className="w-6 h-6 text-teal-600" />
            Kalkulator BMI
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Tinggi Badan (cm)
                </label>
                <input
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  placeholder="Contoh: 170"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Berat Badan (kg)
                </label>
                <input
                  type="number"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="Contoh: 65"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all"
                />
              </div>
              <button
                onClick={calculateBMI}
                className="w-full bg-gradient-to-r from-teal-600 to-cyan-600 text-white py-3 rounded-xl font-semibold hover:from-teal-700 hover:to-cyan-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                Hitung BMI
              </button>
            </div>

            <div className="flex flex-col items-center justify-center">
              {bmi !== null ? (
                <div className={`text-center transition-all duration-1000 ${isAnimating ? 'scale-110' : 'scale-100'}`}>
                  <div className="mb-4">
                    <div className="text-6xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent mb-2">
                      {bmi.toFixed(1)}
                    </div>
                    <div className="text-2xl font-semibold text-gray-800 mb-2">
                      {bmiCategory}
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 w-full">
                    <div className="flex items-center gap-2 mb-2">
                      <Ruler className="w-5 h-5 text-teal-600" />
                      <span className="text-sm text-gray-600">Berat Ideal:</span>
                    </div>
                    <div className="text-lg font-bold text-teal-600">
                      {idealWeight()}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-400">
                  <Scale className="w-24 h-24 mx-auto mb-4 opacity-50" />
                  <p>Masukkan tinggi dan berat badan</p>
                  <p>untuk menghitung BMI</p>
                </div>
              )}
            </div>
          </div>

          {/* BMI Scale */}
          {bmi !== null && (
            <div className="mt-6">
              <div className="h-4 bg-gradient-to-r from-blue-400 via-green-400 via-yellow-400 to-red-400 rounded-full relative">
                <div
                  className={`absolute w-1 h-6 bg-gray-800 top-1/2 transform -translate-y-1/2 transition-all duration-1000`}
                  style={{ left: `${Math.min(Math.max((bmi - 15) / 20 * 100, 0), 100)}%` }}
                />
              </div>
              <div className="flex justify-between mt-2 text-xs text-gray-600">
                <span>Kurus</span>
                <span>Normal</span>
                <span>Gemuk</span>
                <span>Obesitas</span>
              </div>
            </div>
          )}
        </div>

        {/* Risk Assessment */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <AlertCircle className="w-6 h-6 text-red-500" />
            Risiko Kesehatan
          </h2>
          
          <div className="space-y-4">
            <div className="bg-red-50 rounded-xl p-4 border border-red-200">
              <h3 className="font-semibold text-red-800 mb-2">Obesitas</h3>
              <p className="text-sm text-red-700">
                Risiko penyakit jantung, diabetes, dan stroke meningkat
              </p>
            </div>
            <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
              <h3 className="font-semibold text-yellow-800 mb-2">Gemuk</h3>
              <p className="text-sm text-yellow-700">
                Risiko penyakit metabolik dan gangguan sendi
              </p>
            </div>
            <div className="bg-green-50 rounded-xl p-4 border border-green-200">
              <h3 className="font-semibold text-green-800 mb-2">Normal</h3>
              <p className="text-sm text-green-700">
                Risiko penyakit kronik rendah, pertahankan gaya hidup sehat
              </p>
            </div>
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
              <h3 className="font-semibold text-blue-800 mb-2">Kurus</h3>
              <p className="text-sm text-blue-700">
                Risiko kekurangan gizi dan gangguan sistem kekebalan
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
