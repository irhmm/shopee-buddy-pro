import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Percent, 
  FileBarChart, 
  Menu, 
  X, 
  LogOut,
  Receipt,
  Package,
  TrendingUp,
  PanelLeftClose,
  PanelLeft,
  Building2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { path: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/admin/product-performance', label: 'Performa Produk', icon: TrendingUp },
  { path: '/admin/profit-sharing-payments', label: 'Bagi Hasil Franchise', icon: Receipt },
  { path: '/admin/profit-sharing', label: 'Setting Bagi Hasil', icon: Percent },
  { path: '/admin/products', label: 'Produk Franchise', icon: Package },
  { path: '/admin/franchises', label: 'Kelola Franchise', icon: Users },
  { path: '/admin/reports', label: 'Laporan Global', icon: FileBarChart },
];

export function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { signOut, user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-card border-b border-border z-50 flex items-center px-4">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-lg hover:bg-secondary transition-colors"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        <div className="flex items-center gap-2 ml-3">
          <Building2 className="w-5 h-5 text-primary" />
          <span className="font-semibold text-foreground text-sm">Super Admin</span>
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-full bg-card border-r border-border z-50 transition-all duration-300 flex flex-col",
          sidebarOpen ? "w-60" : "w-16",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Header with Toggle */}
        <div className="h-14 flex items-center justify-between px-3 border-b border-border">
          {(sidebarOpen || mobileMenuOpen) && (
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Building2 className="w-5 h-5 text-primary flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <h1 className="font-semibold text-foreground text-sm truncate">Super Admin</h1>
                <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
              </div>
            </div>
          )}
          
          {/* Toggle Button */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hidden lg:flex p-1.5 rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
          >
            {sidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeft size={18} />}
          </button>
        </div>

        {/* Menu Label */}
        {(sidebarOpen || mobileMenuOpen) && (
          <div className="px-4 py-3">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Menu Utama</span>
          </div>
        )}

        {/* Navigation */}
        <nav className={cn("flex-1 px-2 space-y-0.5", !sidebarOpen && !mobileMenuOpen && "px-2 pt-3")}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200",
                  "text-muted-foreground hover:text-foreground hover:bg-secondary",
                  isActive && "bg-primary/10 text-primary font-medium",
                  !sidebarOpen && !mobileMenuOpen && "justify-center px-0"
                )}
                title={!sidebarOpen && !mobileMenuOpen ? item.label : undefined}
              >
                <Icon size={18} className="flex-shrink-0" />
                {(sidebarOpen || mobileMenuOpen) && (
                  <span className="truncate">{item.label}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Logout Button */}
        <div className="p-3 border-t border-border mt-auto">
          <Button
            variant="ghost"
            onClick={signOut}
            className={cn(
              "w-full justify-start gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-10",
              !sidebarOpen && !mobileMenuOpen && "justify-center px-0"
            )}
            title={!sidebarOpen && !mobileMenuOpen ? "Logout" : undefined}
          >
            <LogOut size={18} className="flex-shrink-0" />
            {(sidebarOpen || mobileMenuOpen) && <span className="text-sm">Logout</span>}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main
        className={cn(
          "min-h-screen transition-all duration-300 pt-14 lg:pt-0",
          sidebarOpen ? "lg:ml-60" : "lg:ml-16"
        )}
      >
        {/* Content Header */}
        <div className="hidden lg:flex h-14 items-center gap-3 px-6 border-b border-border bg-card">
          <Building2 className="w-5 h-5 text-primary" />
          <div>
            <h1 className="font-semibold text-foreground text-sm">Shopee Buddy Pro</h1>
            <p className="text-[10px] text-muted-foreground">Franchise Management System</p>
          </div>
        </div>
        <div className="p-4 lg:p-6">{children}</div>
      </main>
    </div>
  );
}
