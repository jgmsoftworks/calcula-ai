import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type SubscriptionStatus = 'active' | 'past_due' | 'canceled';

export interface SubscriptionIssue {
  id: string;
  issue_type: 'payment_failed' | 'subscription_canceled' | 'past_due';
  status: string;
  amount_due: number | null;
  currency: string | null;
  failure_reason: string | null;
  grace_period_ends_at: string | null;
  next_retry_at: string | null;
  created_at: string;
}

export function useSubscriptionStatus() {
  const { user, isAdmin } = useAuth();
  const [status, setStatus] = useState<SubscriptionStatus>('active');
  const [accessBlockedAt, setAccessBlockedAt] = useState<string | null>(null);
  const [openIssue, setOpenIssue] = useState<SubscriptionIssue | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_status, access_blocked_at')
        .eq('user_id', user.id)
        .maybeSingle();

      const s = ((profile as any)?.subscription_status as SubscriptionStatus) || 'active';
      setStatus(s);
      setAccessBlockedAt((profile as any)?.access_blocked_at || null);

      if (s !== 'active') {
        const { data: issue } = await supabase
          .from('subscription_issues')
          .select('id, issue_type, status, amount_due, currency, failure_reason, grace_period_ends_at, next_retry_at, created_at')
          .eq('user_id', user.id)
          .in('status', ['pending', 'contacted'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        setOpenIssue((issue as any) || null);
      } else {
        setOpenIssue(null);
      }
    } catch (e) {
      // fail open
      console.warn('[useSubscriptionStatus] error', e);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchStatus();
    const onFocus = () => fetchStatus();
    window.addEventListener('focus', onFocus);
    const t = setInterval(fetchStatus, 60_000);
    return () => {
      window.removeEventListener('focus', onFocus);
      clearInterval(t);
    };
  }, [fetchStatus]);

  const now = Date.now();
  const graceEnds = openIssue?.grace_period_ends_at ? new Date(openIssue.grace_period_ends_at).getTime() : null;
  const inGracePeriod = status === 'past_due' && graceEnds !== null && graceEnds > now;

  // Admin nunca é bloqueado
  const isBlocked = !isAdmin && (status === 'canceled' || !!accessBlockedAt || (status === 'past_due' && graceEnds !== null && graceEnds <= now));
  const showWarning = !isAdmin && status !== 'active';

  return {
    loading,
    status,
    accessBlockedAt,
    openIssue,
    isBlocked,
    showWarning,
    inGracePeriod,
    refresh: fetchStatus,
  };
}
