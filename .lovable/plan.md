# Rencana: Halaman Bagi Hasil Franchise (Super Admin Only)

## Overview
Membuat halaman baru untuk mengelola pembayaran bagi hasil dari setiap franchise ke Super Admin. Halaman ini hanya dapat diakses oleh Super Admin, dan role Franchise hanya bisa melihat (read-only) tanpa aksi CRUD.

---

## 1. Database Schema Baru

### Tabel `profit_sharing_payments`
Menyimpan data pembayaran bagi hasil per franchise per periode (bulan/tahun):

```sql
CREATE TABLE public.profit_sharing_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    franchise_id UUID REFERENCES public.franchises(id) ON DELETE CASCADE NOT NULL,
    period_month INTEGER NOT NULL CHECK (period_month >= 1 AND period_month <= 12),
    period_year INTEGER NOT NULL CHECK (period_year >= 2020),
    total_revenue NUMERIC DEFAULT 0,          -- Total pendapatan
    profit_sharing_percent NUMERIC DEFAULT 0, -- % bagi hasil saat itu
    profit_sharing_amount NUMERIC DEFAULT 0,  -- Nominal bagi hasil
    payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('paid', 'unpaid')),
    paid_at TIMESTAMPTZ,                      -- Tanggal dibayar
    notes TEXT,                               -- Catatan pembayaran
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(franchise_id, period_month, period_year)
);

-- Enable RLS
ALTER TABLE public.profit_sharing_payments ENABLE ROW LEVEL SECURITY;

-- Policy: Super Admin full access
CREATE POLICY "Super admin can manage profit sharing payments"
ON public.profit_sharing_payments FOR ALL TO authenticated
USING (has_role(auth.uid(), 'super_admin'))
WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- Policy: Franchise hanya bisa lihat pembayaran sendiri
CREATE POLICY "Franchise can view own payments"
ON public.profit_sharing_payments FOR SELECT TO authenticated
USING (franchise_id = get_user_franchise_id(auth.uid()));
```

---

## 2. Halaman Baru: `/admin/profit-sharing-payments`

### File: `src/pages/admin/ProfitSharingPayments.tsx`

### A. Layout Halaman

```
+------------------------------------------------------------------+
|  HEADER: Bagi Hasil Franchise                                     |
+------------------------------------------------------------------+
|                                                                   |
|  +-------------------+  +-------------------+  +------------------+|
|  | Total Bagi Hasil  |  | Sudah Dibayar     |  | Belum Dibayar   ||
|  | Bulan Ini         |  |                   |  |                 ||
|  | Rp 2.248.869,5    |  | 0 Franchise       |  | 5 Franchise     ||
|  +-------------------+  +-------------------+  +------------------+|
|                                                                   |
|  +----------------------------------------------------------------+
|  | [Q] Cari franchise...   | [Filter] January 2026 |             |
|  |                                                               |
|  |  [Hitung Ulang Data]  [Export Excel]                         |
|  +----------------------------------------------------------------+
|                                                                   |
|  +----------------------------------------------------------------+
|  | Nama      | Total Pendapatan | % Bagi | Nominal   | Status  | |
|  | Franchise | (Admin+Worker)   | Hasil  | Bagi Hasil| Bayar   | Aksi|
|  +-----------+------------------+--------+-----------+---------+---+
|  | Abdul     | Rp 1.966.500     | 10%    | Rp 196.650| Belum   | E D|
|  | irhamm    | Rp 0             | 10%    | Rp 0      | Belum   | E D|
|  | Masayu    | Rp 17.643.195    | 10%    | Rp 1.764k | Belum   | E D|
|  | ...       | ...              | ...    | ...       | ...     | ...|
|  +----------------------------------------------------------------+
|                                                                   |
+------------------------------------------------------------------+
```

### B. Fitur

1. **Summary Cards (3 kartu)**:
   - Total Bagi Hasil Bulan Ini (semua franchise)
   - Sudah Dibayar (count franchise dengan status "paid")
   - Belum Dibayar (count franchise dengan status "unpaid")

2. **Filter & Search**:
   - Input pencarian nama franchise
   - Dropdown bulan dan tahun (default: bulan ini)

3. **Tombol Aksi Header**:
   - **Hitung Ulang Data**: Menghitung ulang bagi hasil dari data sales
   - **Export Excel**: Export data tabel ke Excel

4. **Tabel Data**:
   - Nama Franchise
   - Total Pendapatan (dari sales bulan tersebut)
   - Persentase Bagi Hasil (dari franchises.profit_sharing_percent)
   - Nominal Bagi Hasil (dihitung: laba bersih x %)
   - Status Pembayaran (badge: Belum Dibayar / Sudah Dibayar)
   - Aksi:
     - Edit (ubah status pembayaran)
     - Hapus (hapus record pembayaran)

5. **Dialog Edit Status**:
   - Toggle status: Paid / Unpaid
   - Tanggal pembayaran (jika paid)
   - Catatan (opsional)

---

## 3. Logika Perhitungan "Hitung Ulang Data"

Fungsi ini akan:
1. Fetch semua franchise aktif
2. Untuk setiap franchise:
   a. Fetch sales di periode yang dipilih
   b. Hitung total penjualan (sum total_sales)
   c. Hitung total HPP (sum total_hpp)
   d. Hitung total biaya admin (sum total_admin_fee)
   e. Hitung laba bersih = total_sales - total_hpp - total_admin_fee
   f. Hitung bagi hasil = laba bersih * profit_sharing_percent / 100
3. Upsert ke tabel `profit_sharing_payments`
   - Jika sudah ada record untuk franchise+bulan+tahun, update
   - Jika belum ada, insert baru

---

## 4. Perubahan pada Navigation

### File: `src/components/AdminLayout.tsx`

Tambah menu baru di navItems:
```typescript
const navItems = [
  { path: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/admin/franchises', label: 'Kelola Franchise', icon: Users },
  { path: '/admin/profit-sharing', label: 'Setting Bagi Hasil', icon: Percent },
  { path: '/admin/profit-sharing-payments', label: 'Bagi Hasil Franchise', icon: Receipt }, // NEW
  { path: '/admin/reports', label: 'Laporan Global', icon: FileBarChart },
];
```

---

## 5. Perubahan pada Routing

### File: `src/App.tsx`

Tambah route baru:
```typescript
import ProfitSharingPayments from "./pages/admin/ProfitSharingPayments";

// Di dalam Routes
<Route path="/admin/profit-sharing-payments" element={
  <AdminRoute>
    <AdminLayout><ProfitSharingPayments /></AdminLayout>
  </AdminRoute>
} />
```

---

## 6. Komponen UI yang Digunakan

- Card (summary cards)
- Input (search)
- Select (month/year filter)
- Button (actions)
- Table (data table)
- Badge (status pembayaran)
- Dialog (edit status)
- Pagination (jika data banyak)

---

## 7. Export Excel

Menggunakan library `xlsx` yang sudah terinstall:
```typescript
import * as XLSX from 'xlsx';

const exportToExcel = () => {
  const worksheet = XLSX.utils.json_to_sheet(tableData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Bagi Hasil');
  XLSX.writeFile(workbook, `bagi-hasil-${selectedMonth}-${selectedYear}.xlsx`);
};
```

---

## 8. Styling (Sesuai Gambar)

- Summary cards dengan background gradient soft
- Badge "Belum Dibayar" warna orange
- Badge "Sudah Dibayar" warna hijau
- Tabel dengan border tipis dan hover effect
- Icon edit (pensil) dan delete (trash) untuk aksi

---

## Ringkasan File yang Akan Dibuat/Diubah

| File | Aksi | Deskripsi |
|------|------|-----------|
| `supabase/migrations/xxx.sql` | CREATE | Migrasi tabel profit_sharing_payments |
| `src/pages/admin/ProfitSharingPayments.tsx` | CREATE | Halaman baru bagi hasil |
| `src/components/AdminLayout.tsx` | MODIFY | Tambah menu navigasi |
| `src/App.tsx` | MODIFY | Tambah routing |
| `src/integrations/supabase/types.ts` | AUTO UPDATE | Types dari Supabase |
