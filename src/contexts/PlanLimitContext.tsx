import { createContext, useContext } from 'react';

import { type PlanFeature, type PlanLimitResult } from '@/lib/plan-access';

export interface LimitNotice { feature: PlanFeature; result: PlanLimitResult }
interface PlanGate {
  requestAccess: (feature: PlanFeature) => Promise<boolean>;
  consumePdfExport: () => Promise<boolean>;
}
export const PlanLimitContext = createContext<PlanGate | null>(null);

export function usePlanGate() {
  const context = useContext(PlanLimitContext);
  if (!context) throw new Error('usePlanGate requires PlanLimitProvider');
  return context;
}
