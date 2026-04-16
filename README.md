# InterPulse 💓

**InterPulse** adalah aplikasi kesehatan fisik modern yang menggabungkan konsep "Internal" dan "Pulse" (detak jantung) untuk membantu Anda memantau dan meningkatkan kesehatan fisik secara menyeluruh.

## ✨ Fitur Utama

### 🏠 Dashboard Beranda
- Ringkasan kesehatan harian (detak jantung, aktivitas, kalori, pencapaian)
- Progress tracking untuk target kesehatan
- Statistik mingguan yang informatif
- Reminder untuk hidrasi dan aktivitas

### 🎥 Video Kesehatan
- Halaman khusus untuk video edukasi kesehatan
- Area untuk menambahkan video dan URL video Anda sendiri
- Penjelasan teks lengkap untuk setiap video
- Daftar video yang mudah dinavigasi
- Tips menonton dan catatan penting

### ❤️ Monitor Detak Jantung
- Monitoring detak jantung real-time dengan animasi
- Riwayat detak jantung 7 hari terakhir
- Statistik harian (tertinggi, rata-rata, terendah)
- Zona detak jantung dengan indikator warna
- Status kesehatan jantung (Normal, Rendah, Tinggi)

### 📚 Tips Kesehatan
- 8 kategori tips kesehatan komprehensif:
  - Kesehatan Jantung
  - Hidrasi
  - Kualitas Tidur
  - Nutrisi Seimbang
  - Aktivitas Fisik
  - Kesehatan Mental
  - Paparan Sinar Matahari
  - Pernapasan
- Panduan praktis untuk gaya hidup sehat
- Catatan penting dan reminder

### 👤 Profil Pengguna
- Informasi pribadi lengkap
- Data kesehatan (tinggi, berat, BMI)
- Progress tracking target berat badan
- Badge pencapaian
- Statistik aktivitas keseluruhan

## 🚀 Cara Menjalankan

### Prasyarat
- Node.js 18.x atau lebih tinggi
- npm atau yarn

### Instalasi

1. **Install dependencies:**
```bash
npm install
```

2. **Jalankan development server:**
```bash
npm run dev
```

3. **Buka browser dan akses:**
```
http://localhost:3000
```

### Build untuk Production

```bash
npm run build
npm start
```

## 🎨 Teknologi yang Digunakan

- **Framework:** Next.js 14 (App Router)
- **UI Library:** React 18
- **Styling:** TailwindCSS
- **Icons:** Lucide React
- **Components:** Custom components dengan shadcn/ui style
- **Language:** TypeScript

## 📱 Fitur Responsif

Aplikasi ini sepenuhnya responsif dan dapat diakses dengan baik di:
- 💻 Desktop
- 📱 Mobile
- 📱 Tablet

Navigasi bottom bar di mobile, top bar di desktop untuk pengalaman pengguna yang optimal.

## 🎯 Cara Menggunakan

### Menambahkan Video Kesehatan

1. Buka file `app/video-kesehatan/page.tsx`
2. Edit array `videoData` dengan informasi video Anda:

```typescript
{
  id: 1,
  title: 'Judul Video Anda',
  description: 'Deskripsi singkat video',
  videoUrl: 'https://url-video-anda.com/video.mp4',
  duration: '10:00',
  views: 0,
  content: 'Penjelasan lengkap tentang video ini...',
}
```

### Kustomisasi Data Profil

Edit file `app/profil/page.tsx` pada bagian `useState` untuk mengubah data profil default.

### Mengubah Tema Warna

Edit file `app/globals.css` pada bagian `:root` untuk mengubah skema warna aplikasi.

## 📂 Struktur Folder

```
IP/
├── app/
│   ├── page.tsx                 # Halaman beranda
│   ├── video-kesehatan/         # Halaman video kesehatan
│   ├── monitor-jantung/         # Halaman monitor detak jantung
│   ├── tips-kesehatan/          # Halaman tips kesehatan
│   ├── profil/                  # Halaman profil
│   ├── layout.tsx               # Layout utama
│   └── globals.css              # Global styles
├── components/
│   ├── Navigation.tsx           # Komponen navigasi
│   └── ui/                      # UI components
│       ├── card.tsx
│       └── button.tsx
├── lib/
│   └── utils.ts                 # Utility functions
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── README.md
```

## 🎨 Desain & UX

- **Modern UI:** Desain bersih dengan gradient dan shadow yang elegan
- **Color Scheme:** Pink/Red primary color yang melambangkan kesehatan jantung
- **Smooth Animations:** Transisi halus dan animasi yang menarik
- **Intuitive Navigation:** Navigasi yang mudah dipahami dengan icon yang jelas
- **Accessibility:** Desain yang memperhatikan aksesibilitas pengguna

## 🔮 Pengembangan Selanjutnya

Beberapa ide untuk pengembangan fitur:
- Integrasi dengan wearable devices (smartwatch, fitness tracker)
- Notifikasi push untuk reminder
- Grafik dan chart untuk visualisasi data
- Export data kesehatan ke PDF
- Social sharing untuk pencapaian
- Integrasi dengan API kesehatan
- Mode dark theme
- Multi-language support

## 📝 Catatan

- Lint errors yang muncul akan hilang setelah `npm install` dijalankan
- Data pada aplikasi ini adalah contoh/dummy data
- Untuk monitoring detak jantung real, diperlukan integrasi dengan hardware/API

## 🤝 Kontribusi

Aplikasi ini dibuat untuk membantu Anda memantau kesehatan fisik. Silakan kustomisasi sesuai kebutuhan Anda!

## 📄 Lisensi

Aplikasi ini dibuat untuk penggunaan pribadi.

---

**InterPulse** - *Pantau Kesehatan, Raih Kehidupan yang Lebih Baik* 💪❤️
