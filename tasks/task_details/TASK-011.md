# TASK-011: Refaktor UI untuk Toggle Button Login/Logout Berdasarkan Status Sesi

## Deskripsi
Mengubah perilaku tombol login di header atau menu utama agar berubah menjadi tombol logout secara dinamis ketika pengguna sudah masuk (logged in).

## Spesifikasi Teknis
1. Gunakan status `session` dari `useSession` (NextAuth) untuk mendeteksi apakah pengguna sudah login.
2. Jika `session` ada, tampilkan tombol "Logout" yang memicu fungsi dari TASK-010.
3. Jika `session` tidak ada, tampilkan tombol "Login" seperti biasa.
4. Pastikan transisi antar status berjalan mulus tanpa reload halaman penuh.

## Kriteria Penerimaan
- Tombol berubah secara otomatis tanpa perlu refresh manual.
- Tampilan UI tetap konsisten dan estetis.
