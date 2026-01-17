import { useState, useMemo, Fragment } from 'react';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Pagination } from '@/components/Pagination';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Plus, Trash2, BarChart3, TrendingUp, DollarSign, ShoppingCart, Package, Loader2, Calendar as CalendarIcon, Check, ChevronsUpDown, Pencil, Search } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

const ITEMS_PER_PAGE = 25;

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

// Generate list of last 12 months
const generateMonthOptions = () => {
  const options = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const value = `${year}-${String(month).padStart(2, '0')}`;
    const label = `${MONTH_NAMES[month - 1]} ${year}`;
    options.push({ value, label });
  }
  return options;
};

export default function SalesPage() {
  const { products, sales, addSale, updateSale, deleteSale, settings, loading } = useApp();
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [currentPage, setCurrentPage] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saleDate, setSaleDate] = useState<Date>(new Date());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isProductOpen, setIsProductOpen] = useState(false);
  
  // Search filter state
  const [searchQuery, setSearchQuery] = useState('');
  
  // Edit dialog state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingSaleId, setEditingSaleId] = useState<string | null>(null);
  const [editProductId, setEditProductId] = useState('');
  const [editQuantity, setEditQuantity] = useState('1');
  const [editDate, setEditDate] = useState<Date>(new Date());
  const [isEditCalendarOpen, setIsEditCalendarOpen] = useState(false);
  const [isEditProductOpen, setIsEditProductOpen] = useState(false);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  
  // Month filter state - default to current month
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const monthOptions = useMemo(() => generateMonthOptions(), []);

  // Filter sales by selected month and search query
  const filteredSales = useMemo(() => {
    let result = sales;
    
    // Filter by month
    if (selectedMonth) {
      const [year, month] = selectedMonth.split('-').map(Number);
      result = result.filter((sale) => {
        const saleDate = new Date(sale.createdAt);
        return saleDate.getFullYear() === year && saleDate.getMonth() + 1 === month;
      });
    }
    
    // Filter by search query (code or product name)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((sale) =>
        sale.productCode.toLowerCase().includes(query) ||
        sale.productName.toLowerCase().includes(query)
      );
    }
    
    return result;
  }, [sales, selectedMonth, searchQuery]);

  // Format date to Indonesian format
  const formatDateIndonesian = (date: Date) => {
    const day = date.getDate();
    const month = MONTH_NAMES[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  // Group sales by date
  const groupedSalesByDate = useMemo(() => {
    const groups: Record<string, {
      date: Date;
      dateString: string;
      sales: typeof filteredSales;
      totalOrders: number;
      totalProfit: number;
    }> = {};

    filteredSales.forEach((sale) => {
      const saleDate = new Date(sale.createdAt);
      const dateKey = saleDate.toISOString().split('T')[0]; // "2026-01-17"
      
      if (!groups[dateKey]) {
        groups[dateKey] = {
          date: saleDate,
          dateString: formatDateIndonesian(saleDate),
          sales: [],
          totalOrders: 0,
          totalProfit: 0,
        };
      }
      
      groups[dateKey].sales.push(sale);
      groups[dateKey].totalOrders += 1;
      groups[dateKey].totalProfit += sale.netProfit;
    });

    // Sort by date descending (newest first)
    return Object.values(groups).sort(
      (a, b) => b.date.getTime() - a.date.getTime()
    );
  }, [filteredSales]);

  const totalPages = Math.ceil(filteredSales.length / ITEMS_PER_PAGE);
  const paginatedSales = filteredSales.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Group paginated sales by date for display
  const paginatedGroupedSales = useMemo(() => {
    const groups: Record<string, {
      date: Date;
      dateString: string;
      sales: typeof paginatedSales;
      totalOrders: number;
      totalProfit: number;
    }> = {};

    paginatedSales.forEach((sale) => {
      const saleDate = new Date(sale.createdAt);
      const dateKey = saleDate.toISOString().split('T')[0];
      
      if (!groups[dateKey]) {
        // Find the full day stats from groupedSalesByDate
        const fullDayStats = groupedSalesByDate.find(g => 
          g.date.toISOString().split('T')[0] === dateKey
        );
        
        groups[dateKey] = {
          date: saleDate,
          dateString: formatDateIndonesian(saleDate),
          sales: [],
          totalOrders: fullDayStats?.totalOrders || 0,
          totalProfit: fullDayStats?.totalProfit || 0,
        };
      }
      
      groups[dateKey].sales.push(sale);
    });

    return Object.values(groups).sort(
      (a, b) => b.date.getTime() - a.date.getTime()
    );
  }, [paginatedSales, groupedSalesByDate]);

  // Reset to page 1 when month changes
  const handleMonthChange = (month: string) => {
    setSelectedMonth(month);
    setCurrentPage(1);
  };

  // Handle search change
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  // Open edit dialog with sale data
  const handleOpenEditDialog = (sale: typeof sales[0]) => {
    setEditingSaleId(sale.id);
    setEditProductId(sale.productId || '');
    setEditQuantity(String(sale.quantity));
    setEditDate(new Date(sale.createdAt));
    setIsEditDialogOpen(true);
  };

  // Handle edit sale submission
  const handleEditSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSaleId || !editProductId || !editQuantity) {
      toast.error('Lengkapi semua data');
      return;
    }

    setIsEditSubmitting(true);
    try {
      await updateSale(editingSaleId, editProductId, parseInt(editQuantity), editDate);
      setIsEditDialogOpen(false);
      setEditingSaleId(null);
    } finally {
      setIsEditSubmitting(false);
    }
  };

  const handleAddSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || !quantity) {
      toast.error('Pilih produk dan masukkan jumlah');
      return;
    }

    setIsSubmitting(true);
    try {
      await addSale(selectedProductId, parseInt(quantity), saleDate);
      setSelectedProductId('');
      setQuantity('1');
      setSaleDate(new Date());
      setIsDialogOpen(false);
      toast.success('Penjualan berhasil ditambahkan');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSale = async (id: string) => {
    await deleteSale(id);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  // Calculate totals from filtered sales (monthly)
  const totals = useMemo(() => filteredSales.reduce(
    (acc, sale) => ({
      totalSales: acc.totalSales + sale.totalSales,
      totalHpp: acc.totalHpp + sale.totalHpp,
      totalAdminFee: acc.totalAdminFee + sale.totalAdminFee,
      netProfit: acc.netProfit + sale.netProfit,
    }),
    { totalSales: 0, totalHpp: 0, totalAdminFee: 0, netProfit: 0 }
  ), [filteredSales]);

  // Get selected month label for display
  const selectedMonthLabel = monthOptions.find(opt => opt.value === selectedMonth)?.label || '';

  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="page-header">
          <h1 className="page-title">Rekap Penjualan</h1>
          <p className="page-subtitle">Catat dan lihat ringkasan penjualan Shopee</p>
        </div>
        <div className="table-container">
          <LoadingSpinner message="Memuat data penjualan..." />
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="page-title">Rekap Penjualan</h1>
              <p className="page-subtitle">Catat dan lihat ringkasan penjualan Shopee</p>
            </div>
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-muted-foreground" />
              <Select value={selectedMonth} onValueChange={handleMonthChange}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Pilih bulan..." />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  {monthOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Search Filter */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Cari kode atau nama produk..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9"
              />
            </div>
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSearchChange('')}
                className="text-muted-foreground"
              >
                Reset
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Penjualan</p>
              <p className="text-lg font-bold text-foreground">{formatCurrency(totals.totalSales)}</p>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
              <Package className="w-5 h-5 text-secondary-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total HPP</p>
              <p className="text-lg font-bold text-foreground">{formatCurrency(totals.totalHpp)}</p>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Biaya Admin</p>
              <p className="text-lg font-bold text-foreground">{formatCurrency(totals.totalAdminFee)}</p>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Laba Bersih</p>
              <p className={`text-lg font-bold ${totals.netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                {formatCurrency(totals.netProfit)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Add Sale Button + Dialog */}
      <div className="mb-6 flex justify-end">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus size={18} />
              Tambah Rekap
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Tambah Penjualan Baru</DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleAddSale} className="space-y-4">
              {/* Date Picker */}
              <div className="space-y-2">
                <Label>Tanggal</Label>
                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      disabled={isSubmitting}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !saleDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(saleDate, "dd MMMM yyyy", { locale: id })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-popover z-[100]" align="start">
                    <Calendar
                      mode="single"
                      selected={saleDate}
                      onSelect={(date) => {
                        if (date) {
                          setSaleDate(date);
                          setIsCalendarOpen(false);
                        }
                      }}
                      disabled={(date) => date > new Date()}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Product Select with Search */}
              <div className="space-y-2">
                <Label>Produk</Label>
                <Popover open={isProductOpen} onOpenChange={setIsProductOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      disabled={isSubmitting}
                      className={cn(
                        "w-full justify-between font-normal",
                        !selectedProductId && "text-muted-foreground"
                      )}
                    >
                      {selectedProductId
                        ? (() => {
                            const product = products.find((p) => p.id === selectedProductId);
                            return product ? `[${product.code}] ${product.name}` : "Pilih produk...";
                          })()
                        : "Pilih produk..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0 bg-popover z-[100]" align="start">
                    <Command>
                      <CommandInput placeholder="Cari produk..." />
                      <CommandList>
                        <CommandEmpty>Produk tidak ditemukan.</CommandEmpty>
                        <CommandGroup>
                          {products.map((product) => (
                            <CommandItem
                              key={product.id}
                              value={`${product.code} ${product.name}`}
                              onSelect={() => {
                                setSelectedProductId(product.id);
                                setIsProductOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedProductId === product.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <div className="flex flex-col">
                                <span className="font-medium">[{product.code}] {product.name}</span>
                                <span className="text-xs text-muted-foreground">{formatCurrency(product.price)}</span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {products.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Tambahkan produk terlebih dahulu di halaman "Add Produk"
                  </p>
                )}
              </div>

              {/* Quantity */}
              <div className="space-y-2">
                <Label>Jumlah (Qty)</Label>
                <Input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="1"
                  disabled={isSubmitting}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)} 
                  className="flex-1"
                  disabled={isSubmitting}
                >
                  Batal
                </Button>
                <Button 
                  type="submit" 
                  disabled={products.length === 0 || !selectedProductId || isSubmitting} 
                  className="flex-1 gap-2"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus size={18} />
                  )}
                  Simpan
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Sales Table */}
      <div className="table-container">
        {filteredSales.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-secondary flex items-center justify-center">
              <BarChart3 size={32} className="text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-1">Belum ada penjualan</h3>
            <p className="text-muted-foreground text-sm">
              Tidak ada penjualan untuk {selectedMonthLabel}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-secondary/50">
                    <th className="text-left px-4 py-3 font-medium text-foreground text-sm">Produk</th>
                    <th className="text-center px-4 py-3 font-medium text-foreground text-sm">Qty</th>
                    <th className="text-right px-4 py-3 font-medium text-foreground text-sm">Penjualan</th>
                    <th className="text-right px-4 py-3 font-medium text-foreground text-sm">HPP</th>
                    <th className="text-right px-4 py-3 font-medium text-foreground text-sm">Admin</th>
                    <th className="text-right px-4 py-3 font-medium text-foreground text-sm">Laba</th>
                    <th className="text-center px-4 py-3 font-medium text-foreground text-sm">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedGroupedSales.map((group) => (
                    <Fragment key={group.dateString}>
                      {/* Daily Summary Header */}
                      <tr className="bg-secondary/80 border-t-2 border-primary/20">
                        <td colSpan={7} className="px-4 py-3">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-bold text-foreground">{group.dateString}</p>
                              <p className="text-sm text-muted-foreground">
                                {group.totalOrders} transaksi
                              </p>
                            </div>
                            <div className="text-right">
                              <p className={`text-lg font-bold ${group.totalProfit >= 0 ? 'text-primary' : 'text-destructive'}`}>
                                {formatCurrency(group.totalProfit)}
                              </p>
                              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                                Total Hari Ini
                              </p>
                            </div>
                          </div>
                        </td>
                      </tr>
                      
                      {/* Daily Transactions */}
                      {group.sales.map((sale) => (
                        <tr key={sale.id} className="border-t border-border hover:bg-secondary/30 transition-colors">
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-medium text-foreground">{sale.productName}</p>
                              <p className="text-xs text-muted-foreground">{sale.productCode}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex items-center px-2 py-1 rounded-md bg-secondary text-sm font-medium">
                              {sale.quantity}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-medium text-foreground">
                            {formatCurrency(sale.totalSales)}
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-muted-foreground">
                            {formatCurrency(sale.totalHpp)}
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-destructive">
                            -{formatCurrency(sale.totalAdminFee)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span
                              className={`text-sm font-semibold ${
                                sale.netProfit >= 0 ? 'text-success' : 'text-destructive'
                              }`}
                            >
                              {formatCurrency(sale.netProfit)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-center gap-1">
                              {/* Edit Button */}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenEditDialog(sale)}
                                className="h-8 w-8 p-0 text-primary hover:text-primary hover:bg-primary/10"
                              >
                                <Pencil size={16} />
                              </Button>
                              
                              {/* Delete Button */}
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  >
                                    <Trash2 size={16} />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Hapus Penjualan?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Data penjualan ini akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Batal</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteSale(sale.id)}
                                      className="bg-destructive hover:bg-destructive/90"
                                    >
                                      Hapus
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary Footer */}
            <div className="px-4 py-4 border-t border-border bg-secondary/30">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap gap-6 text-sm">
                  <div>
                    <span className="text-muted-foreground">Transaksi ({selectedMonthLabel}):</span>
                    <span className="ml-2 font-semibold text-foreground">{filteredSales.length}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Admin Fee:</span>
                    <span className="ml-2 font-semibold text-foreground">{settings.adminFeePercent}% + {formatCurrency(settings.fixedDeduction)}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm text-muted-foreground">Laba Bersih ({selectedMonthLabel}):</span>
                  <span className={`ml-2 text-lg font-bold ${totals.netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {formatCurrency(totals.netProfit)}
                  </span>
                </div>
              </div>
            </div>

            <div className="px-4 py-4 border-t border-border">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filteredSales.length}
                itemsPerPage={ITEMS_PER_PAGE}
                onPageChange={setCurrentPage}
              />
            </div>
          </>
        )}
      </div>

      {/* Edit Sale Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Penjualan</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleEditSale} className="space-y-4">
            {/* Date Picker */}
            <div className="space-y-2">
              <Label>Tanggal</Label>
              <Popover open={isEditCalendarOpen} onOpenChange={setIsEditCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    disabled={isEditSubmitting}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !editDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(editDate, "dd MMMM yyyy", { locale: id })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-popover z-[100]" align="start">
                  <Calendar
                    mode="single"
                    selected={editDate}
                    onSelect={(date) => {
                      if (date) {
                        setEditDate(date);
                        setIsEditCalendarOpen(false);
                      }
                    }}
                    disabled={(date) => date > new Date()}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Product Select with Search */}
            <div className="space-y-2">
              <Label>Produk</Label>
              <Popover open={isEditProductOpen} onOpenChange={setIsEditProductOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    disabled={isEditSubmitting}
                    className={cn(
                      "w-full justify-between font-normal",
                      !editProductId && "text-muted-foreground"
                    )}
                  >
                    {editProductId
                      ? (() => {
                          const product = products.find((p) => p.id === editProductId);
                          return product ? `[${product.code}] ${product.name}` : "Pilih produk...";
                        })()
                      : "Pilih produk..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0 bg-popover z-[100]" align="start">
                  <Command>
                    <CommandInput placeholder="Cari produk..." />
                    <CommandList>
                      <CommandEmpty>Produk tidak ditemukan.</CommandEmpty>
                      <CommandGroup>
                        {products.map((product) => (
                          <CommandItem
                            key={product.id}
                            value={`${product.code} ${product.name}`}
                            onSelect={() => {
                              setEditProductId(product.id);
                              setIsEditProductOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                editProductId === product.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="flex flex-col">
                              <span className="font-medium">[{product.code}] {product.name}</span>
                              <span className="text-xs text-muted-foreground">{formatCurrency(product.price)}</span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Quantity */}
            <div className="space-y-2">
              <Label>Jumlah (Qty)</Label>
              <Input
                type="number"
                min="1"
                value={editQuantity}
                onChange={(e) => setEditQuantity(e.target.value)}
                placeholder="1"
                disabled={isEditSubmitting}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsEditDialogOpen(false)} 
                className="flex-1"
                disabled={isEditSubmitting}
              >
                Batal
              </Button>
              <Button 
                type="submit" 
                disabled={!editProductId || isEditSubmitting} 
                className="flex-1 gap-2"
              >
                {isEditSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Pencil size={18} />
                )}
                Simpan
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
