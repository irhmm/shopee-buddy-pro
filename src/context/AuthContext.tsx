import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type AppRole = 'super_admin' | 'franchise';

export interface Franchise {
  id: string;
  name: string;
  userId: string;
  profitSharingPercent: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: AppRole | null;
  franchiseId: string | null;
  franchiseInfo: Franchise | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<AppRole | null>(null);
  const [franchiseId, setFranchiseId] = useState<string | null>(null);
  const [franchiseInfo, setFranchiseInfo] = useState<Franchise | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserRole = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user role:', error);
        return null;
      }

      return data?.role as AppRole | null;
    } catch (error) {
      console.error('Error fetching user role:', error);
      return null;
    }
  }, []);

  const fetchFranchiseInfo = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('franchises')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching franchise info:', error);
        return null;
      }

      if (data) {
        return {
          id: data.id,
          name: data.name,
          userId: data.user_id,
          profitSharingPercent: Number(data.profit_sharing_percent),
          isActive: data.is_active,
          createdAt: new Date(data.created_at),
          updatedAt: new Date(data.updated_at),
        } as Franchise;
      }

      return null;
    } catch (error) {
      console.error('Error fetching franchise info:', error);
      return null;
    }
  }, []);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        // Defer Supabase calls with setTimeout to avoid deadlocks
        if (session?.user) {
          setTimeout(async () => {
            const role = await fetchUserRole(session.user.id);
            setUserRole(role);

            if (role === 'franchise') {
              const franchise = await fetchFranchiseInfo(session.user.id);
              setFranchiseInfo(franchise);
              setFranchiseId(franchise?.id || null);
            } else {
              setFranchiseInfo(null);
              setFranchiseId(null);
            }
            setLoading(false);
          }, 0);
        } else {
          setUserRole(null);
          setFranchiseId(null);
          setFranchiseInfo(null);
          setLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        setTimeout(async () => {
          const role = await fetchUserRole(session.user.id);
          setUserRole(role);

          if (role === 'franchise') {
            const franchise = await fetchFranchiseInfo(session.user.id);
            setFranchiseInfo(franchise);
            setFranchiseId(franchise?.id || null);
          }
          setLoading(false);
        }, 0);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchUserRole, fetchFranchiseInfo]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error(error.message);
      return { error };
    }

    toast.success('Login berhasil!');
    return { error: null };
  };

  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });

    if (error) {
      toast.error(error.message);
      return { error };
    }

    toast.success('Registrasi berhasil! Cek email untuk konfirmasi.');
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setUserRole(null);
    setFranchiseId(null);
    setFranchiseInfo(null);
    toast.success('Logout berhasil');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        userRole,
        franchiseId,
        franchiseInfo,
        loading,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
