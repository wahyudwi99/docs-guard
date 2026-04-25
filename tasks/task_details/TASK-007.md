# TASK-007: Implementasi Status Berlangganan Riil dan Perbaikan Sinkronisasi RevenueCat

## Deskripsi
Tugas ini bertujuan untuk mengganti sistem mock pada `useSubscription.tsx` dengan implementasi riil menggunakan SDK RevenueCat (purchases-capacitor). Saat ini, status `isPro` selalu di-set `true` secara manual (mock), yang harus diubah agar mengambil data dari status entitlement RevenueCat yang sebenarnya.

## Detail Pengerjaan
1.  **Hapus Mock di `checkSubscriptionStatus`**: Ubah fungsi ini agar memanggil `Purchases.getCustomerInfo()` dan memeriksa status entitlement `pro`.
2.  **Inisialisasi `isPro`**: Pastikan nilai awal `isPro` adalah `false` dan diupdate setelah mendapatkan informasi dari RevenueCat.
3.  **Sinkronisasi dengan App User ID**: Pastikan App User ID di RevenueCat disinkronkan dengan ID user dari NextAuth (Google Sign-in) jika tersedia, agar langganan dapat dilacak lintas perangkat.
4.  **Penanganan Error**: Tambahkan penanganan error yang baik jika inisialisasi RevenueCat gagal di platform native.

## Kriteria Penerimaan
- Status `isPro` mencerminkan status langganan asli dari RevenueCat.
- Aplikasi tidak lagi memberikan fitur premium secara gratis melalui mock.
- `App User ID` RevenueCat sesuai dengan email atau ID user yang login.
