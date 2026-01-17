import { useState, useEffect, useMemo, Fragment } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/Pagination';
import { 
  FileBarChart, 
  TrendingUp, 
  DollarSign, 
  ShoppingCart,
  Download,
  Filter,
  Search,
  ClipboardList
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

interface Franchise {
  id: string;
  name: string;
  profitSharingPercent: number;
}

interface SalesData {
  id: string;
  franchiseId: string;
  franchiseName: string;
  totalSales: number;
  totalHpp: number;
  totalAdminFee: number;
  netProfit: number;
  profitSharing: number;
}

interface DetailedSale {
  id: string;
  franchiseId: string;
  franchiseName: string;
  productName: string;
  productCode: string;
  quantity: number;
  totalSales: number;
  totalHpp: number;
  totalAdminFee: number;
  netProfit: number;
  createdAt: Date;
}

interface GroupedDailySales {
  date: Date;
  dateString: string;
  sales: DetailedSale[];
  totalTransactions: number;
  totalProfit: number;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export default function GlobalReports() {
  const [loading, setLoading] = useState(true);
  const [franchises, setFranchises] = useState<Franchise[]>([]);
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [selectedFranchise, setSelectedFranchise] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  
  // Detail transaction states
  const [detailedSales, setDetailedSales] = useState<DetailedSale[]>([]);
  const [filterDetailFranchise, setFilterDetailFranchise] = useState<string>('all');
  const [searchDetailProduct, setSearchDetailProduct] = useState('');
  const [currentPageDetail, setCurrentPageDetail] = useState(1);
  const ITEMS_PER_PAGE_DETAIL = 25;

  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return [currentYear, currentYear - 1, currentYear - 2];
  }, []);

  useEffect(() => {
    fetchData();
  }, [selectedYear, selectedMonth]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch franchises
      const { data: franchiseData, error: franchiseError } = await supabase
        .from('franchises')
        .select('id, name, profit_sharing_percent')
        .order('name');

      if (franchiseError) throw franchiseError;

      const franchiseList: Franchise[] = (franchiseData || []).map((f) => ({
        id: f.id,
        name: f.name,
        profitSharingPercent: Number(f.profit_sharing_percent),
      }));
      setFranchises(franchiseList);

      // Fetch sales
      const startDate = new Date(selectedYear, selectedMonth - 1, 1);
      const endDate = new Date(selectedYear, selectedMonth, 0);

      const { data: salesRaw, error: salesError } = await supabase
        .from('sales')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (salesError) throw salesError;

      // Fetch settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('admin_settings')
        .select('*');

      if (settingsError) throw settingsError;

      // Aggregate by franchise
      const aggregated: Record<string, SalesData> = {};

      franchiseList.forEach((franchise) => {
        aggregated[franchise.id] = {
          id: franchise.id,
          franchiseId: franchise.id,
          franchiseName: franchise.name,
          totalSales: 0,
          totalHpp: 0,
          totalAdminFee: 0,
          netProfit: 0,
          profitSharing: 0,
        };
      });

      (salesRaw || []).forEach((sale) => {
        if (!sale.franchise_id || !aggregated[sale.franchise_id]) return;

        const settings = (settingsData || []).find(s => s.franchise_id === sale.franchise_id);
        const adminFeePercent = settings?.admin_fee_percent || 5;
        const fixedDeduction = settings?.fixed_deduction || 1000;
        const adminFee = (Number(sale.total_sales) * adminFeePercent / 100) + fixedDeduction;

        aggregated[sale.franchise_id].totalSales += Number(sale.total_sales);
        aggregated[sale.franchise_id].totalHpp += Number(sale.total_hpp);
        aggregated[sale.franchise_id].totalAdminFee += adminFee;
      });

      // Calculate net profit and profit sharing
      Object.keys(aggregated).forEach((id) => {
        const data = aggregated[id];
        const franchise = franchiseList.find(f => f.id === id);
        data.netProfit = data.totalSales - data.totalHpp - data.totalAdminFee; // tetap hitung untuk display
        // Bagi hasil dihitung dari total penjualan langsung
        data.profitSharing = data.totalSales * (franchise?.profitSharingPercent || 0) / 100;
      });

      setSalesData(Object.values(aggregated));

      // Fetch detailed sales with product info for detail table
      const detailed: DetailedSale[] = (salesRaw || []).map(sale => {
        const franchise = franchiseList.find(f => f.id === sale.franchise_id);
        const settings = (settingsData || []).find(s => s.franchise_id === sale.franchise_id);
        const adminFeePercent = settings?.admin_fee_percent || 5;
        const fixedDeduction = settings?.fixed_deduction || 1000;
        const adminFee = (Number(sale.total_sales) * adminFeePercent / 100) + fixedDeduction;
        
        return {
          id: sale.id,
          franchiseId: sale.franchise_id || '',
          franchiseName: franchise?.name || 'Unknown',
          productName: sale.product_name,
          productCode: sale.product_code,
          quantity: sale.quantity,
          totalSales: Number(sale.total_sales),
          totalHpp: Number(sale.total_hpp),
          totalAdminFee: adminFee,
          netProfit: Number(sale.total_sales) - Number(sale.total_hpp) - adminFee,
          createdAt: new Date(sale.created_at),
        };
      });

      setDetailedSales(detailed);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  const filteredData = useMemo(() => {
    if (selectedFranchise === 'all') {
      return salesData;
    }
    return salesData.filter(d => d.franchiseId === selectedFranchise);
  }, [salesData, selectedFranchise]);

  const totals = useMemo(() => {
    return filteredData.reduce(
      (acc, d) => ({
        totalSales: acc.totalSales + d.totalSales,
        totalHpp: acc.totalHpp + d.totalHpp,
        totalAdminFee: acc.totalAdminFee + d.totalAdminFee,
        netProfit: acc.netProfit + d.netProfit,
        profitSharing: acc.profitSharing + d.profitSharing,
      }),
      { totalSales: 0, totalHpp: 0, totalAdminFee: 0, netProfit: 0, profitSharing: 0 }
    );
  }, [filteredData]);

  // Filter detail sales
  const filteredDetailSales = useMemo(() => {
    let result = detailedSales;
    
    if (filterDetailFranchise !== 'all') {
      result = result.filter(s => s.franchiseId === filterDetailFranchise);
    }
    
    if (searchDetailProduct) {
      const search = searchDetailProduct.toLowerCase();
      result = result.filter(s => 
        s.productName.toLowerCase().includes(search) ||
        s.productCode.toLowerCase().includes(search)
      );
    }
    
    return result;
  }, [detailedSales, filterDetailFranchise, searchDetailProduct]);

  // Group by date
  const groupedDetailSales = useMemo(() => {
    const groups: Record<string, GroupedDailySales> = {};
    
    filteredDetailSales.forEach(sale => {
      const dateKey = sale.createdAt.toISOString().split('T')[0];
      
      if (!groups[dateKey]) {
        groups[dateKey] = {
          date: sale.createdAt,
          dateString: format(sale.createdAt, 'd MMMM yyyy', { locale: localeId }),
          sales: [],
          totalTransactions: 0,
          totalProfit: 0,
        };
      }
      
      groups[dateKey].sales.push(sale);
      groups[dateKey].totalTransactions += 1;
      groups[dateKey].totalProfit += sale.netProfit;
    });
    
    return Object.values(groups).sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [filteredDetailSales]);

  // Pagination for detail
  const totalPagesDetail = Math.ceil(filteredDetailSales.length / ITEMS_PER_PAGE_DETAIL);
  
  // Calculate which groups to show based on pagination
  const paginatedGroupedDetailSales = useMemo(() => {
    const startIndex = (currentPageDetail - 1) * ITEMS_PER_PAGE_DETAIL;
    const endIndex = startIndex + ITEMS_PER_PAGE_DETAIL;
    
    let currentIndex = 0;
    const result: GroupedDailySales[] = [];
    
    for (const group of groupedDetailSales) {
      const groupStart = currentIndex;
      const groupEnd = currentIndex + group.sales.length;
      
      if (groupEnd > startIndex && groupStart < endIndex) {
        const salesStart = Math.max(0, startIndex - groupStart);
        const salesEnd = Math.min(group.sales.length, endIndex - groupStart);
        
        result.push({
          ...group,
          sales: group.sales.slice(salesStart, salesEnd),
        });
      }
      
      currentIndex = groupEnd;
      if (currentIndex >= endIndex) break;
    }
    
    return result;
  }, [groupedDetailSales, currentPageDetail, ITEMS_PER_PAGE_DETAIL]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPageDetail(1);
  }, [filterDetailFranchise, searchDetailProduct]);

  const handleExport = () => {
    if (filteredData.length === 0) {
      toast.error('Tidak ada data untuk diexport');
      return;
    }

    const exportData = filteredData.map((d, i) => ({
      'No': i + 1,
      'Franchise': d.franchiseName,
      'Omzet': d.totalSales,
      'HPP': d.totalHpp,
      'Biaya Admin': d.totalAdminFee,
      'Laba Bersih': d.netProfit,
      'Bagi Hasil': d.profitSharing,
    }));

    // Add totals row
    exportData.push({
      'No': '' as any,
      'Franchise': 'TOTAL',
      'Omzet': totals.totalSales,
      'HPP': totals.totalHpp,
      'Biaya Admin': totals.totalAdminFee,
      'Laba Bersih': totals.netProfit,
      'Bagi Hasil': totals.profitSharing,
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan Global');

    const fileName = `laporan-global-${months[selectedMonth - 1]}-${selectedYear}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    toast.success('Laporan berhasil diunduh');
  };

  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="page-header">
          <h1 className="page-title">Laporan Keuangan Global</h1>
          <p className="page-subtitle">Rekap penjualan seluruh franchise</p>
        </div>
        <LoadingSpinner message="Memuat data..." />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileBarChart className="w-6 h-6 text-primary" />
            Laporan Keuangan Global
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Rekap penjualan {months[selectedMonth - 1]} {selectedYear}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={selectedFranchise} onValueChange={setSelectedFranchise}>
            <SelectTrigger className="w-[160px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Franchise" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Franchise</SelectItem>
              {franchises.map((f) => (
                <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Bulan" />
            </SelectTrigger>
            <SelectContent>
              {months.map((month, i) => (
                <SelectItem key={i} value={(i + 1).toString()}>{month}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
            <SelectTrigger className="w-[100px]">
              <SelectValue placeholder="Tahun" />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map(year => (
                <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleExport} variant="outline" className="gap-2">
            <Download size={16} />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/50 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <ShoppingCart className="w-6 h-6 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Omzet</p>
                <p className="text-xl font-bold text-foreground">{formatCurrency(totals.totalSales)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Biaya Admin</p>
                <p className="text-xl font-bold text-foreground">{formatCurrency(totals.totalAdminFee)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Laba Bersih</p>
                <p className={`text-xl font-bold ${totals.netProfit >= 0 ? 'text-blue-500' : 'text-destructive'}`}>
                  {formatCurrency(totals.netProfit)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-violet-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Bagi Hasil</p>
                <p className="text-xl font-bold text-violet-500">{formatCurrency(totals.profitSharing)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card className="shadow-md border-border/50">
        <CardHeader className="py-4 px-5 border-b border-border/50">
          <CardTitle className="text-base font-bold">Detail per Franchise</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/30">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-sm">Franchise</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground text-sm">Omzet</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground text-sm">HPP</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground text-sm">Biaya Admin</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground text-sm">Laba Bersih</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground text-sm">Bagi Hasil</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-muted-foreground">
                      Tidak ada data untuk periode ini
                    </td>
                  </tr>
                ) : (
                  <>
                    {filteredData.map((data) => (
                      <tr key={data.id} className="border-t border-border hover:bg-muted/10">
                        <td className="px-4 py-3 font-medium text-foreground">{data.franchiseName}</td>
                        <td className="px-4 py-3 text-right text-sm">{formatCurrency(data.totalSales)}</td>
                        <td className="px-4 py-3 text-right text-sm">{formatCurrency(data.totalHpp)}</td>
                        <td className="px-4 py-3 text-right text-sm">{formatCurrency(data.totalAdminFee)}</td>
                        <td className={`px-4 py-3 text-right text-sm font-medium ${data.netProfit >= 0 ? 'text-blue-500' : 'text-destructive'}`}>
                          {formatCurrency(data.netProfit)}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-medium text-violet-500">
                          {formatCurrency(data.profitSharing)}
                        </td>
                      </tr>
                    ))}
                    {/* Totals Row */}
                    <tr className="bg-muted/30 border-t-2 border-border">
                      <td className="px-4 py-3 font-bold text-foreground">TOTAL</td>
                      <td className="px-4 py-3 text-right text-sm font-bold">{formatCurrency(totals.totalSales)}</td>
                      <td className="px-4 py-3 text-right text-sm font-bold">{formatCurrency(totals.totalHpp)}</td>
                      <td className="px-4 py-3 text-right text-sm font-bold">{formatCurrency(totals.totalAdminFee)}</td>
                      <td className={`px-4 py-3 text-right text-sm font-bold ${totals.netProfit >= 0 ? 'text-blue-500' : 'text-destructive'}`}>
                        {formatCurrency(totals.netProfit)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-bold text-violet-500">
                        {formatCurrency(totals.profitSharing)}
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Detail Transaksi Card */}
      <Card className="shadow-md border-border/50">
        <CardHeader className="py-4 px-5 border-b border-border/50">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <ClipboardList className="w-4 h-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base font-bold">Detail Transaksi</CardTitle>
                <p className="text-xs text-muted-foreground">Rincian transaksi semua franchise</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={filterDetailFranchise} onValueChange={setFilterDetailFranchise}>
                <SelectTrigger className="w-[160px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filter Franchise" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Franchise</SelectItem>
                  {franchises.map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Cari produk..."
                  value={searchDetailProduct}
                  onChange={(e) => setSearchDetailProduct(e.target.value)}
                  className="w-[200px] pl-9"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/30">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-sm">Produk</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-sm">Franchise</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground text-sm">Qty</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground text-sm">Penjualan</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground text-sm">HPP</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground text-sm">Admin</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground text-sm">Laba</th>
                </tr>
              </thead>
              <tbody>
                {paginatedGroupedDetailSales.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-muted-foreground">
                      Tidak ada data transaksi untuk periode ini
                    </td>
                  </tr>
                ) : (
                  paginatedGroupedDetailSales.map((group) => (
                    <Fragment key={group.dateString}>
                      {/* Daily Header */}
                      <tr className="bg-secondary/80 border-t-2 border-primary/20">
                        <td colSpan={7} className="px-4 py-3">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-bold text-foreground">{group.dateString}</p>
                              <p className="text-sm text-muted-foreground">
                                {group.totalTransactions} transaksi
                              </p>
                            </div>
                            <div className="text-right">
                              <p className={`text-lg font-bold ${group.totalProfit >= 0 ? 'text-primary' : 'text-destructive'}`}>
                                {formatCurrency(group.totalProfit)}
                              </p>
                              <p className="text-xs text-muted-foreground uppercase">Total Hari Ini</p>
                            </div>
                          </div>
                        </td>
                      </tr>
                      
                      {/* Daily Transactions */}
                      {group.sales.map((sale) => (
                        <tr key={sale.id} className="border-t border-border hover:bg-muted/10">
                          <td className="px-4 py-3">
                            <p className="font-medium text-foreground">{sale.productName}</p>
                            <p className="text-xs text-muted-foreground">{sale.productCode}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-muted-foreground">{sale.franchiseName}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex items-center px-2 py-1 rounded-md bg-secondary text-sm font-medium">
                              {sale.quantity}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-medium">
                            {formatCurrency(sale.totalSales)}
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-muted-foreground">
                            {formatCurrency(sale.totalHpp)}
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-destructive">
                            -{formatCurrency(sale.totalAdminFee)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className={`text-sm font-semibold ${sale.netProfit >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>
                              {formatCurrency(sale.netProfit)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {filteredDetailSales.length > ITEMS_PER_PAGE_DETAIL && (
            <div className="px-4 py-4 border-t border-border">
              <Pagination
                currentPage={currentPageDetail}
                totalPages={totalPagesDetail}
                totalItems={filteredDetailSales.length}
                itemsPerPage={ITEMS_PER_PAGE_DETAIL}
                onPageChange={setCurrentPageDetail}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
