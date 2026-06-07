'use client'

import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import BackButton from '@/components/BackButton'
import { Activity, Heart, PlayCircle, Loader2 } from 'lucide-react'

export default function FiturPage() {
  const router = useRouter()
  const { user, loading, isGuest } = useAuth()

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-teal-600 mx-auto mb-4" />
          <p className="text-gray-600">Memuat...</p>
        </div>
      </div>
    )
  }

  const features = [
    {
      title: 'Skrining Jantung',
      description: 'Cek kesehatan jantung Anda',
      href: '/deteksi-jantung',
      icon: Heart,
      gradient: 'from-red-500 to-pink-500',
      bgColor: 'bg-red-50'
    },
    {
      title: 'Musik Relaksasi',
      description: 'Musik untuk relaksasi dan ketenangan',
      href: '/musik-relaksasi',
      icon: PlayCircle,
      gradient: 'from-indigo-500 to-purple-500',
      bgColor: 'bg-indigo-50'
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 pb-20">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <BackButton onClick={() => router.push('/')} />
          <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent mb-2">
            Fitur Kesehatan
          </h1>
          <p className="text-gray-600">
            Jelajahi berbagai fitur kesehatan untuk mendukung gaya hidup sehat Anda
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <Link
                key={index}
                href={feature.href}
                className="group"
              >
                <div className={`${feature.bgColor} rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 border border-white/50 h-full`}>
                  <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${feature.gradient} p-4 shadow-lg group-hover:scale-110 transition-transform duration-300 mx-auto mb-4`}>
                    <Icon className="w-full h-full text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-800 group-hover:text-teal-600 transition-colors text-center">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-gray-600 mt-2 text-center line-clamp-2">
                    {feature.description}
                  </p>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
