# Database Firebase - InterPulse

Dokumentasi struktur database Firebase untuk aplikasi InterPulse.

## Collections

### 1. **residents** - Data master warga
Collection yang menyimpan data master warga kelurahan.

**Fields:**
- `id` (string) - Document ID unik
- `nama` (string) - Nama lengkap warga
- `nik` (string) - Nomor Induk Kependudukan
- `rw` (string) - Rukun Warga (format: '01', '02', dll)
- `rt` (string) - Rukun Tetangga
- `umur` (number) - Umur warga
- `jenisKelamin` (string) - Jenis kelamin ('L' atau 'P')
- `alamat` (string) - Alamat lengkap
- `birthDate` (string) - Tanggal lahir
- `uid` (string) - Firebase Auth UID (jika ada)

**Penggunaan:**
- Halaman Absensi, Fasca, Posbindu Monitoring, Monitoring
- Digunakan untuk pencocokan data absensi dan pemeriksaan kesehatan

---

### 2. **users** - Data akun pengguna
Collection yang menyimpan data akun pengguna aplikasi.

**Fields:**
- `uid` (string) - Firebase Auth UID (primary key)
- `email` (string) - Email pengguna
- `name` (string) - Nama pengguna
- `role` (string) - Role pengguna ('admin' atau 'user')
- `nik` (string) - NIK pengguna (opsional)
- `rw` (string) - RW pengguna (opsional)
- `rt` (string) - RT pengguna (opsional)

**Penggunaan:**
- Autentikasi dan otorisasi
- Halaman Profil
- Posbindu Monitoring (untuk admin)

---

### 3. **settings** - Pengaturan aplikasi
Collection yang menyimpan pengaturan global aplikasi.

**Fields:**
- (Tergantung kebutuhan aplikasi)

**Penggunaan:**
- Konfigurasi aplikasi secara global

---

### 4. **attendanceSettings** - Pengaturan absensi
Collection yang menyimpan pengaturan terkait absensi.

**Fields:**
- (Tergantung kebutuhan aplikasi)
- Contoh: jam check-in, jam check-out, batas toleransi, dll

**Penggunaan:**
- Konfigurasi sistem absensi

---

### 5. **attendance** - Data absensi
Collection yang menyimpan data absensi/check-in warga.

**Fields:**
- `id` (string) - Document ID unik
- `nik` (string) - NIK warga
- `nama` (string) - Nama warga
- `rw` (string) - RW warga
- `rt` (string) - RT warga
- `timestamp` (string) - Timestamp ISO format
- `date` (string) - Tanggal absensi
- `time` (string) - Waktu check-in
- `checkInTime` (string) - Waktu check-in
- `checkOutTime` (string) - Waktu check-out (opsional)

**Penggunaan:**
- Halaman Absensi, Partisipasi, Monitoring, Posbindu Monitoring
- Tracking kehadiran warga per bulan dan per RW

**Catatan:**
- Semua umur (termasuk lansia) menggunakan collection ini
- Data lebih dari 3 bulan akan dihapus otomatis via script cleanup

---

### 6. **healthReadings** - Data pemeriksaan kesehatan
Collection yang menyimpan data pemeriksaan kesehatan warga.

**Fields:**
- `id` (string) - Document ID unik
- `userId` (string) - Firebase Auth UID pengguna
- `userName` (string) - Nama pengguna
- `type` (string) - Jenis pemeriksaan ('tensi', 'kolesterol', 'asamurat', 'guladarah')
- `timestamp` (string) - Timestamp ISO format
- `source` (string) - Sumber data ('posbindu' atau 'pribadi')
- `rw` (string) - RW warga
- `rt` (string) - RT warga
- Nilai kesehatan spesifik:
  - `systolic` (number) - Tekanan darah sistolik (untuk tensi)
  - `diastolic` (number) - Tekanan darah diastolik (untuk tensi)
  - `kolesterol` (number) - Nilai kolesterol
  - `asamurat` (number) - Nilai asam urat
  - `guladarah` (number) - Nilai gula darah

**Penggunaan:**
- Halaman Homepage, Fasca, Monitoring, Riwayat Tensi
- Tracking pemeriksaan kesehatan per bulan dan per RW

**Catatan:**
- Data lebih dari 3 bulan akan dihapus otomatis via script cleanup

---

### 7. **tb-bb** - Data tinggi badan dan berat badan
Collection yang menyimpan data antropometri warga.

**Fields:**
- `id` (string) - Document ID unik
- `nik` (string) - NIK warga
- `nama` (string) - Nama warga
- `tinggiBadan` (number) - Tinggi badan (cm)
- `beratBadan` (number) - Berat badan (kg)
- `lingkarPinggang` (number) - Lingkar pinggang (cm)
- `timestamp` (string) - Timestamp ISO format
- `rw` (string) - RW warga
- `rt` (string) - RT warga

**Penggunaan:**
- Halaman Fasca, Input TB/BB, Posbindu Monitoring
- Tracking status gizi warga

**Catatan:**
- Data lebih dari 3 bulan akan dihapus otomatis via script cleanup

---

### 8. **elderly-attendance** - Data absensi lansia (DEPRECATED)
Collection ini sudah tidak digunakan lagi.

**Status:** ⚠️ **DEPRECATED** - Tidak lagi digunakan

**Catatan:**
- Sebelumnya digunakan untuk memisahkan data absensi lansia (umur >= 60)
- Sekarang semua umur menggunakan collection `attendance`
- Collection ini bisa dihapus jika tidak ada data penting

---

## Script Maintenance

### cleanup-old-data.js
Script untuk menghapus data yang lebih dari 3 bulan.

**Collections yang dibersihkan:**
- `attendance` - Data absensi > 3 bulan
- `healthReadings` - Data pemeriksaan kesehatan > 3 bulan
- `tb-bb` - Data TB/BB > 3 bulan

**Collections yang TIDAK dibersihkan:**
- `residents` - Data master warga (harus dipertahankan)
- `users` - Data akun pengguna (harus dipertahankan)
- `settings` - Pengaturan aplikasi (harus dipertahankan)
- `attendanceSettings` - Pengaturan absensi (harus dipertahankan)

**Cara menjalankan:**
```bash
npm run cleanup:old-data
```

**Automation:**
Untuk menjalankan otomatis setiap bulan, tambahkan ke crontab:
```bash
0 0 1 * * cd /path/to/project && npm run cleanup:old-data >> cleanup.log 2>&1
```

---

## Backup & Restore

### Backup Data
Gunakan script `clear-firestore.js` untuk operasi database. Untuk backup, gunakan Firebase Console atau export tool.

### Restore Data
Gunakan Firebase Console atau import tool untuk restore data dari backup.

---

## Catatan Penting

1. **Data Master vs Data Transaksional**
   - **Data Master:** `residents`, `users`, `settings`, `attendanceSettings` - Tidak dihapus otomatis
   - **Data Transaksional:** `attendance`, `healthReadings`, `tb-bb` - Dihapus otomatis > 3 bulan

2. **Normalisasi RW**
   - Format RW harus menggunakan 2 digit: '01', '02', '03', dst
   - Script dan aplikasi sudah melakukan normalisasi otomatis

3. **Timestamp Format**
   - Semua timestamp menggunakan format ISO string: `2026-05-27T00:00:00.000Z`

4. **Pencocokan Data**
   - Untuk mencocokkan data antara collections, gunakan multiple keys:
     - Document ID
     - NIK
     - Firebase Auth UID
     - Nama (case-insensitive)
