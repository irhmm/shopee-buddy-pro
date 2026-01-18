import { Info, Calculator, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";
import { useApp } from "@/context/AppContext";

interface CalculationGuideProps {
  showProfitSharing?: boolean;
  showExpenditure?: boolean;
  compact?: boolean;
}

export function CalculationGuide({ 
  showProfitSharing = false, 
  showExpenditure = false,
  compact = false 
}: CalculationGuideProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { settings } = useApp();

  const adminPercent = settings?.adminFeePercent ?? 5;
  const fixedDeduction = settings?.fixedDeduction ?? 1000;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="my-4">
      <Card className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-200/50 dark:border-blue-800/50">
        <CollapsibleTrigger asChild>
          <button className="w-full p-3 flex items-center justify-between hover:bg-blue-100/50 dark:hover:bg-blue-900/30 transition-colors rounded-lg">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-blue-100 dark:bg-blue-900/50">
                <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="font-medium text-sm text-blue-900 dark:text-blue-100">
                Panduan Perhitungan
              </span>
            </div>
            {isOpen ? (
              <ChevronUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            )}
          </button>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className={`pt-0 ${compact ? 'pb-3 px-3' : 'pb-4 px-4'}`}>
            <div className="space-y-4">
              {/* Rumus Perhitungan */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-blue-800 dark:text-blue-200">
                  <Calculator className="w-4 h-4" />
                  <span>Rumus Perhitungan</span>
                </div>
                
                <div className="space-y-3 text-xs">
                  {/* Total Penjualan */}
                  <div className="p-2.5 rounded-md bg-white/70 dark:bg-gray-800/50 border border-blue-100 dark:border-blue-800/30">
                    <div className="font-semibold text-foreground mb-1">1. Total Penjualan</div>
                    <div className="text-muted-foreground mb-1.5">
                      <code className="bg-blue-100 dark:bg-blue-900/50 px-1.5 py-0.5 rounded text-blue-700 dark:text-blue-300">
                        Harga Jual × Quantity
                      </code>
                    </div>
                    <div className="text-muted-foreground/80 italic">
                      Contoh: {formatCurrency(50000)} × 10 = {formatCurrency(500000)}
                    </div>
                  </div>

                  {/* HPP */}
                  <div className="p-2.5 rounded-md bg-white/70 dark:bg-gray-800/50 border border-blue-100 dark:border-blue-800/30">
                    <div className="font-semibold text-foreground mb-1">2. HPP (Harga Pokok Penjualan)</div>
                    <div className="text-muted-foreground mb-1.5">
                      <code className="bg-blue-100 dark:bg-blue-900/50 px-1.5 py-0.5 rounded text-blue-700 dark:text-blue-300">
                        Harga Pokok × Quantity
                      </code>
                    </div>
                    <div className="text-muted-foreground/80 italic">
                      Contoh: {formatCurrency(30000)} × 10 = {formatCurrency(300000)}
                    </div>
                  </div>

                  {/* Biaya Admin */}
                  <div className="p-2.5 rounded-md bg-white/70 dark:bg-gray-800/50 border border-blue-100 dark:border-blue-800/30">
                    <div className="font-semibold text-foreground mb-1">3. Biaya Admin Shopee</div>
                    <div className="text-muted-foreground mb-1.5">
                      <code className="bg-blue-100 dark:bg-blue-900/50 px-1.5 py-0.5 rounded text-blue-700 dark:text-blue-300">
                        (Total Penjualan × {adminPercent}%) + {formatCurrency(fixedDeduction)}
                      </code>
                    </div>
                    <div className="text-muted-foreground/80 italic">
                      Contoh: ({formatCurrency(500000)} × {adminPercent}%) + {formatCurrency(fixedDeduction)} = {formatCurrency(500000 * (adminPercent / 100) + fixedDeduction)}
                    </div>
                  </div>

                  {/* Laba Bersih */}
                  <div className="p-2.5 rounded-md bg-green-50/70 dark:bg-green-900/20 border border-green-200 dark:border-green-800/30">
                    <div className="font-semibold text-green-800 dark:text-green-200 mb-1">4. Laba Bersih</div>
                    <div className="text-muted-foreground mb-1.5">
                      <code className="bg-green-100 dark:bg-green-900/50 px-1.5 py-0.5 rounded text-green-700 dark:text-green-300">
                        Total Penjualan - HPP - Biaya Admin
                      </code>
                    </div>
                    <div className="text-muted-foreground/80 italic">
                      Contoh: {formatCurrency(500000)} - {formatCurrency(300000)} - {formatCurrency(500000 * (adminPercent / 100) + fixedDeduction)} = {formatCurrency(500000 - 300000 - (500000 * (adminPercent / 100) + fixedDeduction))}
                    </div>
                  </div>

                  {/* Bagi Hasil */}
                  {showProfitSharing && (
                    <div className="p-2.5 rounded-md bg-purple-50/70 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800/30">
                      <div className="font-semibold text-purple-800 dark:text-purple-200 mb-1">5. Bagi Hasil ke Super Admin</div>
                      <div className="text-muted-foreground mb-1.5">
                        <code className="bg-purple-100 dark:bg-purple-900/50 px-1.5 py-0.5 rounded text-purple-700 dark:text-purple-300">
                          Total Penjualan × Persentase Bagi Hasil
                        </code>
                      </div>
                      <div className="text-muted-foreground/80 italic">
                        Dihitung dari total penjualan bulanan, bukan dari laba bersih
                      </div>
                    </div>
                  )}

                  {/* Pengeluaran Operasional */}
                  {showExpenditure && (
                    <div className="p-2.5 rounded-md bg-orange-50/70 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800/30">
                      <div className="font-semibold text-orange-800 dark:text-orange-200 mb-1">Pengeluaran Operasional</div>
                      <div className="text-muted-foreground">
                        Biaya operasional harian yang dicatat terpisah (listrik, kemasan, transportasi, dll). 
                        Tidak termasuk dalam perhitungan Laba Bersih otomatis.
                      </div>
                    </div>
                  )}

                  {/* Laba Real */}
                  {showProfitSharing && showExpenditure && (
                    <div className="p-2.5 rounded-md bg-emerald-50/70 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/30">
                      <div className="font-semibold text-emerald-800 dark:text-emerald-200 mb-1">6. Laba Real (Profit Riil)</div>
                      <div className="text-muted-foreground mb-1.5">
                        <code className="bg-emerald-100 dark:bg-emerald-900/50 px-1.5 py-0.5 rounded text-emerald-700 dark:text-emerald-300">
                          Total Penjualan - HPP - Biaya Admin - Pengeluaran - Bagi Hasil
                        </code>
                      </div>
                      <div className="text-muted-foreground/80 italic">
                        Keuntungan riil franchise setelah semua potongan (HPP, admin, operasional, bagi hasil)
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Catatan */}
              <div className="p-2.5 rounded-md bg-amber-50/70 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30">
                <div className="font-semibold text-amber-800 dark:text-amber-200 mb-1.5 text-xs">📝 Catatan Penting</div>
                <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Pengeluaran di grafik = HPP + Biaya Admin</li>
                  <li>Pengaturan Biaya Admin dapat diubah di halaman Pengaturan</li>
                  {showProfitSharing && (
                    <li>Persentase Bagi Hasil ditentukan oleh Super Admin</li>
                  )}
                </ul>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
