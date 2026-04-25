# TASK-001: Implementasi Autentikasi One-Click (Google & Apple)

## Deskripsi
Implementasikan sistem login/registrasi instan menggunakan Google dan Apple Sign-In untuk memastikan pengalaman pengguna yang mulus (one-click).

## Spesifikasi
1. **Provider:** Tambahkan `AppleProvider` ke konfigurasi NextAuth di `lib/auth.ts`.
2. **UX:** Pastikan halaman login (`/app/login/page.tsx`) memungkinkan pengguna untuk masuk hanya dengan satu ketukan.
3. **Verifikasi:** Email harus diverifikasi secara otomatis melalui penyedia OAuth tanpa formulir tambahan.
4. **Alur:** Setelah sukses login, pengguna harus langsung diarahkan ke halaman utama (home screen).

## File Terkait
- `lib/auth.ts`
- `app/api/auth/[...nextauth]/route.ts`
- `app/login/page.tsx`
