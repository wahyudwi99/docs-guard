This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.


## Android (Capacitor 8)

Android menggunakan static export Next.js (`out/`), package ID `com.docsguard`,
minimum Android 7 / API 24, dan target SDK 36. Proyek native ada di `android/`.

### Persiapan

- Install Android Studio 2025.2.1 atau lebih baru, Android SDK 36, dan JDK 21
  (bisa menggunakan JDK bawaan Android Studio).
- Jalankan `npm ci`, lalu salin `.env.example` menjadi `.env` bila belum tersedia.
- Isi `NEXT_PUBLIC_REVENUECAT_ANDROID_KEY` dengan public SDK key Google Play dari
  RevenueCat. Hubungkan aplikasi Google Play dan petakan produk/offering serta
  entitlement yang sama dengan aplikasi iOS di dashboard RevenueCat.
- Isi `NEXT_PUBLIC_GOOGLE_ADMOB_ANDROID_UNIT_ID` untuk rewarded ads Android.
  Default Android menggunakan ID iklan uji Google.

### Menjalankan dan build

```bash
npm run android:sync   # build web terbaru dan sync plugin ke Android
npm run android:open   # buka proyek di Android Studio
npm run android:run    # build, sync, lalu jalankan di emulator/device
npm run android:apk    # APK debug: android/app/build/outputs/apk/debug/app-debug.apk
```

Untuk ID aplikasi AdMob produksi, tambahkan `ADMOB_APP_ID=ca-app-pub-xxx~xxx`
ke `~/.gradle/gradle.properties`, atau berikan `-PADMOB_APP_ID=...` ke Gradle.
Manifest Android membaca properti ini; `.env` AdMob iOS tidak digunakan untuk
ID aplikasi Android. Tanpa properti tersebut, aplikasi memakai ID uji Android.

```bash
npm run android:sync
cd android
./gradlew bundleRelease -PADMOB_APP_ID=ca-app-pub-xxx~xxx
```

`npm run android:bundle` juga membuat bundle release dengan konfigurasi Gradle
aktif. Untuk upload Play Store, gunakan **Generate Signed Bundle / APK** di
Android Studio dan pilih keystore release sendiri. Build release dari script
belum dikonfigurasi signing. Naikkan `versionCode` dan `versionName` di
`android/app/build.gradle` sebelum rilis berikutnya.

Ikon dan splash memakai aset yang sudah ada di `assets/`. Regenerasi dengan
`npx capacitor-assets generate --android`. Foto/video diekspor ke album
DocsGuard, PDF melalui dialog share. Watermark video Android memakai Canvas /
MediaRecorder di WebView, sehingga format hasil mengikuti codec perangkat;
plugin akselerasi video Swift tetap khusus iOS.

Verifikasi di perangkat: impor foto/PDF/video, ekspor ke galeri, share PDF,
iklan rewarded, pembelian/restore melalui track testing Google Play, dan
navigasi kembali. Pembelian memerlukan konfigurasi produk Google Play dan
RevenueCat yang aktif.

Referensi: [setup Capacitor](https://capacitorjs.com/docs/getting-started/environment-setup)
dan [konfigurasi AdMob](https://github.com/capacitor-community/admob).
