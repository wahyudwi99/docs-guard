# TASK-002: Fitur Blur pada Canvas dengan Batasan Freemium

## Deskripsi
Memungkinkan pengguna untuk mengaburkan (blur) area tertentu pada dokumen PDF atau gambar JPG secara lokal di perangkat.

## Spesifikasi
1. **Interaksi:** Pengguna dapat memilih area kotak pada canvas untuk diterapkan efek blur.
2. **Teknologi:** Gunakan Canvas API untuk memproses efek blur secara lokal.
3. **Logika Freemium:**
   - Pengguna gratis: Maksimal 2 area blur per dokumen.
   - Pengguna Premium: Tanpa batasan.
4. **Paywall:** Jika batas terlampaui, tampilkan UI langganan Premium (Paywall).

## File Terkait
- `components/CanvasDisplay.tsx`
- `hooks/useCanvas.ts`
- `components/WatermarkControls.tsx` (Tambahkan mode Blur)
