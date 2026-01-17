# Rencana: Perbaikan Rumus Bagi Hasil di Semua Halaman

## Masalah
Saat ini ketiga halaman menghitung bagi hasil dari **Laba Bersih** (Total Penjualan - HPP - Biaya Admin), padahal seharusnya dihitung langsung dari **Total Penjualan** tanpa potongan apapun.

## Rumus yang Salah (Saat Ini)
```
Bagi Hasil = (Total Penjualan - HPP - Biaya Admin) x Persentase
```

## Rumus yang Benar
```
Bagi Hasil = Total Penjualan x Persentase Bagi Hasil
```

---

## Perubahan yang Akan Dilakukan

### 1. File: `src/pages/admin/ProfitSharingPayments.tsx`

**Lokasi**: Line 227-230

**Sebelum**:
```typescript
const netProfit = totalSales - totalHpp - totalAdminFee;
const profitSharingAmount = netProfit > 0 
  ? netProfit * (franchise.profit_sharing_percent / 100) 
  : 0;
```

**Sesudah**:
```typescript
// Bagi hasil dihitung dari total penjualan langsung
const profitSharingAmount = totalSales * (franchise.profit_sharing_percent / 100);
```

---

### 2. File: `src/pages/admin/Dashboard.tsx`

**Lokasi**: Line 147-149 (dalam loop per bulan)

**Sebelum**:
```typescript
const profit = totalSales - totalHpp - totalAdminFee;
const profitSharingPercent = Number(franchise.profit_sharing_percent) || 0;
const profitSharing = profit > 0 ? (profit * profitSharingPercent / 100) : 0;
```

**Sesudah**:
```typescript
const profitSharingPercent = Number(franchise.profit_sharing_percent) || 0;
// Bagi hasil dihitung dari total penjualan langsung
const profitSharing = totalSales * profitSharingPercent / 100;
```

**Lokasi**: Line 173-175 (dalam ringkasan tahunan)

**Sebelum**:
```typescript
const totalProfit = totalSales - totalHpp - totalAdminFee;
const profitSharing = totalProfit > 0 ? (totalProfit * profitSharingPercent / 100) : 0;
```

**Sesudah**:
```typescript
const totalProfit = totalSales - totalHpp - totalAdminFee; // tetap hitung untuk display
// Bagi hasil dihitung dari total penjualan langsung
const profitSharing = totalSales * profitSharingPercent / 100;
```

---

### 3. File: `src/pages/admin/GlobalReports.tsx`

**Lokasi**: Line 136-139

**Sebelum**:
```typescript
data.netProfit = data.totalSales - data.totalHpp - data.totalAdminFee;
data.profitSharing = data.netProfit > 0 
  ? (data.netProfit * (franchise?.profitSharingPercent || 0) / 100) 
  : 0;
```

**Sesudah**:
```typescript
data.netProfit = data.totalSales - data.totalHpp - data.totalAdminFee; // tetap hitung untuk display
// Bagi hasil dihitung dari total penjualan langsung
data.profitSharing = data.totalSales * (franchise?.profitSharingPercent || 0) / 100;
```

---

## Ringkasan Perubahan

| File | Perubahan |
|------|-----------|
| `ProfitSharingPayments.tsx` | Ubah rumus bagi hasil dari laba bersih ke total penjualan |
| `Dashboard.tsx` | Ubah rumus bagi hasil di chart bulanan dan tabel tahunan |
| `GlobalReports.tsx` | Ubah rumus bagi hasil di tabel detail franchise |

## Hasil Akhir

Setelah perubahan ini, semua halaman akan menampilkan **nilai bagi hasil yang konsisten** dan dihitung dengan rumus yang sama:

```
Bagi Hasil = Total Penjualan x Persentase Bagi Hasil
```

Nilai laba bersih (Total Penjualan - HPP - Biaya Admin) tetap ditampilkan di UI untuk informasi, tapi tidak digunakan dalam perhitungan bagi hasil.