'use client'

import Link from 'next/link'
import { ArrowLeft, Activity, Moon, Sun, Brain, Droplets, Utensils, CheckCircle, AlertTriangle } from 'lucide-react'

export default function EdukasiPolaHidupSehat() {
  const lifestyleAspects = [
    {
      icon: Activity,
      title: 'Aktivitas Fisik',
      color: 'from-red-500 to-orange-500',
      bgColor: 'bg-red-50',
      tips: [
        'Lakukan olahraga minimal 30 menit setiap hari',
        'Jalan kaki 10.000 langkah per hari',
        'Kombinasikan kardio dan latihan kekuatan',
        'Lakukan pemanasan sebelum olahraga',
        'Istirahat yang cukup antar sesi latihan',
        'Pilih aktivitas yang Anda nikmati',
        'Gunakan tangga daripada lift',
        'Parkir lebih jauh untuk berjalan lebih banyak',
      ]
    },
    {
      icon: Moon,
      title: 'Kualitas Tidur',
      color: 'from-indigo-500 to-purple-500',
      bgColor: 'bg-indigo-50',
      tips: [
        'Tidur 7-9 jam setiap malam',
        'Buat jadwal tidur yang konsisten',
        'Hindari layar gadget 1 jam sebelum tidur',
        'Ciptakan lingkungan tidur yang nyaman',
        'Suhu kamar tidur ideal 18-21°C',
        'Gunakan kasur dan bantal yang nyaman',
        'Hindari kafein 4-6 jam sebelum tidur',
        'Lakukan relaksasi sebelum tidur',
      ]
    },
    {
      icon: Sun,
      title: 'Paparan Sinar Matahari',
      color: 'from-amber-500 to-yellow-500',
      bgColor: 'bg-amber-50',
      tips: [
        'Dapatkan sinar matahari pagi 10-15 menit',
        'Gunakan tabir surya saat beraktivitas di luar',
        'Hindari paparan langsung saat terik (10:00-16:00)',
        'Vitamin D penting untuk kesehatan tulang',
        'Paparan sinar matahari meningkatkan mood',
        'Buka tirai di pagi hari untuk masuk cahaya',
        'Berjalan di luar saat cuaca cerah',
        'Gunakan kacamata hitam saat terik',
      ]
    },
    {
      icon: Brain,
      title: 'Kesehatan Mental',
      color: 'from-pink-500 to-rose-500',
      bgColor: 'bg-pink-50',
      tips: [
        'Luangkan waktu untuk hobi dan relaksasi',
        'Jaga hubungan sosial yang positif',
        'Praktikkan mindfulness dan meditasi',
        'Jangan ragu mencari bantuan profesional',
        'Kelola stress dengan cara sehat',
        'Tulis jurnal untuk memproses emosi',
        'Batasi konsumsi berita negatif',
        'Luangkan waktu untuk bersyukur',
      ]
    },
    {
      icon: Droplets,
      title: 'Hidrasi',
      color: 'from-cyan-500 to-blue-500',
      bgColor: 'bg-cyan-50',
      tips: [
        'Minum minimal 8 gelas air per hari',
        'Mulai hari dengan segelas air hangat',
        'Bawa botol air kemana pun Anda pergi',
        'Kurangi minuman berkafein dan bersoda',
        'Perhatikan warna urin (kuning pucat ideal)',
        'Minum lebih banyak saat berolahraga',
        'Konsumsi buah dan sayur yang kaya air',
        'Hindari minuman manis dan beralkohol',
      ]
    },
    {
      icon: Utensils,
      title: 'Kebiasaan Makan',
      color: 'from-green-500 to-emerald-500',
      bgColor: 'bg-green-50',
      tips: [
        'Makan secara teratur 3x sehari',
        'Kunyah makanan secara perlahan',
        'Hindari makan saat terburu-buru',
        'Berhenti makan saat merasa kenyang',
        'Makan di meja makan, bukan di depan TV',
        'Batasi camilan tidak sehat',
        'Gunakan piring lebih kecil',
        'Nikmati setiap gigitan',
      ]
    }
  ]

  const habitsToAvoid = [
    'Merokok dan penggunaan tembakau',
    'Konsumsi alkohol berlebihan',
    'Kurang tidur atau tidur tidak teratur',
    'Sedentary lifestyle (kurang gerak)',
    'Stres berlebihan tanpa manajemen',
    'Konsumsi makanan cepat saji',
    'Terlalu banyak waktu di layar',
    'Kurang interaksi sosial'
  ]

  const dailyRoutine = [
    { time: '06:00', activity: 'Bangun dan minum air', icon: Sun },
    { time: '06:30', activity: 'Olahraga ringan/jalan kaki', icon: Activity },
    { time: '07:00', activity: 'Sarapan sehat', icon: Utensils },
    { time: '09:00', activity: 'Paparan sinar matahari', icon: Sun },
    { time: '12:00', activity: 'Makan siang seimbang', icon: Utensils },
    { time: '15:00', activity: 'Camilan sehat', icon: Utensils },
    { time: '18:00', activity: 'Olahraga/aktivitas fisik', icon: Activity },
    { time: '19:00', activity: 'Makan malam', icon: Utensils },
    { time: '21:00', activity: 'Relaksasi/tidur', icon: Moon },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 pb-24">
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <Link href="/tips" className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors" aria-label="Kembali ke tips">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div className="mt-0">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mb-2">
              Edukasi Pola Hidup Sehat
            </h1>
            <p className="text-base text-gray-600">
              Tips gaya hidup sehat untuk kualitas hidup lebih baik
            </p>
          </div>
        </div>

        {/* Introduction */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <CheckCircle className="w-6 h-6 text-blue-600" />
            Mengapa Pola Hidup Sehat Penting?
          </h2>
          <div className="space-y-3 text-gray-700">
            <p>• Meningkatkan energi dan produktivitas sehari-hari</p>
            <p>• Mengurangi risiko penyakit kronis</p>
            <p>• Meningkatkan kesehatan mental dan emosional</p>
            <p>• Memperpanjang umur dan kualitas hidup</p>
            <p>• Meningkatkan sistem kekebalan tubuh</p>
            <p>• Memperbaiki kualitas tidur</p>
          </div>
        </div>

        {/* Lifestyle Aspects */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Aspek Pola Hidup Sehat</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {lifestyleAspects.map((aspect, index) => {
              const Icon = aspect.icon
              return (
                <div key={index} className={`${aspect.bgColor} rounded-2xl p-5 shadow-md hover:shadow-lg transition-shadow`}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${aspect.color} p-2.5 shadow-md`}>
                      <Icon className="w-full h-full text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800">{aspect.title}</h3>
                  </div>
                  <ul className="space-y-2">
                    {aspect.tips.map((tip, tipIndex) => (
                      <li key={tipIndex} className="flex items-start gap-2 text-sm text-gray-700">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        </div>

        {/* Daily Routine */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Jadwal Harian Sehat</h2>
          <div className="space-y-3">
            {dailyRoutine.map((routine, index) => {
              const Icon = routine.icon
              return (
                <div key={index} className="flex items-center gap-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-4">
                  <div className="bg-white rounded-full p-2 shadow-sm">
                    <Icon className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-gray-800">{routine.time}</div>
                    <div className="text-sm text-gray-600">{routine.activity}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Habits to Avoid */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-red-500" />
            Kebiasaan yang Harus Dihindari
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {habitsToAvoid.map((habit, index) => (
              <div key={index} className="flex items-center gap-3 bg-red-50 rounded-xl p-3">
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <span className="text-sm text-gray-700">{habit}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tips */}
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl shadow-lg p-6 text-white">
          <h2 className="text-2xl font-bold mb-4">Tips Memulai Gaya Hidup Sehat</h2>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <span>Mulai dengan perubahan kecil yang konsisten</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <span>Tetapkan tujuan yang realistis dan terukur</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <span>Track progress Anda setiap hari</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <span>Cari teman atau keluarga untuk dukungan</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <span>Rayakan setiap kemajuan kecil</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <span>Jangan terlalu keras pada diri sendiri jika slip</span>
            </li>
          </ul>
        </div>
      </main>
    </div>
  )
}
