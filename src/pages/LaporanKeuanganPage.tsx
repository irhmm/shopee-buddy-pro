import { useMemo, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Wallet } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

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
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      title: 'Total Penjualan',
      value: currentMonthData.penjualan,
      percentChange: calculatePercentChange(currentMonthData.penjualan, previousMonthData.penjualan),
      icon: ShoppingCart,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Total Pengeluaran',
      value: currentMonthData.pengeluaran,
      percentChange: calculatePercentChange(currentMonthData.pengeluaran, previousMonthData.pengeluaran),
      icon: Wallet,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">📊 Laporan Keuangan</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Ringkasan keuangan bulan {format(new Date(), 'MMMM yyyy', { locale: id })}
          </p>
        </div>
        <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Pilih Tahun" />
          </SelectTrigger>
          <SelectContent>
            {availableYears.map(year => (
              <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          const isPositive = card.invertTrend ? card.percentChange <= 0 : card.percentChange >= 0;
          const TrendIcon = isPositive ? TrendingUp : TrendingDown;
          
          return (
            <Card key={card.title} className="relative overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
                      isPositive ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
                    }`}>
                      <TrendIcon className="w-3 h-3" />
                      <span>{card.percentChange >= 0 ? '+' : ''}{card.percentChange.toFixed(1)}%</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{card.title}</p>
                    <p className={`text-2xl font-bold ${card.color}`}>
                      {formatCurrency(card.value)}
                    </p>
                    <p className="text-xs text-muted-foreground">vs bulan lalu</p>
                  </div>
                  <div className={`p-3 rounded-xl ${card.bgColor}`}>
                    <Icon className={`w-6 h-6 ${card.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Bar Chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-lg">Grafik Bulanan</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Total data per bulan {selectedYear}
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                />
                <YAxis 
                  tickFormatter={formatCompactCurrency}
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: '20px' }}
                />
                <Bar 
                  dataKey="penjualan" 
                  name="Penjualan" 
                  fill="hsl(var(--primary))" 
                  radius={[4, 4, 0, 0]}
                />
                <Bar 
                  dataKey="labaBersih" 
                  name="Laba Bersih" 
                  fill="hsl(var(--success))" 
                  radius={[4, 4, 0, 0]}
                />
                <Bar 
                  dataKey="pengeluaran" 
                  name="Pengeluaran" 
                  fill="hsl(var(--destructive))" 
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Yearly Summary */}
          <div className="mt-6 pt-4 border-t border-border">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-sm text-muted-foreground">Total Penjualan {selectedYear}</p>
                <p className="text-lg font-bold text-primary">{formatCurrency(yearlyTotals.penjualan)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Laba Bersih {selectedYear}</p>
                <p className="text-lg font-bold text-success">{formatCurrency(yearlyTotals.labaBersih)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Pengeluaran {selectedYear}</p>
                <p className="text-lg font-bold text-destructive">{formatCurrency(yearlyTotals.pengeluaran)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
