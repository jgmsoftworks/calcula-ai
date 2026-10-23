import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
const mocks = vi.hoisted(() => ({ userId: 'account-a', from: vi.fn(), rpc: vi.fn() }));
vi.mock('../useAuth', () => ({ useAuth: () => ({ user: { id: mocks.userId }, isAdmin: false }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: mocks.from, rpc: mocks.rpc } }));
import { usePlanLimits } from '../usePlanLimits';
afterEach(() => { cleanup(); mocks.from.mockReset(); mocks.rpc.mockReset(); mocks.userId = 'account-a'; });

describe('shared plan reads', () => {
  it('loads once for simultaneous consumers, separates accounts and still checks write limits on the server', async () => {
    mocks.from.mockImplementation(() => {
      const account = mocks.userId;
      const query: any = { maybeSingle: () => Promise.resolve({ data: { plan: account === 'account-a' ? 'enterprise' : 'lite', plan_expires_at: null }, error: null }) };
      for (const method of ['select', 'eq', 'abortSignal']) query[method] = () => query;
      return query;
    });
    mocks.rpc.mockResolvedValue({ data: { allowed: false, reason: 'limit_reached', current_count: 5, max_allowed: 5, plan: 'lite' }, error: null });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    const { result, rerender } = renderHook(() => [usePlanLimits(), usePlanLimits(), usePlanLimits()], { wrapper });
    await waitFor(() => expect(result.current.every(plan => plan.currentPlan === 'enterprise')).toBe(true));
    expect(mocks.from).toHaveBeenCalledTimes(1);
    expect(await result.current[0].checkLimit('produtos')).toEqual({ allowed: false, reason: 'limit_reached', currentCount: 5, maxAllowed: 5, plan: 'lite' });
    expect(mocks.rpc).toHaveBeenCalledWith('check_plan_limits', { user_uuid: 'account-a', feature_type: 'produtos', feature_count: 1 });
    mocks.userId = 'account-b'; rerender();
    expect(result.current[0].currentPlan).toBe('lite');
    await waitFor(() => expect(result.current[0].loading).toBe(false));
    expect(mocks.from).toHaveBeenCalledTimes(2);
    client.clear();
  });
});
