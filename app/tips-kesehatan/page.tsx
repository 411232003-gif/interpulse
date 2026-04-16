import BackButton from '@/components/BackButton'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Heart, Droplets, Moon, Apple, Dumbbell, Brain, Sun, Wind } from 'lucide-react'

const healthTips = [
  {
    icon: Heart,
    title: 'Kesehatan Jantung',
    color: 'text-teal-600',
    bg: 'bg-teal-100',
    tips: [
      'Lakukan olahraga kardio minimal 30 menit sehari',
      'Kurangi konsumsi garam dan lemak jenuh',
      'Kelola stress dengan meditasi atau yoga',
      'Periksa tekanan darah secara rutin',
    ]
  },
  {
    icon: Droplets,
    title: 'Hidrasi',
    color: 'text-cyan-600',
    bg: 'bg-cyan-100',
    tips: [
      'Minum minimal 8 gelas air per hari',
      'Mulai hari dengan segelas air hangat',
      'Bawa botol air kemana pun Anda pergi',
      'Kurangi minuman berkafein dan bersoda',
    ]
  },
  {
    icon: Moon,
    title: 'Kualitas Tidur',
    color: 'text-teal-700',
    bg: 'bg-teal-100',
    tips: [
      'Tidur 7-9 jam setiap malam',
      'Buat jadwal tidur yang konsisten',
      'Hindari layar gadget 1 jam sebelum tidur',
      'Ciptakan lingkungan tidur yang nyaman',
    ]
  },
  {
    icon: Apple,
    title: 'Nutrisi Seimbang',
    color: 'text-cyan-700',
    bg: 'bg-cyan-100',
    tips: [
      'Konsumsi 5 porsi buah dan sayur setiap hari',
      'Pilih karbohidrat kompleks seperti gandum utuh',
      'Perbanyak protein dari sumber nabati',
      'Batasi konsumsi gula dan makanan olahan',
    ]
  },
  {
    icon: Dumbbell,
    title: 'Aktivitas Fisik',
    color: 'text-teal-600',
    bg: 'bg-teal-100',
    tips: [
      'Lakukan pemanasan sebelum olahraga',
      'Kombinasikan kardio dan latihan kekuatan',
      'Istirahat yang cukup antar sesi latihan',
      'Tingkatkan intensitas secara bertahap',
    ]
  },
  {
    icon: Brain,
    title: 'Kesehatan Mental',
    color: 'text-cyan-600',
    bg: 'bg-cyan-100',
    tips: [
      'Luangkan waktu untuk hobi dan relaksasi',
      'Jaga hubungan sosial yang positif',
      'Praktikkan mindfulness dan meditasi',
      'Jangan ragu mencari bantuan profesional',
    ]
  },
  {
    icon: Sun,
    title: 'Paparan Sinar Matahari',
    color: 'text-teal-700',
    bg: 'bg-teal-100',
    tips: [
      'Dapatkan sinar matahari pagi 10-15 menit',
      'Gunakan tabir surya saat beraktivitas di luar',
      'Hindari paparan langsung saat terik (10:00-16:00)',
      'Vitamin D penting untuk kesehatan tulang',
    ]
  },
  {
    icon: Wind,
    title: 'Pernapasan',
    color: 'text-cyan-600',
    bg: 'bg-cyan-100',
    tips: [
      'Latih pernapasan dalam secara rutin',
      'Hindari polusi udara sebisa mungkin',
      'Jaga postur tubuh untuk pernapasan optimal',
      'Lakukan latihan pernapasan saat stress',
    ]
  },
]

export default function TipsKesehatan() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 to-white">
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <BackButton />
        </div>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Tips Kesehatan</h1>
          <p className="text-gray-600">Panduan praktis untuk hidup lebih sehat</p>
        </div>

        <Card className="mb-8 bg-gradient-to-r from-teal-600 to-cyan-600 text-white border-0">
          <CardContent className="p-6">
            <h2 className="text-2xl font-bold mb-2">Kesehatan adalah Investasi Terbaik</h2>
            <p className="text-white/90">
              Mulai dengan langkah kecil hari ini untuk kesehatan yang lebih baik di masa depan. 
              Konsistensi adalah kunci dari gaya hidup sehat.
            </p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {healthTips.map((category, index) => {
            const Icon = category.icon
            return (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center space-x-3 mb-2">
                    <div className={`${category.bg} p-3 rounded-lg`}>
                      <Icon className={`w-6 h-6 ${category.color}`} />
                    </div>
                    <CardTitle className="text-xl">{category.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {category.tips.map((tip, tipIndex) => (
                      <li key={tipIndex} className="flex items-start space-x-2">
                        <span className={`${category.color} mt-1 flex-shrink-0`}>✓</span>
                        <span className="text-gray-700 text-sm">{tip}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Catatan Penting</CardTitle>
            <CardDescription>Hal-hal yang perlu diingat</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">Konsistensi</h4>
                <p className="text-sm text-blue-800">
                  Perubahan kecil yang konsisten lebih efektif daripada perubahan besar yang tidak berkelanjutan.
                </p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-semibold text-green-900 mb-2">Dengarkan Tubuh</h4>
                <p className="text-sm text-green-800">
                  Setiap orang berbeda. Perhatikan bagaimana tubuh Anda merespons dan sesuaikan kebutuhan Anda.
                </p>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h4 className="font-semibold text-yellow-900 mb-2">Konsultasi Medis</h4>
                <p className="text-sm text-yellow-800">
                  Selalu konsultasikan dengan profesional kesehatan sebelum memulai program kesehatan baru.
                </p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <h4 className="font-semibold text-purple-900 mb-2">Sabar & Realistis</h4>
                <p className="text-sm text-purple-800">
                  Hasil tidak datang dalam semalam. Tetapkan target yang realistis dan rayakan setiap kemajuan.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
