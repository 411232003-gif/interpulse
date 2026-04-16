# InterPulse Android App - Build Instructions

## 📱 Cara Build APK dengan Android Studio

### 1. Persiapan
- Install Android Studio
- Install JDK 8 atau lebih tinggi
- Setup Android SDK

### 2. Import Project
1. Buka Android Studio
2. File → New → Import Project
3. Pilih folder `/android` dari project InterPulse
4. Tunggu Gradle sync selesai

### 3. Konfigurasi
- Pastikan `build.gradle` sudah benar
- Update `AndroidManifest.xml` jika perlu
- Ganti URL di `MainActivity.kt` dari `localhost:3005` ke production URL

### 4. Build APK
- Build → Build Bundle(s) / APK(s) → Build APK(s)
- APK akan dihasilkan di `app/build/outputs/apk/debug/`

## 🌐 Cara Build PWA dengan Bubblewrap

### 1. Install Bubblewrap
```bash
npm install -g @bubblewrap/cli
```

### 2. Build PWA
```bash
# Upload manifest.json ke server terlebih dahulu
# Pastikan https://your-domain.com/manifest.json accessible

bubblewrap init --manifest=https://your-domain.com/manifest.json
bubblewrap build
```

### 3. Upload ke Google Play
- Upload `.aab` file ke Google Play Console
- Follow Play Store publishing process

## 🔧 Konfigurasi Penting

### MainActivity.kt
```kotlin
// Ganti URL untuk production
webView.loadUrl("https://your-production-domain.com")
```

### AndroidManifest.xml
- Update `android:label` untuk app name
- Update package name jika perlu
- Tambah permissions jika diperlukan

### manifest.json
- Update `start_url` ke production URL
- Update icons dengan actual icon files
- Update `theme_color` jika perlu

## 📂 Struktur File
```
android/
├── MainActivity.kt          # Main activity code
├── activity_main.xml       # Layout file
├── AndroidManifest.xml    # App manifest
├── build.gradle           # Build configuration
└── README.md              # This file

public/
├── manifest.json          # PWA manifest
└── icons/                 # Icon files (192x192, 512x512)
```

## ⚠️ Catatan Penting

### Security
- Pastikan HTTPS untuk production
- Enable CSP (Content Security Policy)
- Validasi user input

### Performance
- Optimize images
- Minimize JavaScript
- Use service workers untuk offline

### Testing
- Test di berbagai Android versions
- Test dengan berbagai screen sizes
- Test WebView functionality

## 🚀 Deployment

### Development
- Use `localhost:3005` untuk testing
- Enable USB debugging untuk device testing

### Production
- Deploy ke production server
- Update URL di MainActivity.kt
- Build production APK/PWA
- Submit ke app stores

## 📞 Support

Untuk bantuan lebih lanjut:
- Check Android Studio logs
- Test dengan Chrome DevTools
- Referensi: https://developer.android.com/guide/webapps/webview
