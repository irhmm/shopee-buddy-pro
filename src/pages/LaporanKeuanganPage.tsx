import { useMemo, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Wallet } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

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
  <div className="flex flex-wrap justify-center gap-4 mt-6">
    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20">
      <div className="w-3 h-3 rounded-full bg-emerald-500" />
      <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Penjualan</span>
    </div>
    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20">
      <div className="w-3 h-3 rounded-full bg-blue-500" />
      <span className="text-sm font-medium text-blue-600 dark:text-blue-400">Laba Bersih</span>
    </div>
    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20">
      <div className="w-3 h-3 rounded-full bg-amber-500" />
      <span className="text-sm font-medium text-amber-600 dark:text-amber-400">Pengeluaran</span>
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
    <div className="space-y-8">
      {/* Header with Gradient Background */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/5 via-background to-emerald-500/5 border border-border/50 p-6 md:p-8">
        <div className="absolute inset-0 bg-grid-pattern opacity-5" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-3">
              <span className="text-3xl">📊</span>
              Laporan Keuangan
            </h1>
            <p className="text-muted-foreground text-sm mt-2">
              Ringkasan keuangan bulan {format(new Date(), 'MMMM yyyy', { locale: id })}
            </p>
          </div>
          <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
            <SelectTrigger className="w-[140px] bg-background/80 backdrop-blur-sm border-border/50 shadow-sm">
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          const isPositive = card.invertTrend ? card.percentChange <= 0 : card.percentChange >= 0;
          const TrendIcon = isPositive ? TrendingUp : TrendingDown;
          
          return (
            <Card 
              key={card.title} 
              className={`relative overflow-hidden backdrop-blur-sm bg-gradient-to-br ${card.gradientFrom} ${card.gradientTo} border ${card.borderColor} shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1`}
            >
              {/* Decorative background element */}
              <div className={`absolute -right-8 -top-8 w-32 h-32 rounded-full ${card.bgColor} blur-2xl opacity-50`} />
              
              <CardContent className="relative p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-3">
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
                      isPositive ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/15 text-red-600 dark:text-red-400'
                    }`}>
                      <TrendIcon className="w-3.5 h-3.5" />
                      <span>{card.percentChange >= 0 ? '+' : ''}{card.percentChange.toFixed(1)}%</span>
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                    <p className={`text-2xl md:text-3xl font-bold ${card.color}`}>
                      {formatCurrency(card.value)}
                    </p>
                    <p className="text-xs text-muted-foreground/80">dibanding bulan lalu</p>
                  </div>
                  <div className={`p-4 rounded-2xl ${card.bgColor} shadow-inner`}>
                    <Icon className={`w-7 h-7 ${card.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Bar Chart with Enhanced Styling */}
      <Card className="shadow-lg border-border/50 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-muted/5" />
        <CardHeader className="relative flex flex-row items-center justify-between pb-2 border-b border-border/50 bg-muted/30">
          <div>
            <CardTitle className="text-xl font-bold">Grafik Bulanan</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Perbandingan data keuangan per bulan tahun {selectedYear}
            </p>
          </div>
        </CardHeader>
        <CardContent className="relative pt-6">
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" vertical={false} />
                <XAxis 
                  dataKey="month" 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                  tickLine={false}
                />
                <YAxis 
                  tickFormatter={formatCompactCurrency}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip 
                  formatter={(value: number, name: string) => [formatCurrency(value), name]}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '12px',
                    boxShadow: '0 10px 40px -10px rgba(0, 0, 0, 0.2)',
                    padding: '12px 16px',
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600, marginBottom: '8px' }}
                  cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }}
                />
                <Bar 
                  dataKey="penjualan" 
                  name="Penjualan" 
                  fill={COLORS.penjualan}
                  radius={[6, 6, 0, 0]}
                />
                <Bar 
                  dataKey="labaBersih" 
                  name="Laba Bersih" 
                  fill={COLORS.labaBersih}
                  radius={[6, 6, 0, 0]}
                />
                <Bar 
                  dataKey="pengeluaran" 
                  name="Pengeluaran" 
                  fill={COLORS.pengeluaran}
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Custom Legend */}
          <CustomLegend />

          {/* Yearly Summary with Themed Cards */}
          <div className="mt-8 pt-6 border-t border-border/50">
            <h3 className="text-sm font-semibold text-muted-foreground mb-4 text-center">
              Total Keseluruhan Tahun {selectedYear}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20 text-center">
                <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium mb-1">Total Penjualan</p>
                <p className="text-xl md:text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(yearlyTotals.penjualan)}</p>
              </div>
              <div className="p-5 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 text-center">
                <p className="text-sm text-blue-600 dark:text-blue-400 font-medium mb-1">Total Laba Bersih</p>
                <p className="text-xl md:text-2xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(yearlyTotals.labaBersih)}</p>
              </div>
              <div className="p-5 rounded-xl bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20 text-center">
                <p className="text-sm text-amber-600 dark:text-amber-400 font-medium mb-1">Total Pengeluaran</p>
                <p className="text-xl md:text-2xl font-bold text-amber-600 dark:text-amber-400">{formatCurrency(yearlyTotals.pengeluaran)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
