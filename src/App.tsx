import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { AppProvider } from "@/context/AppContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminRoute } from "@/components/AdminRoute";
import { FranchiseRoute } from "@/components/FranchiseRoute";
import { AdminLayout } from "@/components/AdminLayout";
import { FranchiseLayout } from "@/components/FranchiseLayout";

// Pages
import AuthPage from "./pages/AuthPage";
import ProductsPage from "./pages/ProductsPage";
import SettingsPage from "./pages/SettingsPage";
import SalesPage from "./pages/SalesPage";
import LaporanKeuanganPage from "./pages/LaporanKeuanganPage";
import NotFound from "./pages/NotFound";

// Admin Pages
import AdminDashboard from "./pages/admin/Dashboard";
import FranchiseManagement from "./pages/admin/FranchiseManagement";
import ProfitSharingSettings from "./pages/admin/ProfitSharingSettings";
import GlobalReports from "./pages/admin/GlobalReports";

const queryClient = new QueryClient();

function AppRoutes() {
  const { user, userRole, loading } = useAuth();

  if (loading) {
    return null;
  }

  return (
    <Routes>
      {/* Auth Route */}
      <Route path="/auth" element={<AuthPage />} />

      {/* Admin Routes */}
      <Route path="/admin" element={
        <AdminRoute>
          <AdminLayout><AdminDashboard /></AdminLayout>
        </AdminRoute>
      } />
      <Route path="/admin/franchises" element={
        <AdminRoute>
          <AdminLayout><FranchiseManagement /></AdminLayout>
        </AdminRoute>
      } />
      <Route path="/admin/profit-sharing" element={
        <AdminRoute>
          <AdminLayout><ProfitSharingSettings /></AdminLayout>
        </AdminRoute>
      } />
      <Route path="/admin/reports" element={
        <AdminRoute>
          <AdminLayout><GlobalReports /></AdminLayout>
        </AdminRoute>
      } />

      {/* Franchise Routes */}
      <Route path="/" element={
        <ProtectedRoute>
          {userRole === 'super_admin' ? (
            <Navigate to="/admin" replace />
          ) : (
            <FranchiseRoute>
              <AppProvider>
                <FranchiseLayout><SalesPage /></FranchiseLayout>
              </AppProvider>
            </FranchiseRoute>
          )}
        </ProtectedRoute>
      } />
      <Route path="/products" element={
        <FranchiseRoute>
          <AppProvider>
            <FranchiseLayout><ProductsPage /></FranchiseLayout>
          </AppProvider>
        </FranchiseRoute>
      } />
      <Route path="/settings" element={
        <FranchiseRoute>
          <AppProvider>
            <FranchiseLayout><SettingsPage /></FranchiseLayout>
          </AppProvider>
        </FranchiseRoute>
      } />
      <Route path="/laporan" element={
        <FranchiseRoute>
          <AppProvider>
            <FranchiseLayout><LaporanKeuanganPage /></FranchiseLayout>
          </AppProvider>
        </FranchiseRoute>
      } />

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner position="top-right" />
        <BrowserRouter>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
