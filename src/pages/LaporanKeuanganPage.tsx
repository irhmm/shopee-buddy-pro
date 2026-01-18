import { useMemo, useState, useEffect, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRealtimeSubscription } from '@/hooks/use-realtime';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pagination } from '@/components/Pagination';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Wallet, Info, CheckCircle2, Clock, Receipt, Target, ChevronDown, ChevronUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { CalculationGuide } from '@/components/CalculationGuide';

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
  hpp: number;
  biayaAdmin: number;
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
  const { franchiseId } = useAuth();
  const queryClient = useQueryClient();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  
  // State untuk filter dan pagination Riwayat Bagi Hasil
  const [filterYearBagiHasil, setFilterYearBagiHasil] = useState<number | 'all'>('all');
  const [filterStatusBagiHasil, setFilterStatusBagiHasil] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [currentPageBagiHasil, setCurrentPageBagiHasil] = useState(1);
  const ITEMS_PER_PAGE_BAGI_HASIL = 6;
  const [showLabaRealBreakdown, setShowLabaRealBreakdown] = useState(false);
  
  // State untuk animasi goyang card Riwayat Bagi Hasil
  const [isShaking, setIsShaking] = useState(false);

  // Fetch profit sharing payments
  const { data: profitSharingPayments = [], isLoading: isLoadingPayments } = useQuery({
    queryKey: ['profit-sharing-payments', franchiseId],
    queryFn: async () => {
      if (!franchiseId) return [];
      
      const { data, error } = await supabase
        .from('profit_sharing_payments')
        .select('*')
        .eq('franchise_id', franchiseId)
        .order('period_year', { ascending: false })
        .order('period_month', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!franchiseId,
  });

  // Callback for realtime updates
  const refetchPayments = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['profit-sharing-payments', franchiseId] });
  }, [queryClient, franchiseId]);

  // Realtime subscription for profit sharing payments
  useRealtimeSubscription(
    [
      { 
        table: 'profit_sharing_payments', 
        filter: franchiseId ? `franchise_id=eq.${franchiseId}` : undefined,
        onDataChange: refetchPayments 
      },
    ],
    !!franchiseId
  );

  // Fetch expenditures data
  const { data: expenditures = [] } = useQuery({
    queryKey: ['expenditures', franchiseId],
    queryFn: async () => {
      if (!franchiseId) return [];
      const { data, error } = await supabase
        .from('expenditures')
        .select('*')
        .eq('franchise_id', franchiseId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!franchiseId,
  });

  // Realtime subscription for expenditures
  const refetchExpenditures = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['expenditures', franchiseId] });
  }, [queryClient, franchiseId]);

  useRealtimeSubscription(
    [
      { 
        table: 'expenditures', 
        filter: franchiseId ? `franchise_id=eq.${franchiseId}` : undefined,
        onDataChange: refetchExpenditures 
      },
    ],
    !!franchiseId
  );

  // Hitung tahun yang tersedia dari data profit sharing
  const availableYearsBagiHasil = useMemo(() => {
    const years = [...new Set(profitSharingPayments.map(p => p.period_year))];
    return years.sort((a, b) => b - a);
  }, [profitSharingPayments]);

  // Filter data berdasarkan tahun DAN status
  const filteredPayments = useMemo(() => {
    let result = profitSharingPayments;
    
    // Filter by year
    if (filterYearBagiHasil !== 'all') {
      result = result.filter(p => p.period_year === filterYearBagiHasil);
    }
    
    // Filter by status
    if (filterStatusBagiHasil !== 'all') {
      result = result.filter(p => 
        filterStatusBagiHasil === 'paid' ? p.payment_status === 'paid' : p.payment_status !== 'paid'
      );
    }
    
    return result;
  }, [profitSharingPayments, filterYearBagiHasil, filterStatusBagiHasil]);

  // Pagination
  const totalPagesBagiHasil = Math.ceil(filteredPayments.length / ITEMS_PER_PAGE_BAGI_HASIL);
  const paginatedPayments = useMemo(() => {
    const start = (currentPageBagiHasil - 1) * ITEMS_PER_PAGE_BAGI_HASIL;
    return filteredPayments.slice(start, start + ITEMS_PER_PAGE_BAGI_HASIL);
  }, [filteredPayments, currentPageBagiHasil, ITEMS_PER_PAGE_BAGI_HASIL]);

  // Reset halaman saat filter berubah
  useEffect(() => {
    setCurrentPageBagiHasil(1);
  }, [filterYearBagiHasil, filterStatusBagiHasil]);

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
      data[month] = { month, labaBersih: 0, penjualan: 0, pengeluaran: 0, hpp: 0, biayaAdmin: 0 };
    });

    // Aggregate sales data
    sales
      .filter(sale => new Date(sale.createdAt).getFullYear() === selectedYear)
      .forEach(sale => {
        const monthIndex = new Date(sale.createdAt).getMonth();
        const month = MONTHS[monthIndex];
        
        data[month].labaBersih += sale.netProfit;
        data[month].penjualan += sale.totalSales;
        data[month].hpp += sale.totalHpp;
        data[month].biayaAdmin += sale.totalAdminFee;
      });

    // Aggregate expenditures data (pengeluaran operasional dari tabel expenditures)
    expenditures
      .filter(exp => new Date(exp.expenditure_date).getFullYear() === selectedYear)
      .forEach(exp => {
        const monthIndex = new Date(exp.expenditure_date).getMonth();
        const month = MONTHS[monthIndex];
        data[month].pengeluaran += exp.amount;
      });

    return MONTHS.map(month => data[month]);
  }, [sales, expenditures, selectedYear]);

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

  // Calculate current month operational expenditures
  const currentMonthExpenditures = useMemo(() => {
    const now = new Date();
    const currentMonthNum = now.getMonth();
    const currentYearNum = now.getFullYear();
    
    return expenditures
      .filter(exp => {
        const date = new Date(exp.expenditure_date);
        return date.getMonth() === currentMonthNum && date.getFullYear() === currentYearNum;
      })
      .reduce((sum, exp) => sum + exp.amount, 0);
  }, [expenditures]);

  // Calculate current month profit sharing
  const currentMonthProfitSharing = useMemo(() => {
    const currentMonthNum = new Date().getMonth() + 1; // 1-indexed
    const currentYearNum = new Date().getFullYear();
    
    const payment = profitSharingPayments.find(
      p => p.period_month === currentMonthNum && p.period_year === currentYearNum
    );
    
    return payment?.profit_sharing_amount || 0;
  }, [profitSharingPayments]);

  // Calculate Real Profit (Laba Real)
  // Rumus: Total Penjualan - Total Pengeluaran - Total HPP - Total Biaya Admin - Total Bagi Hasil
  const realProfit = useMemo(() => {
    return currentMonthData.penjualan - currentMonthExpenditures - currentMonthData.hpp - currentMonthData.biayaAdmin - currentMonthProfitSharing;
  }, [currentMonthData, currentMonthExpenditures, currentMonthProfitSharing]);

  // Logic untuk menentukan apakah card Riwayat Bagi Hasil harus goyang
  const shouldShakeCard = useMemo(() => {
    const today = new Date();
    const currentMonthNum = today.getMonth() + 1; // 1-indexed
    const currentYearNum = today.getFullYear();
    const lastDayOfMonth = new Date(currentYearNum, currentMonthNum, 0).getDate();
    const daysUntilEndOfMonth = lastDayOfMonth - today.getDate();
    
    // Cek apakah ada tagihan belum lunas bulan ini
    const hasUnpaidCurrentMonth = profitSharingPayments.some(p => 
      p.period_year === currentYearNum && 
      p.period_month === currentMonthNum && 
      p.payment_status !== 'paid'
    );
    
    // Cek apakah ada tagihan bulan sebelumnya yang belum lunas
    const hasUnpaidPreviousMonths = profitSharingPayments.some(p => {
      const isPastMonth = p.period_year < currentYearNum || 
        (p.period_year === currentYearNum && p.period_month < currentMonthNum);
      return isPastMonth && p.payment_status !== 'paid';
    });
    
    // Goyang jika: (5 hari terakhir bulan DAN ada tagihan belum lunas bulan ini) ATAU ada tagihan bulan lalu belum lunas
    return (daysUntilEndOfMonth <= 5 && hasUnpaidCurrentMonth) || hasUnpaidPreviousMonths;
  }, [profitSharingPayments]);

  // Effect untuk interval animasi goyang
  useEffect(() => {
    if (!shouldShakeCard) {
      setIsShaking(false);
      return;
    }
    
    // Trigger shake setiap 5 detik
    const shakeInterval = setInterval(() => {
      setIsShaking(true);
      // Matikan setelah animasi selesai (600ms)
      setTimeout(() => setIsShaking(false), 600);
    }, 5000);
    
    // Trigger pertama kali
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 600);
    
    return () => clearInterval(shakeInterval);
  }, [shouldShakeCard]);

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

      {/* Calculation Guide */}
      <CalculationGuide showProfitSharing showExpenditure />

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

      {/* Laba Real Card */}
      <Card className={`relative overflow-hidden shadow-lg border-2 ${realProfit >= 0 ? 'border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 via-background to-emerald-600/10' : 'border-red-500/30 bg-gradient-to-br from-red-500/5 via-background to-red-600/10'}`}>
        {/* Decorative background */}
        <div className={`absolute -right-8 -top-8 w-32 h-32 rounded-full ${realProfit >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'} blur-3xl`} />
        <div className={`absolute -left-8 -bottom-8 w-32 h-32 rounded-full ${realProfit >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'} blur-3xl`} />
        
        <CardContent className="relative p-4 md:p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-3 flex-1">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-xl ${realProfit >= 0 ? 'bg-emerald-500/15' : 'bg-red-500/15'} shadow-inner`}>
                  <Target className={`w-5 h-5 ${realProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Laba Real</h3>
                  <p className="text-xs text-muted-foreground">Profit riil setelah semua potongan</p>
                </div>
              </div>
              
              <div className={`text-2xl md:text-3xl font-bold ${realProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                {formatCurrency(realProfit)}
              </div>

              {/* Breakdown - Collapsible */}
              <div className="rounded-lg bg-muted/30 border border-border/50 overflow-hidden">
                <button
                  onClick={() => setShowLabaRealBreakdown(!showLabaRealBreakdown)}
                  className="w-full p-3 flex items-center justify-between text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
                >
                  <span>Lihat Perhitungan</span>
                  {showLabaRealBreakdown ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
                
                {showLabaRealBreakdown && (
                  <div className="px-3 pb-3 space-y-1.5 text-xs border-t border-border/50">
                    <div className="flex justify-between pt-2">
                      <span className="text-muted-foreground">Total Penjualan</span>
                      <span className="font-medium text-emerald-600 dark:text-emerald-400">{formatCurrency(currentMonthData.penjualan)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total HPP</span>
                      <span className="font-medium text-red-600 dark:text-red-400">- {formatCurrency(currentMonthData.hpp)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Biaya Admin</span>
                      <span className="font-medium text-red-600 dark:text-red-400">- {formatCurrency(currentMonthData.biayaAdmin)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Pengeluaran</span>
                      <span className="font-medium text-amber-600 dark:text-amber-400">- {formatCurrency(currentMonthExpenditures)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Bagi Hasil</span>
                      <span className="font-medium text-purple-600 dark:text-purple-400">- {formatCurrency(currentMonthProfitSharing)}</span>
                    </div>
                    <div className="border-t border-border/50 pt-1.5 mt-1.5 flex justify-between">
                      <span className="font-semibold text-foreground">Laba Real</span>
                      <span className={`font-bold ${realProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                        {formatCurrency(realProfit)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bar Chart with Enhanced Styling */}
      <Card className="relative shadow-md border-border/50 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-muted/5 pointer-events-none" />
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
        </CardContent>
      </Card>

      {/* Info Bagi Hasil untuk Franchise */}
      <Card className="bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/50 dark:border-amber-800/50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/50">
              <Info className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                Informasi Bagi Hasil ke Super Admin
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Bagi hasil dihitung dari <strong>Total Penjualan × Persentase Bagi Hasil</strong> yang telah ditetapkan.
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Perhitungan bagi hasil dilakukan berdasarkan total penjualan tanpa potongan HPP atau biaya lainnya. 
                Untuk detail pembayaran bagi hasil, silakan hubungi Super Admin.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card Riwayat Bagi Hasil */}
      <Card className={`shadow-md border-border/50 overflow-hidden ${isShaking ? 'animate-shake' : ''}`}>
        <CardHeader className="py-3 px-4 border-b border-border/50 bg-gradient-to-r from-primary/5 to-purple-500/5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Receipt className="w-4 h-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base font-bold">Riwayat Bagi Hasil</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Status pembayaran bagi hasil ke Super Admin
                </p>
              </div>
            </div>
            
            {/* Filter Container */}
            <div className="flex items-center gap-2">
              {/* Filter Status */}
              <Select
                value={filterStatusBagiHasil}
                onValueChange={(val) => setFilterStatusBagiHasil(val as 'all' | 'paid' | 'unpaid')}
              >
                <SelectTrigger className="w-[130px] h-8 text-xs">
                  <SelectValue placeholder="Filter Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="paid">Lunas</SelectItem>
                  <SelectItem value="unpaid">Belum Dibayar</SelectItem>
                </SelectContent>
              </Select>
              
              {/* Filter Tahun */}
              {availableYearsBagiHasil.length > 0 && (
                <Select
                  value={filterYearBagiHasil.toString()}
                  onValueChange={(val) => setFilterYearBagiHasil(val === 'all' ? 'all' : parseInt(val))}
                >
                  <SelectTrigger className="w-[120px] h-8 text-xs">
                    <SelectValue placeholder="Filter Tahun" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Tahun</SelectItem>
                    {availableYearsBagiHasil.map(year => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoadingPayments ? (
            <div className="p-8 text-center text-muted-foreground">
              Memuat data...
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Receipt className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">
                {filterYearBagiHasil === 'all' && filterStatusBagiHasil === 'all'
                  ? 'Belum ada data bagi hasil' 
                  : `Tidak ada data bagi hasil dengan filter yang dipilih`}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/20 hover:bg-muted/20">
                      <TableHead className="text-xs font-semibold">Periode</TableHead>
                      <TableHead className="text-xs font-semibold text-right">Total Penjualan</TableHead>
                      <TableHead className="text-xs font-semibold text-center">%</TableHead>
                      <TableHead className="text-xs font-semibold text-right">Bagi Hasil</TableHead>
                      <TableHead className="text-xs font-semibold text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedPayments.map((payment) => (
                      <TableRow key={payment.id} className="hover:bg-muted/10">
                        <TableCell className="text-sm font-medium">
                          {MONTHS_FULL[payment.period_month - 1]} {payment.period_year}
                        </TableCell>
                        <TableCell className="text-sm text-right">
                          {formatCurrency(payment.total_revenue || 0)}
                        </TableCell>
                        <TableCell className="text-sm text-center text-muted-foreground">
                          {payment.profit_sharing_percent}%
                        </TableCell>
                        <TableCell className="text-sm text-right font-semibold text-primary">
                          {formatCurrency(payment.profit_sharing_amount || 0)}
                        </TableCell>
                        <TableCell className="text-center">
                          {payment.payment_status === 'paid' ? (
                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Lunas
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
                              <Clock className="w-3 h-3 mr-1" />
                              Belum Dibayar
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              {/* Pagination */}
              {filteredPayments.length > ITEMS_PER_PAGE_BAGI_HASIL && (
                <div className="p-4 border-t border-border/50">
                  <Pagination
                    currentPage={currentPageBagiHasil}
                    totalPages={totalPagesBagiHasil}
                    totalItems={filteredPayments.length}
                    itemsPerPage={ITEMS_PER_PAGE_BAGI_HASIL}
                    onPageChange={setCurrentPageBagiHasil}
                  />
                </div>
              )}
            </>
          )}
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
