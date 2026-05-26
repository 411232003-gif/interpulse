'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { PlayCircle, Activity, History, Heart, Loader2, ChevronLeft, ChevronRight, Users, TrendingUp, LogIn, CheckCircle, AlertCircle, XCircle, PlusCircle, Calendar, Ruler, Scale } from 'lucide-react'
import BigNumpad from '@/components/BigNumpad'
import { collection, addDoc, onSnapshot, query, where, deleteDoc, doc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

type HealthType = 'tensi' | 'kolesterol' | 'asamurat' | 'guladarah'
type Step = 'select' | 'input' | 'result'

export default function Home() {
  const { user, loading, isAdmin, userProfile, isGuest } = useAuth()
  const [isMobile, setIsMobile] = useState(false)
  const [currentSlide, setCurrentSlide] = useState(0)
  const [touchStart, setTouchStart] = useState(0)
  const [touchEnd, setTouchEnd] = useState(0)
  const carouselRef = useRef<HTMLDivElement>(null)

  // Fasca modal state
  const [showFascaModal, setShowFascaModal] = useState(false)
  const [healthType, setHealthType] = useState<HealthType | null>(null)
  const [step, setStep] = useState<Step>('select')
  const [currentInput, setCurrentInput] = useState('')
  const [inputIndex, setInputIndex] = useState(0)
  const [saving, setSaving] = useState(false)
  const [data, setData] = useState<Record<string, string>>({})
  const [result, setResult] = useState<any>(null)
  const [healthReadings, setHealthReadings] = useState<any[]>([])
  const [todayReadingsForResident, setTodayReadingsForResident] = useState<any[]>([])
  const [isResetting, setIsResetting] = useState(false)

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

  // Load health readings
  useEffect(() => {
    const q = collection(db, 'healthReadings')
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      setHealthReadings(data)
    })
    return () => unsubscribe()
  }, [])

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
    if (nilai < 126) return { title: 'Normal', color: 'text-green-600', bgColor: 'bg-green-50', icon: <CheckCircle className="w-16 h-16 text-green-600" />, message: 'Gula Darah Normal', advice: 'Pertahankan pola makan sehat' }
    return { title: 'Tinggi', color: 'text-red-600', bgColor: 'bg-red-50', icon: <XCircle className="w-16 h-16 text-red-600" />, message: 'Gula Darah Tinggi', advice: 'Segera konsultasi dokter' }
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

  // Fasca handlers
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

  const saveData = async (allData: Record<string, string>) => {
    if (!userProfile) return
    setSaving(true)
    const timestamp = new Date().toISOString()

    const userInfo = {
      uid: userProfile.uid,
      name: userProfile.name,
      rt: userProfile.rt,
      rw: userProfile.rw,
      kelurahan: userProfile.kelurahan || '-'
    }

    let newReading: any
    let validationResult: any

    if (healthType === 'tensi') {
      const sys = parseInt(allData.sistolik)
      const dia = parseInt(allData.diastolik)
      const nadi = parseInt(allData.nadi)
      newReading = {
        type: 'tensi',
        ...allData,
        timestamp,
        userId: userInfo.uid,
        userName: userInfo.name,
        rt: userInfo.rt,
        rw: userInfo.rw,
        kelurahan: userInfo.kelurahan,
        source: 'posbindu'
      }
      validationResult = validateBloodPressure(sys, dia)
      validationResult.values = [
        { label: 'Sistolik', value: sys, unit: 'mmHg' },
        { label: 'Diastolik', value: dia, unit: 'mmHg' },
        { label: 'Nadi', value: nadi, unit: 'bpm' }
      ]
    } else if (healthType === 'guladarah') {
      const nilai = parseInt(allData.nilai)
      newReading = {
        type: 'guladarah',
        ...allData,
        timestamp,
        userId: userInfo.uid,
        userName: userInfo.name,
        rt: userInfo.rt,
        rw: userInfo.rw,
        kelurahan: userInfo.kelurahan,
        source: 'posbindu'
      }
      validationResult = validateBloodSugar(nilai)
      validationResult.values = [
        { label: 'Gula Darah', value: nilai, unit: 'mg/dL' }
      ]
    } else if (healthType === 'kolesterol') {
      const total = parseInt(allData.total)
      const ldl = parseInt(allData.ldl)
      const hdl = parseInt(allData.hdl)
      const trigliserida = parseInt(allData.trigliserida)
      newReading = {
        type: 'kolesterol',
        ...allData,
        timestamp,
        userId: userInfo.uid,
        userName: userInfo.name,
        rt: userInfo.rt,
        rw: userInfo.rw,
        kelurahan: userInfo.kelurahan,
        source: 'posbindu'
      }
      validationResult = validateCholesterol(total)
      validationResult.values = [
        { label: 'Total', value: total, unit: 'mg/dL' },
        { label: 'LDL', value: ldl, unit: 'mg/dL' },
        { label: 'HDL', value: hdl, unit: 'mg/dL' },
        { label: 'Trigliserida', value: trigliserida, unit: 'mg/dL' }
      ]
    } else if (healthType === 'asamurat') {
      const nilai = parseFloat(allData.nilai)
      newReading = {
        type: 'asamurat',
        ...allData,
        timestamp,
        userId: userInfo.uid,
        userName: userInfo.name,
        rt: userInfo.rt,
        rw: userInfo.rw,
        kelurahan: userInfo.kelurahan,
        source: 'posbindu'
      }
      validationResult = validateUricAcid(nilai, userProfile.gender === 'Laki-laki' ? 'L' : 'P')
      validationResult.values = [
        { label: 'Asam Urat', value: nilai, unit: 'mg/dL' }
      ]
    }

    try {
      console.log('[Homepage] Saving health reading:', newReading)
      await addDoc(collection(db, 'healthReadings'), newReading)
      console.log('[Homepage] Health reading saved successfully')
      setResult(validationResult)
      setStep('result')
      setTodayReadingsForResident(prev => [...prev, newReading])
    } catch (error) {
      console.error('[Homepage] Error saving health reading:', error)
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
    }
  }

  const handleCloseFascaModal = () => {
    setShowFascaModal(false)
    setHealthType(null)
    setStep('select')
    setCurrentInput('')
    setInputIndex(0)
    setData({})
    setResult(null)
  }

  const openFascaModal = () => {
    if (!userProfile) return
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    const todayReadings = healthReadings.filter(r =>
      r.userId === userProfile.uid &&
      r.timestamp.startsWith(todayStr) &&
      r.source === 'posbindu'
    )
    setTodayReadingsForResident(todayReadings)
    setShowFascaModal(true)
  }

  const handleResetTodayData = async () => {
    if (!userProfile || todayReadingsForResident.length === 0) return
    setIsResetting(true)
    try {
      for (const reading of todayReadingsForResident) {
        await deleteDoc(doc(db, 'healthReadings', reading.id))
      }
      setTodayReadingsForResident([])
      setData({})
      setCurrentInput('')
      setInputIndex(0)
      alert('Data hari ini berhasil dihapus')
    } catch (error) {
      console.error('Error deleting today data:', error)
      alert('Gagal menghapus data')
    } finally {
      setIsResetting(false)
    }
  }

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

  type FeatureCard = {
    title: string
    description: string
    href: string
    icon: any
    gradient: string
    bgColor: string
    isModal?: boolean
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
      title: 'Input Kesehatan',
      description: 'Catat data kesehatan',
      href: '#',
      icon: Heart,
      gradient: 'from-red-500 to-orange-500',
      bgColor: 'bg-red-50',
      isModal: true
    },
    ...(user ? [{
      title: 'Absensi',
      description: 'Catat kehadiran Posbindu',
      href: '/posbindu-monitoring',
      icon: Activity,
      gradient: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-blue-50'
    }] : []),
    ...(user ? [{
      title: 'Riwayat Kesehatan',
      description: 'Lihat riwayat data kesehatan',
      href: '/riwayat-tensi',
      icon: History,
      gradient: 'from-green-500 to-emerald-500',
      bgColor: 'bg-green-50'
    }] : [])
  ]

  const featureCards: FeatureCard[] = isAdmin ? adminCards : userCards

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 pb-20 flex flex-col">
      <div className="max-w-7xl mx-auto px-4 py-2 flex-1 flex flex-col">
        {/* Header */}
        <div className="mb-3 mt-2">
          <div className="text-center">
            <h1 className="text-xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent mb-1">
              Selamat Datang 👋
            </h1>
            <p className="text-xs text-gray-600">
              {isGuest ? 'Tamu' : user ? (userProfile?.name || 'Pengguna') : 'Tamu'}, ayo jaga kesehatanmu
            </p>
            {!user && !isGuest && (
              <Link href="/login" className="inline-flex items-center gap-2 mt-1 px-2 py-1 bg-teal-600 text-white text-xs font-medium rounded-full hover:bg-teal-700 transition-colors">
                <LogIn className="w-3 h-3" />
                Masuk untuk fitur lengkap
              </Link>
            )}
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
              className="flex transition-transform duration-500 ease-in-out carousel-slide"
              style={{ '--slide-offset': `-${currentSlide * 100}%` } as React.CSSProperties}
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
            className="w-full relative overflow-hidden shadow-2xl shadow-emerald-500/30 mb-4"
            ref={carouselRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div
              className="flex transition-transform duration-500 ease-in-out carousel-slide"
              style={{ '--slide-offset': `-${currentSlide * 100}%` } as React.CSSProperties}
            >
              {bannerImages.map((image, index) => (
                <div key={index} className="w-full flex-shrink-0 relative">
                  <div className="relative w-full h-72 bg-gray-200">
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
                      <p className="text-base sm:text-lg text-white drop-shadow-md mb-3 sm:mb-4 font-medium">
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

        {/* Feature Cards */}
        <div className={isMobile ? `grid gap-2 grid-cols-1 flex-1` : `grid gap-3 mb-4 ${featureCards.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
          {featureCards.map((card, index) => {
            const Icon = card.icon
            if (card.isModal) {
              return (
                <button
                  key={index}
                  onClick={openFascaModal}
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
                    <div className={`${card.bgColor} rounded-xl p-4 shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105 border border-white/50`}>
                      <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${card.gradient} p-3 shadow-md group-hover:scale-110 transition-transform duration-300 mx-auto mb-2`}>
                        <Icon className="w-full h-full text-white" />
                      </div>
                      <h3 className="text-sm font-bold text-gray-800 group-hover:text-teal-600 transition-colors text-center">
                        {card.title}
                      </h3>
                      <p className="text-xs text-gray-600 mt-1 text-center">
                        {card.description}
                      </p>
                    </div>
                  )}
                </button>
              )
            }
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
                  <div className={`${card.bgColor} rounded-xl p-3 shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105 border border-white/50`}>
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${card.gradient} p-2 shadow-md group-hover:scale-110 transition-transform duration-300 mx-auto mb-2`}>
                      <Icon className="w-full h-full text-white" />
                    </div>
                    <h3 className="text-sm font-bold text-gray-800 group-hover:text-teal-600 transition-colors text-center">
                      {card.title}
                    </h3>
                    <p className="text-xs text-gray-600 mt-1 text-center line-clamp-1">
                      {card.description}
                    </p>
                  </div>
                )}
              </Link>
            )
          })}
        </div>

        {/* Additional Features Section - only for non-admin, non-guest, and desktop */}
        {!isAdmin && !isGuest && !isMobile && (
          <div className="bg-white rounded-2xl shadow-lg p-4 mb-4">
            <h2 className="text-lg font-bold text-gray-800 mb-3 text-center">Fitur Lainnya</h2>
            <div className="grid grid-cols-3 gap-3">
              <Link href="/kalori-tracker" className="flex flex-col items-center gap-2 p-3 rounded-xl bg-gradient-to-r from-orange-50 to-yellow-50 hover:from-orange-100 hover:to-yellow-100 transition-all border border-orange-200">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-yellow-500 p-1.5">
                  <Activity className="w-full h-full text-white" />
                </div>
                <div className="text-center">
                  <h3 className="text-xs font-semibold text-gray-800">Kalori</h3>
                  <p className="text-[10px] text-gray-600">Tracker</p>
                </div>
              </Link>
              <Link href="/deteksi-jantung" className="flex flex-col items-center gap-2 p-3 rounded-xl bg-gradient-to-r from-red-50 to-pink-50 hover:from-red-100 hover:to-pink-100 transition-all border border-red-200">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-pink-500 p-1.5">
                  <Heart className="w-full h-full text-white" />
                </div>
                <div className="text-center">
                  <h3 className="text-xs font-semibold text-gray-800">Skrining</h3>
                  <p className="text-[10px] text-gray-600">Jantung</p>
                </div>
              </Link>
              <Link href="/musik-relaksasi" className="flex flex-col items-center gap-2 p-3 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 hover:from-indigo-100 hover:to-purple-100 transition-all border border-indigo-200">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 p-1.5">
                  <PlayCircle className="w-full h-full text-white" />
                </div>
                <div className="text-center">
                  <h3 className="text-xs font-semibold text-gray-800">Musik</h3>
                  <p className="text-[10px] text-gray-600">Relaksasi</p>
                </div>
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Fasca Modal */}
      {showFascaModal && step === 'select' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800">Input Kesehatan: {userProfile?.name}</h2>
              <button onClick={handleCloseFascaModal} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>

            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mb-3 shadow-lg">
                <Activity className="w-8 h-8 text-white" />
              </div>
              <p className="text-gray-600">Pilih jenis pemeriksaan</p>
              {todayReadingsForResident.length > 0 && (
                <p className="text-xs text-green-600 mt-2">Data hari ini sudah ada</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              {(Object.keys(healthConfig) as HealthType[]).map((type) => {
                const existingReading = todayReadingsForResident.find(r => r.type === type)
                return (
                  <button
                    key={type}
                    onClick={() => {
                      setHealthType(type)
                      setStep('input')
                      setInputIndex(0)
                      setCurrentInput('')
                      if (existingReading) {
                        const config = healthConfig[type]
                        const prefilledData: Record<string, string> = {}
                        config.fields.forEach((field) => {
                          prefilledData[field.key] = existingReading[field.key] || ''
                        })
                        setData(prefilledData)
                        setInputIndex(config.fields.length - 1)
                      } else {
                        setData({})
                      }
                    }}
                    className={`p-4 rounded-xl bg-gradient-to-br ${healthConfig[type].color} text-white shadow-lg active:scale-95 transition-all text-left`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-3xl">{healthConfig[type].icon}</span>
                      <div className="flex-1">
                        <h3 className="font-bold text-sm">{healthConfig[type].title}</h3>
                        {existingReading && (
                          <p className="text-xs mt-1 opacity-90">
                            {type === 'tensi' && `${existingReading.sistolik}/${existingReading.diastolik} mmHg`}
                            {type === 'kolesterol' && `${existingReading.total} mg/dL`}
                            {type === 'asamurat' && `${existingReading.nilai} mg/dL`}
                            {type === 'guladarah' && `${existingReading.nilai} mg/dL`}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            {todayReadingsForResident.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <button
                  onClick={handleResetTodayData}
                  disabled={isResetting}
                  className="w-full px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isResetting ? 'Menghapus...' : 'Reset Data Hari Ini'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {showFascaModal && step === 'input' && healthType && (
        <div className="fixed inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <button onClick={handleBack} className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold px-4 py-2 rounded-xl active:scale-95 transition-all">← Kembali</button>
              <div className="bg-blue-100 text-blue-700 text-xl font-bold px-4 py-2 rounded-xl">{inputIndex + 1}/{healthConfig[healthType].fields.length}</div>
              <button onClick={handleCloseFascaModal} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>

            <div className="text-center mb-4">
              <div className="flex justify-center mb-2 text-blue-600">
                <span className="text-5xl">{healthConfig[healthType].icon}</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-1">{healthConfig[healthType].fields[inputIndex].label}</h2>
              <p className="text-gray-600">{healthConfig[healthType].title} - Step {inputIndex + 1}</p>
              <p className="text-sm text-gray-500 mt-1">User: {userProfile?.name}</p>
            </div>

            <div className="bg-gray-100 rounded-2xl p-4 mb-4 text-center">
              <div className="text-4xl font-bold text-gray-800 mb-2">{currentInput || '-'}</div>
              <div className="text-sm text-gray-500">{healthConfig[healthType].fields[inputIndex].unit}</div>
            </div>

            <BigNumpad
              onNumberClick={handleNumber}
              onDelete={handleDelete}
              onClear={handleClear}
            />

            <button
              onClick={handleNext}
              disabled={currentInput.length === 0}
              className={`w-full mt-4 text-2xl font-bold py-5 rounded-2xl shadow-lg active:scale-95 transition-all ${
                currentInput.length === 0
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white'
              }`}
            >
              {inputIndex === healthConfig[healthType].fields.length - 1 ? 'Simpan' : 'Lanjut'}
            </button>
          </div>
        </div>
      )}

      {showFascaModal && step === 'result' && result && (
        <div className={`fixed inset-0 ${result.bgColor} flex items-center justify-center z-50 p-4`}>
          <div className="bg-white rounded-3xl shadow-2xl p-8 text-center w-full max-w-2xl">
            <div className="flex justify-center mb-6">{result.icon}</div>
            <h1 className={`text-4xl font-bold ${result.color} mb-4`}>{result.title}</h1>

            {result.values && (
              <div className="bg-gray-100 rounded-2xl p-6 mb-6">
                <p className="text-gray-600 text-xl mb-4">Nilai Input:</p>
                <div className="grid grid-cols-2 gap-4">
                  {result.values.map((val: any, idx: number) => (
                    <div key={idx} className="bg-white rounded-xl p-4 shadow-sm">
                      <p className="text-sm text-gray-500">{val.label}</p>
                      <p className={`text-2xl font-bold ${result.color}`}>{val.value} {val.unit}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4 mb-8">
              <p className="text-lg text-gray-800 leading-relaxed">{result.advice}</p>
            </div>
            <button onClick={handleCloseFascaModal} className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-xl font-bold py-4 rounded-2xl shadow-lg active:scale-95 transition-all">Selesai</button>
          </div>
        </div>
      )}
    </div>
  )
}
