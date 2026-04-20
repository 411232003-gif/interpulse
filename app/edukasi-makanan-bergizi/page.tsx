'use client'

import Link from 'next/link'
import { ArrowLeft, Apple, Carrot, Wheat, Fish, Egg, Milk, Droplets, CheckCircle, AlertTriangle } from 'lucide-react'

export default function EdukasiMakananBergizi() {
  const foodGroups = [
    {
      icon: Apple,
      title: 'Buah dan Sayur',
      color: 'from-green-500 to-emerald-500',
      bgColor: 'bg-green-50',
      tips: [
        'Konsumsi minimal 5 porsi buah dan sayur setiap hari',
        'Pilih buah dan sayur yang berwarna-warni untuk nutrisi lengkap',
        'Makan buah segar sebagai pengganti camilan manis',
        'Sayuran hijau kaya akan zat besi dan vitamin K',
        'Buah berwarna merah/oranye tinggi antioksidan',
        'Sayuran cruciferous (brokol, kembang kol) baik untuk kanker',
      ]
    },
    {
      icon: Wheat,
      title: 'Karbohidrat Kompleks',
      color: 'from-amber-500 to-orange-500',
      bgColor: 'bg-amber-50',
      tips: [
        'Pilih gandum utuh (whole grain) daripada tepung putih',
        'Nasi merah lebih bernutrisi daripada nasi putih',
        'Oatmeal baik untuk kesehatan jantung',
        'Roti gandum lebih kaya serat',
        'Batasi konsumsi karbohidrat olahan (roti tawar, kue)',
        'Karbohidrat kompleks memberi energi tahan lama',
      ]
    },
    {
      icon: Fish,
      title: 'Protein Hewani',
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-blue-50',
      tips: [
        'Ikan berlemak (salmon, tuna) kaya omega-3',
        'Ayam tanpa kulit lebih rendah lemak',
        'Daging merah batasi konsumsi (maks 2x seminggu)',
        'Telur adalah sumber protein lengkap',
        'Ikan laut baik untuk kesehatan otak',
        'Hindari daging olahan (sosis, nugget)',
      ]
    },
    {
      icon: Egg,
      title: 'Protein Nabati',
      color: 'from-yellow-500 to-amber-500',
      bgColor: 'bg-yellow-50',
      tips: [
        'Kacang-kacangan kaya protein dan serat',
        'Tahu dan tempe sumber protein nabati berkualitas',
        'Kacang almond baik untuk kesehatan jantung',
        'Edamame tinggi protein dan antioksidan',
        'Quinoa adalah protein nabati lengkap',
        'Kacang merah baik untuk kesehatan pencernaan',
      ]
    },
    {
      icon: Milk,
      title: 'Susu dan Turunannya',
      color: 'from-purple-500 to-violet-500',
      bgColor: 'bg-purple-50',
      tips: [
        'Susu rendah lemak lebih sehat',
        'Yogurt probiotik baik untuk pencernaan',
        'Keese kalsium penting untuk kesehatan tulang',
        'Susu almond alternatif untuk intoleransi laktosa',
        'Keju batasi konsumsi karena tinggi lemak',
        'Yogurt tanpa gula lebih sehat',
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
        'Air putih lebih baik daripada minuman manis',
        'Batasi minuman bersoda dan berkafein',
        'Bawa botol air kemana pun',
        'Kehilangan cairan saat berolahraga harus diganti',
      ]
    }
  ]

  const nutrients = [
    { name: 'Vitamin A', sources: 'Wortel, bayam, telur', function: 'Kesehatan mata dan kulit' },
    { name: 'Vitamin C', sources: 'Jeruk, kiwi, paprika', function: 'Sistem kekebalan tubuh' },
    { name: 'Vitamin D', sources: 'Ikan, telur, sinar matahari', function: 'Kesehatan tulang' },
    { name: 'Zat Besi', sources: 'Daging merah, bayam, kacang', function: 'Pembentukan sel darah' },
    { name: 'Kalsium', sources: 'Susu, keju, sayuran hijau', function: 'Kesehatan tulang dan gigi' },
    { name: 'Serat', sources: 'Buah, sayur, gandum utuh', function: 'Pencernaan sehat' },
    { name: 'Omega-3', sources: 'Ikan berlemak, kenari', function: 'Kesehatan jantung dan otak' },
    { name: 'Protein', sources: 'Daging, ikan, kacang', function: 'Pembentukan otot dan jaringan' }
  ]

  const avoidFoods = [
    'Makanan tinggi gula (minuman manis, kue, permen)',
    'Makanan tinggi garam (makanan kaleng, snack asin)',
    'Makanan tinggi lemak jenuh (gorengan, fast food)',
    'Makanan olahan (sosis, nugget, makanan instan)',
    'Minuman bersoda dan beralkohol',
    'Karbohidrat olahan (roti tawar, pasta putih)'
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 pb-24">
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <Link href="/tips" className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors" aria-label="Kembali ke tips">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div className="mt-0">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-2">
              Edukasi Makanan Bergizi
            </h1>
            <p className="text-base text-gray-600">
              Panduan nutrisi seimbang untuk hidup sehat
            </p>
          </div>
        </div>

        {/* Introduction */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <CheckCircle className="w-6 h-6 text-green-600" />
            Mengapa Makanan Bergizi Penting?
          </h2>
          <div className="space-y-3 text-gray-700">
            <p>• Memberikan energi yang cukup untuk aktivitas sehari-hari</p>
            <p>• Meningkatkan sistem kekebalan tubuh</p>
            <p>• Menjaga kesehatan organ vital (jantung, otak, dll)</p>
            <p>• Mencegah penyakit kronis (diabetes, jantung, kanker)</p>
            <p>• Mendukung pertumbuhan dan perkembangan</p>
            <p>• Meningkatkan kualitas hidup dan umur panjang</p>
          </div>
        </div>

        {/* Food Groups */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Kelompok Makanan</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {foodGroups.map((group, index) => {
              const Icon = group.icon
              return (
                <div key={index} className={`${group.bgColor} rounded-2xl p-5 shadow-md hover:shadow-lg transition-shadow`}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${group.color} p-2.5 shadow-md`}>
                      <Icon className="w-full h-full text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800">{group.title}</h3>
                  </div>
                  <ul className="space-y-2">
                    {group.tips.map((tip, tipIndex) => (
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

        {/* Nutrients */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Nutrisi Penting</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {nutrients.map((nutrient, index) => (
              <div key={index} className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4">
                <h3 className="font-bold text-gray-800 mb-2">{nutrient.name}</h3>
                <p className="text-sm text-gray-600 mb-1">
                  <span className="font-semibold">Sumber:</span> {nutrient.sources}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-semibold">Fungsi:</span> {nutrient.function}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Foods to Avoid */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-red-500" />
            Makanan yang Harus Dibatasi
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {avoidFoods.map((food, index) => (
              <div key={index} className="flex items-center gap-3 bg-red-50 rounded-xl p-3">
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <span className="text-sm text-gray-700">{food}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tips */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl shadow-lg p-6 text-white">
          <h2 className="text-2xl font-bold mb-4">Tips Praktis</h2>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <span>Gunakan metode &quot;pinggan sehat&quot; - 1/2 sayur, 1/4 karbohidrat, 1/4 protein</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <span>Makan secara perlahan dan nikmati setiap gigitan</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <span>Hindari makan saat sedang stres atau terburu-buru</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <span>Baca label nutrisi sebelum membeli makanan kemasan</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <span>Siapkan makanan sendiri daripada membeli</span>
            </li>
          </ul>
        </div>
      </main>
    </div>
  )
}
