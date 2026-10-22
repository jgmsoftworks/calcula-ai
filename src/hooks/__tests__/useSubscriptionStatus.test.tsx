import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
const mocks = vi.hoisted(() => ({ id: 'trial-a', rpc: vi.fn() }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: mocks.id } }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: mocks.rpc } }));
import { useSubscriptionStatus } from '../useSubscriptionStatus';
const clients: QueryClient[] = [];
afterEach(() => { cleanup(); clients.forEach(c => c.clear()); clients.length = 0; mocks.rpc.mockReset(); mocks.id = 'trial-a'; });
function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } }); clients.push(client);
  return ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
const trial = { can_access: true, reason: 'trial_active', server_now: '2020-01-01T00:00:00Z', access_mode: 'trial', plan: 'lite', trial_ends_at: '2020-01-08T00:00:00Z', subscription_status: 'active', is_admin: false, has_subscription: false };
describe('server-authoritative account access', () => {
  it('shares the request, uses server time and never reuses another account entitlement', async () => {
    mocks.rpc.mockImplementation(() => ({ abortSignal: () => Promise.resolve({ data: mocks.id === 'trial-a' ? trial : { ...trial, can_access: false, trial_ends_at: trial.server_now }, error: null }) }));
    const { result, rerender } = renderHook(() => [useSubscriptionStatus(), useSubscriptionStatus()], { wrapper: setup() });
    await waitFor(() => expect(result.current[0].loading).toBe(false));
    expect(result.current[0].daysRemaining).toBe(7); expect(result.current[0].isBlocked).toBe(false); expect(mocks.rpc).toHaveBeenCalledTimes(1);
    mocks.id = 'trial-b'; rerender(); expect(result.current[0].isBlocked).toBe(true);
    await waitFor(() => expect(result.current[0].loading).toBe(false)); expect(result.current[0].trialExpired).toBe(true);
  });
  it('blocks at the trial boundary without waiting for a reload or the next poll', async () => {
    mocks.rpc.mockReturnValue({ abortSignal: () => Promise.resolve({ data: { ...trial, trial_ends_at: '2020-01-01T00:00:00.150Z' }, error: null }) });
    const { result } = renderHook(useSubscriptionStatus, { wrapper: setup() });
    await waitFor(() => expect(result.current.loading).toBe(false)); expect(result.current.isBlocked).toBe(false);
    await waitFor(() => expect(result.current.trialExpired).toBe(true)); expect(result.current.isBlocked).toBe(true); expect(mocks.rpc).toHaveBeenCalledTimes(1);
  });
});
