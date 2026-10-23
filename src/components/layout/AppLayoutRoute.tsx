import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { AppLayout } from './AppLayout';
import { PlanLimitProvider } from '@/contexts/PlanLimitContext';

export const AppLayoutRoute = () => (
  <PlanLimitProvider><AppLayout>
    <Suspense fallback={<div role="status" className="flex min-h-40 items-center justify-center text-sm text-muted-foreground">Carregando…</div>}>
      <Outlet />
    </Suspense>
  </AppLayout></PlanLimitProvider>
);

export default AppLayoutRoute;
