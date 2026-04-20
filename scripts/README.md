# Cara Menggunakan Script Cleanup Users

## Langkah 1: Download Service Account Key
1. Buka [Firebase Console](https://console.firebase.google.com)
2. Klik ⚙️ (Settings) → Project Settings → Service Accounts
3. Klik "Generate new private key"
4. Simpan file `serviceAccountKey.json` di folder `scripts/`

## Langkah 2: Install Dependencies
```bash
cd scripts
npm init -y
npm install firebase-admin
```

## Langkah 3: Jalankan Script
```bash
node cleanup-users.js
```

## Output yang Diharapkan
```
🚀 Memulai pembersihan akun...

👤 Keep admin: admin@email.com

📊 Summary:
   5 akun user akan dihapus
   1 akun admin dipertahankan

✓ Deleted: user1@email.com (role: user)
✓ Deleted: user2@email.com (role: user)
🎉 Selesai! 2 dihapus, 0 gagal.
```

## Catatan Penting
- Pastikan file `serviceAccountKey.json` tidak di-commit ke git (tambahkan ke `.gitignore`)
- Script ini menghapus berdasarkan field `role: 'admin'` di collection `users`
- Akun yang dihapus tidak bisa dikembalikan
