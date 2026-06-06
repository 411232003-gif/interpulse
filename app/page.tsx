'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { PlayCircle, Activity, Heart, Loader2, ChevronRight, TrendingUp, LogIn, Calendar, Scale, FileText } from 'lucide-react'
import NotificationBell from '@/components/NotificationBell'

export default function Home() {
  const { user, loading, isAdmin, userProfile, isGuest } = useAuth()
  const [isMobile, setIsMobile] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [currentSlide, setCurrentSlide] = useState(0)
  const [touchStart, setTouchStart] = useState(0)
  const [touchEnd, setTouchEnd] = useState(0)
  const carouselRef = useRef<HTMLDivElement>(null)

  const bannerImages = [
    {
      src: '/FOTO/Gemini_Generated_Image_euzbu1euzbu1euzb.png',
      alt: 'Banner Sehat Sentosa 1',
      title: '🌿 Sehat Sentosa',
      subtitle: 'Jelajahi ramuan tradisional alami'
    },
    {
      src: '/FOTO/Gemini_Generated_Image_yykf9vyykf9vyykf.png',
      alt: 'Banner Sehat Sentosa 2',
      title: '🌿 Sehat Sentosa',
      subtitle: 'Solusi kesehatan alami untuk Anda'
    }
  ]

  // No redirect - guest users can access the home page

  // Detect mobile/desktop
  useEffect(() => {
    setMounted(true)
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Auto-slide every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % bannerImages.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  const handlePrevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + bannerImages.length) % bannerImages.length)
  }

  const handleNextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % bannerImages.length)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const handleTouchEnd = () => {
    if (touchStart - touchEnd > 75) {
      handleNextSlide()
    }
    if (touchStart - touchEnd < -75) {
      handlePrevSlide()
    }
  }

  // Show loading while checking auth or mounting
  if (loading || !mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-teal-600 mx-auto mb-4" />
          <p className="text-gray-600">Memuat...</p>
        </div>
      </div>
    )
  }

  type FeatureCard = {
    title: string
    description: string
    href: string
    icon: any
    gradient: string
    bgColor: string
  }

  // Admin feature cards - Only 3 buttons: Absensi, Input TB/BB/LP, Input Kesehatan
  const adminCards: FeatureCard[] = [
    {
      title: 'Absensi',
      description: 'Catat kehadiran warga',
      href: '/absensi',
      icon: Calendar,
      gradient: 'from-teal-500 to-green-500',
      bgColor: 'bg-teal-50'
    },
    {
      title: 'Input TB/BB/LP',
      description: 'Input tinggi badan, berat badan, lingkar pinggang',
      href: '/input-tb-bb',
      icon: Scale,
      gradient: 'from-purple-500 to-pink-500',
      bgColor: 'bg-purple-50'
    },
    {
      title: 'Input Kesehatan',
      description: 'Catat hasil pemeriksaan kesehatan',
      href: '/Fasca',
      icon: Heart,
      gradient: 'from-red-500 to-orange-500',
      bgColor: 'bg-red-50'
    }
  ]

  // User/guest feature cards - ordered vertically for mobile
  const userCards: FeatureCard[] = isGuest ? [] : [
    {
      title: 'FASCA',
      description: 'Cek TD, GDS, kolesterol & asam urat',
      href: '/fasca-catatan',
      icon: FileText,
      gradient: 'from-purple-500 to-pink-500',
      bgColor: 'bg-purple-50'
    },
    // Trafik/riwayat pemeriksaan on mobile (below FASCA)
    ...(isMobile ? [{
      title: 'Riwayat Pemeriksaan',
      description: userProfile?.name || 'Pengguna',
      href: '/trafik-user',
      icon: TrendingUp,
      gradient: 'from-teal-500 to-cyan-500',
      bgColor: 'bg-teal-50'
    }] : []),
    // Trafik only on desktop
    ...(!isMobile ? [{
      title: 'Trafik',
      description: 'Trafik kesehatan RW',
      href: '/trafik-user',
      icon: TrendingUp,
      gradient: 'from-teal-500 to-cyan-500',
      bgColor: 'bg-teal-50'
    }] : [])
  ]

  const featureCards: FeatureCard[] = isAdmin ? adminCards : userCards

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 pb-20 flex flex-col">
      <div className="max-w-7xl mx-auto px-4 py-2 flex-1 flex flex-col">
        {/* Header */}
        <div className="mb-4 mt-3">
          <div className="flex items-center justify-between">
            <div className="text-center flex-1">
              <h1 className={`${isMobile ? 'text-xl' : 'text-3xl'} font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent mb-2`}>
                Selamat Datang 👋
              </h1>
              <p className={`${isMobile ? 'text-xs' : 'text-base'} text-gray-600`}>
                {isGuest ? 'Tamu' : user ? (userProfile?.name || 'Pengguna') : 'Tamu'}, ayo jaga kesehatanmu
              </p>
              {!user && !isGuest && (
                <Link href="/login" className={`inline-flex items-center gap-2 mt-2 ${isMobile ? 'px-2 py-1 text-xs' : 'px-4 py-2 text-sm'} bg-teal-600 text-white font-medium rounded-full hover:bg-teal-700 transition-colors`}>
                  <LogIn className={isMobile ? 'w-3 h-3' : 'w-4 h-4'} />
                  Masuk untuk fitur lengkap
                </Link>
              )}
            </div>
            {user && !isAdmin && <NotificationBell />}
          </div>
        </div>

        {/* Sehat Sentosa Banner Carousel - Top, below welcome message */}
        {isMobile && (
          <div
            className="w-full relative overflow-hidden shadow-xl shadow-emerald-500/20 mb-4"
            ref={carouselRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div
              className="flex transition-transform duration-500 ease-in-out"
              style={{ transform: `translateX(-${currentSlide * 100}%)` }}
              role="group"
              aria-label="Banner carousel"
            >
              {bannerImages.map((image, index) => (
                <div key={index} className="w-full flex-shrink-0 relative">
                  <div className="relative w-full h-48 bg-gray-200">
                    <img
                      src={image.src}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <Link href="/sehat-sentosa" className="absolute inset-0 bg-gradient-to-r from-emerald-800/90 via-emerald-700/60 to-emerald-600/30 flex items-center">
                    <div className="px-4 max-w-md">
                      <h2 className="text-xl font-bold text-white mb-1 drop-shadow-lg">
                        {image.title}
                      </h2>
                      <p className="text-sm text-white drop-shadow-md mb-2 font-medium">
                        {image.subtitle}
                      </p>
                      <span className="inline-flex items-center gap-1 bg-white text-emerald-700 px-3 py-1.5 rounded-full font-semibold text-xs hover:bg-emerald-50 transition-colors">
                        Lihat Selengkapnya
                        <ChevronRight className="w-4 h-4" />
                      </span>
                    </div>
                  </Link>
                </div>
              ))}
            </div>

            {/* Dots Indicator */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 z-10">
              {bannerImages.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`h-2 rounded-full transition-all ${
                    currentSlide === index ? 'bg-white w-6' : 'bg-white/60 w-2'
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Sehat Sentosa Banner Carousel - Desktop */}
        {!isMobile && (
          <div
            className="w-full relative overflow-hidden shadow-2xl shadow-emerald-500/30 mb-6"
            ref={carouselRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div
              className="flex transition-transform duration-500 ease-in-out"
              style={{ transform: `translateX(-${currentSlide * 100}%)` }}
              role="group"
              aria-label="Banner carousel"
            >
              {bannerImages.map((image, index) => (
                <div key={index} className="w-full flex-shrink-0 relative">
                  <div className="relative w-full h-96 bg-gray-200">
                    <img
                      src={image.src}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <Link href="/sehat-sentosa" className="absolute inset-0 bg-gradient-to-r from-emerald-800/90 via-emerald-700/60 to-emerald-600/30 flex items-center">
                    <div className="px-8 sm:px-12 lg:px-16 max-w-2xl">
                      <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-3 sm:mb-4 drop-shadow-lg">
                        {image.title}
                      </h2>
                      <p className="text-lg sm:text-xl lg:text-2xl text-white drop-shadow-md mb-4 sm:mb-5 font-medium">
                        {image.subtitle}
                      </p>
                      <span className="inline-flex items-center gap-3 bg-white text-emerald-700 px-6 py-3 rounded-full font-semibold text-base sm:text-lg hover:bg-emerald-50 transition-colors">
                        Lihat Selengkapnya
                        <ChevronRight className="w-5 h-5" />
                      </span>
                    </div>
                  </Link>
                </div>
              ))}
            </div>

            {/* Dots Indicator */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-3 z-10">
              {bannerImages.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`h-3 rounded-full transition-all ${
                    currentSlide === index ? 'bg-white w-8' : 'bg-white/60 w-3'
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Feature Cards */}
        <div className={isMobile ? `grid gap-2 grid-cols-1 flex-1` : `grid gap-5 mb-6 ${featureCards.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
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
                  <div className={`${card.bgColor} rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 border border-white/50`}>
                    <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${card.gradient} p-4 shadow-lg group-hover:scale-110 transition-transform duration-300 mx-auto mb-3`}>
                      <Icon className="w-full h-full text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800 group-hover:text-teal-600 transition-colors text-center">
                      {card.title}
                    </h3>
                    <p className="text-sm text-gray-600 mt-2 text-center line-clamp-2">
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
