import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-wa-bg text-white">
        <div className="rounded-3xl border border-white/10 bg-white/5 px-6 py-4 text-sm text-slate-300 shadow-soft">
          Loading secure chat...
        </div>
      </div>
    );
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}
