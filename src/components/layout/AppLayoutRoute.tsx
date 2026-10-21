import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { AppLayout } from './AppLayout';

export const AppLayoutRoute = () => (
  <AppLayout>
    <Suspense fallback={<div role="status" className="flex min-h-40 items-center justify-center text-sm text-muted-foreground">Carregando…</div>}>
      <Outlet />
    </Suspense>
  </AppLayout>
);

export default AppLayoutRoute;
