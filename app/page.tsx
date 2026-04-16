'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { Search, Heart, Leaf, Droplets, Sun, Wind, Shield, Star, Activity, Flame, Loader2, LogOut } from 'lucide-react'

interface Ramuan {
  id: number
  nama: string
  namaLatin: string
  deskripsi: string
  manfaat: string[]
  caraPembuatan: string
  dosis: string
  hadis: string
  kategori: 'jantung' | 'pencernaan' | 'imun' | 'pernapasan' | 'umum'
  icon: React.ReactNode
}

const ramuanData: Ramuan[] = [
  {
    id: 1,
    nama: 'Madu',
    namaLatin: 'Apis mellifera',
    deskripsi: 'Madu adalah superfood alami yang telah digunakan selama ribuan tahun di berbagai tradisi pengobatan dunia sebagai obat untuk berbagai penyakit.',
    manfaat: [
      'Meningkatkan imunitas tubuh',
      'Menyembuhkan luka lebih cepat',
      'Mengatasi batuk dan sakit tenggorokan',
      'Menjaga kesehatan pencernaan',
      'Sumber energi alami'
    ],
    caraPembuatan: 'Madu murni tanpa proses pemanasan atau tambahan bahan lain',
    dosis: '1-2 sendok makan setiap hari, dapat diminum langsung atau dicampur air hangat',
    hadis: 'Dikenal sebagai "makanan para dewa" dalam tradisi Yunani kuno dan digunakan dalam pengobatan tradisional Ayurveda',
    kategori: 'imun',
    icon: <Droplets className="w-5 h-5" />
  },
  {
    id: 2,
    nama: 'Kurma',
    namaLatin: 'Phoenix dactylifera',
    deskripsi: 'Buah kurma adalah sumber energi alami yang kaya akan nutrisi, sering disebut sebagai "emas gurun" dalam tradisi Timur Tengah.',
    manfaat: [
      'Sumber energi instant',
      'Mencegah anemia',
      'Menjaga kesehatan tulang',
      'Meningkatkan sistem pencernaan',
      'Mengandung antioksidan tinggi'
    ],
    caraPembuatan: 'Kurma segar atau kering dapat dimakan langsung',
    dosis: '3-7 butir kurma setiap hari, lebih baik dikonsumsi saat pagi hari',
    hadis: 'Dihargai dalam tradisi Mediterania dan Timur Tengah sebagai sumber vitalitas sejak ribuan tahun lalu',
    kategori: 'umum',
    icon: <Sun className="w-5 h-5" />
  },
  {
    id: 3,
    nama: 'Habbatussauda (Jintan Hitam)',
    namaLatin: 'Nigella sativa',
    deskripsi: 'Jintan hitam adalah rempah ajaib yang dikenal sebagai "cure for all except death" dalam pengobatan tradisional Timur Tengah dan Asia Selatan.',
    manfaat: [
      'Meningkatkan imunitas',
      'Anti-inflamasi alami',
      'Menurunkan kolesterol',
      'Mengatasi alergi',
      'Menjaga kesehatan jantung'
    ],
    caraPembuatan: 'Biji habbatussauda dapat dikunyah langsung, dibuat teh, atau diambil minyaknya',
    dosis: '½ sendok teh biji habbatussauda atau 1 kapsul minyak habbatussauda setiap hari',
    hadis: 'Ditemukan di makam Tutankhamun dan digunakan dalam pengobatan tradisional Mesir kuno',
    kategori: 'jantung',
    icon: <Heart className="w-5 h-5" />
  },
  {
    id: 4,
    nama: 'Minyak Zaitun',
    namaLatin: 'Olea europaea',
    deskripsi: 'Minyak zaitun extra virgin adalah emas cair dari Mediterania yang kaya akan lemak sehat dan antioksidan.',
    manfaat: [
      'Menjaga kesehatan jantung',
      'Mengandung lemak sehat',
      'Antioksidan tinggi',
      'Menurunkan tekanan darah',
      'Menjaga kesehatan kulit'
    ],
    caraPembuatan: 'Minyak zaitun extra virgin untuk konsumsi, buah zaitun dapat dimakan langsung',
    dosis: '1-2 sendok makan minyak zaitun extra virgin setiap hari',
    hadis: 'Staple dalam diet Mediterania yang diakui UNESCO sebagai warisan budaya',
    kategori: 'jantung',
    icon: <Leaf className="w-5 h-5" />
  },
  {
    id: 5,
    nama: 'Jahe',
    namaLatin: 'Zingiber officinale',
    deskripsi: 'Jahe adalah rempah serbaguna yang menjadi bagian penting dalam pengobatan tradisional Tiongkok, India, dan Indonesia.',
    manfaat: [
      'Mengatasi mual dan muntah',
      'Menghangatkan tubuh',
      'Anti-inflamasi',
      'Meningkatkan sirkulasi darah',
      'Mengatasi masalah pencernaan'
    ],
    caraPembuatan: 'Jahe segar diparut, direbus dengan air, atau dibuat teh jahe',
    dosis: '1-2 cangkir teh jahe setiap hari, atau 1 sendok teh jahe bubuk',
    hadis: 'Digunakan dalam jamu tradisional Indonesia dan Ayurveda India selama berabad-abad',
    kategori: 'pencernaan',
    icon: <Wind className="w-5 h-5" />
  },
  {
    id: 6,
    nama: 'Kurkuma',
    namaLatin: 'Curcuma longa',
    deskripsi: 'Kurkuma adalah emas kuning dari India yang mengandung curcumin, senyawa anti-inflamasi kuat yang sangat dihargai dalam Ayurveda.',
    manfaat: [
      'Anti-inflamasi yang sangat kuat',
      'Antioksidan tinggi',
      'Meningkatkan fungsi otak',
      'Menurunkan risiko penyakit jantung',
      'Mengatasi arthritis dan nyeri sendi'
    ],
    caraPembuatan: 'Kurkuma bubuk ditambahkan ke masakan, susu emas (golden milk), atau teh',
    dosis: '½-1 sendok teh kurkuma bubuk per hari, lebih baik dikonsumsi dengan lada hitam untuk penyerapan optimal',
    hadis: 'Ramuan utama dalam Ayurveda India dan pengobatan tradisional Asia Tenggara',
    kategori: 'imun',
    icon: <Star className="w-5 h-5" />
  },
  {
    id: 7,
    nama: 'Ginseng',
    namaLatin: 'Panax ginseng',
    deskripsi: 'Ginseng adalah akar kehidupan dalam pengobatan tradisional Tiongkok yang terkenal sebagai adaptogen alami.',
    manfaat: [
      'Meningkatkan energi dan mengurangi kelelahan',
      'Meningkatkan fungsi kognitif',
      'Meningkatkan sistem imun',
      'Menurunkan gula darah',
      'Meningkatkan fungsi seksual'
    ],
    caraPembuatan: 'Akar ginseng direbus untuk teh atau dikonsumsi sebagai suplemen ekstrak',
    dosis: '200-400mg ekstrak ginseng standar per hari, atau 1-2 gram akar kering',
    hadis: 'Disebut "akar keabadian" dalam pengobatan tradisional Tiongkok Korea selama 2000 tahun',
    kategori: 'umum',
    icon: <Shield className="w-5 h-5" />
  },
  {
    id: 8,
    nama: 'Teh Hijau',
    namaLatin: 'Camellia sinensis',
    deskripsi: 'Teh hijau adalah minuman super sehat dari Asia Timur yang kaya akan katekin dan antioksidan.',
    manfaat: [
      'Meningkatkan metabolisme dan membakar lemak',
      'Meningkatkan fungsi otak',
      'Menurunkan risiko kanker',
      'Menurunkan risiko penyakit jantung',
      'Menjaga kesehatan gigi'
    ],
    caraPembuatan: 'Daun teh hijau diseduh dengan air hangat 70-80°C selama 2-3 menit',
    dosis: '2-3 cangkir teh hijau per hari, tanpa gula untuk manfaat optimal',
    hadis: 'Minuman ritual dalam budaya Jepang, Cina, dan Korea dengan sejarah 5000 tahun',
    kategori: 'imun',
    icon: <Leaf className="w-5 h-5" />
  },
  {
    id: 9,
    nama: 'Bawang Putih',
    namaLatin: 'Allium sativum',
    deskripsi: 'Bawang putih adalah antibiotik alami yang telah digunakan dalam pengobatan tradisional global sejak zaman Mesir kuno.',
    manfaat: [
      'Meningkatkan sistem imun',
      'Menurunkan tekanan darah',
      'Menurunkan kolesterol jahat',
      'Anti-bakteri dan anti-jamur',
      'Mencegah penyakit jantung'
    ],
    caraPembuatan: 'Bawang putih segar dikunyah, dimasak, atau dibuat suplemen minyak bawang putih',
    dosis: '1-2 siung bawang putih segar per hari, atau 600-1200mg suplemen',
    hadis: 'Ditemukan di Piramida Giza dan digunakan oleh ksatria Yunani dan Romawi kuno',
    kategori: 'jantung',
    icon: <Shield className="w-5 h-5" />
  },
  {
    id: 10,
    nama: 'Kayu Manis',
    namaLatin: 'Cinnamomum verum',
    deskripsi: 'Kayu manis adalah rempah berharga yang kaya akan antioksidan dan memiliki efek anti-diabetes yang kuat.',
    manfaat: [
      'Menurunkan gula darah',
      'Anti-inflamasi',
      'Kaya antioksidan',
      'Menurunkan kolesterol',
      'Mengatasi infeksi jamur'
    ],
    caraPembuatan: 'Kayu manis bubuk ditambahkan ke makanan, minuman, atau dibuat teh',
    dosis: '½-2 sendok teh kayu manis Ceylon per hari',
    hadis: 'Dihargai lebih tinggi dari emas oleh bangsa Mesir kuno dan Romawi',
    kategori: 'pencernaan',
    icon: <Sun className="w-5 h-5" />
  },
  {
    id: 11,
    nama: 'Temulawak',
    namaLatin: 'Curcuma xanthorrhiza',
    deskripsi: 'Temulawak adalah rempah khas Indonesia yang telah lama digunakan dalam jamu tradisional untuk kesehatan liver.',
    manfaat: [
      'Menjaga kesehatan liver dan detoksifikasi',
      'Meningkatkan nafsu makan',
      'Mengatasi masalah pencernaan',
      'Anti-inflamasi',
      'Mengurangi kolesterol'
    ],
    caraPembuatan: 'Rimpang temulawak diiris tipis dan direbus untuk jamu, atau dibuat serbuk',
    dosis: '1-2 cangkir jamu temulawak per hari',
    hadis: 'Jamu warisan Indonesia yang terdaftar UNESCO sebagai Warisan Budaya Takbenda',
    kategori: 'pencernaan',
    icon: <Droplets className="w-5 h-5" />
  },
  {
    id: 12,
    nama: 'Chia Seed',
    namaLatin: 'Salvia hispanica',
    deskripsi: 'Chia seed adalah superfood dari Meksiko yang kaya akan omega-3, serat, dan protein.',
    manfaat: [
      'Kaya omega-3 fatty acids',
      'Tinggi serat untuk pencernaan',
      'Sumber protein lengkap',
      'Mengontrol gula darah',
      'Menambah energi dan stamina'
    ],
    caraPembuatan: 'Chia seed direndam dalam air atau susu selama 10-15 menit untuk membuat pudding',
    dosis: '1-2 sendok makan chia seed per hari',
    hadis: 'Makanan pokok suku Aztec Meksiko kuno untuk energi dan stamina',
    kategori: 'umum',
    icon: <Activity className="w-5 h-5" />
  }
]

const kategoriColors = {
  jantung: 'bg-red-100 text-red-700 border-red-200',
  pencernaan: 'bg-green-100 text-green-700 border-green-200',
  imun: 'bg-blue-100 text-blue-700 border-blue-200',
  pernapasan: 'bg-purple-100 text-purple-700 border-purple-200',
  umum: 'bg-yellow-100 text-yellow-700 border-yellow-200'
}

export default function Home() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedKategori, setSelectedKategori] = useState<string>('semua')
  const [expandedBenefits, setExpandedBenefits] = useState<Set<number>>(new Set())
  const router = useRouter()
  const { user, loading, logout } = useAuth()

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

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

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  const filteredRamuan = ramuanData.filter(ramuan => {
    const matchesSearch = ramuan.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ramuan.deskripsi.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ramuan.manfaat.some(manfaat => manfaat.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesKategori = selectedKategori === 'semua' || ramuan.kategori === selectedKategori
    
    return matchesSearch && matchesKategori
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-12">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1" />
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm font-medium">Logout</span>
            </button>
          </div>
          <div className="text-center">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent mb-4">
              Ramuan Tradisional 🌿
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Koleksi obat-obatan tradisional dari berbagai budaya dunia untuk menjaga kesehatan secara alami
            </p>
          </div>
        </div>

        {/* Ilustrasi Relaksasi - Laut Tenang */}
        <div className="mb-8 px-4">
          <div className="bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 rounded-3xl p-6 sm:p-10 shadow-xl border border-blue-100">
            <div className="text-center">
              {/* Logo Aplikasi */}
              <div className="w-full max-w-xs mx-auto mb-6">
                <img 
                  src="/logo-app.png" 
                  alt="InterPulse Logo" 
                  className="w-full h-auto rounded-2xl shadow-lg"
                />
              </div>
              
              <h2 className="text-2xl sm:text-3xl font-bold text-teal-800 mb-2">InterPulse</h2>
              <p className="text-teal-600 text-sm sm:text-base">Solusi Kesehatan Modern Berbasis Tradisi</p>
              
            </div>
          </div>
        </div>

        {/* Search dan Filter */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Cari ramuan atau manfaat..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setSelectedKategori('semua')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedKategori === 'semua' 
                    ? 'bg-emerald-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Semua
              </button>
              <button
                onClick={() => setSelectedKategori('jantung')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedKategori === 'jantung' 
                    ? 'bg-emerald-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Jantung
              </button>
              <button
                onClick={() => setSelectedKategori('pencernaan')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedKategori === 'pencernaan' 
                    ? 'bg-emerald-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Pencernaan
              </button>
              <button
                onClick={() => setSelectedKategori('imun')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedKategori === 'imun' 
                    ? 'bg-emerald-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Imunitas
              </button>
              <button
                onClick={() => setSelectedKategori('umum')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedKategori === 'umum' 
                    ? 'bg-emerald-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Umum
              </button>
            </div>
          </div>
        </div>

        {/* Grid Ramuan */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRamuan.map((ramuan) => (
            <div key={ramuan.id} className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
              <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="bg-white bg-opacity-20 p-2 rounded-lg">
                      {ramuan.icon}
                    </div>
                    <h3 className="text-xl font-bold text-white">{ramuan.nama}</h3>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${kategoriColors[ramuan.kategori]}`}>
                    {ramuan.kategori}
                  </span>
                </div>
                <p className="text-emerald-50 text-sm mt-2 italic">{ramuan.namaLatin}</p>
              </div>
              
              <div className="p-6">
                <p className="text-gray-700 mb-4">{ramuan.deskripsi}</p>
                
                <div className="mb-4">
                  <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                    <Star className="w-4 h-4 text-yellow-500" />
                    Manfaat:
                  </h4>
                  <ul className="space-y-1">
                    {(expandedBenefits.has(ramuan.id) ? ramuan.manfaat : ramuan.manfaat.slice(0, 3)).map((manfaat, index) => (
                      <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                        <span className="text-emerald-500 mt-1">•</span>
                        {manfaat}
                      </li>
                    ))}
                    {ramuan.manfaat.length > 3 && (
                      <li 
                        className="text-sm text-emerald-600 font-medium cursor-pointer hover:text-emerald-800 hover:underline transition-colors flex items-center gap-1"
                        onClick={() => {
                          const newExpanded = new Set(expandedBenefits)
                          if (newExpanded.has(ramuan.id)) {
                            newExpanded.delete(ramuan.id)
                          } else {
                            newExpanded.add(ramuan.id)
                          }
                          setExpandedBenefits(newExpanded)
                        }}
                      >
                        {expandedBenefits.has(ramuan.id) ? (
                          <>← Sembunyikan manfaat</>
                        ) : (
                          <>+{ramuan.manfaat.length - 3} manfaat lainnya <span className="text-xs">(klik)</span></>
                        )}
                      </li>
                    )}
                  </ul>
                </div>

                <div className="mb-4">
                  <h4 className="font-semibold text-gray-800 mb-2">Cara Pembuatan:</h4>
                  <p className="text-sm text-gray-600">{ramuan.caraPembuatan}</p>
                </div>

                <div className="mb-4">
                  <h4 className="font-semibold text-gray-800 mb-2">Dosis:</h4>
                  <p className="text-sm text-gray-600">{ramuan.dosis}</p>
                </div>

                <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
                  <h4 className="font-semibold text-emerald-800 mb-1 text-sm">Sejarah & Tradisi:</h4>
                  <p className="text-xs text-emerald-700 italic">&ldquo;{ramuan.hadis}&rdquo;</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredRamuan.length === 0 && (
          <div className="text-center py-12">
            <div className="bg-gray-100 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
              <Search className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">Tidak ada ramuan ditemukan</h3>
            <p className="text-gray-500">Coba kata kunci pencarian yang berbeda</p>
          </div>
        )}

        {/* Footer Info */}
        <div className="mt-12 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-8 text-white">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">🌿 Kearifan Lokal Global</h2>
            <p className="text-emerald-50 max-w-2xl mx-auto">
              Ramuan tradisional dari berbagai penjuru dunia telah terbukti secara ilmiah memiliki khasiat luar biasa untuk kesehatan. 
              Semua ramuan di atas menggabungkan kearifan lokal dari Timur Tengah, Asia, dan tradisi pengobatan global.
            </p>
            <div className="mt-6 flex justify-center gap-4 flex-wrap">
              <div className="bg-white bg-opacity-20 px-4 py-2 rounded-lg">
                <p className="text-sm font-medium">100% Alami</p>
              </div>
              <div className="bg-white bg-opacity-20 px-4 py-2 rounded-lg">
                <p className="text-sm font-medium">Tradisi Warisan</p>
              </div>
              <div className="bg-white bg-opacity-20 px-4 py-2 rounded-lg">
                <p className="text-sm font-medium">Terbukti Manfaatnya</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
