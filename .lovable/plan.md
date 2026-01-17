# Rencana: Tambah Filter Tahun dan Pagination di Riwayat Bagi Hasil

## Tujuan
Menambahkan filter tahun dan pagination pada tabel "Riwayat Bagi Hasil" agar tampilan tetap rapi meskipun data bertambah banyak.

---

## Perubahan yang Akan Dilakukan

### File: `src/pages/LaporanKeuanganPage.tsx`

### 1. Tambah State untuk Filter dan Pagination

```typescript
// State untuk filter dan pagination Riwayat Bagi Hasil
const [filterYearBagiHasil, setFilterYearBagiHasil] = useState<number | 'all'>('all');
const [currentPageBagiHasil, setCurrentPageBagiHasil] = useState(1);
const ITEMS_PER_PAGE_BAGI_HASIL = 6;
```

### 2. Tambah Logic untuk Filter dan Pagination

```typescript
// Hitung tahun yang tersedia dari data profit sharing
const availableYearsBagiHasil = useMemo(() => {
  const years = [...new Set(profitSharingPayments.map(p => p.period_year))];
  return years.sort((a, b) => b - a);
}, [profitSharingPayments]);

// Filter data berdasarkan tahun
const filteredPayments = useMemo(() => {
  if (filterYearBagiHasil === 'all') return profitSharingPayments;
  return profitSharingPayments.filter(p => p.period_year === filterYearBagiHasil);
}, [profitSharingPayments, filterYearBagiHasil]);

// Pagination
const totalPagesBagiHasil = Math.ceil(filteredPayments.length / ITEMS_PER_PAGE_BAGI_HASIL);
const paginatedPayments = useMemo(() => {
  const start = (currentPageBagiHasil - 1) * ITEMS_PER_PAGE_BAGI_HASIL;
  return filteredPayments.slice(start, start + ITEMS_PER_PAGE_BAGI_HASIL);
}, [filteredPayments, currentPageBagiHasil]);

// Reset halaman saat filter berubah
useEffect(() => {
  setCurrentPageBagiHasil(1);
}, [filterYearBagiHasil]);
```

### 3. Tambah Import yang Diperlukan

```typescript
import { Pagination } from '@/components/Pagination';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
```

### 4. Update UI Card Header dengan Filter

Tambahkan dropdown filter tahun di header card:

```tsx
<CardHeader className="py-3 px-4 border-b border-border/50 bg-gradient-to-r from-primary/5 to-purple-500/5">
  <div className="flex items-center justify-between gap-4">
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
    
    {/* Filter Tahun */}
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
</CardHeader>
```

### 5. Update Table Body dengan Data Terpaginasi

Ubah dari `profitSharingPayments.map(...)` menjadi `paginatedPayments.map(...)`:

```tsx
<TableBody>
  {paginatedPayments.map((payment) => (
    // ... konten row tetap sama
  ))}
</TableBody>
```

### 6. Tambah Pagination Component di Footer Card

Tambahkan pagination di bawah tabel (sebelum penutup CardContent):

```tsx
{filteredPayments.length > ITEMS_PER_PAGE_BAGI_HASIL && (
  <div className="p-4 border-t border-border/50">
    <Pagination
      currentPage={currentPageBagiHasil}
      totalPages={totalPagesBagiHasil}
      totalItems={filteredPayments.length}
      itemsPerPage={ITEMS_PER_PAGE_BAGI_HASIL}
      onPageChange={setCurrentPageBagiHasil}
    />
  </div>
)}
```

---

## Diagram Alur

```
profitSharingPayments (data dari Supabase)
    |
    v
[Filter by Year] --> filterYearBagiHasil state
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

## Hasil Akhir

| Fitur | Deskripsi |
|-------|-----------|
| Filter Tahun | Dropdown di header card untuk filter berdasarkan tahun (Semua Tahun / 2024 / 2025 / dst) |
| Pagination | 6 baris per halaman dengan navigasi Previous/Next dan nomor halaman |
| Auto Reset | Halaman otomatis kembali ke 1 saat filter tahun berubah |
| Responsive | Pagination menyesuaikan ukuran layar |

---

## Preview Layout

```
+------------------------------------------------+
| [Icon] Riwayat Bagi Hasil      [Filter: 2024 v]|
|        Status pembayaran...                    |
+------------------------------------------------+
| Periode | Total Penjualan | % | Bagi Hasil | Status |
|---------|-----------------|---|------------|--------|
| Jan 2024| Rp 10.000.000   |5% | Rp 500.000 | Lunas  |
| Feb 2024| Rp 12.000.000   |5% | Rp 600.000 | Belum  |
| ... (max 6 rows)                               |
+------------------------------------------------+
| Menampilkan 1-6 dari 12 data   [<] [1] [2] [>] |
+------------------------------------------------+
```
