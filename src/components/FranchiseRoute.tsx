import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { LoadingSpinner } from '@/components/LoadingSpinner';

interface FranchiseRouteProps {
  children: React.ReactNode;
}

export function FranchiseRoute({ children }: FranchiseRouteProps) {
  const { user, userRole, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner message="Memuat..." />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (userRole !== 'franchise') {
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
}
