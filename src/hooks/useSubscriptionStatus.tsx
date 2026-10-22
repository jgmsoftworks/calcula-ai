import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface AccountAccess {
  can_access: boolean;
  reason: 'admin' | 'active' | 'trial_active' | 'trial_expired' | 'payment_required' | 'profile_missing';
  server_now: string;
  access_mode: 'legacy' | 'trial' | 'subscription';
  plan: string;
  trial_ends_at: string | null;
  subscription_status: 'active' | 'past_due' | 'canceled';
  grace_period_ends_at: string | null;
  access_blocked_at: string | null;
  is_admin: boolean;
  has_subscription: boolean;
}

export function useSubscriptionStatus() {
  const { user } = useAuth();
  const [, tick] = useState(0);
  const query = useQuery({
    queryKey: ['account-access', user?.id],
    enabled: !!user?.id,
    queryFn: async ({ signal }) => {
      const { data, error } = await supabase.rpc('get_my_access').abortSignal(signal);
      if (error) throw error;
      const access = data as unknown as AccountAccess;
      if (!access || access.reason === 'profile_missing' || !Number.isFinite(Date.parse(access.server_now))) {
        throw new Error('Não foi possível conferir seu acesso. Tente novamente.');
      }
      return { access, receivedAt: performance.now() };
    },
    staleTime: 15_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: 'always',
    retry: 2,
  });
  const access = query.data?.access;
  // Count from the server clock, not the device's date/time setting.
  const serverNow = access ? Date.parse(access.server_now) + Math.max(0, performance.now() - query.data.receivedAt) : 0;
  const trialRemaining = access?.trial_ends_at ? Date.parse(access.trial_ends_at) - serverNow : 0;
  const graceRemaining = access?.grace_period_ends_at ? Date.parse(access.grace_period_ends_at) - serverNow : 0;
  const isTrial = access?.access_mode === 'trial' && !access.is_admin;
  const trialExpired = isTrial && trialRemaining <= 0;
  const inGracePeriod = access?.subscription_status === 'past_due' && graceRemaining > 0;
  const graceExpired = access?.subscription_status === 'past_due' && !inGracePeriod;

  useEffect(() => {
    const interval = window.setInterval(() => tick(n => n + 1), 60_000);
    const data = query.data;
    const state = data?.access;
    const end = state?.access_mode === 'trial' ? state.trial_ends_at : state?.subscription_status === 'past_due' ? state.grace_period_ends_at : null;
    const remaining = end && data ? Date.parse(end) - Date.parse(state.server_now) - Math.max(0, performance.now() - data.receivedAt) : 0;
    const expiry = remaining > 0 ? window.setTimeout(() => tick(n => n + 1), Math.min(remaining + 20, 2_147_483_647)) : undefined;
    return () => { window.clearInterval(interval); window.clearTimeout(expiry); };
  }, [query.data]);

  return {
    loading: !!user && query.isPending,
    error: query.isError,
    status: access?.subscription_status,
    accessBlockedAt: access?.access_blocked_at,
    isBlocked: !access?.is_admin && (!access?.can_access || trialExpired || graceExpired),
    showWarning: !access?.is_admin && access?.subscription_status === 'past_due',
    inGracePeriod,
    graceEndsAt: access?.grace_period_ends_at,
    isTrial,
    trialExpired,
    trialEndsAt: access?.trial_ends_at,
    daysRemaining: isTrial ? Math.max(0, Math.ceil(trialRemaining / 86_400_000)) : 0,
    hasSubscription: !!access?.has_subscription,
    refresh: query.refetch,
  };
}
