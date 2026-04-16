'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { 
  Ear,
  Pill,
  Droplets,
  Camera,
  Volume2,
  VolumeX,
  Plus,
  Trash2,
  Clock,
  ChevronLeft,
  Info,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  ArrowLeft,
  Play
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

// ==================== TYPES ====================

interface Medicine {
  id: string
  name: string
  dosage: string
  frequency: string
  time: string
  notes: string
}

interface AnemiaResult {
  score: number
  status: 'normal' | 'ringan' | 'sedang' | 'berat'
  label: string
  color: string
  bgColor: string
  advice: string
}

// ==================== 1. CEK ANEMIA - NAIL COLOR ANALYZER ====================

const analyzeNailColor = (imageData: ImageData): AnemiaResult => {
  const data = imageData.data
  let totalR = 0, totalG = 0, totalB = 0
  let pixelCount = 0
  
  const startX = Math.floor(imageData.width * 0.3)
  const endX = Math.floor(imageData.width * 0.7)
  const startY = Math.floor(imageData.height * 0.3)
  const endY = Math.floor(imageData.height * 0.7)
  
  for (let y = startY; y < endY; y += 2) {
    for (let x = startX; x < endX; x += 2) {
      const i = (y * imageData.width + x) * 4
      totalR += data[i]
      totalG += data[i + 1]
      totalB += data[i + 2]
      pixelCount++
    }
  }
  
  const avgR = totalR / pixelCount
  const avgG = totalG / pixelCount
  const avgB = totalB / pixelCount
  const redness = avgR / ((avgG + avgB) / 2)
  const brightness = (avgR + avgG + avgB) / 3
  
  let score = Math.min(100, Math.max(0, (redness - 0.8) * 200 + 50))
  if (brightness < 50) score = Math.max(0, score - 20)
  if (brightness > 200) score = Math.max(0, score - 10)
  
  if (score >= 70) {
    return {
      score: Math.round(score),
      status: 'normal',
      label: 'Warna Normal',
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      advice: 'Warna kuku Anda terlihat normal. Tetap jaga asupan zat besi dengan makan daging, hati, bayam, dan buah-buahan.'
    }
  } else if (score >= 50) {
    return {
      score: Math.round(score),
      status: 'ringan',
      label: 'Kemerahan Ringan',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
      advice: 'Warna kuku sedikit pucat. Perbanyak konsumsi makanan kaya zat besi dan vitamin C. Lakukan cek darah jika memungkinkan.'
    }
  } else if (score >= 30) {
    return {
      score: Math.round(score),
      status: 'sedang',
      label: 'Pucat Sedang',
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      advice: 'Kuku terlihat cukup pucat. Disarankan untuk cek hemoglobin di puskesmas/posyandu. Tingkatkan asupan zat besi segera.'
    }
  } else {
    return {
      score: Math.round(score),
      status: 'berat',
      label: 'Pucat Berat',
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      advice: 'Kuku sangat pucat! Segera periksa ke puskesmas untuk cek darah. Risiko anemia tinggi - perlu suplementasi zat besi.'
    }
  }
}

// ==================== 2. TES PENDENGARAN ====================

const HEARING_FREQUENCIES = [
  { freq: 250, label: '250 Hz', desc: 'Nada rendah' },
  { freq: 500, label: '500 Hz', desc: 'Nada rendah-sedang' },
  { freq: 1000, label: '1 kHz', desc: 'Nada sedang (wicara)' },
  { freq: 2000, label: '2 kHz', desc: 'Nada tinggi (konsonan)' },
  { freq: 4000, label: '4 kHz', desc: 'Nada tinggi' },
  { freq: 8000, label: '8 kHz', desc: 'Nada sangat tinggi' },
]

// ==================== 3. PENGINGAT OBAT ====================

const FREQUENCY_OPTIONS = [
  { value: 'pagi', label: 'Pagi (06:00)', icon: '☀️' },
  { value: 'siang', label: 'Siang (12:00)', icon: '🌤️' },
  { value: 'sore', label: 'Sore (16:00)', icon: '🌅' },
  { value: 'malam', label: 'Malam (20:00)', icon: '🌙' },
  { value: 'sebelum_makan', label: 'Sebelum Makan', icon: '🍽️' },
  { value: 'sesudah_makan', label: 'Sesudah Makan', icon: '🍽️' },
]

const DRUG_INTERACTIONS: Record<string, string[]> = {
  'warfarin': ['aspirin', 'ibuprofen'],
  'metformin': ['kontras iodine', 'alkohol'],
  'amlodipine': ['grapefruit', 'simvastatin'],
  'digoxin': ['furosemide', 'amiodarone'],
  'lisinopril': ['kalium', 'spironolactone'],
  'aspirin': ['warfarin', 'clopidogrel', 'ibuprofen'],
}

// ==================== MAIN COMPONENT ====================

export default function HealthTools() {
  const [activeFeature, setActiveFeature] = useState<'home' | 'anemia' | 'hearing' | 'medicine'>('home')

  // ========== ANEMIA STATE ==========
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [anemiaResult, setAnemiaResult] = useState<AnemiaResult | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)

  // ========== HEARING TEST STATE ==========
  const audioContextRef = useRef<AudioContext | null>(null)
  const oscillatorRef = useRef<OscillatorNode | null>(null)
  const gainNodeRef = useRef<GainNode | null>(null)
  const [currentFreqIndex, setCurrentFreqIndex] = useState(0)
  const [hearingResults, setHearingResults] = useState<{freq: number, heard: boolean}[]>([])
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(50)
  const [testComplete, setTestComplete] = useState(false)

  // ========== MEDICINE REMINDER STATE ==========
  const [medicines, setMedicines] = useState<Medicine[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [newMed, setNewMed] = useState({ name: '', dosage: '', frequency: 'pagi', time: '06:00', notes: '' })
  const [interactions, setInteractions] = useState<string[]>([])

  // Load medicines from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('medicineReminders')
    if (saved) setMedicines(JSON.parse(saved))
  }, [])

  // Save medicines to localStorage
  useEffect(() => {
    localStorage.setItem('medicineReminders', JSON.stringify(medicines))
    checkInteractions()
  }, [medicines])

  // ==================== ANEMIA FUNCTIONS ====================

  const initAnemiaCamera = async () => {
    try {
      setCameraError(null)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: 640, height: 480 }
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (err) {
      setCameraError('Tidak dapat mengakses kamera. Pastikan izin diberikan.')
    }
  }

  const captureAndAnalyze = () => {
    if (!videoRef.current || !canvasRef.current) return
    
    setIsAnalyzing(true)
    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    
    if (!ctx) return
    
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    ctx.drawImage(video, 0, 0)
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const result = analyzeNailColor(imageData)
    
    setAnemiaResult(result)
    setIsAnalyzing(false)
    
    // Stop camera
    const stream = video.srcObject as MediaStream
    stream?.getTracks().forEach(t => t.stop())
  }

  const resetAnemia = () => {
    setAnemiaResult(null)
    setCameraError(null)
    initAnemiaCamera()
  }

  // ==================== HEARING TEST FUNCTIONS ====================

  const initAudio = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
  }

  const playTone = (freq: number) => {
    initAudio()
    if (!audioContextRef.current) return
    
    stopTone()
    
    const osc = audioContextRef.current.createOscillator()
    const gain = audioContextRef.current.createGain()
    
    osc.type = 'sine'
    osc.frequency.value = freq
    gain.gain.value = (volume / 100) * 0.5
    
    osc.connect(gain)
    gain.connect(audioContextRef.current.destination)
    
    osc.start()
    
    oscillatorRef.current = osc
    gainNodeRef.current = gain
    setIsPlaying(true)
  }

  const stopTone = () => {
    oscillatorRef.current?.stop()
    oscillatorRef.current = null
    setIsPlaying(false)
  }

  const recordHearingResult = (heard: boolean) => {
    stopTone()
    const freq = HEARING_FREQUENCIES[currentFreqIndex].freq
    setHearingResults(prev => [...prev, { freq, heard }])
    
    if (currentFreqIndex < HEARING_FREQUENCIES.length - 1) {
      setCurrentFreqIndex(prev => prev + 1)
    } else {
      setTestComplete(true)
    }
  }

  const resetHearingTest = () => {
    setCurrentFreqIndex(0)
    setHearingResults([])
    setTestComplete(false)
    setVolume(50)
    stopTone()
  }

  const getHearingSummary = () => {
    const notHeard = hearingResults.filter(r => !r.heard)
    if (notHeard.length === 0) return { status: 'normal', text: 'Pendengaran normal', color: 'text-green-600' }
    if (notHeard.length <= 2) return { status: 'ringan', text: 'Gangguan ringan', color: 'text-yellow-600' }
    return { status: 'sedang', text: 'Gangguan pendengaran', color: 'text-red-600' }
  }

  // ==================== MEDICINE FUNCTIONS ====================

  const checkInteractions = () => {
    const warnings: string[] = []
    const medNames = medicines.map(m => m.name.toLowerCase())
    
    medicines.forEach(med => {
      const interactions = DRUG_INTERACTIONS[med.name.toLowerCase()] || []
      interactions.forEach(drug => {
        if (medNames.some(m => m.includes(drug) || drug.includes(m))) {
          warnings.push(`${med.name} tidak boleh diminum bersama ${drug}`)
        }
      })
    })
    
    setInteractions([...new Set(warnings)])
  }

  const addMedicine = () => {
    if (!newMed.name || !newMed.dosage) return
    
    const medicine: Medicine = {
      id: Date.now().toString(),
      ...newMed
    }
    
    setMedicines(prev => [...prev, medicine])
    setNewMed({ name: '', dosage: '', frequency: 'pagi', time: '06:00', notes: '' })
    setShowAddForm(false)
  }

  const deleteMedicine = (id: string) => {
    setMedicines(prev => prev.filter(m => m.id !== id))
  }

  const getFrequencyLabel = (value: string) => {
    return FREQUENCY_OPTIONS.find(o => o.value === value)?.label || value
  }

  // ==================== RENDER ====================

  if (activeFeature === 'home') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 pb-24">
        <div className="mobile-container py-6">
          {/* Header */}
          <div className="text-center mb-8 px-4">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mb-4 shadow-lg">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Pemeriksaan Kesehatan</h1>
            <p className="text-gray-600">3 fitur bermanfaat tanpa biaya</p>
          </div>

          {/* Feature Cards */}
          <div className="space-y-4 px-4">
            {/* Anemia Check */}
            <Card 
              className="cursor-pointer hover:shadow-lg transition-all active:scale-95 border-l-4 border-l-red-400"
              onClick={() => { setActiveFeature('anemia'); setTimeout(initAnemiaCamera, 100) }}
            >
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-red-400 to-pink-500 rounded-xl flex items-center justify-center">
                    <Droplets className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-800">Cek Anemia</h3>
                    <p className="text-sm text-gray-500">Analisis warna kuku untuk skrining anemia</p>
                  </div>
                  <ChevronLeft className="w-5 h-5 text-gray-400 rotate-180" />
                </div>
              </CardContent>
            </Card>

            {/* Hearing Test */}
            <Card 
              className="cursor-pointer hover:shadow-lg transition-all active:scale-95 border-l-4 border-l-blue-400"
              onClick={() => setActiveFeature('hearing')}
            >
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-xl flex items-center justify-center">
                    <Ear className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-800">Tes Pendengaran</h3>
                    <p className="text-sm text-gray-500">Cek kemampuan dengar frekuensi berbeda</p>
                  </div>
                  <ChevronLeft className="w-5 h-5 text-gray-400 rotate-180" />
                </div>
              </CardContent>
            </Card>

            {/* Medicine Reminder */}
            <Card 
              className="cursor-pointer hover:shadow-lg transition-all active:scale-95 border-l-4 border-l-green-400"
              onClick={() => setActiveFeature('medicine')}
            >
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl flex items-center justify-center">
                    <Pill className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-800">Pengingat Obat</h3>
                    <p className="text-sm text-gray-500">Jadwal minum obat & cek interaksi</p>
                  </div>
                  <ChevronLeft className="w-5 h-5 text-gray-400 rotate-180" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Info */}
          <div className="mt-8 mx-4 p-4 bg-blue-50 rounded-xl">
            <p className="text-sm text-blue-700 flex items-start gap-2">
              <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>
                Fitur ini membantu skrining kesehatan. Hasil bersifat informatif, 
                bukan diagnosis medis. Jika ada keluhan, segera kunjungi puskesmas.
              </span>
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ========== ANEMIA SCREEN ==========
  if (activeFeature === 'anemia') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-pink-50 to-rose-50 pb-24">
        <div className="mobile-container py-4">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 mb-4">
            <button onClick={() => { setActiveFeature('home'); setAnemiaResult(null) }} className="p-2 hover:bg-white/50 rounded-full" aria-label="Kembali ke menu">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-bold">Cek Anemia</h1>
          </div>

          {!anemiaResult ? (
            <div className="px-4">
              {/* Camera Preview */}
              <Card className="overflow-hidden mb-4">
                <div className="relative aspect-[4/3] bg-black">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  <canvas ref={canvasRef} className="hidden" />
                  
                  {/* Guide overlay */}
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-32 h-32 border-2 border-white/70 rounded-lg" />
                    </div>
                    <p className="absolute bottom-4 left-0 right-0 text-center text-white/80 text-xs px-4">
                      Letakkan kuku jari di dalam kotak
                    </p>
                  </div>
                </div>
              </Card>

              {cameraError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {cameraError}
                </div>
              )}

              <Card className="mb-4">
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Info className="w-4 h-4 text-red-500" />
                    Cara Penggunaan
                  </h3>
                  <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                    <li>Pastikan pencahayaan cukup terang</li>
                    <li>Letakkan ujung jari di tengah layar</li>
                    <li>Kuku harus terlihat jelas tanpa kuteks</li>
                    <li>Tekan tombol &quot;Analisis&quot; untuk memindai</li>
                  </ol>
                </CardContent>
              </Card>

              <Button 
                onClick={captureAndAnalyze}
                disabled={isAnalyzing || cameraError !== null}
                className="w-full bg-red-500 hover:bg-red-600 text-white py-6"
              >
                {isAnalyzing ? 'Menganalisis...' : 'Analisis Warna Kuku'}
              </Button>
            </div>
          ) : (
            <div className="px-4">
              {/* Result */}
              <Card className={`mb-4 border-l-4 ${anemiaResult.status === 'normal' ? 'border-l-green-500' : anemiaResult.status === 'ringan' ? 'border-l-yellow-500' : 'border-l-red-500'}`}>
                <CardContent className="p-6">
                  <div className="text-center mb-4">
                    <div className={`inline-flex items-center justify-center w-20 h-20 ${anemiaResult.bgColor} rounded-full mb-3`}>
                      <Droplets className={`w-10 h-10 ${anemiaResult.color}`} />
                    </div>
                    <h2 className={`text-3xl font-bold ${anemiaResult.color}`}>{anemiaResult.score}</h2>
                    <p className="text-sm text-gray-500">Skor Kemerahan</p>
                    <div className={`mt-2 inline-block px-4 py-1 rounded-full ${anemiaResult.bgColor} ${anemiaResult.color} font-medium`}>
                      {anemiaResult.label}
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-800 mb-2">Saran:</h4>
                    <p className="text-sm text-gray-600">{anemiaResult.advice}</p>
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-3">
                <Button 
                  onClick={() => setActiveFeature('home')}
                  variant="outline"
                  className="flex-1"
                >
                  Kembali
                </Button>
                <Button 
                  onClick={resetAnemia}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Cek Lagi
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ========== HEARING TEST SCREEN ==========
  if (activeFeature === 'hearing') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-sky-50 pb-24">
        <div className="mobile-container py-4">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 mb-4">
            <button onClick={() => { setActiveFeature('home'); stopTone() }} className="p-2 hover:bg-white/50 rounded-full" aria-label="Kembali ke menu">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-bold">Tes Pendengaran</h1>
          </div>

          {!testComplete ? (
            <div className="px-4">
              {/* Progress */}
              <div className="mb-6">
                <div className="flex justify-between text-sm text-gray-500 mb-2">
                  <span>Frekuensi {currentFreqIndex + 1} dari {HEARING_FREQUENCIES.length}</span>
                  <span>{Math.round((currentFreqIndex / HEARING_FREQUENCIES.length) * 100)}%</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full">
                  <div 
                    className="h-2 bg-blue-500 rounded-full transition-all"
                    style={{ width: `${((currentFreqIndex) / HEARING_FREQUENCIES.length) * 100}%` }}
                  />
                </div>
              </div>

              {/* Current Test */}
              <Card className="mb-6">
                <CardContent className="p-6 text-center">
                  <div className="mb-4">
                    <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                      {HEARING_FREQUENCIES[currentFreqIndex].label}
                    </span>
                    <p className="text-gray-500 text-sm mt-1">
                      {HEARING_FREQUENCIES[currentFreqIndex].desc}
                    </p>
                  </div>

                  {/* Volume Control */}
                  <div className="mb-6">
                    <label className="text-sm text-gray-500 mb-2 block">Volume: {volume}%</label>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={volume}
                      onChange={(e) => setVolume(Number(e.target.value))}
                      className="w-full"
                      aria-label="Volume tes pendengaran"
                    />
                  </div>

                  {/* Play Button */}
                  <Button
                    onClick={() => playTone(HEARING_FREQUENCIES[currentFreqIndex].freq)}
                    disabled={isPlaying}
                    className="w-full mb-4 bg-blue-500 hover:bg-blue-600 text-white py-6"
                  >
                    {isPlaying ? (
                      <><Volume2 className="w-5 h-5 mr-2 animate-pulse" /> Memutar Nada...</>
                    ) : (
                      <><Play className="w-5 h-5 mr-2" /> Putar Nada</>
                    )}
                  </Button>

                  <p className="text-sm text-gray-500 mb-4">
                    Apakah Anda mendengar nada ini?
                  </p>

                  {/* Response Buttons */}
                  <div className="flex gap-3">
                    <Button
                      onClick={() => recordHearingResult(false)}
                      variant="outline"
                      className="flex-1 py-6"
                    >
                      <VolumeX className="w-5 h-5 mr-2" />
                      Tidak Dengar
                    </Button>
                    <Button
                      onClick={() => recordHearingResult(true)}
                      className="flex-1 bg-green-500 hover:bg-green-600 text-white py-6"
                    >
                      <Volume2 className="w-5 h-5 mr-2" />
                      Dengar
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                    <Info className="w-4 h-4 text-blue-500" />
                    Petunjuk
                  </h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Gunakan earphone untuk hasil lebih akurat</li>
                    <li>• Pastikan lingkungan sepi</li>
                    <li>• Volume HP setengah atau lebih</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="px-4">
              {/* Results */}
              <Card className="mb-4">
                <CardContent className="p-6">
                  <div className="text-center mb-6">
                    <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-3 ${getHearingSummary().status === 'normal' ? 'bg-green-100' : getHearingSummary().status === 'ringan' ? 'bg-yellow-100' : 'bg-red-100'}`}>
                      <Ear className={`w-10 h-10 ${getHearingSummary().color}`} />
                    </div>
                    <h2 className={`text-2xl font-bold ${getHearingSummary().color}`}>
                      {getHearingSummary().text}
                    </h2>
                  </div>

                  {/* Detail Results */}
                  <div className="space-y-2">
                    {hearingResults.map((result, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm font-medium">{HEARING_FREQUENCIES[i].label}</span>
                        <span className={`text-sm ${result.heard ? 'text-green-600' : 'text-red-500'}`}>
                          {result.heard ? '✓ Terdengar' : '✗ Tidak terdengar'}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-3">
                <Button 
                  onClick={() => setActiveFeature('home')}
                  variant="outline"
                  className="flex-1"
                >
                  Kembali
                </Button>
                <Button 
                  onClick={resetHearingTest}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Ulangi Tes
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ========== MEDICINE REMINDER SCREEN ==========
  if (activeFeature === 'medicine') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 pb-24">
        <div className="mobile-container py-4">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 mb-4">
            <button onClick={() => setActiveFeature('home')} className="p-2 hover:bg-white/50 rounded-full" aria-label="Kembali ke menu">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-bold">Pengingat Obat</h1>
          </div>

          {/* Drug Interactions Warning */}
          {interactions.length > 0 && (
            <div className="mx-4 mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
              <h3 className="font-semibold text-red-700 flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5" />
                Perhatian Interaksi Obat!
              </h3>
              <ul className="text-sm text-red-600 space-y-1">
                {interactions.map((warning, i) => (
                  <li key={i}>• {warning}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Add Medicine Button */}
          {!showAddForm && (
            <div className="px-4 mb-4">
              <Button 
                onClick={() => setShowAddForm(true)}
                className="w-full bg-green-500 hover:bg-green-600 text-white py-6"
              >
                <Plus className="w-5 h-5 mr-2" />
                Tambah Obat
              </Button>
            </div>
          )}

          {/* Add Form */}
          {showAddForm && (
            <Card className="mx-4 mb-4">
              <CardContent className="p-4">
                <h3 className="font-semibold mb-4">Tambah Obat Baru</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-gray-600 block mb-1">Nama Obat</label>
                    <input
                      type="text"
                      value={newMed.name}
                      onChange={(e) => setNewMed({ ...newMed, name: e.target.value })}
                      placeholder="Contoh: Paracetamol"
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-600 block mb-1">Dosis</label>
                    <input
                      type="text"
                      value={newMed.dosage}
                      onChange={(e) => setNewMed({ ...newMed, dosage: e.target.value })}
                      placeholder="Contoh: 500mg"
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm text-gray-600 block mb-1">Frekuensi</label>
                      <select
                        value={newMed.frequency}
                        onChange={(e) => setNewMed({ ...newMed, frequency: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        aria-label="Frekuensi minum obat"
                      >
                        {FREQUENCY_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600 block mb-1">Jam</label>
                      <input
                        type="time"
                        value={newMed.time}
                        onChange={(e) => setNewMed({ ...newMed, time: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        aria-label="Waktu minum obat"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600 block mb-1">Catatan (opsional)</label>
                    <input
                      type="text"
                      value={newMed.notes}
                      onChange={(e) => setNewMed({ ...newMed, notes: e.target.value })}
                      placeholder="Contoh: Setelah makan"
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button 
                      onClick={() => setShowAddForm(false)}
                      variant="outline"
                      className="flex-1"
                    >
                      Batal
                    </Button>
                    <Button 
                      onClick={addMedicine}
                      disabled={!newMed.name || !newMed.dosage}
                      className="flex-1 bg-green-500 hover:bg-green-600 text-white"
                    >
                      Simpan
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Medicine List */}
          <div className="px-4 space-y-3">
            {medicines.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Pill className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p>Belum ada pengingat obat</p>
                <p className="text-sm">Tambahkan obat yang rutin Anda minum</p>
              </div>
            ) : (
              medicines.map(med => (
                <Card key={med.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">{FREQUENCY_OPTIONS.find(o => o.value === med.frequency)?.icon}</span>
                          <h3 className="font-semibold text-gray-800">{med.name}</h3>
                        </div>
                        <p className="text-sm text-gray-600">{med.dosage}</p>
                        <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                          <Clock className="w-4 h-4" />
                          <span>{getFrequencyLabel(med.frequency)} - {med.time}</span>
                        </div>
                        {med.notes && (
                          <p className="text-xs text-gray-400 mt-1">{med.notes}</p>
                        )}
                      </div>
                      <button
                        onClick={() => deleteMedicine(med.id)}
                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                        aria-label="Hapus obat"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Info */}
          {medicines.length > 0 && (
            <div className="mx-4 mt-6 p-4 bg-green-50 rounded-xl">
              <p className="text-sm text-green-700 flex items-start gap-2">
                <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>
                  Aplikasi akan memeriksa interaksi berbahaya antar obat. 
                  Selalu konsultasikan dengan dokter atau apoteker.
                </span>
              </p>
            </div>
          )}
        </div>
      </div>
    )
  }

  return null
}
