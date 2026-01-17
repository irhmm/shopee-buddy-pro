import { useMemo, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Wallet } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const MONTHS_FULL = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

// Color scheme
const COLORS = {
  penjualan: '#10b981',    // Emerald Green
  labaBersih: '#3b82f6',   // Blue
  pengeluaran: '#f59e0b',  // Amber/Orange
};

interface MonthlyData {
  month: string;
  labaBersih: number;
  penjualan: number;
  pengeluaran: number;
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

// Custom Legend Component
const CustomLegend = () => (
  <div className="flex flex-wrap justify-center gap-3 mt-4">
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
      <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Penjualan</span>
    </div>
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20">
      <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
      <span className="text-xs font-medium text-blue-600 dark:text-blue-400">Laba Bersih</span>
    </div>
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20">
      <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
      <span className="text-xs font-medium text-amber-600 dark:text-amber-400">Pengeluaran</span>
    </div>
  </div>
);

export default function LaporanKeuanganPage() {
  const { sales } = useApp();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  // Get available years from sales data
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    years.add(currentYear);
    sales.forEach(sale => {
      const year = new Date(sale.createdAt).getFullYear();
      years.add(year);
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [sales, currentYear]);

  // Calculate monthly data for selected year
  const monthlyData = useMemo(() => {
    const data: Record<string, MonthlyData> = {};
    
    // Initialize all months
    MONTHS.forEach(month => {
      data[month] = { month, labaBersih: 0, penjualan: 0, pengeluaran: 0 };
    });

    // Aggregate sales data
    sales
      .filter(sale => new Date(sale.createdAt).getFullYear() === selectedYear)
      .forEach(sale => {
        const monthIndex = new Date(sale.createdAt).getMonth();
        const month = MONTHS[monthIndex];
        
        data[month].labaBersih += sale.netProfit;
        data[month].penjualan += sale.totalSales;
        data[month].pengeluaran += sale.totalHpp + sale.totalAdminFee;
      });

    return MONTHS.map(month => data[month]);
  }, [sales, selectedYear]);

  // Calculate totals for current month
  const currentMonth = new Date().getMonth();
  const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;

  const currentMonthData = monthlyData[currentMonth];
  const previousMonthData = monthlyData[previousMonth];

  const calculatePercentChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / Math.abs(previous)) * 100;
  };

  const summaryCards = [
    {
      title: 'Laba Bersih',
      value: currentMonthData.labaBersih,
      percentChange: calculatePercentChange(currentMonthData.labaBersih, previousMonthData.labaBersih),
      icon: DollarSign,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20',
      gradientFrom: 'from-blue-500/5',
      gradientTo: 'to-blue-600/10',
    },
    {
      title: 'Total Penjualan',
      value: currentMonthData.penjualan,
      percentChange: calculatePercentChange(currentMonthData.penjualan, previousMonthData.penjualan),
      icon: ShoppingCart,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/20',
      gradientFrom: 'from-emerald-500/5',
      gradientTo: 'to-emerald-600/10',
    },
    {
      title: 'Total Pengeluaran',
      value: currentMonthData.pengeluaran,
      percentChange: calculatePercentChange(currentMonthData.pengeluaran, previousMonthData.pengeluaran),
      icon: Wallet,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/20',
      gradientFrom: 'from-amber-500/5',
      gradientTo: 'to-amber-600/10',
      invertTrend: true, // Lower is better for expenses
    },
  ];

  // Calculate yearly totals
  const yearlyTotals = useMemo(() => {
    return monthlyData.reduce(
      (acc, month) => ({
        labaBersih: acc.labaBersih + month.labaBersih,
        penjualan: acc.penjualan + month.penjualan,
        pengeluaran: acc.pengeluaran + month.pengeluaran,
      }),
      { labaBersih: 0, penjualan: 0, pengeluaran: 0 }
    );
  }, [monthlyData]);

  return (
    <div className="space-y-6">
      {/* Header with Gradient Background */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary/5 via-background to-emerald-500/5 border border-border/50 p-4 md:p-5">
        <div className="absolute inset-0 bg-grid-pattern opacity-5" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
              <span className="text-2xl">📊</span>
              Laporan Keuangan
            </h1>
            <p className="text-muted-foreground text-xs mt-1">
              Ringkasan keuangan bulan {format(new Date(), 'MMMM yyyy', { locale: id })}
            </p>
          </div>
          <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
            <SelectTrigger className="w-[120px] h-9 text-sm bg-background/80 backdrop-blur-sm border-border/50 shadow-sm">
              <SelectValue placeholder="Pilih Tahun" />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map(year => (
                <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards with Glass Effect */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          const isPositive = card.invertTrend ? card.percentChange <= 0 : card.percentChange >= 0;
          const TrendIcon = isPositive ? TrendingUp : TrendingDown;
          
          return (
            <Card 
              key={card.title} 
              className={`relative overflow-hidden backdrop-blur-sm bg-gradient-to-br ${card.gradientFrom} ${card.gradientTo} border ${card.borderColor} shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5`}
            >
              {/* Decorative background element */}
              <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full ${card.bgColor} blur-2xl opacity-50`} />
              
              <CardContent className="relative p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
                      isPositive ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/15 text-red-600 dark:text-red-400'
                    }`}>
                      <TrendIcon className="w-3 h-3" />
                      <span>{card.percentChange >= 0 ? '+' : ''}{card.percentChange.toFixed(1)}%</span>
                    </div>
                    <p className="text-xs font-medium text-muted-foreground">{card.title}</p>
                    <p className={`text-xl md:text-2xl font-bold ${card.color}`}>
                      {formatCurrency(card.value)}
                    </p>
                    <p className="text-[10px] text-muted-foreground/80">dibanding bulan lalu</p>
                  </div>
                  <div className={`p-3 rounded-xl ${card.bgColor} shadow-inner`}>
                    <Icon className={`w-5 h-5 ${card.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Bar Chart with Enhanced Styling */}
      <Card className="shadow-md border-border/50 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-muted/5" />
        <CardHeader className="relative flex flex-row items-center justify-between py-3 px-4 border-b border-border/50 bg-muted/30">
          <div>
            <CardTitle className="text-base font-bold">Grafik Bulanan</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Perbandingan data keuangan per bulan tahun {selectedYear}
            </p>
          </div>
        </CardHeader>
        <CardContent className="relative pt-4 px-4 pb-4">
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" vertical={false} />
                <XAxis 
                  dataKey="month" 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                  tickLine={false}
                />
                <YAxis 
                  tickFormatter={formatCompactCurrency}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={45}
                />
                <Tooltip 
                  formatter={(value: number, name: string) => [formatCurrency(value), name]}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    boxShadow: '0 4px 20px -4px rgba(0, 0, 0, 0.15)',
                    padding: '8px 12px',
                    fontSize: '12px',
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600, marginBottom: '4px', fontSize: '12px' }}
                  cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }}
                />
                <Bar 
                  dataKey="penjualan" 
                  name="Penjualan" 
                  fill={COLORS.penjualan}
                  radius={[4, 4, 0, 0]}
                />
                <Bar 
                  dataKey="labaBersih" 
                  name="Laba Bersih" 
                  fill={COLORS.labaBersih}
                  radius={[4, 4, 0, 0]}
                />
                <Bar 
                  dataKey="pengeluaran" 
                  name="Pengeluaran" 
                  fill={COLORS.pengeluaran}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Custom Legend */}
          <CustomLegend />

          {/* Yearly Summary with Themed Cards */}
          <div className="mt-5 pt-4 border-t border-border/50">
            <h3 className="text-xs font-semibold text-muted-foreground mb-3 text-center">
              Total Keseluruhan Tahun {selectedYear}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20 text-center">
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mb-0.5">Total Penjualan</p>
                <p className="text-lg md:text-xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(yearlyTotals.penjualan)}</p>
              </div>
              <div className="p-3 rounded-lg bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 text-center">
                <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-0.5">Total Laba Bersih</p>
                <p className="text-lg md:text-xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(yearlyTotals.labaBersih)}</p>
              </div>
              <div className="p-3 rounded-lg bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20 text-center">
                <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mb-0.5">Total Pengeluaran</p>
                <p className="text-lg md:text-xl font-bold text-amber-600 dark:text-amber-400">{formatCurrency(yearlyTotals.pengeluaran)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Details Table */}
      <Card className="shadow-md border-border/50 overflow-hidden">
        <CardHeader className="py-3 px-4 border-b border-border/50 bg-muted/30">
          <CardTitle className="text-base font-bold">Rincian Per Bulan - {selectedYear}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/20 hover:bg-muted/20">
                  <TableHead className="text-xs font-semibold text-muted-foreground w-[120px]">Bulan</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground text-right">Penjualan</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground text-right">Laba Bersih</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground text-right">Pengeluaran</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground text-right">Saldo Bersih</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monthlyData.map((data, index) => {
                  const saldoBersih = data.penjualan - data.pengeluaran;
                  const hasData = data.penjualan > 0 || data.labaBersih > 0 || data.pengeluaran > 0;
                  
                  if (!hasData) return null;
                  
                  return (
                    <TableRow key={data.month} className="hover:bg-muted/10">
                      <TableCell className="text-sm font-medium">{MONTHS_FULL[index]}</TableCell>
                      <TableCell className="text-sm text-right text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(data.penjualan)}
                      </TableCell>
                      <TableCell className="text-sm text-right text-blue-600 dark:text-blue-400">
                        {formatCurrency(data.labaBersih)}
                      </TableCell>
                      <TableCell className="text-sm text-right text-amber-600 dark:text-amber-400">
                        {formatCurrency(data.pengeluaran)}
                      </TableCell>
                      <TableCell className={`text-sm text-right font-semibold ${saldoBersih >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                        {formatCurrency(saldoBersih)}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {/* Total Row */}
                <TableRow className="bg-muted/30 hover:bg-muted/30 border-t-2 border-border">
                  <TableCell className="text-sm font-bold">Total</TableCell>
                  <TableCell className="text-sm text-right font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(yearlyTotals.penjualan)}
                  </TableCell>
                  <TableCell className="text-sm text-right font-bold text-blue-600 dark:text-blue-400">
                    {formatCurrency(yearlyTotals.labaBersih)}
                  </TableCell>
                  <TableCell className="text-sm text-right font-bold text-amber-600 dark:text-amber-400">
                    {formatCurrency(yearlyTotals.pengeluaran)}
                  </TableCell>
                  <TableCell className={`text-sm text-right font-bold ${(yearlyTotals.penjualan - yearlyTotals.pengeluaran) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                    {formatCurrency(yearlyTotals.penjualan - yearlyTotals.pengeluaran)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
