# TASK-003: Proteksi Password dan Enkripsi PDF (Fitur Premium)

## Deskripsi
Implementasikan fitur keamanan untuk mengunci file PDF dengan kata sandi menggunakan enkripsi tingkat tinggi.

## Spesifikasi
1. **Enkripsi:** Gunakan library `pdf-lib` untuk menerapkan enkripsi AES-256 pada file PDF.
2. **UI:** Sediakan input field bagi pengguna untuk memasukkan kata sandi yang diinginkan.
3. **Akses Premium:** Fitur ini hanya tersedia untuk pengguna Premium. Jika pengguna non-Premium mencoba mengakses, arahkan ke halaman Paywall.
4. **Output:** Menghasilkan file PDF yang terlindungi dan siap diunduh/diekspor.

## File Terkait
- `lib/pdf.ts`
- `hooks/useFileExport.ts`
- `components/ExportButton.tsx`
