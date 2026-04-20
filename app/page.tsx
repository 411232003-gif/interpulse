'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { PlayCircle, Activity, History, Heart, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'

export default function Home() {
  const router = useRouter()
  const { user, loading, isAdmin, userProfile } = useAuth()
  const [isMobile, setIsMobile] = useState(false)
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

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  // Detect mobile/desktop
  useEffect(() => {
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

  // Don't render content if not logged in (will redirect)
  if (!user) {
    return null
  }

  const featureCards = [
    {
      title: 'Video Edukasi',
      description: 'Tonton video kesehatan dan edukasi',
      href: '/video-edukasi',
      icon: PlayCircle,
      gradient: 'from-purple-500 to-pink-500',
      bgColor: 'bg-purple-50'
    },
    {
      title: isAdmin ? 'Data Warga' : 'Absensi',
      description: isAdmin ? 'Kelola data warga dan riwayat kesehatan' : 'Catat kehadiran',
      href: '/posbindu-monitoring',
      icon: Activity,
      gradient: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-blue-50'
    },
    ...(isAdmin ? [] : [{
      title: 'Riwayat Tensi',
      description: 'Lihat riwayat pengukuran tekanan darah',
      href: '/riwayat-tensi',
      icon: History,
      gradient: 'from-green-500 to-emerald-500',
      bgColor: 'bg-green-50'
    }]),
    ...(isAdmin ? [] : [{
      title: 'Fasca',
      description: 'Fasilitas Catatan',
      href: '/Fasca',
      icon: Heart,
      gradient: 'from-red-500 to-orange-500',
      bgColor: 'bg-red-50'
    }])
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 pb-24">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent mb-2">
              Selamat Datang 👋
            </h1>
            <p className="text-base text-gray-600">
              {userProfile?.name || 'Pengguna'}, ayo jaga kesehatanmu
            </p>
          </div>
        </div>

        {/* Feature Cards */}
        <div className={isMobile ? "grid grid-cols-2 gap-6 mb-6 px-2" : "grid grid-cols-2 gap-4 mb-6"}>
          {featureCards.map((card, index) => {
            const Icon = card.icon
            return (
              <Link
                key={index}
                href={card.href}
                className="group"
              >
                {isMobile ? (
                  // Mobile: Dengan kotak background sesuai referensi gambar
                  <div className={`${card.bgColor} rounded-2xl p-4 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 border border-white/50`}>
                    <div className="flex flex-col items-center gap-2">
                      <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${card.gradient} p-3 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className="w-full h-full text-white" />
                      </div>
                      <div className="text-center">
                        <h3 className="text-sm font-bold text-gray-800 group-hover:text-teal-600 transition-colors">
                          {card.title}
                        </h3>
                        <p className="text-[10px] text-gray-600 line-clamp-2">
                          {card.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Desktop: Card style seperti semula
                  <div className={`${card.bgColor} rounded-2xl p-4 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 border border-white/50`}
                  >
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.gradient} p-2.5 mb-3 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className="w-full h-full text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800 mb-1 group-hover:text-teal-600 transition-colors">
                      {card.title}
                    </h3>
                    <p className="text-xs text-gray-600 line-clamp-2">
                      {card.description}
                    </p>
                  </div>
                )}
              </Link>
            )
          })}
        </div>

        {/* Additional Features Section */}
        <div className={isMobile ? "mb-4 px-2" : "bg-white rounded-2xl shadow-lg p-4 mb-4"}>
          <h2 className="text-lg font-bold text-gray-800 mb-3 text-center">Fitur Lainnya</h2>
          <div className={isMobile ? "grid grid-cols-3 gap-4" : "grid grid-cols-3 gap-3"}>
            <Link href="/kalori-tracker" className={isMobile ? "flex flex-col items-center gap-2 p-3 rounded-xl bg-gradient-to-r from-orange-50 to-yellow-50 hover:from-orange-100 hover:to-yellow-100 transition-all border border-orange-200 shadow-md" : "flex flex-col items-center gap-2 p-3 rounded-xl bg-gradient-to-r from-orange-50 to-yellow-50 hover:from-orange-100 hover:to-yellow-100 transition-all border border-orange-200"}>
              <div className={isMobile ? "w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-yellow-500 p-2.5 shadow-lg" : "w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-yellow-500 p-1.5"}>
                <Activity className="w-full h-full text-white" />
              </div>
              <div className="text-center">
                <h3 className="text-xs font-semibold text-gray-800">Kalori</h3>
                <p className="text-[10px] text-gray-600">Tracker</p>
              </div>
            </Link>
            <Link href="/deteksi-jantung" className={isMobile ? "flex flex-col items-center gap-2 p-3 rounded-xl bg-gradient-to-r from-red-50 to-pink-50 hover:from-red-100 hover:to-pink-100 transition-all border border-red-200 shadow-md" : "flex flex-col items-center gap-2 p-3 rounded-xl bg-gradient-to-r from-red-50 to-pink-50 hover:from-red-100 hover:to-pink-100 transition-all border border-red-200"}>
              <div className={isMobile ? "w-12 h-12 rounded-full bg-gradient-to-br from-red-500 to-pink-500 p-2.5 shadow-lg" : "w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-pink-500 p-1.5"}>
                <Heart className="w-full h-full text-white" />
              </div>
              <div className="text-center">
                <h3 className="text-xs font-semibold text-gray-800">Skrining</h3>
                <p className="text-[10px] text-gray-600">Jantung</p>
              </div>
            </Link>
            <Link href="/musik-relaksasi" className={isMobile ? "flex flex-col items-center gap-2 p-3 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 hover:from-indigo-100 hover:to-purple-100 transition-all border border-indigo-200 shadow-md" : "flex flex-col items-center gap-2 p-3 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 hover:from-indigo-100 hover:to-purple-100 transition-all border border-indigo-200"}>
              <div className={isMobile ? "w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 p-2.5 shadow-lg" : "w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 p-1.5"}>
                <PlayCircle className="w-full h-full text-white" />
              </div>
              <div className="text-center">
                <h3 className="text-xs font-semibold text-gray-800">Musik</h3>
                <p className="text-[10px] text-gray-600">Relaksasi</p>
              </div>
            </Link>
          </div>
        </div>

      </div>

      {/* Sehat Sentosa Banner Carousel - Full Width at Bottom */}
      <div
        className="w-full relative overflow-hidden"
        ref={carouselRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div 
          className="flex transition-transform duration-500 ease-in-out"
          style={{ transform: `translateX(-${currentSlide * 100}%)` }}
        >
          {bannerImages.map((image, index) => (
            <div key={index} className="w-full flex-shrink-0 relative">
              <div className={`relative w-full ${isMobile ? 'h-56' : 'h-80'} bg-gray-200`}>
                <img
                  src={image.src}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
              <Link href="/sehat-sentosa" className="absolute inset-0 bg-gradient-to-r from-emerald-800/90 via-emerald-700/60 to-emerald-600/30 flex items-center">
                <div className="px-4 sm:px-6 lg:px-8 max-w-md">
                  <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2 sm:mb-3 drop-shadow-lg">
                    {image.title}
                  </h2>
                  <p className="text-white text-base sm:text-lg drop-shadow-md mb-4 font-medium">
                    {image.subtitle}
                  </p>
                  <span className="inline-flex items-center gap-2 bg-white text-emerald-700 px-4 py-2 rounded-full font-semibold text-sm hover:bg-emerald-50 transition-colors">
                    Lihat Selengkapnya
                    <ChevronRight className="w-4 h-4" />
                  </span>
                </div>
              </Link>
            </div>
          ))}
        </div>

        {/* Navigation Arrows */}
        <button
          onClick={handlePrevSlide}
          className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2 rounded-full shadow-lg transition-all z-10"
          aria-label="Previous slide"
        >
          <ChevronLeft className="w-5 h-5 text-emerald-700" />
        </button>
        <button
          onClick={handleNextSlide}
          className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2 rounded-full shadow-lg transition-all z-10"
          aria-label="Next slide"
        >
          <ChevronRight className="w-5 h-5 text-emerald-700" />
        </button>

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
    </div>
  )
}
