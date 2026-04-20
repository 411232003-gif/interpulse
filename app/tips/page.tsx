'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Apple, Activity, Dumbbell, Heart, ArrowLeft, Lightbulb, RefreshCw } from 'lucide-react'

interface Tip {
  href: string
  label: string
  icon: any
  description: string
  color: string
}

export default function TipsPage() {
  const [isMobile, setIsMobile] = useState(false)
  const [dailyTip, setDailyTip] = useState('')
  const [currentTipIndex, setCurrentTipIndex] = useState(0)

  const dailyTips = [
    'Minum segelas air hangat setiap pagi untuk memulai metabolisme',
    'Lakukan peregangan ringan setiap 2 jam saat bekerja di depan komputer',
    'Makan buah dan sayur minimal 5 porsi setiap hari',
    'Tidur 7-8 jam setiap malam untuk kesehatan optimal',
    'Jalan kaki 30 menit setiap hari untuk kesehatan jantung',
    'Batasi konsumsi gula dan garam dalam makanan',
    'Luangkan waktu untuk relaksasi dan meditasi setiap hari',
    'Cuci tangan dengan sabun secara teratur',
    'Perbanyak minum air minimal 8 gelas sehari',
    'Hindari makan 3 jam sebelum tidur',
    'Lakukan pemanasan sebelum olahraga',
    'Gunakan tangga daripada lift untuk aktivitas fisik tambahan',
    'Batasi waktu layar gadget untuk kesehatan mata',
    'Konsumsi makanan kaya serat untuk pencernaan sehat',
    'Luangkan waktu untuk hobi yang menyenangkan'
  ]

  const getRandomTip = () => {
    let newIndex
    do {
      newIndex = Math.floor(Math.random() * dailyTips.length)
    } while (newIndex === currentTipIndex && dailyTips.length > 1)
    setCurrentTipIndex(newIndex)
    setDailyTip(dailyTips[newIndex])
  }

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    // Get random tip based on date to keep it consistent for the day
    const today = new Date().getDate()
    const tipIndex = today % dailyTips.length
    setCurrentTipIndex(tipIndex)
    setDailyTip(dailyTips[tipIndex])
  }, [])

  const tips: Tip[] = [
    {
      href: '/edukasi-makanan-bergizi',
      label: 'Edukasi Makanan Bergizi',
      icon: Apple,
      description: 'Panduan nutrisi seimbang',
      color: 'from-green-500 to-emerald-500'
    },
    {
      href: '/edukasi-pola-hidup-sehat',
      label: 'Edukasi Pola Hidup Sehat',
      icon: Activity,
      description: 'Tips gaya hidup sehat',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      href: '/senam-osteoporosis',
      label: 'Senam Osteoporosis',
      icon: Dumbbell,
      description: 'Latihan untuk kesehatan tulang',
      color: 'from-purple-500 to-violet-500'
    },
    {
      href: '/rangkuman-kebugaran',
      label: 'Rangkuman Kebugaran',
      icon: Heart,
      description: 'Ringkasan status kebugaran',
      color: 'from-red-500 to-pink-500'
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 pb-24">
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors" aria-label="Kembali ke beranda">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div className="mt-0">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent mb-2">
              Tips Kesehatan
            </h1>
            <p className="text-base text-gray-600">
              Panduan kesehatan untuk hidup lebih sehat
            </p>
          </div>
        </div>

        {/* Tips Grid */}
        <div className="grid grid-cols-2 gap-4">
          {tips.map((tip, index) => {
            const Icon = tip.icon
            return (
              <Link
                key={index}
                href={tip.href}
                className="group"
              >
                {isMobile ? (
                  // Mobile: Dengan kotak background
                  <div className="bg-white rounded-2xl p-4 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 border border-white/50">
                    <div className="flex flex-col items-center gap-2">
                      <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${tip.color} p-3 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className="w-full h-full text-white" />
                      </div>
                      <div className="text-center">
                        <h3 className="text-sm font-bold text-gray-800 group-hover:text-teal-600 transition-colors">
                          {tip.label}
                        </h3>
                        <p className="text-[10px] text-gray-600 line-clamp-2">
                          {tip.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Desktop: Card style
                  <div className="bg-white rounded-2xl p-4 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 border border-white/50">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${tip.color} p-2.5 mb-3 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className="w-full h-full text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800 mb-1 group-hover:text-teal-600 transition-colors">
                      {tip.label}
                    </h3>
                    <p className="text-xs text-gray-600 line-clamp-2">
                      {tip.description}
                    </p>
                  </div>
                )}
              </Link>
            )
          })}
        </div>

        {/* Daily Health Tip */}
        <div className="mt-6 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-2xl p-6 shadow-md border border-amber-200">
          <div className="flex items-start gap-4">
            <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-full p-3 shadow-md flex-shrink-0">
              <Lightbulb className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-bold text-gray-800">Tips Kesehatan Hari Ini</h3>
                <button
                  onClick={getRandomTip}
                  className="flex items-center gap-1 text-amber-600 hover:text-amber-800 transition-colors text-sm font-medium"
                  aria-label="Ganti tips"
                >
                  <RefreshCw className="w-4 h-4" />
                  Ganti
                </button>
              </div>
              <p className="text-gray-700">{dailyTip}</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
