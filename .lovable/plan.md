# Rencana: Tambah Filter Status pada Riwayat Bagi Hasil

## Tujuan
Menambahkan filter status pembayaran (Semua / Lunas / Belum Dibayar) pada tabel "Riwayat Bagi Hasil" untuk melengkapi fitur filter yang sudah ada.

---

## Status Saat Ini

| Fitur | Status |
|-------|--------|
| Filter Tahun | Sudah ada |
| Pagination | Sudah ada |
| Filter Status | **Belum ada** |

---

## Perubahan yang Akan Dilakukan

### File: `src/pages/LaporanKeuanganPage.tsx`

### 1. Tambah State untuk Filter Status

```typescript
// Tambahkan setelah line 81
const [filterStatusBagiHasil, setFilterStatusBagiHasil] = useState<'all' | 'paid' | 'unpaid'>('all');
```

### 2. Update Logic Filter

Ubah `filteredPayments` untuk menyertakan filter status:

```typescript
// Filter data berdasarkan tahun DAN status
const filteredPayments = useMemo(() => {
  let result = profitSharingPayments;
  
  // Filter by year
  if (filterYearBagiHasil !== 'all') {
    result = result.filter(p => p.period_year === filterYearBagiHasil);
  }
  
  // Filter by status
  if (filterStatusBagiHasil !== 'all') {
    result = result.filter(p => 
      filterStatusBagiHasil === 'paid' ? p.is_paid : !p.is_paid
    );
  }
  
  return result;
}, [profitSharingPayments, filterYearBagiHasil, filterStatusBagiHasil]);
```

### 3. Update useEffect untuk Reset Pagination

```typescript
// Reset halaman saat filter berubah
useEffect(() => {
  setCurrentPageBagiHasil(1);
}, [filterYearBagiHasil, filterStatusBagiHasil]); // Tambahkan filterStatusBagiHasil
```

### 4. Update UI Header dengan Filter Status

Tambahkan dropdown filter status di sebelah filter tahun:

```tsx
<CardHeader className="py-3 px-4 border-b border-border/50 bg-gradient-to-r from-primary/5 to-purple-500/5">
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
    <div className="flex items-center gap-2">
      <div className="p-2 rounded-lg bg-primary/10">
        <Receipt className="w-4 h-4 text-primary" />
      </div>
      <div>
        <CardTitle className="text-base font-bold">Riwayat Bagi Hasil</CardTitle>
        <p className="text-xs text-muted-foreground">
          Status pembayaran bagi hasil ke Super Admin
        </p>
      </div>
    </div>
    
    {/* Filter Container */}
    <div className="flex items-center gap-2">
      {/* Filter Status */}
      <Select
        value={filterStatusBagiHasil}
        onValueChange={(val) => setFilterStatusBagiHasil(val as 'all' | 'paid' | 'unpaid')}
      >
        <SelectTrigger className="w-[130px] h-8 text-xs">
          <SelectValue placeholder="Filter Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Semua Status</SelectItem>
          <SelectItem value="paid">Lunas</SelectItem>
          <SelectItem value="unpaid">Belum Dibayar</SelectItem>
        </SelectContent>
      </Select>
      
      {/* Filter Tahun (sudah ada) */}
      {availableYearsBagiHasil.length > 0 && (
        <Select
          value={filterYearBagiHasil.toString()}
          onValueChange={(val) => setFilterYearBagiHasil(val === 'all' ? 'all' : parseInt(val))}
        >
          <SelectTrigger className="w-[120px] h-8 text-xs">
            <SelectValue placeholder="Filter Tahun" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Tahun</SelectItem>
            {availableYearsBagiHasil.map(year => (
              <SelectItem key={year} value={year.toString()}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  </div>
</CardHeader>
```

---

## Diagram Alur Data

```
profitSharingPayments (data dari Supabase)
         |
         v
[Filter by Year] --> filterYearBagiHasil state
         |
         v
[Filter by Status] --> filterStatusBagiHasil state  <-- NEW
         |
         v
filteredPayments (data terfilter)
         |
         v
[Pagination] --> currentPageBagiHasil state
         |
         v
paginatedPayments (6 item per halaman)
         |
         v
[Render Table]
```

---

## Preview Layout Baru

```
+------------------------------------------------------------------+
| [Icon] Riwayat Bagi Hasil         [Status: All v] [Tahun: All v] |
|        Status pembayaran...                                       |
+------------------------------------------------------------------+
| Periode | Total Penjualan | % | Bagi Hasil | Status              |
|---------|-----------------|---|------------|---------------------|
| Jan 2024| Rp 10.000.000   |5% | Rp 500.000 | Lunas               |
| Feb 2024| Rp 12.000.000   |5% | Rp 600.000 | Belum Dibayar       |
| ... (max 6 rows)                                                  |
+------------------------------------------------------------------+
| Menampilkan 1-6 dari 12 data              [<] [1] [2] [>]        |
+------------------------------------------------------------------+
```

---

## Ringkasan Perubahan

| No | Perubahan | Lokasi |
|----|-----------|--------|
| 1 | Tambah state `filterStatusBagiHasil` | Setelah line 81 |
| 2 | Update `filteredPayments` useMemo | Line 110-113 |
| 3 | Tambah `filterStatusBagiHasil` ke useEffect | Line 123-125 |
| 4 | Tambah dropdown Filter Status di CardHeader | Di dalam CardHeader |

---

## Hasil Akhir

Setelah implementasi, tabel Riwayat Bagi Hasil akan memiliki:

- **Filter Tahun**: Dropdown untuk filter berdasarkan tahun
- **Filter Status**: Dropdown untuk filter berdasarkan status (Semua/Lunas/Belum Dibayar)
- **Pagination**: 6 baris per halaman dengan navigasi
- **Auto Reset**: Halaman otomatis kembali ke 1 saat filter berubah

Semua filter bekerja bersamaan (kombinasi), sehingga user bisa misalnya melihat "Semua yang Belum Dibayar di tahun 2024".
