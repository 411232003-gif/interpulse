'use client'

import Link from 'next/link'
import { ArrowLeft, Dumbbell, Activity, Bone, AlertTriangle, CheckCircle, Clock, Shield } from 'lucide-react'

export default function SenamOsteoporosis() {
  const exercises = [
    {
      icon: Activity,
      title: 'Jalan Kaki',
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-blue-50',
      duration: '30 menit/hari',
      frequency: '5-7 hari/minggu',
      benefits: [
        'Meningkatkan kepadatan tulang',
        'Menguatkan otot kaki dan pinggul',
        'Meningkatkan keseimbangan',
        'Mudah dilakukan di mana saja',
        'Tidak perlu peralatan khusus',
        'Rendah risiko cedera',
      ],
      tips: [
        'Gunakan sepatu yang nyaman',
        'Mulai dengan tempo lambat',
        'Tingkatkan jarak secara bertahap',
        'Jalan di permukaan yang rata',
        'Gunakan tongkat jika perlu',
        'Hindari jalan di cuaca buruk',
      ]
    },
    {
      icon: Dumbbell,
      title: 'Latihan Beban',
      color: 'from-purple-500 to-violet-500',
      bgColor: 'bg-purple-50',
      duration: '20-30 menit',
      frequency: '2-3 hari/minggu',
      benefits: [
        'Meningkatkan kepadatan tulang',
        'Menguatkan otot punggung',
        'Meningkatkan postur tubuh',
        'Mencegah pengeroposan tulang',
        'Meningkatkan metabolisme',
        'Membantu keseimbangan',
      ],
      tips: [
        'Mulai dengan beban ringan',
        'Fokus pada teknik yang benar',
        'Istirahat antar set',
        'Hindari mengangkat terlalu berat',
        'Gunakan alat bantu jika perlu',
        'Konsultasi dengan instruktur',
      ]
    },
    {
      icon: Activity,
      title: 'Senam Keseimbangan',
      color: 'from-green-500 to-emerald-500',
      bgColor: 'bg-green-50',
      duration: '15-20 menit',
      frequency: 'Setiap hari',
      benefits: [
        'Mencegah jatuh',
        'Meningkatkan stabilitas',
        'Menguatkan otot inti',
        'Meningkatkan koordinasi',
        'Membantu postur tubuh',
        'Meningkatkan kepercayaan diri',
      ],
      tips: [
        'Gunakan kursu sebagai pegangan',
        'Lakukan di dekat dinding',
        'Mulai dengan gerakan sederhana',
        'Tutup mata untuk tantangan',
        'Lakukan secara perlahan',
        'Hindari gerakan berputar cepat',
      ]
    },
    {
      icon: Activity,
      title: 'Yoga dan Tai Chi',
      color: 'from-pink-500 to-rose-500',
      bgColor: 'bg-pink-50',
      duration: '20-30 menit',
      frequency: '3-4 hari/minggu',
      benefits: [
        'Meningkatkan fleksibilitas',
        'Menguatkan otot',
        'Meningkatkan keseimbangan',
        'Mengurangi stress',
        'Meningkatkan kesadaran tubuh',
        'Meningkatkan pernapasan',
      ],
      tips: [
        'Ikuti instruktur berpengalaman',
        'Gunakan mat yoga',
        'Mulai dengan pose dasar',
        'Hindari pose yang terlalu sulit',
        'Dengarkan tubuh Anda',
        'Istirahat jika perlu',
      ]
    }
  ]

  const prevention = [
    { icon: Shield, title: 'Nutrisi', items: ['Konsumsi kalsium 1000-1200 mg/hari', 'Vitamin D dari sinar matahari', 'Protein cukup', 'Batasi kafein dan alkohol'] },
    { icon: Clock, title: 'Gaya Hidup', items: ['Hindari merokok', 'Batasi alkohol', 'Tidur cukup', 'Kelola stress'] },
    { icon: Activity, title: 'Aktivitas', items: ['Olahraga teratur', 'Jalan kaki setiap hari', 'Hindari sedentary', 'Paparan sinar matahari'] },
    { icon: AlertTriangle, title: 'Pantauan', items: ['Cek densitas tulang', 'Periksa rutin', 'Konsultasi dokter', 'Monitor obat-obatan'] }
  ]

  const riskFactors = [
    'Usia di atas 50 tahun',
    'Wanita (terutama setelah menopause)',
    'Riwayat keluarga osteoporosis',
    'Rendah berat badan',
    'Kurang kalsium dan vitamin D',
    'Merokok',
    'Konsumsi alkohol berlebihan',
    'Sedentary lifestyle',
    'Penggunaan steroid jangka panjang',
    'Riwayat patah tulang sebelumnya'
  ]

  const warmUp = [
    'Putar bahu ke depan dan belakang (10x)',
    'Putar pinggang (10x)',
    'Putar pergelangan kaki (10x)',
    'Jalan di tempat (1 menit)',
    'Angkat lutut bergantian (10x)',
    'Regangan lengan ke samping (10x)',
    'Membungkukkan tubuh perlahan (10x)'
  ]

  const coolDown = [
    'Jalan perlahan (2 menit)',
    'Regangan hamstring (15 detik/kaki)',
    'Regangan quadriceps (15 detik/kaki)',
    'Regangan punggung (30 detik)',
    'Regangan bahu (15 detik/sisi)',
    'Pernapasan dalam (1 menit)',
    'Relaksasi total (2 menit)'
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 pb-24">
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <Link href="/tips" className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors" aria-label="Kembali ke tips">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div className="mt-0">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
              Senam Osteoporosis
            </h1>
            <p className="text-base text-gray-600">
              Latihan untuk kesehatan tulang dan pencegahan osteoporosis
            </p>
          </div>
        </div>

        {/* Introduction */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Bone className="w-6 h-6 text-purple-600" />
            Apa itu Osteoporosis?
          </h2>
          <div className="space-y-3 text-gray-700">
            <p>Osteoporosis adalah kondisi di mana tulang menjadi lemah dan rapuh, meningkatkan risiko patah tulang. Senam dan aktivitas fisik yang tepat dapat membantu:</p>
            <ul className="space-y-2 mt-3">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Meningkatkan kepadatan dan kekuatan tulang</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Meningkatkan keseimbangan dan koordinasi</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Menguatkan otot yang mendukung tulang</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Mencegah jatuh dan patah tulang</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Meningkatkan postur dan fleksibilitas</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Risk Factors */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-red-500" />
            Faktor Risiko Osteoporosis
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {riskFactors.map((factor, index) => (
              <div key={index} className="flex items-center gap-3 bg-red-50 rounded-xl p-3">
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <span className="text-sm text-gray-700">{factor}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Exercises */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Latihan yang Direkomendasikan</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {exercises.map((exercise, index) => {
              const Icon = exercise.icon
              return (
                <div key={index} className={`${exercise.bgColor} rounded-2xl p-5 shadow-md hover:shadow-lg transition-shadow`}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${exercise.color} p-2.5 shadow-md`}>
                      <Icon className="w-full h-full text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-800">{exercise.title}</h3>
                      <div className="text-sm text-gray-600">
                        {exercise.duration} • {exercise.frequency}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <h4 className="font-semibold text-gray-800 mb-2">Manfaat:</h4>
                    <ul className="space-y-1">
                      {exercise.benefits.map((benefit, benefitIndex) => (
                        <li key={benefitIndex} className="flex items-start gap-2 text-sm text-gray-700">
                          <CheckCircle className="w-3 h-3 text-green-600 mt-1 flex-shrink-0" />
                          <span>{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-800 mb-2">Tips:</h4>
                    <ul className="space-y-1">
                      {exercise.tips.map((tip, tipIndex) => (
                        <li key={tipIndex} className="flex items-start gap-2 text-sm text-gray-700">
                          <CheckCircle className="w-3 h-3 text-green-600 mt-1 flex-shrink-0" />
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Warm Up and Cool Down */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Activity className="w-6 h-6 text-orange-500" />
              Pemanasan (Warm Up)
            </h2>
            <ul className="space-y-2">
              {warmUp.map((item, index) => (
                <li key={index} className="flex items-center gap-2 text-sm text-gray-700">
                  <CheckCircle className="w-4 h-4 text-orange-600 flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Activity className="w-6 h-6 text-blue-500" />
              Pendinginan (Cool Down)
            </h2>
            <ul className="space-y-2">
              {coolDown.map((item, index) => (
                <li key={index} className="flex items-center gap-2 text-sm text-gray-700">
                  <CheckCircle className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Prevention */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Pencegahan Osteoporosis</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {prevention.map((category, index) => {
              const Icon = category.icon
              return (
                <div key={index} className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Icon className="w-5 h-5 text-purple-600" />
                    <h3 className="font-bold text-gray-800">{category.title}</h3>
                  </div>
                  <ul className="space-y-1">
                    {category.items.map((item, itemIndex) => (
                      <li key={itemIndex} className="flex items-start gap-2 text-sm text-gray-700">
                        <CheckCircle className="w-3 h-3 text-green-600 mt-1 flex-shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        </div>

        {/* Safety Tips */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl shadow-lg p-6 text-white">
          <h2 className="text-2xl font-bold mb-4">Tips Keselamatan</h2>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <span>Konsultasikan dengan dokter sebelum memulai program latihan baru</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <span>Mulai dengan intensitas rendah dan tingkatkan secara bertahap</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <span>Gunakan alat bantu jika diperlukan untuk keseimbangan</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <span>Hentikan latihan jika merasa sakit atau tidak nyaman</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <span>Lakukan latihan di area yang aman dan bebas hambatan</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <span>Gunakan sepatu yang nyaman dan memberikan dukungan</span>
            </li>
          </ul>
        </div>
      </main>
    </div>
  )
}
