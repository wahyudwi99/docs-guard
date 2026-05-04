# TASK-009: Implementasi Sistem Pembayaran In-App untuk iOS menggunakan RevenueCat

## Deskripsi
Implementasikan sistem pembelian dalam aplikasi (In-App Purchase) khusus untuk platform iOS menggunakan SDK RevenueCat. Fitur ini harus memungkinkan pengguna untuk berlangganan paket Pro guna mengakses fitur premium (seperti proteksi password PDF dan penghapusan metadata).

## Spesifikasi Teknis
1. Gunakan `@pythagoras-theron/capacitor-revenuecat` atau plugin RevenueCat yang sudah terintegrasi.
2. Pastikan `offering` dan `package` diatur dengan benar sesuai dengan konfigurasi di dashboard RevenueCat.
3. Sinkronkan status `isPro` di `useSubscription` hook setelah transaksi berhasil.
4. Tangani error transaksi dan tampilkan pesan yang sesuai kepada pengguna.

## Kriteria Penerimaan
- Pengguna dapat membuka paywall di iOS.
- Transaksi berhasil mengubah status akun menjadi Pro secara instan.
- Riwayat pembelian dapat dipulihkan (restore purchases).
