import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { 
  TrendingUp, 
  DollarSign, 
  ShoppingCart, 
  Store
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface FranchiseInfo {
  id: string;
  name: string;
  profitSharingPercent: number;
}

interface FranchiseYearlyStats {
  id: string;
  name: string;
  totalSales: number;
  totalProfit: number;
  profitSharingPercent: number;
  profitSharing: number;
}

interface MonthlyProfitSharing {
  month: string;
  [franchiseName: string]: number | string;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatCompactCurrency = (value: number) => {
  if (value >= 1000000000) {
    return `${(value / 1000000000).toFixed(1)}M`;
  }
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}Jt`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(0)}Rb`;
  }
  return value.toString();
};

const COLORS = ['#f97316', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b', '#6366f1'];

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
];

const MONTHS_FULL = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [franchiseList, setFranchiseList] = useState<FranchiseInfo[]>([]);
  const [franchiseStats, setFranchiseStats] = useState<FranchiseYearlyStats[]>([]);
  const [monthlyChartData, setMonthlyChartData] = useState<MonthlyProfitSharing[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [topNFranchise, setTopNFranchise] = useState<number>(5);

  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return [currentYear, currentYear - 1, currentYear - 2];
  }, []);

  useEffect(() => {
    fetchData();
  }, [selectedYear]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch all franchises
      const { data: franchiseData, error: franchiseError } = await supabase
        .from('franchises')
        .select('*')
        .eq('is_active', true);

      if (franchiseError) throw franchiseError;

      // Fetch all sales for the entire year (January 1 - December 31)
      const startDate = new Date(selectedYear, 0, 1);
      const endDate = new Date(selectedYear, 11, 31, 23, 59, 59);

      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (salesError) throw salesError;

      // Fetch admin settings for each franchise
      const { data: settingsData, error: settingsError } = await supabase
        .from('admin_settings')
        .select('*');

      if (settingsError) throw settingsError;

      const franchises = franchiseData || [];
      const sales = salesData || [];
      const settings = settingsData || [];

      // Store franchise list for chart legend
      const franchiseInfoList: FranchiseInfo[] = franchises.map(f => ({
        id: f.id,
        name: f.name,
        profitSharingPercent: Number(f.profit_sharing_percent) || 0
      }));
      setFranchiseList(franchiseInfoList);

      // Calculate monthly profit sharing data for chart
      const monthlyData: MonthlyProfitSharing[] = MONTHS.map((monthName, monthIndex) => {
        const monthData: MonthlyProfitSharing = { month: monthName };

        franchises.forEach((franchise) => {
          // Filter sales for this franchise in this month
          const franchiseSales = sales.filter(s => {
            const saleDate = new Date(s.created_at);
            return s.franchise_id === franchise.id && saleDate.getMonth() === monthIndex;
          });

          const franchiseSettings = settings.find(s => s.franchise_id === franchise.id);
          const adminFeePercent = franchiseSettings?.admin_fee_percent || 5;
          const fixedDeduction = franchiseSettings?.fixed_deduction || 1000;

          const totalSales = franchiseSales.reduce((sum, s) => sum + Number(s.total_sales), 0);
          const totalHpp = franchiseSales.reduce((sum, s) => sum + Number(s.total_hpp), 0);
          const totalAdminFee = franchiseSales.reduce((sum, s) => {
            return sum + ((Number(s.total_sales) * adminFeePercent / 100) + fixedDeduction);
          }, 0);

          const profitSharingPercent = Number(franchise.profit_sharing_percent) || 0;
          // Bagi hasil dihitung dari total penjualan langsung
          const profitSharing = totalSales * profitSharingPercent / 100;

          monthData[franchise.name] = profitSharing;
        });

        return monthData;
      });

      setMonthlyChartData(monthlyData);

      // Calculate yearly totals per franchise for the table
      const yearlyStats: FranchiseYearlyStats[] = franchises.map((franchise) => {
        const franchiseSales = sales.filter(s => s.franchise_id === franchise.id);
        const franchiseSettings = settings.find(s => s.franchise_id === franchise.id);

        const adminFeePercent = franchiseSettings?.admin_fee_percent || 5;
        const fixedDeduction = franchiseSettings?.fixed_deduction || 1000;

        const totalSales = franchiseSales.reduce((sum, s) => sum + Number(s.total_sales), 0);
        const totalHpp = franchiseSales.reduce((sum, s) => sum + Number(s.total_hpp), 0);
        const totalAdminFee = franchiseSales.reduce((sum, s) => {
          return sum + ((Number(s.total_sales) * adminFeePercent / 100) + fixedDeduction);
        }, 0);

        const totalProfit = totalSales - totalHpp - totalAdminFee; // tetap hitung untuk display
        const profitSharingPercent = Number(franchise.profit_sharing_percent) || 0;
        // Bagi hasil dihitung dari total penjualan langsung
        const profitSharing = totalSales * profitSharingPercent / 100;

        return {
          id: franchise.id,
          name: franchise.name,
          totalSales,
          totalProfit,
          profitSharingPercent,
          profitSharing,
        };
      });

      setFranchiseStats(yearlyStats);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const totals = useMemo(() => {
    return franchiseStats.reduce(
      (acc, f) => ({
        totalSales: acc.totalSales + f.totalSales,
        totalProfit: acc.totalProfit + f.totalProfit,
        totalProfitSharing: acc.totalProfitSharing + f.profitSharing,
      }),
      { totalSales: 0, totalProfit: 0, totalProfitSharing: 0 }
    );
  }, [franchiseStats]);

  const hasChartData = useMemo(() => {
    return monthlyChartData.some(month => 
      franchiseList.some(f => Number(month[f.name]) > 0)
    );
  }, [monthlyChartData, franchiseList]);

  // Filter top N franchises by total profit sharing for the chart
  const topFranchises = useMemo(() => {
    const sorted = [...franchiseStats].sort((a, b) => b.profitSharing - a.profitSharing);
    return topNFranchise >= 999 ? sorted : sorted.slice(0, topNFranchise);
  }, [franchiseStats, topNFranchise]);

  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="page-header">
          <h1 className="page-title">Dashboard Super Admin</h1>
          <p className="page-subtitle">Ringkasan penjualan seluruh franchise</p>
        </div>
        <LoadingSpinner message="Memuat data..." />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <span className="text-2xl">📊</span>
            Dashboard Super Admin
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Ringkasan tahunan {selectedYear}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Tahun" />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map(year => (
                <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/50 shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <ShoppingCart className="w-6 h-6 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Penjualan</p>
                <p className="text-xl font-bold text-foreground">{formatCurrency(totals.totalSales)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Laba Bersih</p>
                <p className={`text-xl font-bold ${totals.totalProfit >= 0 ? 'text-blue-500' : 'text-destructive'}`}>
                  {formatCurrency(totals.totalProfit)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-violet-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Bagi Hasil Diterima</p>
                <p className="text-xl font-bold text-violet-500">{formatCurrency(totals.totalProfitSharing)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Store className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Franchise Aktif</p>
                <p className="text-xl font-bold text-foreground">{franchiseList.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart - Monthly Profit Sharing per Franchise */}
      <Card className="shadow-md border-border/50">
        <CardHeader className="py-4 px-5 border-b border-border/50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <CardTitle className="text-base font-bold">Bagi Hasil per Franchise - Tahun {selectedYear}</CardTitle>
            <Select value={topNFranchise.toString()} onValueChange={(v) => setTopNFranchise(parseInt(v))}>
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder="Top N" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">Top 5</SelectItem>
                <SelectItem value="10">Top 10</SelectItem>
                <SelectItem value="999">Semua</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {hasChartData ? (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" vertical={false} />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  />
                  <YAxis 
                    tickFormatter={formatCompactCurrency}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  />
                  <Tooltip 
                    formatter={(value: number, name: string) => [formatCurrency(value), name]}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      fontSize: '12px',
                    }}
                    labelStyle={{ fontWeight: 'bold', marginBottom: '4px' }}
                  />
                  <Legend 
                    wrapperStyle={{ paddingTop: '10px', overflowX: 'auto', maxWidth: '100%' }}
                    iconType="circle"
                  />
                  {topFranchises.map((franchise, index) => (
                    <Line 
                      key={franchise.id}
                      type="monotone"
                      dataKey={franchise.name}
                      stroke={COLORS[index % COLORS.length]}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground">
              Belum ada data bagi hasil
            </div>
          )}
        </CardContent>
      </Card>

      {/* Yearly Franchise Summary Table */}
      <Card className="shadow-md border-border/50">
        <CardHeader className="py-4 px-5 border-b border-border/50">
          <CardTitle className="text-base font-bold">Ringkasan Tahunan per Franchise - {selectedYear}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/30">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-sm">Franchise</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground text-sm">Total Penjualan</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground text-sm">Laba Bersih</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground text-sm">% Bagi Hasil</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground text-sm">Bagi Hasil</th>
                </tr>
              </thead>
              <tbody>
                {franchiseStats.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-muted-foreground">
                      Belum ada franchise terdaftar
                    </td>
                  </tr>
                ) : (
                  franchiseStats.map((franchise, index) => (
                    <tr key={franchise.id} className="border-t border-border hover:bg-muted/20">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <span className="font-medium text-foreground">{franchise.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-sm">{formatCurrency(franchise.totalSales)}</td>
                      <td className={`px-4 py-3 text-right text-sm font-medium ${franchise.totalProfit >= 0 ? 'text-blue-500' : 'text-destructive'}`}>
                        {formatCurrency(franchise.totalProfit)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm">{franchise.profitSharingPercent}%</td>
                      <td className="px-4 py-3 text-right text-sm font-medium text-violet-500">
                        {formatCurrency(franchise.profitSharing)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
