import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Pagination } from '@/components/Pagination';
import { Wallet, Plus, Pencil, Trash2, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { useRealtimeSubscription } from '@/hooks/use-realtime';

interface Expenditure {
  id: string;
  franchise_id: string;
  amount: number;
  description: string;
  expenditure_date: string;
  created_at: string;
}

const ITEMS_PER_PAGE = 10;

export default function ExpendituresPage() {
  const { franchiseId } = useAuth();
  const [expenditures, setExpenditures] = useState<Expenditure[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [filterMonth, setFilterMonth] = useState<string>('all');

  // Form states
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [expenditureDate, setExpenditureDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const fetchExpenditures = useCallback(async () => {
    if (!franchiseId) return;
    
    const { data, error } = await supabase
      .from('expenditures')
      .select('*')
      .eq('franchise_id', franchiseId)
      .order('expenditure_date', { ascending: false });

    if (error) {
      console.error('Error fetching expenditures:', error);
      toast.error('Gagal memuat data pengeluaran');
      return;
    }

    setExpenditures(data || []);
    setLoading(false);
  }, [franchiseId]);

  useEffect(() => {
    fetchExpenditures();
  }, [fetchExpenditures]);

  useRealtimeSubscription(
    [
      {
        table: 'expenditures',
        filter: franchiseId ? `franchise_id=eq.${franchiseId}` : undefined,
        onDataChange: fetchExpenditures,
      },
    ],
    !!franchiseId
  );

  // Available months for filter
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    expenditures.forEach(e => {
      const date = new Date(e.expenditure_date);
      months.add(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
    });
    return Array.from(months).sort().reverse();
  }, [expenditures]);

  // Filtered data
  const filteredExpenditures = useMemo(() => {
    if (filterMonth === 'all') return expenditures;
    return expenditures.filter(e => {
      const date = new Date(e.expenditure_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      return monthKey === filterMonth;
    });
  }, [expenditures, filterMonth]);

  // Pagination
  const totalPages = Math.ceil(filteredExpenditures.length / ITEMS_PER_PAGE);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredExpenditures.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredExpenditures, currentPage]);

  // Total for current filter
  const totalExpenditure = useMemo(() => {
    return filteredExpenditures.reduce((sum, e) => sum + Number(e.amount), 0);
  }, [filteredExpenditures]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterMonth]);

  const resetForm = () => {
    setAmount('');
    setDescription('');
    setExpenditureDate(format(new Date(), 'yyyy-MM-dd'));
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!franchiseId) return;

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error('Nominal harus lebih dari 0');
      return;
    }

    if (!description.trim()) {
      toast.error('Keterangan tidak boleh kosong');
      return;
    }

    if (editingId) {
      const { error } = await supabase
        .from('expenditures')
        .update({
          amount: numAmount,
          description: description.trim(),
          expenditure_date: expenditureDate,
        })
        .eq('id', editingId);

      if (error) {
        console.error('Error updating expenditure:', error);
        toast.error('Gagal mengupdate pengeluaran');
        return;
      }
      toast.success('Pengeluaran berhasil diperbarui');
    } else {
      const { error } = await supabase
        .from('expenditures')
        .insert({
          franchise_id: franchiseId,
          amount: numAmount,
          description: description.trim(),
          expenditure_date: expenditureDate,
        });

      if (error) {
        console.error('Error adding expenditure:', error);
        toast.error('Gagal menambahkan pengeluaran');
        return;
      }
      toast.success('Pengeluaran berhasil ditambahkan');
    }

    setDialogOpen(false);
    resetForm();
    fetchExpenditures();
  };

  const handleEdit = (expenditure: Expenditure) => {
    setEditingId(expenditure.id);
    setAmount(expenditure.amount.toString());
    setDescription(expenditure.description);
    setExpenditureDate(expenditure.expenditure_date);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus pengeluaran ini?')) return;

    const { error } = await supabase
      .from('expenditures')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting expenditure:', error);
      toast.error('Gagal menghapus pengeluaran');
      return;
    }

    toast.success('Pengeluaran berhasil dihapus');
    fetchExpenditures();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatMonthLabel = (monthKey: string) => {
    const [year, month] = monthKey.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return format(date, 'MMMM yyyy', { locale: idLocale });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pengeluaran</h1>
          <p className="text-muted-foreground text-sm">Kelola data pengeluaran franchise Anda</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus size={18} />
              Tambah Pengeluaran
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit Pengeluaran' : 'Tambah Pengeluaran'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Nominal (Rp)</Label>
                <Input
                  id="amount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Masukkan nominal"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Keterangan</Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Masukkan keterangan"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Tanggal</Label>
                <Input
                  id="date"
                  type="date"
                  value={expenditureDate}
                  onChange={(e) => setExpenditureDate(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                {editingId ? 'Simpan Perubahan' : 'Tambah'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Card */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-purple-500/5">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/10">
              <Wallet className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                Total Pengeluaran {filterMonth !== 'all' ? formatMonthLabel(filterMonth) : 'Keseluruhan'}
              </p>
              <p className="text-2xl font-bold text-primary">{formatCurrency(totalExpenditure)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="py-3 px-4 border-b border-border/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Calendar className="w-4 h-4 text-primary" />
              </div>
              <CardTitle className="text-base font-bold">Daftar Pengeluaran</CardTitle>
            </div>
            {availableMonths.length > 0 && (
              <Select value={filterMonth} onValueChange={setFilterMonth}>
                <SelectTrigger className="w-[160px] h-8 text-xs">
                  <SelectValue placeholder="Filter Bulan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Bulan</SelectItem>
                  {availableMonths.map(month => (
                    <SelectItem key={month} value={month}>
                      {formatMonthLabel(month)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {paginatedData.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Wallet className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Belum ada data pengeluaran</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="w-12 text-center">No</TableHead>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Keterangan</TableHead>
                      <TableHead className="text-right">Nominal</TableHead>
                      <TableHead className="text-center w-24">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedData.map((item, index) => (
                      <TableRow key={item.id} className="hover:bg-muted/20">
                        <TableCell className="text-center text-sm text-muted-foreground">
                          {(currentPage - 1) * ITEMS_PER_PAGE + index + 1}
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(item.expenditure_date), 'dd MMM yyyy', { locale: idLocale })}
                        </TableCell>
                        <TableCell className="text-sm font-medium">{item.description}</TableCell>
                        <TableCell className="text-right text-sm font-semibold text-destructive">
                          {formatCurrency(Number(item.amount))}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleEdit(item)}
                            >
                              <Pencil size={14} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => handleDelete(item.id)}
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {totalPages > 1 && (
                <div className="p-4 border-t border-border/50">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    totalItems={filteredExpenditures.length}
                    itemsPerPage={ITEMS_PER_PAGE}
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}