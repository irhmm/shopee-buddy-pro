# Rencana: Pindahkan Card Riwayat Bagi Hasil ke Bawah Grafik

## Tujuan
Memindahkan Card "Riwayat Bagi Hasil" dari posisi setelah header ke posisi di bawah grafik bulanan.

---

## Perubahan yang Akan Dilakukan

### File: `src/pages/LaporanKeuanganPage.tsx`

**Urutan Saat Ini:**
1. Header (line 196-219)
2. Card Riwayat Bagi Hasil (line 221-293) <-- Posisi sekarang
3. Summary Cards (line 295-333)
4. Grafik Bulanan (line 335-402)
5. Rincian Per Bulan (line 404+)

**Urutan Baru:**
1. Header
2. Summary Cards
3. Grafik Bulanan
4. Card Riwayat Bagi Hasil <-- Posisi baru (setelah grafik)
5. Rincian Per Bulan

---

## Langkah Implementasi

1. **Cut** seluruh blok Card Riwayat Bagi Hasil (line 221-293)

2. **Paste** blok tersebut setelah Card Grafik Bulanan (setelah line 402, sebelum Card Rincian Per Bulan)

---

## Hasil Akhir

Halaman Laporan Keuangan akan memiliki layout:

```
+---------------------------+
|         Header            |
+---------------------------+
|    Summary Cards (3x)     |
+---------------------------+
|     Grafik Bulanan        |
+---------------------------+
|   Riwayat Bagi Hasil      |  <-- Posisi baru
+---------------------------+
|    Rincian Per Bulan      |
+---------------------------+
|   Info Bagi Hasil         |
+---------------------------+
```

Tidak ada perubahan logika atau data, hanya perpindahan posisi komponen UI.