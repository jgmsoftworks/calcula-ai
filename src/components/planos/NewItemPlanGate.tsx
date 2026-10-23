import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { usePlanGate } from '@/contexts/PlanLimitContext';
import type { PlanFeature } from '@/lib/plan-access';

/** Also guards direct URLs before mounting a new-item form. Editing stays available. */
export function NewItemPlanGate({ feature, children, onBack }: { feature: PlanFeature; children: React.ReactNode; onBack: () => void }) {
  const { requestAccess } = usePlanGate();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  useEffect(() => {
    let active = true;
    void requestAccess(feature).then(value => { if (active) setAllowed(value); });
    return () => { active = false; };
  }, [feature, requestAccess]);
  if (allowed) return <>{children}</>;
  return <div className="flex min-h-64 flex-col items-center justify-center gap-4 text-center">
    <p role="status" className="text-sm text-muted-foreground">{allowed === null ? 'Conferindo seu plano…' : 'Seu cadastro continua salvo. Você pode voltar ou conhecer outros planos.'}</p>
    {allowed === false && <Button variant="outline" onClick={onBack}>Voltar</Button>}
  </div>;
}
