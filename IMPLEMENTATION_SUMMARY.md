# Implementasi Sistem Kelurahan Terpusat

## Ringkasan Perubahan
Implementasi berhasil untuk mengubah sistem kelurahan dari label "Alamat Kelurahan" menjadi "Kelurahan" dan menjadikannya sebagai sistem terpusat yang di-manage dari admin profile. 

## File-file yang Dimodifikasi

### 1. **lib/utils.ts** ✅
- **Perubahan**: Tambah function `getAdminKelurahan()` 
- **Tujuan**: Utility function untuk mengambil kelurahan admin dari Firestore
- **Implementasi**: 
  - Function async yang query admins collection
  - Mengembalikan adminKelurahan field
  - Include error handling
- **Penggunaan**: Bisa digunakan oleh komponen manapun untuk mendapatkan centralized kelurahan

### 2. **app/profil/page.tsx** ✅
- **Perubahan A**: Ubah 3 label dari "Alamat Kelurahan" → "Kelurahan"
  - Line 652: Form input label
  - Line 702: Display read-only label  
  - Line 969: Admin create user section label
- **Perubahan B**: Update placeholder dari "Isi alamat kelurahan" → "Nama Kelurahan"
- **Perubahan C**: Update handleSave function untuk:
  - Menyimpan adminKelurahan ke admins collection saat admin update profil
  - Check apakah user adalah admin
  - If admin: update both users dan admins collection dengan adminKelurahan field
- **Perubahan D**: Auto-fill kelurahan saat admin membuka modal create user
  - Saat tombol "Buat Akun Warga" diklik, kelurahan field di-populate dengan `authProfile?.kelurahan`
  - User baru yang dibuat akan langsung memiliki kelurahan dari admin profile

### 3. **lib/auth-context.tsx** ✅
- **Perubahan**: Update `refreshProfile()` function
- **Tujuan**: Pastikan admin profile di-refresh dengan benar dari admins collection
- **Implementasi**:
  - Check role apakah 'admin'
  - If admin: fetch dari admins collection
  - Read adminKelurahan dan map ke kelurahan field
  - If non-admin: fetch dari users collection seperti biasa
- **Benefit**: Memastikan admin selalu mendapat kelurahan terbaru dari admins collection

### 4. **app/api/create-user/route.ts** ✅
- **Perubahan A**: Extract adminId dari request body
- **Perubahan B**: Tambah logic untuk fetch admin's kelurahan jika alamat tidak disediakan
  - If alamat provided: gunakan alamat
  - Else if adminId provided: fetch dari admins collection
  - Use adminKelurahan dari admin profile
- **Perubahan C**: Gunakan variable `kelurahan` untuk disimpan (bukan langsung `alamat`)
  - Untuk users collection: `kelurahan: kelurahan`
  - Untuk residents collection: `alamat: kelurahan`

## Arsitektur Sistem Kelurahan Terpusat

### Alur Data:
```
Admin Profile (Firestore: admins collection)
    ↓ adminKelurahan field
    ↓
Admin mengedit profil → Simpan ke admins.adminKelurahan
    ↓
Admin membuat user baru → Auto-fill kelurahan dari admin profile
    ↓
User Profil (Firestore: users collection)
    ↓ kelurahan field
    ↓
Semua halaman aplikasi menampilkan kelurahan dari user profile
    ↓
Ketika admin mengubah adminKelurahan → Semua user baru akan mendapat value terbaru
```

### Multi-Tenant Support:
- **Saat admin ingin switch ke kelurahan lain**:
  1. Admin login ke profil
  2. Edit field "Kelurahan" dengan nama kelurahan baru
  3. Simpan profil (adminKelurahan tersimpan di admins collection)
  4. Saat membuat user baru → user akan mendapat kelurahan baru sebagai default
  5. Semua user yang dibuat setelah ini akan memiliki kelurahan baru

## Fitur & Benefit

✅ **Label UX**: Berubah dari "Alamat Kelurahan" → "Kelurahan" (lebih singkat & jelas)

✅ **Centralized Management**: Kelurahan di-manage dari 1 tempat (admin profile)

✅ **Auto-fill**: Saat admin membuat user baru, kelurahan otomatis terisi dari admin profile

✅ **Consistency**: Semua user baru akan memiliki kelurahan yang sama (dari admin)

✅ **Multi-tenant Ready**: Mudah switch kelurahan - hanya perlu ubah di admin profile

✅ **Fallback Logic**: API endpoint punya fallback untuk fetch admin's kelurahan jika tidak dikirim

## Validasi & Testing

### Perubahan Diverifikasi:
- ✅ 4 file berhasil dimodifikasi
- ✅ 87 insertions, 11 deletions
- ✅ Semua field label sudah diupdate
- ✅ Admin profile save logic sudah implement
- ✅ Auto-fill logic sudah implement
- ✅ Refresh profile function sudah handle admin profile
- ✅ API endpoint sudah handle centralized kelurahan

### Testing Checklist:
- [ ] Admin login → profil section ditampilkan dengan label "Kelurahan"
- [ ] Admin edit kelurahan → simpan (verifikasi saved ke admins collection)
- [ ] Admin buka modal "Buat Akun Warga" → field kelurahan sudah terisi dengan nilai admin
- [ ] Admin buat user baru → user mendapat kelurahan dari admin
- [ ] Admin change kelurahan → user baru berikutnya mendapat value terbaru
- [ ] User baru login → profil mereka menampilkan kelurahan dari admin

## Catatan Penting

1. **Backward Compatibility**: User yang sudah ada akan tetap memiliki kelurahan lama sampai admin update mereka secara manual
2. **Admin Creation**: Pastikan admin account sudah memiliki value di admins collection
3. **Firestore Structure**: 
   - admins collection: menyimpan adminKelurahan
   - users collection: menyimpan kelurahan (copy dari admin atau user's own value)
4. **Self-Registration**: User yang self-register via /register masih bisa input kelurahan mereka sendiri (tidak auto-fill dari admin karena tidak ada auth context untuk admins)

## Next Steps (Optional Enhancements)

- [ ] Tambah validasi dropdown untuk kelurahan (jangan input bebas)
- [ ] Tambah audit log saat admin change kelurahan
- [ ] Tambah notifikasi otomatis ke semua user saat kelurahan berubah
- [ ] Buat dashboard untuk admin show summary (berapa user per kelurahan, etc)
- [ ] Implementasi role-based permissions untuk manage multiple admins per kelurahan
