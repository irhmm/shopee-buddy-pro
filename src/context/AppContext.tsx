import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface Product {
  id: string;
  name: string;
  code: string;
  hpp: number;
  price: number;
  createdAt: Date;
}

export interface AdminSettings {
  adminFeePercent: number;
  fixedDeduction: number;
}

export interface SaleRecord {
  id: string;
  productId: string;
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
  addProduct: (product: Omit<Product, 'id' | 'createdAt'>) => void;
  updateProduct: (id: string, product: Omit<Product, 'id' | 'createdAt'>) => void;
  deleteProduct: (id: string) => void;
  settings: AdminSettings;
  updateSettings: (settings: AdminSettings) => void;
  sales: SaleRecord[];
  addSale: (productId: string, quantity: number) => void;
  deleteSale: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEYS = {
  products: 'shopee-recap-products',
  settings: 'shopee-recap-settings',
  sales: 'shopee-recap-sales',
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.products);
    return stored ? JSON.parse(stored) : [];
  });

  const [settings, setSettings] = useState<AdminSettings>(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.settings);
    return stored ? JSON.parse(stored) : { adminFeePercent: 5, fixedDeduction: 1000 };
  });

  const [sales, setSales] = useState<SaleRecord[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.sales);
    return stored ? JSON.parse(stored) : [];
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.products, JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.sales, JSON.stringify(sales));
  }, [sales]);

  const addProduct = (product: Omit<Product, 'id' | 'createdAt'>) => {
    const newProduct: Product = {
      ...product,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    };
    setProducts((prev) => [...prev, newProduct]);
  };

  const updateProduct = (id: string, product: Omit<Product, 'id' | 'createdAt'>) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...product } : p))
    );
  };

  const deleteProduct = (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  const updateSettings = (newSettings: AdminSettings) => {
    setSettings(newSettings);
  };

  const addSale = (productId: string, quantity: number) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    const totalSales = product.price * quantity;
    const totalHpp = product.hpp * quantity;
    const adminFeeFromPercent = (totalSales * settings.adminFeePercent) / 100;
    const totalAdminFee = adminFeeFromPercent + settings.fixedDeduction;
    const netProfit = totalSales - totalHpp - totalAdminFee;

    const newSale: SaleRecord = {
      id: crypto.randomUUID(),
      productId,
      productName: product.name,
      productCode: product.code,
      quantity,
      pricePerUnit: product.price,
      hppPerUnit: product.hpp,
      totalSales,
      totalHpp,
      totalAdminFee,
      netProfit,
      createdAt: new Date(),
    };

    setSales((prev) => [...prev, newSale]);
  };

  const deleteSale = (id: string) => {
    setSales((prev) => prev.filter((s) => s.id !== id));
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
