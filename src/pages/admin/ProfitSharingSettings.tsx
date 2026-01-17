import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Percent, Check, Loader2, Store, Save } from 'lucide-react';
import { toast } from 'sonner';

interface Franchise {
  id: string;
  name: string;
  profitSharingPercent: number;
}

export default function ProfitSharingSettings() {
  const [franchises, setFranchises] = useState<Franchise[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchFranchises();
  }, []);

  const fetchFranchises = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('franchises')
        .select('id, name, profit_sharing_percent')
        .order('name');

      if (error) throw error;

      const franchiseList: Franchise[] = (data || []).map((f) => ({
        id: f.id,
        name: f.name,
        profitSharingPercent: Number(f.profit_sharing_percent),
      }));

      setFranchises(franchiseList);

      // Initialize edited values
      const initialValues: Record<string, string> = {};
      franchiseList.forEach((f) => {
        initialValues[f.id] = f.profitSharingPercent.toString();
      });
      setEditedValues(initialValues);
    } catch (error) {
      console.error('Error fetching franchises:', error);
      toast.error('Gagal memuat data franchise');
    } finally {
      setLoading(false);
    }
  };

  // Recalculate ALL profit sharing payments when percentage changes
  const recalculateAllPeriods = async (franchiseId: string, newPercent: number) => {
    // Fetch all profit sharing payments for this franchise
    const { data: payments, error: fetchError } = await supabase
      .from('profit_sharing_payments')
      .select('id, total_revenue')
      .eq('franchise_id', franchiseId);

    if (fetchError) {
      console.error('Error fetching payments:', fetchError);
      return;
    }

    // Update each record with new percentage
    for (const payment of payments || []) {
      const newAmount = (payment.total_revenue || 0) * (newPercent / 100);

      await supabase
        .from('profit_sharing_payments')
        .update({
          profit_sharing_percent: newPercent,
          profit_sharing_amount: newAmount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', payment.id);
    }
  };

  const handleSave = async (franchiseId: string) => {
    const newValue = parseFloat(editedValues[franchiseId]);
    if (isNaN(newValue) || newValue < 0 || newValue > 100) {
      toast.error('Persentase harus antara 0 dan 100');
      return;
    }

    setSavingId(franchiseId);
    try {
      const { error } = await supabase
        .from('franchises')
        .update({ profit_sharing_percent: newValue })
        .eq('id', franchiseId);

      if (error) throw error;

      // Recalculate ALL profit sharing payments with new percentage
      await recalculateAllPeriods(franchiseId, newValue);

      setFranchises((prev) =>
        prev.map((f) =>
          f.id === franchiseId ? { ...f, profitSharingPercent: newValue } : f
        )
      );

      toast.success('Persentase bagi hasil berhasil diperbarui');
    } catch (error) {
      console.error('Error updating profit sharing:', error);
      toast.error('Gagal memperbarui persentase bagi hasil');
    } finally {
      setSavingId(null);
    }
  };

  const handleSaveAll = async () => {
    setSavingId('all');
    try {
      for (const franchise of franchises) {
        const newPercent = parseFloat(editedValues[franchise.id]) || franchise.profitSharingPercent;

        // Update franchises table
        const { error } = await supabase
          .from('franchises')
          .update({ profit_sharing_percent: newPercent })
          .eq('id', franchise.id);

        if (error) throw error;

        // Recalculate ALL profit sharing payments with new percentage
        await recalculateAllPeriods(franchise.id, newPercent);
      }

      await fetchFranchises();
      toast.success('Semua persentase bagi hasil berhasil diperbarui');
    } catch (error) {
      console.error('Error updating all profit sharing:', error);
      toast.error('Gagal memperbarui persentase bagi hasil');
    } finally {
      setSavingId(null);
    }
  };

  const hasChanges = (franchiseId: string) => {
    const franchise = franchises.find((f) => f.id === franchiseId);
    return franchise && editedValues[franchiseId] !== franchise.profitSharingPercent.toString();
  };

  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="page-header">
          <h1 className="page-title">Setting Bagi Hasil</h1>
          <p className="page-subtitle">Atur persentase bagi hasil untuk setiap franchise</p>
        </div>
        <LoadingSpinner message="Memuat data..." />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Percent className="w-6 h-6 text-primary" />
            Setting Bagi Hasil
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Atur persentase laba bersih yang masuk ke Super Admin
          </p>
        </div>
        <Button 
          onClick={handleSaveAll} 
          disabled={savingId !== null}
          className="gap-2"
        >
          {savingId === 'all' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save size={18} />
          )}
          Simpan Semua
        </Button>
      </div>

      {/* Info Card */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4">
          <p className="text-sm text-foreground">
            <strong>Cara Perhitungan:</strong> Bagi Hasil = Total Penjualan × Persentase Bagi Hasil
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Contoh: Jika total penjualan Rp 10.000.000 dan bagi hasil 10%, maka Super Admin mendapat Rp 1.000.000
          </p>
          <p className="text-xs text-muted-foreground/70 mt-2 italic">
            * Bagi hasil dihitung dari total penjualan tanpa dikurangi HPP atau biaya lainnya
          </p>
        </CardContent>
      </Card>

      {/* Franchise List */}
      {franchises.length === 0 ? (
        <Card className="shadow-md border-border/50">
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-secondary flex items-center justify-center">
              <Store size={32} className="text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-1">Belum ada franchise</h3>
            <p className="text-muted-foreground text-sm">
              Tambahkan franchise terlebih dahulu
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {franchises.map((franchise) => (
            <Card key={franchise.id} className="shadow-md border-border/50 hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Store className="w-4 h-4 text-primary" />
                  {franchise.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor={`profit-${franchise.id}`} className="text-sm">
                      Persentase Bagi Hasil
                    </Label>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Input
                          id={`profit-${franchise.id}`}
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={editedValues[franchise.id] || ''}
                          onChange={(e) =>
                            setEditedValues({
                              ...editedValues,
                              [franchise.id]: e.target.value,
                            })
                          }
                          className="pr-8"
                          disabled={savingId !== null}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                          %
                        </span>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleSave(franchise.id)}
                        disabled={!hasChanges(franchise.id) || savingId !== null}
                        className="h-10"
                      >
                        {savingId === franchise.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Saat ini: <span className="font-medium text-foreground">{franchise.profitSharingPercent}%</span>
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
