import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Pagination } from '@/components/Pagination';
import { Wallet, Calendar, Store } from 'lucide-react';
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
  franchises: {
    name: string;
  } | null;
}

interface Franchise {
  id: string;
  name: string;
}

const ITEMS_PER_PAGE = 10;

export default function ExpendituresGlobal() {
  const [expenditures, setExpenditures] = useState<Expenditure[]>([]);
  const [franchises, setFranchises] = useState<Franchise[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [filterFranchise, setFilterFranchise] = useState<string>('all');

  const fetchFranchises = useCallback(async () => {
    const { data, error } = await supabase
      .from('franchises')
      .select('id, name')
      .order('name');

    if (error) {
      console.error('Error fetching franchises:', error);
      return;
    }

    setFranchises(data || []);
  }, []);

  const fetchExpenditures = useCallback(async () => {
    const { data, error } = await supabase
      .from('expenditures')
      .select('*, franchises(name)')
      .order('expenditure_date', { ascending: false });

    if (error) {
      console.error('Error fetching expenditures:', error);
      toast.error('Gagal memuat data pengeluaran');
      return;
    }

    setExpenditures(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchFranchises();
    fetchExpenditures();
  }, [fetchFranchises, fetchExpenditures]);

  useRealtimeSubscription(
    [
      {
        table: 'expenditures',
        onDataChange: fetchExpenditures,
      },
    ],
    true
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
    let result = expenditures;
    
    if (filterFranchise !== 'all') {
      result = result.filter(e => e.franchise_id === filterFranchise);
    }
    
    if (filterMonth !== 'all') {
      result = result.filter(e => {
        const date = new Date(e.expenditure_date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        return monthKey === filterMonth;
      });
    }
    
    return result;
  }, [expenditures, filterMonth, filterFranchise]);

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
  }, [filterMonth, filterFranchise]);

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
      <div>
        <h1 className="text-2xl font-bold text-foreground">Pengeluaran Franchise</h1>
        <p className="text-muted-foreground text-sm">Lihat semua data pengeluaran dari seluruh franchise</p>
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
                Total Pengeluaran 
                {filterFranchise !== 'all' && ` ${franchises.find(f => f.id === filterFranchise)?.name || ''}`}
                {filterMonth !== 'all' && ` - ${formatMonthLabel(filterMonth)}`}
              </p>
              <p className="text-2xl font-bold text-destructive">{formatCurrency(totalExpenditure)}</p>
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
            <div className="flex items-center gap-2">
              <Select value={filterFranchise} onValueChange={setFilterFranchise}>
                <SelectTrigger className="w-[150px] h-8 text-xs">
                  <SelectValue placeholder="Filter Franchise" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Franchise</SelectItem>
                  {franchises.map(franchise => (
                    <SelectItem key={franchise.id} value={franchise.id}>
                      {franchise.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {availableMonths.length > 0 && (
                <Select value={filterMonth} onValueChange={setFilterMonth}>
                  <SelectTrigger className="w-[140px] h-8 text-xs">
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
                      <TableHead>Franchise</TableHead>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Keterangan</TableHead>
                      <TableHead className="text-right">Nominal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedData.map((item, index) => (
                      <TableRow key={item.id} className="hover:bg-muted/20">
                        <TableCell className="text-center text-sm text-muted-foreground">
                          {(currentPage - 1) * ITEMS_PER_PAGE + index + 1}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-md bg-primary/10">
                              <Store className="w-3 h-3 text-primary" />
                            </div>
                            <span className="text-sm font-medium">{item.franchises?.name || 'Unknown'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(item.expenditure_date), 'dd MMM yyyy', { locale: idLocale })}
                        </TableCell>
                        <TableCell className="text-sm">{item.description}</TableCell>
                        <TableCell className="text-right text-sm font-semibold text-destructive">
                          {formatCurrency(Number(item.amount))}
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