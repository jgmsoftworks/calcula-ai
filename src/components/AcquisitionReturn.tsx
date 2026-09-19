import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { acquisitionDestination, consumeAcquisition, rememberAcquisition } from '@/lib/acquisition';
export function AcquisitionReturn() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    if (location.pathname !== '/' || loading || !user) return;
    rememberAcquisition(location.search);
    const target = acquisitionDestination(location.search);
    consumeAcquisition();
    if (target !== '/') navigate(target, { replace: true });
  }, [user, loading, location.pathname, location.search, navigate]);
  return null;
}
