import type { PlanLimits } from '@/hooks/usePlanLimits';

export type PlanFeature = keyof PlanLimits;
export interface PlanLimitResult {
  allowed: boolean;
  reason?: string;
  currentCount?: number;
  maxAllowed?: number;
  plan?: string;
}

export function normalizeLimitResult(data: unknown): PlanLimitResult {
  if (!data || typeof data !== 'object' || typeof (data as Record<string, unknown>).allowed !== 'boolean') {
    return { allowed: false, reason: 'check_error' };
  }
  const value = data as Record<string, unknown>;
  return {
    allowed: value.allowed as boolean,
    ...(typeof value.reason === 'string' && { reason: value.reason }),
    ...(typeof (value.current_count ?? value.currentCount) === 'number' && { currentCount: (value.current_count ?? value.currentCount) as number }),
    ...(typeof (value.max_allowed ?? value.maxAllowed) === 'number' && { maxAllowed: (value.max_allowed ?? value.maxAllowed) as number }),
    ...(typeof value.plan === 'string' && { plan: value.plan }),
  };
}

export const isPlanLimit = (result: PlanLimitResult) =>
  !result.allowed && ['limit_exceeded', 'limit_reached'].includes(result.reason || '');

export const isPlanLimitError = (error: unknown) => {
  const value = error as { code?: string; message?: string } | null;
  return value?.code === '23514' && /limite.*plano|limite do/i.test(value.message || '');
};
