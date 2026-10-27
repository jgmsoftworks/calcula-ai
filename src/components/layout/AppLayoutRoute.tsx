import { localizeText } from '@/i18n/localizeText';
import { useTranslation as usePortugalTranslation } from 'react-i18next';
import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { AppLayout } from './AppLayout';
import { PlanLimitProvider } from '@/contexts/PlanLimitContext';

export const AppLayoutRoute = () => { usePortugalTranslation(); return (
  <PlanLimitProvider><AppLayout>
    <Suspense fallback={<div role="status" className="flex min-h-40 items-center justify-center text-sm text-muted-foreground">{localizeText("Carregando…")}</div>}>
      <Outlet />
    </Suspense>
  </AppLayout></PlanLimitProvider>
); };

export default AppLayoutRoute;
