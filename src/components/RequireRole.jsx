import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function RequireRole({ role, children }) {
  const { user, profile, loading } = useAuth();
  if (loading) return <div className="page" style={{ placeItems: 'center', display: 'grid' }}>Loading…</div>;
  if (!user || !profile) return <Navigate to="/login" replace />;
  const ok = role === 'admin' ? profile.role === 'admin' : profile.role === role || profile.role === 'admin';
  if (!ok) return <Navigate to="/" replace />;
  return children;
}
