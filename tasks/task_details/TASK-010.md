# TASK-010: Implementasi Fitur Logout pada Hook useI18n dan Komponen UI

## Deskripsi
Menambahkan fungsionalitas logout yang belum ada. Saat ini login sudah berfungsi, tetapi pengguna tidak memiliki cara untuk keluar dari sesi mereka.

## Spesifikasi Teknis
1. Tambahkan fungsi `signOut` atau `logout` pada hook autentikasi yang relevan (misal: `lib/auth.ts` atau hook yang membungkus NextAuth/Capacitor Google Auth).
2. Pastikan sesi di NextAuth dibersihkan.
3. Jika menggunakan platform native (Capacitor), pastikan sesi Google Sign-In juga di-sign out secara native.
4. Hapus data lokal atau state yang terkait dengan user setelah logout.

## Kriteria Penerimaan
- Terdapat fungsi logout yang dapat dipanggil dari UI.
- Sesi pengguna benar-benar berakhir setelah menekan tombol logout.
- Pengguna diarahkan kembali ke halaman beranda atau login setelah logout.
