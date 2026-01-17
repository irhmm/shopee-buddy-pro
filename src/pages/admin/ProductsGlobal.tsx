import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/Pagination';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Package, Search, Download, Store, TrendingUp, Users, ArrowUpDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import * as XLSX from 'xlsx';

interface ProductWithFranchise {
  id: string;
  name: string;
  code: string;
  hpp: number;
  price: number;
  franchiseId: string;
  franchiseName: string;
  createdAt: string;
}

interface Franchise {
  id: string;
  name: string;
}

const ITEMS_PER_PAGE = 25;

export default function ProductsGlobal() {
  const [products, setProducts] = useState<ProductWithFranchise[]>([]);
  const [franchises, setFranchises] = useState<Franchise[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterFranchise, setFilterFranchise] = useState<string>('all');
  const [sortMargin, setSortMargin] = useState<'default' | 'highest' | 'lowest'>('default');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch franchises
      const { data: franchisesData } = await supabase
        .from('franchises')
        .select('id, name')
        .order('name');

      setFranchises(franchisesData || []);

      // Fetch products with franchise info
      const { data: productsData, error } = await supabase
        .from('products')
        .select(`
          id,
          name,
          code,
          hpp,
          price,
          franchise_id,
          created_at,
          franchises!inner (
            name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedProducts: ProductWithFranchise[] = (productsData || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        code: p.code,
        hpp: p.hpp,
        price: p.price,
        franchiseId: p.franchise_id,
        franchiseName: p.franchises?.name || 'Unknown',
        createdAt: p.created_at,
      }));

      setProducts(formattedProducts);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter, search, and sort products
  const filteredProducts = useMemo(() => {
    let result = products;

    // Filter by franchise
    if (filterFranchise !== 'all') {
      result = result.filter((p) => p.franchiseId === filterFranchise);
    }

    // Search by name or code
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.code.toLowerCase().includes(query)
      );
    }

    // Sort by margin
    if (sortMargin !== 'default') {
      result = [...result].sort((a, b) => {
        const marginA = a.price > 0 ? ((a.price - a.hpp) / a.price) * 100 : 0;
        const marginB = b.price > 0 ? ((b.price - b.hpp) / b.price) * 100 : 0;
        return sortMargin === 'highest' ? marginB - marginA : marginA - marginB;
      });
    }

    return result;
  }, [products, filterFranchise, searchQuery, sortMargin]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterFranchise, searchQuery, sortMargin]);

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Summary stats
  const summary = useMemo(() => {
    const avgMargin =
      filteredProducts.length > 0
        ? filteredProducts.reduce((sum, p) => {
            const margin = p.price > 0 ? ((p.price - p.hpp) / p.price) * 100 : 0;
            return sum + margin;
          }, 0) / filteredProducts.length
        : 0;

    const uniqueFranchises = new Set(filteredProducts.map((p) => p.franchiseId)).size;

    return {
      totalProducts: filteredProducts.length,
      avgMargin: avgMargin.toFixed(1),
      totalFranchises: uniqueFranchises,
    };
  }, [filteredProducts]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const exportToExcel = () => {
    const exportData = filteredProducts.map((p, index) => {
      const margin = p.price > 0 ? ((p.price - p.hpp) / p.price) * 100 : 0;
      return {
        No: index + 1,
        'Nama Produk': p.name,
        Kode: p.code,
        HPP: p.hpp,
        'Harga Jual': p.price,
        'Margin (%)': margin.toFixed(1),
        Franchise: p.franchiseName,
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Produk');
    XLSX.writeFile(wb, `Produk_Semua_Franchise_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="page-header">
          <h1 className="page-title">Produk Semua Franchise</h1>
          <p className="page-subtitle">Lihat semua produk dari seluruh franchise</p>
        </div>
        <div className="table-container">
          <LoadingSpinner message="Memuat data produk..." />
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">Produk Semua Franchise</h1>
        <p className="page-subtitle">Lihat semua produk dari seluruh franchise</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={filterFranchise} onValueChange={setFilterFranchise}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Filter Franchise" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Franchise</SelectItem>
            {franchises.map((f) => (
              <SelectItem key={f.id} value={f.id}>
                {f.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sortMargin} onValueChange={(val) => setSortMargin(val as 'default' | 'highest' | 'lowest')}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <ArrowUpDown className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Urutkan Margin" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">Default</SelectItem>
            <SelectItem value="highest">Margin Terbesar</SelectItem>
            <SelectItem value="lowest">Margin Terkecil</SelectItem>
          </SelectContent>
        </Select>

        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari nama atau kode produk..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Button onClick={exportToExcel} variant="outline" className="gap-2">
          <Download size={16} />
          Export Excel
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/20">
              <Package className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Produk</p>
              <p className="text-2xl font-bold text-foreground">{summary.totalProducts}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-green-500/20">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Rata-rata Margin</p>
              <p className="text-2xl font-bold text-foreground">{summary.avgMargin}%</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-violet-500/10 to-violet-500/5 border-violet-500/20">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-violet-500/20">
              <Users className="w-6 h-6 text-violet-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Franchise</p>
              <p className="text-2xl font-bold text-foreground">{summary.totalFranchises}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Products Table */}
      <div className="table-container">
        {filteredProducts.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-secondary flex items-center justify-center">
              <Package size={32} className="text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-1">Tidak ada produk</h3>
            <p className="text-muted-foreground text-sm">
              {searchQuery || filterFranchise !== 'all'
                ? 'Coba ubah filter atau kata kunci pencarian'
                : 'Belum ada produk yang terdaftar di franchise manapun'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-secondary/50">
                    <th className="text-left px-4 py-3 font-medium text-foreground text-sm">No</th>
                    <th className="text-left px-4 py-3 font-medium text-foreground text-sm">Nama Produk</th>
                    <th className="text-left px-4 py-3 font-medium text-foreground text-sm">Kode</th>
                    <th className="text-right px-4 py-3 font-medium text-foreground text-sm">HPP</th>
                    <th className="text-right px-4 py-3 font-medium text-foreground text-sm">Harga Jual</th>
                    <th className="text-right px-4 py-3 font-medium text-foreground text-sm">Margin</th>
                    <th className="text-left px-4 py-3 font-medium text-foreground text-sm">Franchise</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedProducts.map((product, index) => {
                    const margin =
                      product.price > 0
                        ? ((product.price - product.hpp) / product.price) * 100
                        : 0;
                    const marginColorClass =
                      margin >= 20
                        ? 'text-green-600'
                        : margin >= 10
                        ? 'text-yellow-600'
                        : 'text-red-600';

                    return (
                      <tr
                        key={product.id}
                        className="border-t border-border hover:bg-secondary/30 transition-colors"
                      >
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {(currentPage - 1) * ITEMS_PER_PAGE + index + 1}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-medium text-foreground">{product.name}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2 py-1 rounded-md bg-secondary text-xs font-medium text-secondary-foreground">
                            {product.code}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-muted-foreground">
                          {formatCurrency(product.hpp)}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-medium text-foreground">
                          {formatCurrency(product.price)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`text-sm font-medium ${marginColorClass}`}>
                            {margin.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Store size={14} className="text-muted-foreground" />
                            <span className="text-sm text-foreground">{product.franchiseName}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-4 border-t border-border">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filteredProducts.length}
                itemsPerPage={ITEMS_PER_PAGE}
                onPageChange={setCurrentPage}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
