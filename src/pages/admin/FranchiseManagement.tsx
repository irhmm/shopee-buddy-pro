import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Pagination } from '@/components/Pagination';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Users, 
  Loader2, 
  Store,
  Mail,
  Lock,
  Percent,
  Check,
  X,
  Key
} from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';

interface Franchise {
  id: string;
  name: string;
  userId: string;
  email: string;
  profitSharingPercent: number;
  isActive: boolean;
  createdAt: Date;
}

const ITEMS_PER_PAGE = 10;

export default function FranchiseManagement() {
  const [franchises, setFranchises] = useState<Franchise[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFranchise, setEditingFranchise] = useState<Franchise | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    profitSharingPercent: '10',
  });

  // Password change states
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [selectedFranchise, setSelectedFranchise] = useState<Franchise | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  useEffect(() => {
    fetchFranchises();
  }, []);

  const fetchFranchises = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('franchises')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get emails from auth users
      const franchiseList: Franchise[] = await Promise.all(
        (data || []).map(async (f) => {
          // We can't directly query auth.users, so we'll just show the user_id
          // In a real app, you'd have a profiles table or edge function for this
          return {
            id: f.id,
            name: f.name,
            userId: f.user_id,
            email: `User: ${f.user_id.substring(0, 8)}...`, // Placeholder
            profitSharingPercent: Number(f.profit_sharing_percent),
            isActive: f.is_active,
            createdAt: new Date(f.created_at),
          };
        })
      );

      setFranchises(franchiseList);
    } catch (error) {
      console.error('Error fetching franchises:', error);
      toast.error('Gagal memuat data franchise');
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(franchises.length / ITEMS_PER_PAGE);
  const paginatedFranchises = franchises.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      profitSharingPercent: '10',
    });
    setEditingFranchise(null);
  };

  const handleOpenDialog = (franchise?: Franchise) => {
    if (franchise) {
      setEditingFranchise(franchise);
      setFormData({
        name: franchise.name,
        email: '',
        password: '',
        profitSharingPercent: franchise.profitSharingPercent.toString(),
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (editingFranchise) {
        // Update existing franchise
        const { error } = await supabase
          .from('franchises')
          .update({
            name: formData.name,
            profit_sharing_percent: parseFloat(formData.profitSharingPercent),
          })
          .eq('id', editingFranchise.id);

        if (error) throw error;
        toast.success('Franchise berhasil diperbarui');
      } else {
        // Create new user and franchise
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
          },
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error('Gagal membuat user');

        // Create franchise record
        const { data: franchiseData, error: franchiseError } = await supabase
          .from('franchises')
          .insert({
            name: formData.name,
            user_id: authData.user.id,
            profit_sharing_percent: parseFloat(formData.profitSharingPercent),
          })
          .select()
          .single();

        if (franchiseError) throw franchiseError;

        // Assign franchise role
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: authData.user.id,
            role: 'franchise',
          });

        if (roleError) throw roleError;

        // Create default admin_settings for franchise
        const { error: settingsError } = await supabase
          .from('admin_settings')
          .insert({
            franchise_id: franchiseData.id,
            admin_fee_percent: 5,
            fixed_deduction: 1000,
          });

        if (settingsError) {
          console.error('Error creating settings:', settingsError);
        }

        toast.success('Franchise berhasil ditambahkan');
      }

      setIsDialogOpen(false);
      resetForm();
      fetchFranchises();
    } catch (error: any) {
      console.error('Error saving franchise:', error);
      toast.error(error.message || 'Gagal menyimpan franchise');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (franchise: Franchise) => {
    try {
      const { error } = await supabase
        .from('franchises')
        .update({ is_active: !franchise.isActive })
        .eq('id', franchise.id);

      if (error) throw error;
      
      toast.success(`Franchise ${!franchise.isActive ? 'diaktifkan' : 'dinonaktifkan'}`);
      fetchFranchises();
    } catch (error) {
      console.error('Error toggling franchise status:', error);
      toast.error('Gagal mengubah status franchise');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('franchises')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Franchise berhasil dihapus');
      fetchFranchises();
    } catch (error) {
      console.error('Error deleting franchise:', error);
      toast.error('Gagal menghapus franchise');
    }
  };

  const openPasswordDialog = (franchise: Franchise) => {
    setSelectedFranchise(franchise);
    setNewPassword('');
    setConfirmPassword('');
    setIsPasswordDialogOpen(true);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFranchise) return;

    if (newPassword !== confirmPassword) {
      toast.error('Password tidak cocok');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Password minimal 6 karakter');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const { data, error } = await supabase.functions.invoke('update-user-password', {
        body: {
          user_id: selectedFranchise.userId,
          new_password: newPassword,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      toast.success('Password berhasil diubah');
      setIsPasswordDialogOpen(false);
      setNewPassword('');
      setConfirmPassword('');
      setSelectedFranchise(null);
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast.error(error.message || 'Gagal mengubah password');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="page-header">
          <h1 className="page-title">Kelola Franchise</h1>
          <p className="page-subtitle">Tambah dan kelola franchise yang terdaftar</p>
        </div>
        <LoadingSpinner message="Memuat data franchise..." />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            Kelola Franchise
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {franchises.length} franchise terdaftar
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()} className="gap-2">
              <Plus size={18} />
              Tambah Franchise
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingFranchise ? 'Edit Franchise' : 'Tambah Franchise Baru'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nama Franchise</Label>
                <div className="relative">
                  <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Contoh: Toko Sejahtera"
                    className="pl-10"
                    required
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              {!editingFranchise && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="franchise@example.com"
                        className="pl-10"
                        required
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="Minimal 6 karakter"
                        className="pl-10"
                        required
                        minLength={6}
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="profitSharing">Persentase Bagi Hasil (%)</Label>
                <div className="relative">
                  <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="profitSharing"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={formData.profitSharingPercent}
                    onChange={(e) => setFormData({ ...formData, profitSharingPercent: e.target.value })}
                    className="pl-10"
                    required
                    disabled={isSubmitting}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Persentase dari laba bersih yang masuk ke Super Admin
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false);
                    resetForm();
                  }}
                  disabled={isSubmitting}
                >
                  Batal
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingFranchise ? 'Simpan Perubahan' : 'Tambah Franchise'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Table */}
      <Card className="shadow-md border-border/50">
        <CardContent className="p-0">
          {franchises.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-secondary flex items-center justify-center">
                <Store size={32} className="text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-1">Belum ada franchise</h3>
              <p className="text-muted-foreground text-sm">
                Tambahkan franchise pertama untuk memulai
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-muted/30">
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground text-sm">No</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground text-sm">Nama Franchise</th>
                      <th className="text-center px-4 py-3 font-medium text-muted-foreground text-sm">Bagi Hasil</th>
                      <th className="text-center px-4 py-3 font-medium text-muted-foreground text-sm">Status</th>
                      <th className="text-center px-4 py-3 font-medium text-muted-foreground text-sm">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedFranchises.map((franchise, index) => (
                      <tr key={franchise.id} className="border-t border-border hover:bg-muted/10">
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {(currentPage - 1) * ITEMS_PER_PAGE + index + 1}
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-foreground">{franchise.name}</p>
                            <p className="text-xs text-muted-foreground">{franchise.email}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-violet-500/10 text-violet-600 text-sm font-medium">
                            {franchise.profitSharingPercent}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Switch
                              checked={franchise.isActive}
                              onCheckedChange={() => handleToggleActive(franchise)}
                            />
                            <span className={`text-xs ${franchise.isActive ? 'text-success' : 'text-muted-foreground'}`}>
                              {franchise.isActive ? 'Aktif' : 'Nonaktif'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenDialog(franchise)}
                              className="h-8 w-8 p-0"
                              title="Edit Franchise"
                            >
                              <Pencil size={16} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openPasswordDialog(franchise)}
                              className="h-8 w-8 p-0 text-amber-600 hover:text-amber-700 hover:bg-amber-500/10"
                              title="Ganti Password"
                            >
                              <Key size={16} />
                            </Button>
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
                                  <AlertDialogTitle>Hapus Franchise?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Franchise "{franchise.name}" dan semua datanya akan dihapus permanen. 
                                    Tindakan ini tidak dapat dibatalkan.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Batal</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(franchise.id)}
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
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div className="px-4 py-4 border-t border-border">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={franchises.length}
                    itemsPerPage={ITEMS_PER_PAGE}
                    onPageChange={setCurrentPage}
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Password Change Dialog */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="w-5 h-5 text-amber-600" />
              Ganti Password
            </DialogTitle>
          </DialogHeader>
          <div className="mb-4 p-3 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              Ganti password untuk franchise:
            </p>
            <p className="font-medium text-foreground">{selectedFranchise?.name}</p>
          </div>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">Password Baru</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  className="pl-10"
                  required
                  minLength={6}
                  disabled={isUpdatingPassword}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Konfirmasi Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ketik ulang password"
                  className="pl-10"
                  required
                  minLength={6}
                  disabled={isUpdatingPassword}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsPasswordDialogOpen(false)}
                disabled={isUpdatingPassword}
              >
                Batal
              </Button>
              <Button type="submit" disabled={isUpdatingPassword}>
                {isUpdatingPassword && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Simpan Password
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
