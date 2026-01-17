import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShoppingBag, Loader2, Mail, Lock, AlertCircle } from 'lucide-react';
import { z } from 'zod';

const emailSchema = z.string().email('Email tidak valid');
const passwordSchema = z.string().min(6, 'Password minimal 6 karakter');

export default function AuthPage() {
  const { user, userRole, signIn, signUp, loading } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('login');
  
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginErrors, setLoginErrors] = useState<{ email?: string; password?: string }>({});
  
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [signupErrors, setSignupErrors] = useState<{ email?: string; password?: string; confirmPassword?: string }>({});

  useEffect(() => {
    if (user && userRole && !loading) {
      if (userRole === 'super_admin') {
        navigate('/admin', { replace: true });
      } else if (userRole === 'franchise') {
        navigate('/', { replace: true });
      }
    }
  }, [user, userRole, loading, navigate]);

  const validateLogin = () => {
    const errors: { email?: string; password?: string } = {};
    
    try {
      emailSchema.parse(loginEmail);
    } catch {
      errors.email = 'Email tidak valid';
    }
    
    try {
      passwordSchema.parse(loginPassword);
    } catch {
      errors.password = 'Password minimal 6 karakter';
    }
    
    setLoginErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateSignup = () => {
    const errors: { email?: string; password?: string; confirmPassword?: string } = {};
    
    try {
      emailSchema.parse(signupEmail);
    } catch {
      errors.email = 'Email tidak valid';
    }
    
    try {
      passwordSchema.parse(signupPassword);
    } catch {
      errors.password = 'Password minimal 6 karakter';
    }
    
    if (signupPassword !== signupConfirmPassword) {
      errors.confirmPassword = 'Password tidak cocok';
    }
    
    setSignupErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateLogin()) return;
    
    setIsSubmitting(true);
    await signIn(loginEmail, loginPassword);
    setIsSubmitting(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateSignup()) return;
    
    setIsSubmitting(true);
    await signUp(signupEmail, signupPassword);
    setIsSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-background to-secondary/20 p-4">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 gradient-primary rounded-xl flex items-center justify-center shadow-lg">
          <ShoppingBag className="w-7 h-7 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Rekap Shopee</h1>
          <p className="text-sm text-muted-foreground">Multi Franchise System</p>
        </div>
      </div>

      <Card className="w-full max-w-md shadow-xl border-border/50">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-xl">Selamat Datang</CardTitle>
          <CardDescription>
            Masuk untuk mengelola penjualan franchise
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="email@example.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="pl-10"
                      disabled={isSubmitting}
                    />
                  </div>
                  {loginErrors.email && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {loginErrors.email}
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="pl-10"
                      disabled={isSubmitting}
                    />
                  </div>
                  {loginErrors.password && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {loginErrors.password}
                    </p>
                  )}
                </div>
                
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Masuk
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="register">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="email@example.com"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      className="pl-10"
                      disabled={isSubmitting}
                    />
                  </div>
                  {signupErrors.email && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {signupErrors.email}
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      className="pl-10"
                      disabled={isSubmitting}
                    />
                  </div>
                  {signupErrors.password && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {signupErrors.password}
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-confirm-password">Konfirmasi Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="signup-confirm-password"
                      type="password"
                      placeholder="••••••••"
                      value={signupConfirmPassword}
                      onChange={(e) => setSignupConfirmPassword(e.target.value)}
                      className="pl-10"
                      disabled={isSubmitting}
                    />
                  </div>
                  {signupErrors.confirmPassword && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {signupErrors.confirmPassword}
                    </p>
                  )}
                </div>
                
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Daftar
                </Button>
              </form>
              
              <p className="text-xs text-muted-foreground text-center mt-4">
                Setelah mendaftar, hubungi Super Admin untuk aktivasi akun franchise.
              </p>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      <p className="text-sm text-muted-foreground mt-6">
        Sistem Rekap Penjualan Shopee - Multi Franchise
      </p>
    </div>
  );
}
