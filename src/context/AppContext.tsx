import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { useRealtimeSubscription } from '@/hooks/use-realtime';

export interface Product {
  id: string;
  name: string;
  code: string;
  hpp: number;
  price: number;
  createdAt: Date;
}

export interface AdminSettings {
  id?: string;
  adminFeePercent: number;
  fixedDeduction: number;
}

// Raw sale data from database (without calculated fields)
interface RawSaleRecord {
  id: string;
  productId: string | null;
  productName: string;
  productCode: string;
  quantity: number;
  pricePerUnit: number;
  hppPerUnit: number;
  totalSales: number;
  totalHpp: number;
  discountType: 'percentage' | 'fixed' | null;
  discountValue: number;
  createdAt: Date;
}

// Sale record with dynamically calculated admin fee and profit
export interface SaleRecord extends RawSaleRecord {
  discountAmount: number;
  totalSalesAfterDiscount: number;
  totalAdminFee: number;
  netProfit: number;
}

interface AppContextType {
  products: Product[];
  addProduct: (product: Omit<Product, 'id' | 'createdAt'>) => Promise<void>;
  updateProduct: (id: string, product: Omit<Product, 'id' | 'createdAt'>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  settings: AdminSettings;
  updateSettings: (settings: AdminSettings) => Promise<void>;
  sales: SaleRecord[];
  addSale: (productId: string, quantity: number, saleDate?: Date, discountType?: 'percentage' | 'fixed' | null, discountValue?: number) => Promise<void>;
  updateSale: (id: string, productId: string, quantity: number, saleDate: Date, discountType?: 'percentage' | 'fixed' | null, discountValue?: number) => Promise<void>;
  deleteSale: (id: string) => Promise<void>;
  loading: boolean;
  refreshData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const { franchiseId } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<AdminSettings>({ adminFeePercent: 5, fixedDeduction: 1000 });
  const [rawSales, setRawSales] = useState<RawSaleRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Dynamically calculate discount, admin fee and net profit based on current settings
  const sales = useMemo<SaleRecord[]>(() => {
    return rawSales.map((sale) => {
      // Calculate discount amount
      let discountAmount = 0;
      if (sale.discountType === 'percentage') {
        discountAmount = (sale.totalSales * sale.discountValue) / 100;
      } else if (sale.discountType === 'fixed') {
        discountAmount = sale.discountValue;
      }
      
      // Ensure discount doesn't exceed total sales
      discountAmount = Math.min(discountAmount, sale.totalSales);
      
      const totalSalesAfterDiscount = sale.totalSales - discountAmount;
      const adminFeeFromPercent = (totalSalesAfterDiscount * settings.adminFeePercent) / 100;
      const totalAdminFee = adminFeeFromPercent + settings.fixedDeduction;
      const netProfit = totalSalesAfterDiscount - sale.totalHpp - totalAdminFee;
      
      return {
        ...sale,
        discountAmount,
        totalSalesAfterDiscount,
        totalAdminFee,
        netProfit,
      };
    });
  }, [rawSales, settings]);

  const fetchProducts = useCallback(async () => {
    if (!franchiseId) return;
    
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('franchise_id', franchiseId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching products:', error);
      toast.error('Gagal memuat data produk');
      return;
    }

    setProducts(
      data.map((p) => ({
        id: p.id,
        name: p.name,
        code: p.code,
        hpp: Number(p.hpp),
        price: Number(p.price),
        createdAt: new Date(p.created_at),
      }))
    );
  }, [franchiseId]);

  const fetchSettings = useCallback(async () => {
    if (!franchiseId) return;
    
    const { data, error } = await supabase
      .from('admin_settings')
      .select('*')
      .eq('franchise_id', franchiseId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching settings:', error);
      return;
    }

    if (data) {
      setSettings({
        id: data.id,
        adminFeePercent: Number(data.admin_fee_percent),
        fixedDeduction: Number(data.fixed_deduction),
      });
    }
  }, [franchiseId]);

  const fetchSales = useCallback(async () => {
    if (!franchiseId) return;
    
    const { data, error } = await supabase
      .from('sales')
      .select('*')
      .eq('franchise_id', franchiseId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching sales:', error);
      toast.error('Gagal memuat data penjualan');
      return;
    }

    setRawSales(
      data.map((s) => ({
        id: s.id,
        productId: s.product_id,
        productName: s.product_name,
        productCode: s.product_code,
        quantity: s.quantity,
        pricePerUnit: Number(s.price_per_unit),
        hppPerUnit: Number(s.hpp_per_unit),
        totalSales: Number(s.total_sales),
        totalHpp: Number(s.total_hpp),
        discountType: s.discount_type as 'percentage' | 'fixed' | null,
        discountValue: Number(s.discount_value || 0),
        createdAt: new Date(s.created_at),
      }))
    );
  }, [franchiseId]);

  const refreshData = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchProducts(), fetchSettings(), fetchSales()]);
    setLoading(false);
  }, [fetchProducts, fetchSettings, fetchSales]);

  useEffect(() => {
    if (franchiseId) {
      refreshData();
    }
  }, [refreshData, franchiseId]);

  // Realtime subscriptions for automatic updates
  useRealtimeSubscription(
    [
      {
        table: 'sales',
        filter: franchiseId ? `franchise_id=eq.${franchiseId}` : undefined,
        onDataChange: fetchSales,
      },
      {
        table: 'products',
        filter: franchiseId ? `franchise_id=eq.${franchiseId}` : undefined,
        onDataChange: fetchProducts,
      },
      {
        table: 'admin_settings',
        filter: franchiseId ? `franchise_id=eq.${franchiseId}` : undefined,
        onDataChange: fetchSettings,
      },
    ],
    !!franchiseId
  );

  const addProduct = async (product: Omit<Product, 'id' | 'createdAt'>) => {
    if (!franchiseId) return;
    
    const { error } = await supabase.from('products').insert({
      name: product.name,
      code: product.code,
      hpp: product.hpp,
      price: product.price,
      franchise_id: franchiseId,
    });

    if (error) {
      console.error('Error adding product:', error);
      toast.error('Gagal menambahkan produk');
      return;
    }

    await fetchProducts();
    toast.success('Produk berhasil ditambahkan');
  };

  const updateProduct = async (id: string, product: Omit<Product, 'id' | 'createdAt'>) => {
    const { error } = await supabase
      .from('products')
      .update({
        name: product.name,
        code: product.code,
        hpp: product.hpp,
        price: product.price,
      })
      .eq('id', id);

    if (error) {
      console.error('Error updating product:', error);
      toast.error('Gagal mengupdate produk');
      return;
    }

    await fetchProducts();
    toast.success('Produk berhasil diperbarui');
  };

  const deleteProduct = async (id: string) => {
    const { error } = await supabase.from('products').delete().eq('id', id);

    if (error) {
      console.error('Error deleting product:', error);
      toast.error('Gagal menghapus produk');
      return;
    }

    await fetchProducts();
    toast.success('Produk berhasil dihapus');
  };

  const updateSettings = async (newSettings: AdminSettings) => {
    const { error } = await supabase
      .from('admin_settings')
      .update({
        admin_fee_percent: newSettings.adminFeePercent,
        fixed_deduction: newSettings.fixedDeduction,
      })
      .eq('id', settings.id);

    if (error) {
      console.error('Error updating settings:', error);
      toast.error('Gagal menyimpan pengaturan');
      return;
    }

    await fetchSettings();
  };

  const addSale = async (productId: string, quantity: number, saleDate?: Date, discountType?: 'percentage' | 'fixed' | null, discountValue?: number) => {
    if (!franchiseId) return;
    
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    const totalSales = product.price * quantity;
    const totalHpp = product.hpp * quantity;

    const { error } = await supabase.from('sales').insert({
      product_id: productId,
      product_name: product.name,
      product_code: product.code,
      quantity,
      price_per_unit: product.price,
      hpp_per_unit: product.hpp,
      total_sales: totalSales,
      total_hpp: totalHpp,
      total_admin_fee: 0,
      net_profit: 0,
      discount_type: discountType || null,
      discount_value: discountValue || 0,
      franchise_id: franchiseId,
      created_at: saleDate ? saleDate.toISOString() : new Date().toISOString(),
    });

    if (error) {
      console.error('Error adding sale:', error);
      toast.error('Gagal menambahkan penjualan');
      return;
    }

    await fetchSales();
  };

  const updateSale = async (id: string, productId: string, quantity: number, saleDate: Date, discountType?: 'percentage' | 'fixed' | null, discountValue?: number) => {
    const product = products.find((p) => p.id === productId);
    if (!product) {
      toast.error('Produk tidak ditemukan');
      return;
    }

    const totalSales = product.price * quantity;
    const totalHpp = product.hpp * quantity;

    const { error } = await supabase
      .from('sales')
      .update({
        product_id: productId,
        product_name: product.name,
        product_code: product.code,
        quantity,
        price_per_unit: product.price,
        hpp_per_unit: product.hpp,
        total_sales: totalSales,
        total_hpp: totalHpp,
        discount_type: discountType || null,
        discount_value: discountValue || 0,
        created_at: saleDate.toISOString(),
      })
      .eq('id', id);

    if (error) {
      console.error('Error updating sale:', error);
      toast.error('Gagal mengupdate penjualan');
      return;
    }

    await fetchSales();
    toast.success('Penjualan berhasil diperbarui');
  };

  const deleteSale = async (id: string) => {
    const { error } = await supabase.from('sales').delete().eq('id', id);

    if (error) {
      console.error('Error deleting sale:', error);
      toast.error('Gagal menghapus penjualan');
      return;
    }

    await fetchSales();
    toast.success('Penjualan berhasil dihapus');
  };

  return (
    <AppContext.Provider
      value={{
        products,
        addProduct,
        updateProduct,
        deleteProduct,
        settings,
        updateSettings,
        sales,
        addSale,
        updateSale,
        deleteSale,
        loading,
        refreshData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
