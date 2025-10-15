import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export default function FornecedorProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isFornecedor } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!isFornecedor) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
