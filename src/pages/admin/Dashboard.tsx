import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { 
  TrendingUp, 
  DollarSign, 
  ShoppingCart, 
  Users, 
  Store,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface FranchiseStats {
  id: string;
  name: string;
  totalSales: number;
  totalProfit: number;
  profitSharingPercent: number;
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

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [franchises, setFranchises] = useState<FranchiseStats[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return [currentYear, currentYear - 1, currentYear - 2];
  }, []);

  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  useEffect(() => {
    fetchData();
  }, [selectedYear, selectedMonth]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch all franchises
      const { data: franchiseData, error: franchiseError } = await supabase
        .from('franchises')
        .select('*')
        .eq('is_active', true);

      if (franchiseError) throw franchiseError;

      // Fetch all sales for the selected period
      const startDate = new Date(selectedYear, selectedMonth - 1, 1);
      const endDate = new Date(selectedYear, selectedMonth, 0);

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

      // Aggregate sales by franchise
      const franchiseStats: FranchiseStats[] = (franchiseData || []).map((franchise) => {
        const franchiseSales = (salesData || []).filter(s => s.franchise_id === franchise.id);
        const franchiseSettings = (settingsData || []).find(s => s.franchise_id === franchise.id);
        
        const totalSales = franchiseSales.reduce((sum, s) => sum + Number(s.total_sales), 0);
        const totalHpp = franchiseSales.reduce((sum, s) => sum + Number(s.total_hpp), 0);
        
        // Calculate admin fee based on franchise settings
        const adminFeePercent = franchiseSettings?.admin_fee_percent || 5;
        const fixedDeduction = franchiseSettings?.fixed_deduction || 1000;
        const totalAdminFee = franchiseSales.reduce((sum, s) => {
          return sum + ((Number(s.total_sales) * adminFeePercent / 100) + fixedDeduction);
        }, 0);
        
        const totalProfit = totalSales - totalHpp - totalAdminFee;
        const profitSharingPercent = Number(franchise.profit_sharing_percent);
        const profitSharing = totalProfit > 0 ? (totalProfit * profitSharingPercent / 100) : 0;

        return {
          id: franchise.id,
          name: franchise.name,
          totalSales,
          totalProfit,
          profitSharingPercent,
          profitSharing,
        };
      });

      setFranchises(franchiseStats);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const totals = useMemo(() => {
    return franchises.reduce(
      (acc, f) => ({
        totalSales: acc.totalSales + f.totalSales,
        totalProfit: acc.totalProfit + f.totalProfit,
        totalProfitSharing: acc.totalProfitSharing + f.profitSharing,
      }),
      { totalSales: 0, totalProfit: 0, totalProfitSharing: 0 }
    );
  }, [franchises]);

  const chartData = useMemo(() => {
    return franchises
      .filter(f => f.totalSales > 0)
      .sort((a, b) => b.totalSales - a.totalSales)
      .slice(0, 10);
  }, [franchises]);

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
            Ringkasan penjualan {months[selectedMonth - 1]} {selectedYear}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
            <SelectTrigger className="w-[140px]">
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
                <p className="text-xl font-bold text-foreground">{franchises.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card className="shadow-md border-border/50">
        <CardHeader className="py-4 px-5 border-b border-border/50">
          <CardTitle className="text-base font-bold">Penjualan per Franchise</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {chartData.length > 0 ? (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" horizontal={true} vertical={false} />
                  <XAxis 
                    type="number" 
                    tickFormatter={formatCompactCurrency}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    width={100}
                    tick={{ fill: 'hsl(var(--foreground))', fontSize: 11 }}
                  />
                  <Tooltip 
                    formatter={(value: number) => [formatCurrency(value), 'Penjualan']}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="totalSales" radius={[0, 4, 4, 0]}>
                    {chartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground">
              Belum ada data penjualan
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Franchises Table */}
      <Card className="shadow-md border-border/50">
        <CardHeader className="py-4 px-5 border-b border-border/50">
          <CardTitle className="text-base font-bold">Ringkasan per Franchise</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/30">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-sm">Franchise</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground text-sm">Penjualan</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground text-sm">Laba Bersih</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground text-sm">% Bagi Hasil</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground text-sm">Bagi Hasil</th>
                </tr>
              </thead>
              <tbody>
                {franchises.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-muted-foreground">
                      Belum ada franchise terdaftar
                    </td>
                  </tr>
                ) : (
                  franchises.map((franchise, index) => (
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
