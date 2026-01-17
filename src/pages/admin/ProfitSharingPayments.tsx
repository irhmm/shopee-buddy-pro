import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeSubscription } from '@/hooks/use-realtime';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Receipt,
  Search,
  RefreshCw,
  FileSpreadsheet,
  Pencil,
  Trash2,
  Loader2,
  Wallet,
  CheckCircle2,
  Clock,
  Calendar,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

interface ProfitSharingPayment {
  id: string;
  franchise_id: string;
  franchise_name: string;
  period_month: number;
  period_year: number;
  total_revenue: number;
  profit_sharing_percent: number;
  profit_sharing_amount: number;
  payment_status: 'paid' | 'unpaid';
  paid_at: string | null;
  notes: string | null;
}

interface Franchise {
  id: string;
  name: string;
  profit_sharing_percent: number;
}

const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export default function ProfitSharingPayments() {
  const currentDate = new Date();
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [payments, setPayments] = useState<ProfitSharingPayment[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<ProfitSharingPayment[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  
  // Edit dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<ProfitSharingPayment | null>(null);
  const [editStatus, setEditStatus] = useState<'paid' | 'unpaid'>('unpaid');
  const [editPaidAt, setEditPaidAt] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingPayment, setDeletingPayment] = useState<ProfitSharingPayment | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Generate year options (last 5 years)
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - i);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profit_sharing_payments')
        .select(`
          id,
          franchise_id,
          period_month,
          period_year,
          total_revenue,
          profit_sharing_percent,
          profit_sharing_amount,
          payment_status,
          paid_at,
          notes,
          franchises!inner (name)
        `)
        .eq('period_month', selectedMonth)
        .eq('period_year', selectedYear)
        .order('profit_sharing_amount', { ascending: false });

      if (error) throw error;

      const paymentsData: ProfitSharingPayment[] = (data || []).map((p: any) => ({
        id: p.id,
        franchise_id: p.franchise_id,
        franchise_name: p.franchises?.name || 'Unknown',
        period_month: p.period_month,
        period_year: p.period_year,
        total_revenue: Number(p.total_revenue) || 0,
        profit_sharing_percent: Number(p.profit_sharing_percent) || 0,
        profit_sharing_amount: Number(p.profit_sharing_amount) || 0,
        payment_status: p.payment_status,
        paid_at: p.paid_at,
        notes: p.notes,
      }));

      setPayments(paymentsData);
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast.error('Gagal memuat data bagi hasil');
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  useEffect(() => {
    filterPayments();
  }, [payments, searchQuery]);

  // Realtime subscriptions for automatic updates
  useRealtimeSubscription([
    { table: 'profit_sharing_payments', onDataChange: fetchPayments },
    { table: 'sales', onDataChange: fetchPayments },
  ]);

  const filterPayments = () => {
    if (!searchQuery.trim()) {
      setFilteredPayments(payments);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredPayments(
        payments.filter((p) => p.franchise_name.toLowerCase().includes(query))
      );
    }
  };

  const calculateProfitSharing = async () => {
    setCalculating(true);
    try {
      // Fetch all franchises
      const { data: franchises, error: franchiseError } = await supabase
        .from('franchises')
        .select('id, name, profit_sharing_percent');

      if (franchiseError) throw franchiseError;

      // Fetch admin settings for admin fee
      const { data: adminSettings } = await supabase
        .from('admin_settings')
        .select('admin_fee_percent')
        .limit(1)
        .single();

      const adminFeePercent = adminSettings?.admin_fee_percent || 0;

      // Calculate start and end date for the selected month
      const startDate = new Date(selectedYear, selectedMonth - 1, 1);
      const endDate = new Date(selectedYear, selectedMonth, 0, 23, 59, 59);

      // Fetch all sales for the period
      const { data: sales, error: salesError } = await supabase
        .from('sales')
        .select('franchise_id, total_sales, total_hpp, total_admin_fee, created_at')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (salesError) throw salesError;

      // Calculate profit sharing for each franchise
      const paymentUpdates: any[] = [];

      for (const franchise of (franchises || []) as Franchise[]) {
        const franchiseSales = (sales || []).filter(
          (s) => s.franchise_id === franchise.id
        );

        const totalSales = franchiseSales.reduce(
          (sum, s) => sum + (Number(s.total_sales) || 0),
          0
        );
        const totalHpp = franchiseSales.reduce(
          (sum, s) => sum + (Number(s.total_hpp) || 0),
          0
        );
        const totalAdminFee = franchiseSales.reduce(
          (sum, s) => sum + (Number(s.total_admin_fee) || 0),
          0
        );

        // Bagi hasil dihitung dari total penjualan langsung
        const profitSharingAmount = totalSales * (franchise.profit_sharing_percent / 100);

        paymentUpdates.push({
          franchise_id: franchise.id,
          period_month: selectedMonth,
          period_year: selectedYear,
          total_revenue: totalSales,
          profit_sharing_percent: franchise.profit_sharing_percent,
          profit_sharing_amount: profitSharingAmount,
          updated_at: new Date().toISOString(),
        });
      }

      // Upsert all payments
      for (const payment of paymentUpdates) {
        const { error: upsertError } = await supabase
          .from('profit_sharing_payments')
          .upsert(payment, {
            onConflict: 'franchise_id,period_month,period_year',
          });

        if (upsertError) {
          console.error('Upsert error:', upsertError);
        }
      }

      toast.success('Data bagi hasil berhasil dihitung ulang');
      await fetchPayments();
    } catch (error) {
      console.error('Error calculating profit sharing:', error);
      toast.error('Gagal menghitung bagi hasil');
    } finally {
      setCalculating(false);
    }
  };

  const handleEdit = (payment: ProfitSharingPayment) => {
    setEditingPayment(payment);
    setEditStatus(payment.payment_status);
    setEditPaidAt(payment.paid_at ? payment.paid_at.split('T')[0] : '');
    setEditNotes(payment.notes || '');
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingPayment) return;

    setSaving(true);
    try {
      const updateData: any = {
        payment_status: editStatus,
        notes: editNotes || null,
        updated_at: new Date().toISOString(),
      };

      if (editStatus === 'paid' && editPaidAt) {
        updateData.paid_at = new Date(editPaidAt).toISOString();
      } else if (editStatus === 'unpaid') {
        updateData.paid_at = null;
      }

      const { error } = await supabase
        .from('profit_sharing_payments')
        .update(updateData)
        .eq('id', editingPayment.id);

      if (error) throw error;

      toast.success('Status pembayaran berhasil diperbarui');
      setEditDialogOpen(false);
      await fetchPayments();
    } catch (error) {
      console.error('Error updating payment:', error);
      toast.error('Gagal memperbarui status pembayaran');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (payment: ProfitSharingPayment) => {
    setDeletingPayment(payment);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingPayment) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from('profit_sharing_payments')
        .delete()
        .eq('id', deletingPayment.id);

      if (error) throw error;

      toast.success('Data bagi hasil berhasil dihapus');
      setDeleteDialogOpen(false);
      await fetchPayments();
    } catch (error) {
      console.error('Error deleting payment:', error);
      toast.error('Gagal menghapus data bagi hasil');
    } finally {
      setDeleting(false);
    }
  };

  const exportToExcel = () => {
    const exportData = filteredPayments.map((p) => ({
      'Nama Franchise': p.franchise_name,
      'Total Pendapatan': p.total_revenue,
      'Persentase Bagi Hasil': `${p.profit_sharing_percent}%`,
      'Nominal Bagi Hasil': p.profit_sharing_amount,
      'Status Pembayaran': p.payment_status === 'paid' ? 'Sudah Dibayar' : 'Belum Dibayar',
      'Tanggal Dibayar': p.paid_at ? new Date(p.paid_at).toLocaleDateString('id-ID') : '-',
      'Catatan': p.notes || '-',
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Bagi Hasil');
    XLSX.writeFile(workbook, `bagi-hasil-${MONTHS[selectedMonth - 1]}-${selectedYear}.xlsx`);
    toast.success('Data berhasil diexport ke Excel');
  };

  // Calculate summary
  const totalProfitSharing = payments.reduce((sum, p) => sum + p.profit_sharing_amount, 0);
  const paidCount = payments.filter((p) => p.payment_status === 'paid').length;
  const unpaidCount = payments.filter((p) => p.payment_status === 'unpaid').length;

  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="page-header">
          <h1 className="page-title">Bagi Hasil Franchise</h1>
          <p className="page-subtitle">Kelola pembayaran bagi hasil dari setiap franchise</p>
        </div>
        <LoadingSpinner message="Memuat data..." />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Receipt className="w-6 h-6 text-primary" />
          Bagi Hasil Franchise
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Kelola pembayaran bagi hasil dari setiap franchise ke Super Admin
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="bg-gradient-to-br from-violet-500/10 to-purple-500/10 border-violet-200/50">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-violet-500/20">
                <Wallet className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Total Bagi Hasil Bulan Ini</p>
                <p className="text-xl font-bold text-foreground">{formatCurrency(totalProfitSharing)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500/10 to-green-500/10 border-emerald-200/50">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/20">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Sudah Dibayar</p>
                <p className="text-xl font-bold text-foreground">{paidCount} Franchise</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/10 to-amber-500/10 border-orange-200/50">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-orange-500/20">
                <Clock className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Belum Dibayar</p>
                <p className="text-xl font-bold text-foreground">{unpaidCount} Franchise</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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
                <strong>Bagi Hasil = Total Penjualan × Persentase Bagi Hasil</strong>
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Dihitung dari total penjualan tanpa dikurangi HPP, biaya admin, atau biaya lainnya.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters & Actions */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Cari franchise..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Select
                value={selectedMonth.toString()}
                onValueChange={(v) => setSelectedMonth(parseInt(v))}
              >
                <SelectTrigger className="w-36">
                  <Calendar className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Pilih Bulan" />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((month, index) => (
                    <SelectItem key={index} value={(index + 1).toString()}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={selectedYear.toString()}
                onValueChange={(v) => setSelectedYear(parseInt(v))}
              >
                <SelectTrigger className="w-24">
                  <SelectValue placeholder="Tahun" />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={calculateProfitSharing} disabled={calculating} className="gap-2">
              {calculating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Hitung Ulang Data
            </Button>
            <Button variant="outline" onClick={exportToExcel} className="gap-2">
              <FileSpreadsheet className="w-4 h-4" />
              Export Excel
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Franchise</TableHead>
                  <TableHead className="text-right">Total Pendapatan</TableHead>
                  <TableHead className="text-center">% Bagi Hasil</TableHead>
                  <TableHead className="text-right">Nominal Bagi Hasil</TableHead>
                  <TableHead className="text-center">Status Bayar</TableHead>
                  <TableHead className="text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {payments.length === 0
                        ? 'Belum ada data. Klik "Hitung Ulang Data" untuk menghitung bagi hasil.'
                        : 'Tidak ada franchise yang cocok dengan pencarian.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">{payment.franchise_name}</TableCell>
                      <TableCell className="text-right">{formatCurrency(payment.total_revenue)}</TableCell>
                      <TableCell className="text-center">{payment.profit_sharing_percent}%</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(payment.profit_sharing_amount)}</TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={payment.payment_status === 'paid' ? 'default' : 'secondary'}
                          className={
                            payment.payment_status === 'paid'
                              ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                              : 'bg-orange-100 text-orange-700 hover:bg-orange-100'
                          }
                        >
                          {payment.payment_status === 'paid' ? 'Sudah Dibayar' : 'Belum Dibayar'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleEdit(payment)}
                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDelete(payment)}
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Status Pembayaran</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Franchise</Label>
              <p className="text-sm font-medium text-foreground">{editingPayment?.franchise_name}</p>
            </div>
            <div className="space-y-2">
              <Label>Nominal Bagi Hasil</Label>
              <p className="text-sm font-semibold text-foreground">
                {editingPayment ? formatCurrency(editingPayment.profit_sharing_amount) : '-'}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Status Pembayaran</Label>
              <Select value={editStatus} onValueChange={(v) => setEditStatus(v as 'paid' | 'unpaid')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unpaid">Belum Dibayar</SelectItem>
                  <SelectItem value="paid">Sudah Dibayar</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {editStatus === 'paid' && (
              <div className="space-y-2">
                <Label>Tanggal Pembayaran</Label>
                <Input
                  type="date"
                  value={editPaidAt}
                  onChange={(e) => setEditPaidAt(e.target.value)}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Catatan (Opsional)</Label>
              <Textarea
                placeholder="Tambahkan catatan pembayaran..."
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Data Bagi Hasil</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground">
              Apakah Anda yakin ingin menghapus data bagi hasil untuk{' '}
              <strong className="text-foreground">{deletingPayment?.franchise_name}</strong> pada periode{' '}
              <strong className="text-foreground">
                {deletingPayment ? MONTHS[deletingPayment.period_month - 1] : ''} {deletingPayment?.period_year}
              </strong>
              ?
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Batal
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete} disabled={deleting}>
              {deleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}