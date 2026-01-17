import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

export interface SaleRecord {
  id: string;
  productId: string | null;
  productName: string;
  productCode: string;
  quantity: number;
  pricePerUnit: number;
  hppPerUnit: number;
  totalSales: number;
  totalHpp: number;
  totalAdminFee: number;
  netProfit: number;
  createdAt: Date;
}

interface AppContextType {
  products: Product[];
  addProduct: (product: Omit<Product, 'id' | 'createdAt'>) => Promise<void>;
  updateProduct: (id: string, product: Omit<Product, 'id' | 'createdAt'>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  settings: AdminSettings;
  updateSettings: (settings: AdminSettings) => Promise<void>;
  sales: SaleRecord[];
  addSale: (productId: string, quantity: number) => Promise<void>;
  deleteSale: (id: string) => Promise<void>;
  loading: boolean;
  refreshData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<AdminSettings>({ adminFeePercent: 5, fixedDeduction: 1000 });
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = useCallback(async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
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
  }, []);

  const fetchSettings = useCallback(async () => {
    const { data, error } = await supabase
      .from('admin_settings')
      .select('*')
      .limit(1)
      .single();

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
  }, []);

  const fetchSales = useCallback(async () => {
    const { data, error } = await supabase
      .from('sales')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching sales:', error);
      toast.error('Gagal memuat data penjualan');
      return;
    }

    setSales(
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
        totalAdminFee: Number(s.total_admin_fee),
        netProfit: Number(s.net_profit),
        createdAt: new Date(s.created_at),
      }))
    );
  }, []);

  const refreshData = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchProducts(), fetchSettings(), fetchSales()]);
    setLoading(false);
  }, [fetchProducts, fetchSettings, fetchSales]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const addProduct = async (product: Omit<Product, 'id' | 'createdAt'>) => {
    const { error } = await supabase.from('products').insert({
      name: product.name,
      code: product.code,
      hpp: product.hpp,
      price: product.price,
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

  const addSale = async (productId: string, quantity: number) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    const totalSales = product.price * quantity;
    const totalHpp = product.hpp * quantity;
    const adminFeeFromPercent = (totalSales * settings.adminFeePercent) / 100;
    const totalAdminFee = adminFeeFromPercent + settings.fixedDeduction;
    const netProfit = totalSales - totalHpp - totalAdminFee;

    const { error } = await supabase.from('sales').insert({
      product_id: productId,
      product_name: product.name,
      product_code: product.code,
      quantity,
      price_per_unit: product.price,
      hpp_per_unit: product.hpp,
      total_sales: totalSales,
      total_hpp: totalHpp,
      total_admin_fee: totalAdminFee,
      net_profit: netProfit,
    });

    if (error) {
      console.error('Error adding sale:', error);
      toast.error('Gagal menambahkan penjualan');
      return;
    }

    await fetchSales();
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
