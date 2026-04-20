'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Activity, Heart, Flame, History, PlayCircle, Music, ArrowLeft, CheckCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth-context'

interface Feature {
  href: string
  label: string
  icon: any
  description: string
  color: string
}

export default function FiturPage() {
  const { isAdmin } = useAuth()
  const [mounted, setMounted] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useState(() => {
    setMounted(true)
  })

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  if (!mounted) return null

  const features: Feature[] = [
    { 
      href: '/kalori-tracker', 
      label: 'Kalori', 
      icon: Flame, 
      description: 'Track kalori harian',
      color: 'from-orange-500 to-red-500'
    },
    { 
      href: '/deteksi-jantung', 
      label: 'Skrining', 
      icon: Heart, 
      description: 'Deteksi penyakit jantung',
      color: 'from-red-500 to-pink-500'
    },
    { 
      href: '/musik-relaksasi', 
      label: 'Musik', 
      icon: Music, 
      description: 'Musik relaksasi',
      color: 'from-indigo-500 to-purple-500'
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50">
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Link href="/" className="p-3 hover:bg-white/50 rounded-full ml-2" aria-label="Kembali ke beranda">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Fitur Tersedia</h1>
            <p className="text-gray-600">Pilih fitur yang ingin Anda gunakan</p>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <Link key={feature.href} href={feature.href}>
                {isMobile ? (
                  // Mobile: Minimalis tanpa kotak dengan description
                  <div className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-white/50 transition-all">
                    <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${feature.color} p-3 shadow-lg hover:scale-110 transition-transform duration-300`}>
                      <Icon className="w-full h-full text-white" />
                    </div>
                    <div className="text-center">
                      <h3 className="text-sm font-bold text-gray-800">{feature.label}</h3>
                      <p className="text-[10px] text-gray-600">{feature.description}</p>
                    </div>
                  </div>
                ) : (
                  // Desktop: Card style seperti semula
                  <Card className="hover:shadow-xl transition-all cursor-pointer border-l-4 border-l-teal-500">
                    <CardContent className="p-5">
                      <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 bg-gradient-to-br ${feature.color} rounded-xl flex items-center justify-center flex-shrink-0`}>
                          <Icon className="w-7 h-7 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-gray-800 text-lg mb-1">{feature.label}</h3>
                          <p className="text-sm text-gray-500 truncate">{feature.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </Link>
            )
          })}
        </div>
      </main>
    </div>
  )
}
