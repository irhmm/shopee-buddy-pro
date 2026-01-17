import { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Settings, Check, Info, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { settings, updateSettings, loading } = useApp();
  const [formData, setFormData] = useState({
    adminFeePercent: settings.adminFeePercent.toString(),
    fixedDeduction: settings.fixedDeduction.toString(),
  });
  const [hasChanges, setHasChanges] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setFormData({
      adminFeePercent: settings.adminFeePercent.toString(),
      fixedDeduction: settings.fixedDeduction.toString(),
    });
  }, [settings]);

  useEffect(() => {
    const currentPercent = parseFloat(formData.adminFeePercent) || 0;
    const currentFixed = parseFloat(formData.fixedDeduction) || 0;
    setHasChanges(
      currentPercent !== settings.adminFeePercent ||
      currentFixed !== settings.fixedDeduction
    );
  }, [formData, settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await updateSettings({
        adminFeePercent: parseFloat(formData.adminFeePercent) || 0,
        fixedDeduction: parseFloat(formData.fixedDeduction) || 0,
      });
      setHasChanges(false);
      toast.success('Pengaturan berhasil disimpan');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  if (loading) {
    return (
      <div className="animate-fade-in max-w-2xl">
        <div className="page-header">
          <h1 className="page-title">Setting Biaya Admin</h1>
          <p className="page-subtitle">Atur biaya admin Shopee yang berlaku untuk semua produk</p>
        </div>
        <div className="form-section">
          <LoadingSpinner message="Memuat pengaturan..." />
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in max-w-2xl">
      <div className="page-header">
        <h1 className="page-title">Setting Biaya Admin</h1>
        <p className="page-subtitle">Atur biaya admin Shopee yang berlaku untuk semua produk</p>
      </div>


      {/* Settings Form */}
      <div className="form-section">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 gradient-primary rounded-lg flex items-center justify-center">
            <Settings className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">Pengaturan Biaya</h2>
            <p className="text-sm text-muted-foreground">Konfigurasi biaya admin marketplace</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="adminFeePercent">Biaya Admin (%)</Label>
              <div className="relative">
                <Input
                  id="adminFeePercent"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={formData.adminFeePercent}
                  onChange={(e) =>
                    setFormData({ ...formData, adminFeePercent: e.target.value })
                  }
                  className="pr-12"
                  disabled={isSubmitting}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  %
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Persentase potongan dari total penjualan
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fixedDeduction">Potongan Tetap (Rp)</Label>
              <Input
                id="fixedDeduction"
                type="number"
                min="0"
                value={formData.fixedDeduction}
                onChange={(e) =>
                  setFormData({ ...formData, fixedDeduction: e.target.value })
                }
                disabled={isSubmitting}
              />
              <p className="text-xs text-muted-foreground">
                Nominal tetap yang dipotong per transaksi
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-border">
            <Button type="submit" disabled={!hasChanges || isSubmitting} className="gap-2">
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check size={18} />
              )}
              Simpan Pengaturan
            </Button>
          </div>
        </form>
      </div>

      {/* Current Settings Preview */}
      <div className="mt-6 p-4 rounded-xl bg-secondary/50 border border-border">
        <h3 className="font-medium text-foreground mb-3">Pengaturan Saat Ini</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex justify-between items-center p-3 rounded-lg bg-card">
            <span className="text-sm text-muted-foreground">Biaya Admin</span>
            <span className="font-semibold text-foreground">{settings.adminFeePercent}%</span>
          </div>
          <div className="flex justify-between items-center p-3 rounded-lg bg-card">
            <span className="text-sm text-muted-foreground">Potongan Tetap</span>
            <span className="font-semibold text-foreground">
              {formatCurrency(settings.fixedDeduction)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
