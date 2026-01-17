import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { 
  FileBarChart, 
  TrendingUp, 
  DollarSign, 
  ShoppingCart,
  Download,
  Filter
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

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
    </div>
  );
}
