import { useState, useEffect, useMemo, Fragment } from 'react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/Pagination';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { 
  Trophy, 
  Package, 
  ShoppingCart, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Search,
  Download,
  BarChart3,
  Medal
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import * as XLSX from 'xlsx';

interface MonthlyProductData {
  month: string;
  [productName: string]: string | number;
}

interface ProductRanking {
  productName: string;
  productCode: string;
  franchiseId: string;
  franchiseName: string;
  totalQuantity: number;
  totalSales: number;
  contributionPercent: number;
  rank: number;
}

interface ProductComparison {
  productName: string;
  productCode: string;
  currentMonth: number;
  previousMonth: number;
  change: number;
  changePercent: number;
  trend: 'up' | 'down' | 'stable';
}

const MONTHS = [
  { value: 1, label: 'Januari' },
  { value: 2, label: 'Februari' },
  { value: 3, label: 'Maret' },
  { value: 4, label: 'April' },
  { value: 5, label: 'Mei' },
  { value: 6, label: 'Juni' },
  { value: 7, label: 'Juli' },
  { value: 8, label: 'Agustus' },
  { value: 9, label: 'September' },
  { value: 10, label: 'Oktober' },
  { value: 11, label: 'November' },
  { value: 12, label: 'Desember' },
];

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export default function ProductPerformance() {
  // Filter states
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedFranchise, setSelectedFranchise] = useState<string>('all');
  const [topN, setTopN] = useState<number>(10);

  // Data states
  const [productRankings, setProductRankings] = useState<ProductRanking[]>([]);
  const [previousMonthData, setPreviousMonthData] = useState<ProductRanking[]>([]);
  const [franchises, setFranchises] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthlyTrendData, setMonthlyTrendData] = useState<MonthlyProductData[]>([]);
  const [topProductNames, setTopProductNames] = useState<string[]>([]);

  // Search & Pagination
  const [searchProduct, setSearchProduct] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 25;

  // Get available years
  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => currentYear - i);
  }, []);

  // Fetch data
  useEffect(() => {
    fetchData();
  }, [selectedMonth, selectedYear, selectedFranchise]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch franchises
      const { data: franchiseData } = await supabase
        .from('franchises')
        .select('id, name')
        .order('name');
      
      setFranchises(franchiseData || []);

      // Calculate date range for current month
      const startDate = startOfMonth(new Date(selectedYear, selectedMonth - 1));
      const endDate = endOfMonth(new Date(selectedYear, selectedMonth - 1));

      // Calculate date range for previous month
      const prevMonthDate = subMonths(startDate, 1);
      const prevStartDate = startOfMonth(prevMonthDate);
      const prevEndDate = endOfMonth(prevMonthDate);

      // Fetch current month sales
      let salesQuery = supabase
        .from('sales')
        .select('product_name, product_code, quantity, total_sales, franchise_id')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (selectedFranchise !== 'all') {
        salesQuery = salesQuery.eq('franchise_id', selectedFranchise);
      }

      const { data: salesData } = await salesQuery;

      // Fetch previous month sales
      let prevSalesQuery = supabase
        .from('sales')
        .select('product_name, product_code, quantity, total_sales, franchise_id')
        .gte('created_at', prevStartDate.toISOString())
        .lte('created_at', prevEndDate.toISOString());

      if (selectedFranchise !== 'all') {
        prevSalesQuery = prevSalesQuery.eq('franchise_id', selectedFranchise);
      }

      const { data: prevSalesData } = await prevSalesQuery;

      // Aggregate current month data
      const aggregated: Record<string, {
        productName: string;
        productCode: string;
        franchiseId: string;
        totalQuantity: number;
        totalSales: number;
      }> = {};

      (salesData || []).forEach(sale => {
        const key = `${sale.product_name}-${sale.product_code}-${sale.franchise_id}`;
        if (!aggregated[key]) {
          aggregated[key] = {
            productName: sale.product_name,
            productCode: sale.product_code,
            franchiseId: sale.franchise_id,
            totalQuantity: 0,
            totalSales: 0,
          };
        }
        aggregated[key].totalQuantity += sale.quantity;
        aggregated[key].totalSales += Number(sale.total_sales);
      });

      // Calculate total quantity for contribution percentage
      const totalQty = Object.values(aggregated).reduce((sum, item) => sum + item.totalQuantity, 0);

      // Sort by quantity and add rank
      const ranked: ProductRanking[] = Object.values(aggregated)
        .sort((a, b) => b.totalQuantity - a.totalQuantity)
        .map((item, index) => ({
          ...item,
          franchiseName: franchiseData?.find(f => f.id === item.franchiseId)?.name || 'Unknown',
          rank: index + 1,
          contributionPercent: totalQty > 0 ? (item.totalQuantity / totalQty) * 100 : 0,
        }));

      setProductRankings(ranked);

      // Aggregate previous month data
      const prevAggregated: Record<string, {
        productName: string;
        productCode: string;
        franchiseId: string;
        totalQuantity: number;
        totalSales: number;
      }> = {};

      (prevSalesData || []).forEach(sale => {
        const key = `${sale.product_name}-${sale.product_code}-${sale.franchise_id}`;
        if (!prevAggregated[key]) {
          prevAggregated[key] = {
            productName: sale.product_name,
            productCode: sale.product_code,
            franchiseId: sale.franchise_id,
            totalQuantity: 0,
            totalSales: 0,
          };
        }
        prevAggregated[key].totalQuantity += sale.quantity;
        prevAggregated[key].totalSales += Number(sale.total_sales);
      });

      const prevTotalQty = Object.values(prevAggregated).reduce((sum, item) => sum + item.totalQuantity, 0);

      const prevRanked: ProductRanking[] = Object.values(prevAggregated)
        .sort((a, b) => b.totalQuantity - a.totalQuantity)
        .map((item, index) => ({
          ...item,
          franchiseName: franchiseData?.find(f => f.id === item.franchiseId)?.name || 'Unknown',
          rank: index + 1,
          contributionPercent: prevTotalQty > 0 ? (item.totalQuantity / prevTotalQty) * 100 : 0,
        }));

      setPreviousMonthData(prevRanked);

      // Fetch 12 months trend data for line chart
      const endDateTrend = endOfMonth(new Date(selectedYear, selectedMonth - 1));
      const startDateTrend = startOfMonth(subMonths(endDateTrend, 11));

      let trendSalesQuery = supabase
        .from('sales')
        .select('product_name, product_code, quantity, created_at, franchise_id')
        .gte('created_at', startDateTrend.toISOString())
        .lte('created_at', endDateTrend.toISOString());

      if (selectedFranchise !== 'all') {
        trendSalesQuery = trendSalesQuery.eq('franchise_id', selectedFranchise);
      }

      const { data: trendSalesData } = await trendSalesQuery;

      // Aggregate by product across all 12 months to find top 5
      const productTotals: Record<string, { name: string; total: number }> = {};
      (trendSalesData || []).forEach(sale => {
        const key = sale.product_name;
        if (!productTotals[key]) {
          productTotals[key] = { name: sale.product_name, total: 0 };
        }
        productTotals[key].total += sale.quantity;
      });

      // Get top 5 product names
      const top5Products = Object.values(productTotals)
        .sort((a, b) => b.total - a.total)
        .slice(0, 5)
        .map(p => p.name);

      setTopProductNames(top5Products);

      // Build monthly data for each of the 12 months
      const monthlyData: MonthlyProductData[] = [];
      for (let i = 11; i >= 0; i--) {
        const monthDate = subMonths(endDateTrend, i);
        const monthStart = startOfMonth(monthDate);
        const monthEnd = endOfMonth(monthDate);
        const monthLabel = format(monthDate, 'MMM yy', { locale: localeId });

        // Filter sales for this month
        const monthSales = (trendSalesData || []).filter(sale => {
          const saleDate = new Date(sale.created_at);
          return saleDate >= monthStart && saleDate <= monthEnd;
        });

        // Aggregate by product for this month
        const monthAgg: Record<string, number> = {};
        monthSales.forEach(sale => {
          if (!monthAgg[sale.product_name]) {
            monthAgg[sale.product_name] = 0;
          }
          monthAgg[sale.product_name] += sale.quantity;
        });

        // Create data point with top 5 products
        const dataPoint: MonthlyProductData = { month: monthLabel };
        top5Products.forEach(productName => {
          dataPoint[productName] = monthAgg[productName] || 0;
        });

        monthlyData.push(dataPoint);
      }

      setMonthlyTrendData(monthlyData);

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter by search
  const filteredRankings = useMemo(() => {
    if (!searchProduct) return productRankings;
    const search = searchProduct.toLowerCase();
    return productRankings.filter(p =>
      p.productName.toLowerCase().includes(search) ||
      p.productCode.toLowerCase().includes(search) ||
      p.franchiseName.toLowerCase().includes(search)
    );
  }, [productRankings, searchProduct]);

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchProduct]);

  // Paginate rankings
  const totalPages = Math.ceil(filteredRankings.length / ITEMS_PER_PAGE);
  const paginatedRankings = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredRankings.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredRankings, currentPage]);

  // Top N for chart
  const topProducts = useMemo(() => {
    return productRankings.slice(0, topN);
  }, [productRankings, topN]);

  // Comparison data
  const comparisonData = useMemo(() => {
    const comparisons: ProductComparison[] = [];
    
    productRankings.slice(0, 10).forEach(current => {
      const prev = previousMonthData.find(
        p => p.productName === current.productName && 
             p.productCode === current.productCode &&
             p.franchiseId === current.franchiseId
      );
      
      const prevQty = prev?.totalQuantity || 0;
      const change = current.totalQuantity - prevQty;
      const changePercent = prevQty > 0 ? (change / prevQty) * 100 : (current.totalQuantity > 0 ? 100 : 0);
      
      comparisons.push({
        productName: current.productName,
        productCode: current.productCode,
        currentMonth: current.totalQuantity,
        previousMonth: prevQty,
        change,
        changePercent,
        trend: change > 0 ? 'up' : change < 0 ? 'down' : 'stable',
      });
    });
    
    return comparisons;
  }, [productRankings, previousMonthData]);

  // Summary stats
  const summaryStats = useMemo(() => {
    const topProduct = productRankings[0];
    const totalProducts = productRankings.length;
    const totalSold = productRankings.reduce((sum, p) => sum + p.totalQuantity, 0);
    const totalRevenue = productRankings.reduce((sum, p) => sum + p.totalSales, 0);
    
    return { topProduct, totalProducts, totalSold, totalRevenue };
  }, [productRankings]);

  // Export to Excel
  const handleExport = () => {
    const exportData = productRankings.map(p => ({
      'Rank': p.rank,
      'Produk': p.productName,
      'Kode': p.productCode,
      'Franchise': p.franchiseName,
      'Qty Terjual': p.totalQuantity,
      'Total Omzet': p.totalSales,
      'Kontribusi (%)': p.contributionPercent.toFixed(2),
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Performa Produk');
    XLSX.writeFile(wb, `Performa_Produk_${MONTHS[selectedMonth - 1].label}_${selectedYear}.xlsx`);
  };

  // Line chart colors
  const lineColors = [
    '#ef4444', // red
    '#22c55e', // green
    '#f97316', // orange
    '#3b82f6', // blue
    '#a855f7', // purple
  ];

  const getRankBadge = (rank: number) => {
    if (rank === 1) return <span className="text-lg">🥇</span>;
    if (rank === 2) return <span className="text-lg">🥈</span>;
    if (rank === 3) return <span className="text-lg">🥉</span>;
    return <span className="text-sm font-medium text-muted-foreground">{rank}</span>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Trophy className="w-7 h-7 text-primary" />
            Performa Produk
          </h1>
          <p className="text-muted-foreground mt-1">
            Analisis produk terlaris dari semua franchise berdasarkan jumlah terjual
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Bulan" />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map(m => (
                <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
            <SelectTrigger className="w-[100px]">
              <SelectValue placeholder="Tahun" />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map(y => (
                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedFranchise} onValueChange={setSelectedFranchise}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Franchise" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Franchise</SelectItem>
              {franchises.map(f => (
                <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={topN.toString()} onValueChange={(v) => setTopN(parseInt(v))}>
            <SelectTrigger className="w-[100px]">
              <SelectValue placeholder="Top N" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">Top 5</SelectItem>
              <SelectItem value="10">Top 10</SelectItem>
              <SelectItem value="20">Top 20</SelectItem>
              <SelectItem value="50">Top 50</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-yellow-500/20">
                <Trophy className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">🏆 #1 Terlaris</p>
                <p className="font-bold text-foreground truncate">
                  {summaryStats.topProduct?.productName || '-'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {summaryStats.topProduct ? `${summaryStats.topProduct.totalQuantity} unit` : '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <Package className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Produk</p>
                <p className="text-2xl font-bold text-foreground">{summaryStats.totalProducts}</p>
                <p className="text-sm text-muted-foreground">produk terjual</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10">
                <ShoppingCart className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Terjual</p>
                <p className="text-2xl font-bold text-foreground">
                  {summaryStats.totalSold.toLocaleString('id-ID')}
                </p>
                <p className="text-sm text-muted-foreground">unit</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-500/10">
                <BarChart3 className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Omzet</p>
                <p className="text-xl font-bold text-foreground">
                  {formatCurrency(summaryStats.totalRevenue)}
                </p>
                <p className="text-sm text-muted-foreground">bulan ini</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Line Chart - 12 Month Trend */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Medal className="w-5 h-5 text-primary" />
            Grafik Trend Penjualan Produk (12 Bulan Terakhir)
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Trend penjualan 5 produk terlaris dalam 12 bulan terakhir
          </p>
        </CardHeader>
        <CardContent>
          {monthlyTrendData.length > 0 && topProductNames.length > 0 ? (
            <div className="h-[300px] md:h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={monthlyTrendData}
                  margin={{ top: 20, right: 30, left: 0, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontSize: 11 }}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <YAxis 
                    tick={{ fontSize: 11 }}
                    stroke="hsl(var(--muted-foreground))"
                    tickFormatter={(value) => 
                      value >= 1000 ? `${(value / 1000).toFixed(0)}K` : value.toString()
                    }
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => [`${value} unit`, name]}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ fontWeight: 'bold' }}
                  />
                  <Legend />
                  {topProductNames.map((productName, index) => (
                    <Line
                      key={productName}
                      type="monotone"
                      dataKey={productName}
                      stroke={lineColors[index]}
                      strokeWidth={2}
                      dot={{ fill: lineColors[index], strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-muted-foreground">
              Tidak ada data untuk periode ini
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rankings Table */}
      <Card>
        <CardHeader className="pb-3 border-b border-border">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-base font-bold">📋 Tabel Ranking Produk</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Cari produk..."
                value={searchProduct}
                onChange={(e) => setSearchProduct(e.target.value)}
                className="pl-9 w-full sm:w-[250px]"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/30">
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground text-sm w-16">Rank</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-sm">Produk</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-sm">Kode</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-sm">Franchise</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground text-sm">Qty Terjual</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground text-sm">Total Omzet</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground text-sm">Kontribusi</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRankings.length > 0 ? (
                  paginatedRankings.map((product) => (
                    <tr key={`${product.productCode}-${product.franchiseId}`} className="border-t border-border hover:bg-muted/10">
                      <td className="text-center px-4 py-3">{getRankBadge(product.rank)}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{product.productName}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-muted-foreground">{product.productCode}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-muted-foreground">{product.franchiseName}</span>
                      </td>
                      <td className="text-right px-4 py-3">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-secondary text-sm font-semibold">
                          {product.totalQuantity}
                        </span>
                      </td>
                      <td className="text-right px-4 py-3 text-sm font-medium">
                        {formatCurrency(product.totalSales)}
                      </td>
                      <td className="text-right px-4 py-3">
                        <span className="text-sm font-medium text-primary">
                          {product.contributionPercent.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-muted-foreground">
                      {searchProduct ? 'Tidak ada produk yang cocok' : 'Tidak ada data untuk periode ini'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {filteredRankings.length > ITEMS_PER_PAGE && (
            <div className="px-4 py-4 border-t border-border">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filteredRankings.length}
                itemsPerPage={ITEMS_PER_PAGE}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Comparison Table */}
      <Card>
        <CardHeader className="pb-3 border-b border-border">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Perbandingan dengan Bulan Sebelumnya (Top 10)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/30">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-sm">Produk</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground text-sm">Bulan Ini</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground text-sm">Bulan Lalu</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground text-sm">Perubahan</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground text-sm">Trend</th>
                </tr>
              </thead>
              <tbody>
                {comparisonData.length > 0 ? (
                  comparisonData.map((item, index) => (
                    <tr key={index} className="border-t border-border hover:bg-muted/10">
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{item.productName}</p>
                        <p className="text-xs text-muted-foreground">{item.productCode}</p>
                      </td>
                      <td className="text-right px-4 py-3">
                        <span className="font-semibold">{item.currentMonth}</span>
                      </td>
                      <td className="text-right px-4 py-3 text-muted-foreground">
                        {item.previousMonth}
                      </td>
                      <td className="text-right px-4 py-3">
                        <span className={`font-medium ${
                          item.change > 0 ? 'text-emerald-500' : 
                          item.change < 0 ? 'text-destructive' : 'text-muted-foreground'
                        }`}>
                          {item.change > 0 ? '+' : ''}{item.change} ({item.changePercent.toFixed(1)}%)
                        </span>
                      </td>
                      <td className="text-center px-4 py-3">
                        {item.trend === 'up' && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-medium">
                            <TrendingUp className="w-3 h-3" /> Naik
                          </span>
                        )}
                        {item.trend === 'down' && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-destructive/10 text-destructive text-xs font-medium">
                            <TrendingDown className="w-3 h-3" /> Turun
                          </span>
                        )}
                        {item.trend === 'stable' && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-muted text-muted-foreground text-xs font-medium">
                            <Minus className="w-3 h-3" /> Stabil
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-muted-foreground">
                      Tidak ada data perbandingan
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
