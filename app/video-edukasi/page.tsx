'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { Play, Pause, Volume2, VolumeX, Maximize2, Clock, FileVideo, ArrowLeft } from 'lucide-react'

// Data video WhatsApp yang tersedia
const videosData = [
  {
    id: 1,
    title: 'Manfaat Daun Salam',
    description: 'Menurunkan Gula Darah, Menjaga Kesehatan Pencernaan, Menurunkan Kolesterol',
    src: '/video/WhatsApp%20Video%202026-04-02%20at%2022.52.13.mp4',
    duration: '10:00',
    content: `1. Daun Salam
• Menurunkan Gula Darah: Membantu meningkatkan sensitivitas insulin, sehingga baik dikonsumsi penderita diabetes.
• Menjaga Kesehatan Pencernaan: Kandungan enzim di dalamnya membantu melancarkan proses pencernaan dan mengurangi gejala perut kembung.
• Menurunkan Kolesterol: Membantu menurunkan kadar kolesterol jahat (LDL) dan trigliserida dalam darah.`,
  },
  {
    id: 2,
    title: '6 Bahan Alami untuk Kesehatan',
    description: 'Kunyit, Cengkeh, Daun Mint, Minyak Wijen, dan Air Garam',
    src: '/video/WhatsApp%20Video%202026-04-02%20at%2022.52.27.mp4',
    duration: '10:00',
    content: `2. Kunyit
• Anti-inflamasi Alami: Kandungan kurkumin yang tinggi sangat efektif meredakan peradangan di dalam tubuh.
• Meningkatkan Imunitas: Memiliki sifat antioksidan dan imunomodulator yang memperkuat daya tahan tubuh terhadap penyakit.
• Menjaga Kesehatan Lambung: Membantu mengatasi masalah pencernaan seperti maag dan gejala dispepsia lainnya.

3. Cengkeh
• Meredakan Sakit Gigi: Senyawa eugenol di dalamnya berfungsi sebagai anestesi alami dan antiseptik untuk mengatasi nyeri gigi.
• Melawan Infeksi: Memiliki sifat antibakteri dan antivirus yang kuat untuk membantu melawan berbagai jenis infeksi.
• Meredakan Gangguan Pernapasan: Membantu mengencerkan lendir dan melegakan tenggorokan saat batuk atau pilek.

4. Daun Mint
• Melegakan Saluran Napas: Kandungan mentol memberikan sensasi dingin yang membantu membuka saluran napas saat tersumbat.
• Mengatasi Mual: Aroma dan sifat alaminya efektif meredakan rasa mual atau pusing, termasuk motion sickness.
• Meningkatkan Fokus: Menghirup aromanya dapat membantu meningkatkan kewaspadaan dan mengurangi rasa lelah mental.

5. Minyak Wijen
• Menjaga Kesehatan Jantung: Kaya akan lemak tak jenuh (asam oleat dan linoleat) yang baik untuk menurunkan risiko penyakit kardiovaskular.
• Perawatan Kulit: Bersifat melembapkan dan mengandung antioksidan yang baik untuk menutrisi kulit serta melindunginya dari radikal bebas.
• Menjaga Kesehatan Tulang: Mengandung kalsium dan seng yang penting untuk mempertahankan kepadatan dan kekuatan tulang.

6. Air Garam
• Pembersih Tenggorokan: Berkumur dengan air garam dapat membantu meredakan sakit tenggorokan dan membunuh bakteri di area mulut.
• Mempercepat Penyembuhan Luka: Larutan air garam steril dapat digunakan untuk membersihkan luka kecil agar tidak terinfeksi.
• Mengatasi Masalah Gusi: Efektif mengurangi peradangan gusi dan menjaga kesehatan jaringan mulut secara umum.`,
  },
]

export default function VideoEdukasi() {
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)

  const currentVideo = videosData[currentVideoIndex]

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
    }
  }

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const progress = (videoRef.current.currentTime / videoRef.current.duration) * 100
      setProgress(progress)
      setCurrentTime(videoRef.current.currentTime)
    }
  }

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration)
    }
  }

  const switchVideo = (index: number) => {
    setCurrentVideoIndex(index)
    setIsPlaying(false)
    setProgress(0)
    setCurrentTime(0)
    setDuration(0)
  }

  // Effect untuk handle video source change
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.load()
    }
  }, [currentVideoIndex])

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value)
    if (videoRef.current) {
      videoRef.current.currentTime = time
      setCurrentTime(time)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 pb-nav">
      <Link href="/" className="p-3 hover:bg-white/50 rounded-full ml-2" aria-label="Kembali ke beranda">
        <ArrowLeft className="w-6 h-6" />
      </Link>
      
      <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-2xl sm:rounded-3xl mb-4 shadow-lg">
            <Play className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-teal-800 mb-3">
            Video Edukasi Kesehatan
          </h2>
          <p className="text-slate-500 text-lg max-w-2xl mx-auto">
            Pelajari cara menjaga kesehatan melalui koleksi video edukasi kami
          </p>
        </div>

        {/* Video Player - Modern Design */}
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden mb-10 ring-1 ring-slate-200">
          <div className="relative aspect-video bg-slate-900 group">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              controls={false}
              preload="metadata"
              poster="/icons/icon-512x512.svg"
            >
              <source src={`${currentVideo.src}?v=2`} type="video/mp4" />
            </video>

            {/* Center Play Button - Large & Elegant */}
            {!isPlaying && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity">
                <button
                  onClick={togglePlay}
                  className="w-20 h-20 bg-white/95 hover:bg-white rounded-full flex items-center justify-center shadow-2xl transition-all hover:scale-110 active:scale-95"
                  aria-label="Play"
                >
                  <Play className="w-8 h-8 text-slate-800 ml-1" fill="currentColor" />
                </button>
              </div>
            )}

            {/* Hover Play/Pause Overlay */}
            {isPlaying && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" onClick={togglePlay}>
                <button
                  className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center shadow-xl"
                  aria-label="Pause"
                >
                  <Pause className="w-6 h-6 text-slate-800" fill="currentColor" />
                </button>
              </div>
            )}

            {/* Bottom Controls Bar */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-16 pb-4 px-4">
              {/* Progress Bar */}
              <div className="mb-3">
                <input
                  type="range"
                  min="0"
                  max={duration || 100}
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full h-1.5 bg-white/30 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-lg"
                  aria-label="Progress"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* Play/Pause */}
                  <button
                    onClick={togglePlay}
                    className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-colors"
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                  >
                    {isPlaying ? (
                      <Pause className="w-5 h-5" fill="currentColor" />
                    ) : (
                      <Play className="w-5 h-5 ml-0.5" fill="currentColor" />
                    )}
                  </button>

                  {/* Volume */}
                  <button
                    onClick={toggleMute}
                    className="w-10 h-10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors"
                    aria-label={isMuted ? 'Unmute' : 'Mute'}
                  >
                    {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  </button>

                  {/* Time */}
                  <span className="text-white text-sm font-medium tabular-nums">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>

                {/* Fullscreen */}
                <button
                  onClick={() => videoRef.current?.requestFullscreen()}
                  className="w-10 h-10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors"
                  aria-label="Fullscreen"
                >
                  <Maximize2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Content Grid - Modern Layout */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content - Left 2/3 */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description Card */}
            <div className="bg-white rounded-2xl p-8 shadow-sm ring-1 ring-slate-100">
              <h2 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </span>
                {currentVideo.title}
              </h2>
              <p className="text-slate-600 leading-relaxed whitespace-pre-line">
                {currentVideo.content}
              </p>
            </div>

            {/* Key Points - Modern List */}
            <div className="bg-white rounded-2xl p-8 shadow-sm ring-1 ring-slate-100">
              <h2 className="text-xl font-semibold text-slate-800 mb-6">Poin Kunci</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  { num: '01', text: 'Konsumsi makanan rendah lemak jenuh', color: 'bg-emerald-100 text-emerald-700' },
                  { num: '02', text: 'Aktivitas fisik 30 menit per hari', color: 'bg-blue-100 text-blue-700' },
                  { num: '03', text: 'Kelola stres dengan meditasi', color: 'bg-purple-100 text-purple-700' },
                  { num: '04', text: 'Pantau tekanan darah rutin', color: 'bg-orange-100 text-orange-700' },
                  { num: '05', text: 'Hindari rokok dan alkohol', color: 'bg-red-100 text-red-700' },
                ].map((item) => (
                  <div key={item.num} className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                    <span className={`w-8 h-8 ${item.color} rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0`}>
                      {item.num}
                    </span>
                    <p className="text-slate-700 text-sm pt-1">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar - Right 1/3 */}
          <div className="space-y-6">
            {/* Video Playlist Card */}
            <div className="bg-white rounded-2xl p-6 shadow-sm ring-1 ring-slate-100">
              <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <FileVideo className="w-5 h-5 text-teal-600" />
                Daftar Video
              </h3>
              <div className="space-y-3">
                {videosData.map((video, index) => (
                  <button
                    key={video.id}
                    onClick={() => switchVideo(index)}
                    className={`w-full text-left p-4 rounded-xl transition-all ${
                      currentVideoIndex === index
                        ? 'bg-teal-50 ring-2 ring-teal-500'
                        : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${
                        currentVideoIndex === index ? 'bg-teal-100' : 'bg-gray-200'
                      }`}>
                        <Play className={`w-4 h-4 ${
                          currentVideoIndex === index ? 'text-teal-600' : 'text-gray-600'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className={`font-medium text-sm ${
                          currentVideoIndex === index ? 'text-teal-800' : 'text-gray-800'
                        }`}>
                          {video.title}
                        </h4>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                          {video.description}
                        </p>
                        <div className="flex items-center mt-2 text-xs text-gray-400">
                          <Clock className="w-3 h-3 mr-1" />
                          {video.duration}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Stats Card */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 text-white">
              <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-5">
                Target Harian
              </h3>
              <div className="space-y-5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                    <span className="text-xl">🏃</span>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">30</p>
                    <p className="text-sm text-slate-400">Menit Olahraga</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                    <span className="text-xl">💧</span>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">8</p>
                    <p className="text-sm text-slate-400">Gelas Air</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                    <span className="text-xl">💤</span>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">7-8</p>
                    <p className="text-sm text-slate-400">Jam Tidur</p>
                  </div>
                </div>
              </div>
            </div>

            {/* CTA Card */}
            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl p-6 text-white">
              <h3 className="font-semibold mb-2">Mulai Pantau Kesehatan</h3>
              <p className="text-sm text-blue-100 mb-4">
                Gunakan fitur aplikasi untuk memantau kesehatan Anda secara rutin.
              </p>
              <div className="space-y-2">
                <a
                  href="/Fasca"
                  className="block w-full py-2.5 px-4 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-medium text-center transition-colors"
                >
                  Catat Kesehatan
                </a>
                <a 
                  href="/kalori-tracker" 
                  className="block w-full py-2.5 px-4 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-medium text-center transition-colors"
                >
                  Tracker Kalori
                </a>
                <a 
                  href="/deteksi-jantung" 
                  className="block w-full py-2.5 px-4 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-medium text-center transition-colors"
                >
                  Cek Jantung
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
