# TASK-008: Integrasi Alur Sign-in Google Sebelum Pembayaran Pro Plan pada iOS

## Deskripsi
Tugas ini bertujuan untuk memastikan alur UX yang lancar di mana user diharuskan login menggunakan Google terlebih dahulu sebelum dapat melakukan pembelian paket Pro di platform iOS (Capacitor).

## Detail Pengerjaan
1.  **Modifikasi `Paywall.tsx`**: Pastikan tombol beli hanya muncul jika user sudah terautentikasi melalui `useSession` dari NextAuth.
2.  **Integrasi Sign-in**: Jika user belum login, tampilkan tombol "Sign in with Google" yang akan melakukan redirect/popup autentikasi.
3.  **Callback Pasca Login**: Setelah login berhasil, user harus tetap berada di (atau kembali ke) Paywall agar dapat melanjutkan proses pembayaran tanpa harus mengulang navigasi.
4.  **Kompatibilitas Capacitor**: Pastikan alur `signIn('google')` bekerja dengan baik di dalam webview Capacitor pada iOS. Jika diperlukan, gunakan plugin `capacitor-google-auth` untuk pengalaman native yang lebih baik.

## Kriteria Penerimaan
- User tidak dapat melihat opsi pembayaran sebelum login.
- Tombol Google Sign-in berfungsi dengan benar di iOS.
- Setelah login, opsi pembayaran (RevenueCat packages) muncul secara otomatis.
