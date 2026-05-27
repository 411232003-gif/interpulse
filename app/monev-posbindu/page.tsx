'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { Users, Activity } from 'lucide-react'

export default function MonevPosbindu() {
  const { isAdmin, loading } = useAuth()
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat...</p>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md text-center">
          <p className="text-gray-600 mb-4">Halaman ini hanya untuk admin.</p>
          <Link href="/" className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors">
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    )
  }

  const featureCards = [
    {
      title: 'Data Warga',
      description: 'Kelola data warga dan riwayat kesehatan',
      href: '/posbindu-monitoring',
      icon: Users,
      gradient: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Trafik',
      description: 'Export Laporan',
      href: '/monitoring',
      icon: Activity,
      gradient: 'from-indigo-500 to-purple-500',
      bgColor: 'bg-indigo-50'
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 pb-20">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className={`${isMobile ? 'text-2xl' : 'text-4xl'} font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent`}>
            Monev Posbindu
          </h1>
          <p className={`${isMobile ? 'text-gray-600' : 'text-lg text-gray-600'} mt-2`}>Monitoring dan evaluasi Posbindu</p>
        </div>

        {/* Feature Cards */}
        <div className={isMobile ? 'grid gap-3 grid-cols-1' : 'grid gap-6 grid-cols-2'}>
          {featureCards.map((card, index) => {
            const Icon = card.icon
            return (
              <Link
                key={index}
                href={card.href}
                className="group"
              >
                {isMobile ? (
                  <div className={`${card.bgColor} rounded-2xl p-4 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 border border-white/50 h-32 flex items-center justify-center`}>
                    <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${card.gradient} p-3 shadow-lg group-hover:scale-110 transition-transform duration-300 flex-shrink-0 mr-3`}>
                      <Icon className="w-full h-full text-white" />
                    </div>
                    <div className="flex-1 text-left">
                      <h3 className="text-base font-bold text-gray-800 group-hover:text-teal-600 transition-colors">
                        {card.title}
                      </h3>
                      <p className="text-sm text-gray-600 line-clamp-1">
                        {card.description}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className={`${card.bgColor} rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 border border-white/50`}>
                    <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${card.gradient} p-5 shadow-lg group-hover:scale-110 transition-transform duration-300 mx-auto mb-4`}>
                      <Icon className="w-full h-full text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 group-hover:text-teal-600 transition-colors text-center">
                      {card.title}
                    </h3>
                    <p className="text-base text-gray-600 mt-3 text-center">
                      {card.description}
                    </p>
                  </div>
                )}
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
