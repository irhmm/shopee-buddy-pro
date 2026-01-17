# Rencana: Ubah Grafik Dashboard Admin - Bagi Hasil per Franchise per Bulan

## Perubahan yang Akan Dilakukan

### File: `src/pages/admin/Dashboard.tsx`

### 1. Hapus Filter Bulan
- Hapus dropdown pemilihan bulan
- Hanya sisakan dropdown pemilihan tahun

### 2. Ubah Data Fetching
Fetch data sales untuk **seluruh tahun** yang dipilih (Januari - Desember):
```typescript
// Sebelumnya: hanya 1 bulan
const startDate = new Date(selectedYear, 0, 1);      // 1 Januari
const endDate = new Date(selectedYear, 11, 31);      // 31 Desember
```

### 3. Ubah Struktur Data untuk Chart
Dari:
```typescript
// Sebelumnya: per franchise
chartData = [
  { name: 'Franchise A', totalSales: 1000000 },
  { name: 'Franchise B', totalSales: 800000 },
]
```

Menjadi:
```typescript
// Sesudahnya: per bulan dengan setiap franchise sebagai bar
chartData = [
  { month: 'Jan', 'Franchise A': 50000, 'Franchise B': 40000 },
  { month: 'Feb', 'Franchise A': 60000, 'Franchise B': 45000 },
  { month: 'Mar', 'Franchise A': 55000, 'Franchise B': 50000 },
  // ... sampai Desember
]
```

### 4. Ubah Tipe Grafik
- Dari: **Horizontal Bar Chart** (penjualan per franchise)
- Menjadi: **Grouped Bar Chart** (bagi hasil per bulan, dengan bar untuk setiap franchise)

### 5. Visualisasi Chart Baru
```
┌──────────────────────────────────────────────────────────────┐
│  Bagi Hasil per Franchise - Tahun 2026                       │
├──────────────────────────────────────────────────────────────┤
│  Rp                                                          │
│  5jt ┤                                                       │
│      │     ■□                                                │
│  4jt ┤  ■  ■□    ■                                          │
│      │  ■□ ■□ ■  ■□                                         │
│  3jt ┤  ■□ ■□ ■□ ■□ ■□                                      │
│      │  ■□ ■□ ■□ ■□ ■□ ■□                                   │
│  2jt ┤  ■□ ■□ ■□ ■□ ■□ ■□ ■□                                │
│      │  ■□ ■□ ■□ ■□ ■□ ■□ ■□                                │
│  1jt ┤  ■□ ■□ ■□ ■□ ■□ ■□ ■□ ■□ ■□ ■□ ■□ ■□                │
│      └──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──                   │
│        Jan Feb Mar Apr Mei Jun Jul Agu Sep Okt Nov Des      │
│                                                              │
│  Legend: ■ Franchise A  □ Franchise B  ◆ Franchise C        │
└──────────────────────────────────────────────────────────────┘
```

### 6. Perhitungan Data
Untuk setiap bulan, hitung bagi hasil setiap franchise:
1. Ambil semua sales di bulan tersebut
2. Hitung total penjualan, HPP, dan biaya admin
3. Hitung laba bersih = penjualan - HPP - biaya admin
4. Hitung bagi hasil = laba bersih * profit_sharing_percent

### 7. Update Summary Cards
- Summary cards akan menampilkan **total tahun** (bukan per bulan)
- Atau bisa ditambahkan toggle untuk lihat summary tahun vs bulan tertentu

### 8. Tambah Legend
Menambahkan legend di bawah chart untuk menunjukkan warna setiap franchise

---

## Kode Perubahan Utama

### Struktur Data Baru
```typescript
interface MonthlyProfitSharing {
  month: string;
  [franchiseName: string]: number | string;
}

// Process data untuk 12 bulan
const monthlyData: MonthlyProfitSharing[] = MONTHS.map((monthName, monthIndex) => {
  const monthData: MonthlyProfitSharing = { month: monthName };
  
  franchises.forEach(franchise => {
    // Filter sales untuk franchise ini di bulan ini
    const franchiseSales = salesData.filter(s => 
      s.franchise_id === franchise.id &&
      new Date(s.created_at).getMonth() === monthIndex
    );
    
    // Hitung bagi hasil
    const totalSales = ...;
    const totalHpp = ...;
    const adminFee = ...;
    const profit = totalSales - totalHpp - adminFee;
    const profitSharing = profit > 0 ? profit * franchise.profit_sharing_percent / 100 : 0;
    
    monthData[franchise.name] = profitSharing;
  });
  
  return monthData;
});
```

### Chart Component
```typescript
<BarChart data={monthlyData}>
  <CartesianGrid strokeDasharray="3 3" />
  <XAxis dataKey="month" />
  <YAxis tickFormatter={formatCompactCurrency} />
  <Tooltip formatter={(value) => formatCurrency(value)} />
  <Legend />
  {franchises.map((franchise, index) => (
    <Bar 
      key={franchise.id}
      dataKey={franchise.name}
      fill={COLORS[index % COLORS.length]}
      radius={[4, 4, 0, 0]}
    />
  ))}
</BarChart>
```

---

## Hasil Akhir
- Grafik menampilkan 12 bulan (Jan-Des) di sumbu X
- Setiap franchise memiliki bar dengan warna berbeda
- Sumbu Y menampilkan nominal bagi hasil
- Tooltip menampilkan detail bagi hasil saat hover
- Legend menunjukkan warna setiap franchise
- Filter hanya tahun (tanpa bulan)
