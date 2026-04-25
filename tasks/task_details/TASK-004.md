# TASK-004: Pembersihan Metadata Selektif (Metadata Stripper) untuk PDF & JPG

## Deskripsi
Membangun alat pembersih metadata yang memungkinkan pengguna memilih data sensitif mana yang ingin dihapus dari file sebelum dibagikan.

## Spesifikasi
1. **Opsi Metadata:** Sediakan checkbox untuk menghapus Author, Creation Date, GPS Location, atau opsi "Nuclear Clean" (Hapus Semua).
2. **Pemrosesan:** Lakukan pembacaan kamus PDF atau data Exif JPG secara lokal, hapus data yang dipilih, dan bangun ulang file tersebut.
3. **Akses Premium:** Batasi fitur ini hanya untuk pengguna Premium.
4. **Privasi:** Pastikan tidak ada data yang dikirim ke server selama pemrosesan.

## File Terkait
- `lib/pdf.ts`
- `lib/utils.ts` (untuk pemrosesan Exif JPG)
- `components/WatermarkControls.tsx` (tambahkan UI pembersih metadata)
