import { createContext, lazy, Suspense, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { isPlanLimit, normalizeLimitResult, type PlanFeature, type PlanLimitResult } from '@/lib/plan-access';
import { supabase } from '@/integrations/supabase/client';

const PlanLimitDialog = lazy(() => import('@/components/planos/PlanLimitDialog'));
interface LimitNotice { feature: PlanFeature; result: PlanLimitResult }
interface PlanGate {
  requestAccess: (feature: PlanFeature) => Promise<boolean>;
  consumePdfExport: () => Promise<boolean>;
}
const PlanLimitContext = createContext<PlanGate | null>(null);

export function PlanLimitProvider({ children }: { children: React.ReactNode }) {
  const { checkLimit } = usePlanLimits();
  const [notice, setNotice] = useState<LimitNotice | null>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const handleResult = useCallback((feature: PlanFeature, result: PlanLimitResult) => {
    if (result.allowed) return true;
    if (isPlanLimit(result)) {
      setNotice({ feature, result });
    } else {
      toast.error(result.reason === 'access_expired'
        ? 'Seu acesso terminou. Escolha um plano para continuar.'
        : 'Não foi possível conferir seu plano. Tente novamente.');
    }
    return false;
  }, []);
  const requestAccess = useCallback(async (feature: PlanFeature) => {
    returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    return handleResult(feature, await checkLimit(feature));
  }, [checkLimit, handleResult]);

  const consumePdfExport = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('consume_pdf_export');
      if (error) throw error;
      return handleResult('pdf_exports', normalizeLimitResult(data));
    } catch {
      toast.error('Não foi possível autorizar a ficha técnica. Tente novamente.');
      return false;
    }
  }, [handleResult]);

  const gate = useMemo(() => ({ requestAccess, consumePdfExport }), [requestAccess, consumePdfExport]);
  return (
    <PlanLimitContext.Provider value={gate}>
      {children}
      {notice && <Suspense fallback={null}>
        <PlanLimitDialog {...notice} onClose={() => setNotice(null)} onReturnFocus={() => returnFocus.current?.focus()} />
      </Suspense>}
    </PlanLimitContext.Provider>
  );
}

export function usePlanGate() {
  const context = useContext(PlanLimitContext);
  if (!context) throw new Error('usePlanGate requires PlanLimitProvider');
  return context;
}
