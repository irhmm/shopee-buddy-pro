# Rencana: Pindahkan Laporan Keuangan ke Atas + Tambah Card Bagi Hasil

## Ringkasan
1. Pindahkan menu "Laporan Keuangan" ke posisi paling atas di sidebar Franchise
2. Tambahkan Card Riwayat Bagi Hasil di halaman Laporan Keuangan yang menampilkan data dari tabel `profit_sharing_payments`

---

## Perubahan yang Akan Dilakukan

### 1. Ubah Urutan Menu di `FranchiseLayout.tsx`

**Lokasi**: Line 22-27

**Sebelum**:
```typescript
const navItems = [
  { path: '/', label: 'Rekap Penjualan', icon: BarChart3 },
  { path: '/products', label: 'Add Produk', icon: Package },
  { path: '/settings', label: 'Setting Biaya Admin', icon: Settings },
  { path: '/laporan', label: 'Laporan Keuangan', icon: TrendingUp },
];
```

**Sesudah**:
```typescript
const navItems = [
  { path: '/laporan', label: 'Laporan Keuangan', icon: TrendingUp },
  { path: '/', label: 'Rekap Penjualan', icon: BarChart3 },
  { path: '/products', label: 'Add Produk', icon: Package },
  { path: '/settings', label: 'Setting Biaya Admin', icon: Settings },
];
```

---

### 2. Tambahkan Card Bagi Hasil di `LaporanKeuanganPage.tsx`

**Fitur Card Bagi Hasil**:
- Menampilkan riwayat pembayaran bagi hasil per bulan
- Menampilkan:
  - Bulan/Tahun periode
  - Total penjualan periode tersebut
  - Persentase bagi hasil
  - Nominal bagi hasil
  - Status pembayaran (Lunas/Belum Dibayar)
  - Tanggal dibayar (jika sudah lunas)
- Data diambil dari tabel `profit_sharing_payments` (RLS sudah ada untuk franchise)

**Lokasi**: Tambahkan setelah header (sebelum summary cards), sekitar line 196

**Tambahkan Import**:
```typescript
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, Receipt } from 'lucide-react';
```

**Tambahkan Query untuk mengambil data bagi hasil**:
```typescript
const { franchiseId } = useAuth();

const { data: profitSharingPayments = [], isLoading: isLoadingPayments } = useQuery({
  queryKey: ['profit-sharing-payments', franchiseId],
  queryFn: async () => {
    if (!franchiseId) return [];
    
    const { data, error } = await supabase
      .from('profit_sharing_payments')
      .select('*')
      .eq('franchise_id', franchiseId)
      .order('period_year', { ascending: false })
      .order('period_month', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },
  enabled: !!franchiseId,
});
```

**Tambahkan Card UI**:
```tsx
{/* Card Riwayat Bagi Hasil */}
<Card className="shadow-md border-border/50 overflow-hidden">
  <CardHeader className="py-3 px-4 border-b border-border/50 bg-gradient-to-r from-primary/5 to-purple-500/5">
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
  </CardHeader>
  <CardContent className="p-0">
    {isLoadingPayments ? (
      <div className="p-8 text-center text-muted-foreground">
        Memuat data...
      </div>
    ) : profitSharingPayments.length === 0 ? (
      <div className="p-8 text-center text-muted-foreground">
        <Receipt className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p className="text-sm">Belum ada data bagi hasil</p>
      </div>
    ) : (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/20 hover:bg-muted/20">
              <TableHead className="text-xs font-semibold">Periode</TableHead>
              <TableHead className="text-xs font-semibold text-right">Total Penjualan</TableHead>
              <TableHead className="text-xs font-semibold text-center">%</TableHead>
              <TableHead className="text-xs font-semibold text-right">Bagi Hasil</TableHead>
              <TableHead className="text-xs font-semibold text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {profitSharingPayments.map((payment) => (
              <TableRow key={payment.id} className="hover:bg-muted/10">
                <TableCell className="text-sm font-medium">
                  {MONTHS_FULL[payment.period_month - 1]} {payment.period_year}
                </TableCell>
                <TableCell className="text-sm text-right">
                  {formatCurrency(payment.total_revenue || 0)}
                </TableCell>
                <TableCell className="text-sm text-center text-muted-foreground">
                  {payment.profit_sharing_percent}%
                </TableCell>
                <TableCell className="text-sm text-right font-semibold text-primary">
                  {formatCurrency(payment.profit_sharing_amount || 0)}
                </TableCell>
                <TableCell className="text-center">
                  {payment.payment_status === 'paid' ? (
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Lunas
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
                      <Clock className="w-3 h-3 mr-1" />
                      Belum Dibayar
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )}
  </CardContent>
</Card>
```

---

## Diagram Alur Data

```
Super Admin (ProfitSharingPayments.tsx)
    |
    | [Konfirmasi Pembayaran]
    | UPDATE profit_sharing_payments
    | SET payment_status = 'paid', paid_at = now()
    v
+-------------------------+
| profit_sharing_payments |
| - franchise_id          |
| - period_month/year     |
| - total_revenue         |
| - profit_sharing_amount |
| - payment_status        | <-- 'paid' / 'unpaid'
| - paid_at               |
+-------------------------+
    |
    | [RLS: Franchise can view own payments]
    | SELECT * WHERE franchise_id = get_user_franchise_id()
    v
Franchise (LaporanKeuanganPage.tsx)
    |
    v
[Tampilkan Card Bagi Hasil dengan Status]
```

---

## Ringkasan Perubahan

| File | Aksi | Deskripsi |
|------|------|-----------|
| `FranchiseLayout.tsx` | MODIFY | Pindahkan "Laporan Keuangan" ke posisi pertama di sidebar |
| `LaporanKeuanganPage.tsx` | MODIFY | Tambahkan Card Riwayat Bagi Hasil dengan data dari `profit_sharing_payments` |

---

## Hasil Akhir

1. **Sidebar Franchise**: "Laporan Keuangan" menjadi menu pertama (paling atas)

2. **Halaman Laporan Keuangan**: 
   - Menampilkan Card baru "Riwayat Bagi Hasil" dengan tabel berisi:
     - Periode (Bulan Tahun)
     - Total Penjualan
     - Persentase Bagi Hasil
     - Nominal Bagi Hasil
     - Status Pembayaran (Badge Lunas/Belum Dibayar)
   - Status otomatis ter-update ketika Super Admin mengkonfirmasi pembayaran di halaman admin

3. **Sinkronisasi Real-time**:
   - Ketika Super Admin mengubah status di `ProfitSharingPayments.tsx`, data di tabel `profit_sharing_payments` ter-update
   - Franchise melihat perubahan status secara otomatis (setelah refresh atau dengan react-query refetch)
