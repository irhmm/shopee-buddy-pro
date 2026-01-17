# Rencana: Tambahkan Keterangan Rumus Bagi Hasil

## Tujuan
Menambahkan keterangan/info card yang menjelaskan rumus perhitungan bagi hasil yang benar di halaman-halaman yang relevan untuk Super Admin dan Franchise.

---

## Rumus yang Benar
```
Bagi Hasil = Total Penjualan x Persentase Bagi Hasil
```
(Tanpa dipotong HPP, Biaya Admin, atau biaya lainnya)

---

## Perubahan yang Akan Dilakukan

### 1. Perbaiki Keterangan di `ProfitSharingSettings.tsx` (Super Admin)

**Lokasi**: Line 161-171 (Info Card)

**Sebelum**:
```tsx
<Card className="bg-primary/5 border-primary/20">
  <CardContent className="p-4">
    <p className="text-sm text-foreground">
      <strong>Cara Perhitungan:</strong> Bagi Hasil = Laba Bersih Franchise x Persentase Bagi Hasil
    </p>
    <p className="text-sm text-muted-foreground mt-1">
      Contoh: Jika laba bersih Rp 10.000.000 dan bagi hasil 10%, maka Super Admin mendapat Rp 1.000.000
    </p>
  </CardContent>
</Card>
```

**Sesudah**:
```tsx
<Card className="bg-primary/5 border-primary/20">
  <CardContent className="p-4">
    <p className="text-sm text-foreground">
      <strong>Cara Perhitungan:</strong> Bagi Hasil = Total Penjualan x Persentase Bagi Hasil
    </p>
    <p className="text-sm text-muted-foreground mt-1">
      Contoh: Jika total penjualan Rp 10.000.000 dan bagi hasil 10%, maka Super Admin mendapat Rp 1.000.000
    </p>
    <p className="text-xs text-muted-foreground/70 mt-2 italic">
      * Bagi hasil dihitung dari total penjualan tanpa dikurangi HPP atau biaya lainnya
    </p>
  </CardContent>
</Card>
```

---

### 2. Tambahkan Info Card di `ProfitSharingPayments.tsx` (Super Admin)

**Lokasi**: Setelah summary cards (sekitar line 360), sebelum filter section

**Tambahkan**:
```tsx
{/* Info Keterangan Rumus */}
<Card className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-200/50 dark:border-blue-800/50">
  <CardContent className="p-4">
    <div className="flex items-start gap-3">
      <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/50">
        <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">
          Rumus Perhitungan Bagi Hasil
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          <strong>Bagi Hasil = Total Penjualan x Persentase Bagi Hasil</strong>
        </p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          Dihitung dari total penjualan tanpa dikurangi HPP, biaya admin, atau biaya lainnya.
        </p>
      </div>
    </div>
  </CardContent>
</Card>
```

---

### 3. Tambahkan Info Card di `LaporanKeuanganPage.tsx` (Franchise)

**Lokasi**: Di akhir halaman, sebelum closing div (sekitar line 368)

**Tambahkan section baru**:
```tsx
{/* Info Bagi Hasil untuk Franchise */}
<Card className="bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/50 dark:border-amber-800/50">
  <CardContent className="p-4">
    <div className="flex items-start gap-3">
      <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/50">
        <Info className="w-4 h-4 text-amber-600 dark:text-amber-400" />
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">
          Informasi Bagi Hasil ke Super Admin
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Bagi hasil dihitung dari <strong>Total Penjualan x Persentase Bagi Hasil</strong> yang telah ditetapkan.
        </p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          Perhitungan bagi hasil dilakukan berdasarkan total penjualan tanpa potongan HPP atau biaya lainnya. 
          Untuk detail pembayaran bagi hasil, silakan hubungi Super Admin.
        </p>
      </div>
    </div>
  </CardContent>
</Card>
```

---

## Import yang Perlu Ditambahkan

### ProfitSharingPayments.tsx
```tsx
import { Info } from 'lucide-react';
```

### LaporanKeuanganPage.tsx
```tsx
import { Info } from 'lucide-react';
```

---

## Ringkasan

| File | Aksi | Deskripsi |
|------|------|-----------|
| `ProfitSharingSettings.tsx` | MODIFY | Perbaiki teks keterangan dari "Laba Bersih" menjadi "Total Penjualan" |
| `ProfitSharingPayments.tsx` | MODIFY | Tambah info card dengan rumus bagi hasil |
| `LaporanKeuanganPage.tsx` | MODIFY | Tambah info card tentang bagi hasil untuk franchise |

---

## Hasil Akhir

1. **Super Admin** akan melihat keterangan rumus yang benar di:
   - Halaman Setting Bagi Hasil
   - Halaman Bagi Hasil Franchise

2. **Franchise** akan melihat keterangan tentang bagi hasil di:
   - Halaman Laporan Keuangan

Semua keterangan akan konsisten menjelaskan bahwa:
> **Bagi Hasil = Total Penjualan x Persentase Bagi Hasil**
> (tanpa dikurangi HPP atau biaya lainnya)
