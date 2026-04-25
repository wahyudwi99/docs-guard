# TASK-006: Integrasi RevenueCat dan Global SubscriptionService

## Deskripsi
Mengimplementasikan sistem pembayaran in-app dan layanan pengecekan status langganan global menggunakan RevenueCat.

## Spesifikasi
1. **Integrasi:** Hubungkan SDK RevenueCat untuk menangani langganan di Apple App Store dan Google Play Store.
2. **SubscriptionService:** Buat layanan atau hook global untuk mengecek status `isPro`.
3. **Entitlement:** Status `isPro` harus dapat diakses di seluruh aplikasi untuk membuka kunci fitur premium (TASK-002 batas blur, TASK-003, TASK-004).
4. **UI Paywall:** Buat komponen Paywall yang menampilkan keuntungan fitur Pro.

## File Terkait
- `hooks/useSubscription.ts` (Refactor untuk menggunakan RevenueCat)
- `lib/revenuecat.ts` (buat file baru jika diperlukan)
- `components/Providers.tsx`
