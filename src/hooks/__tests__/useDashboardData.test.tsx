import React from 'react';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ userId: 'account-a', fetch: vi.fn() }));
vi.mock('../useAuth', () => ({ useAuth: () => ({ user: { id: mocks.userId } }) }));
vi.mock('@/lib/dashboardData', () => ({ fetchDashboardData: mocks.fetch }));
import { useDashboardData } from '../useDashboardData';

const clients: QueryClient[] = [];
function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, retryDelay: 0 } } });
  clients.push(client);
  return ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
afterEach(() => { cleanup(); clients.splice(0).forEach(c => c.clear()); mocks.fetch.mockReset(); mocks.userId = 'account-a'; });

it('shows cached cards on returning, updates in the background, and preserves them if refreshing fails', async () => {
  mocks.fetch.mockResolvedValue({ valorEmEstoque: 130 });
  const wrapper = setup();
  const first = renderHook(() => useDashboardData(), { wrapper });
  await waitFor(() => expect(first.result.current.data.valorEmEstoque).toBe(130));
  first.unmount();
  let finish!: (value: any) => void;
  mocks.fetch.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const second = renderHook(() => useDashboardData(), { wrapper });
  expect(second.result.current.data).toMatchObject({ valorEmEstoque: 130, loading: false, updating: true });
  await act(async () => finish({ valorEmEstoque: 145 }));
  await waitFor(() => expect(second.result.current.data.valorEmEstoque).toBe(145));
  mocks.fetch.mockRejectedValue(new Error('offline'));
  await act(async () => { await second.result.current.refreshData(); });
  await waitFor(() => expect(second.result.current.data.error).not.toBeNull());
  expect(second.result.current.data).toMatchObject({ valorEmEstoque: 145, loading: false, hasData: true });
});

it('does not expose cached values or late responses from another account', async () => {
  mocks.fetch.mockResolvedValueOnce({ valorEmEstoque: 130 });
  const { result, rerender } = renderHook(() => useDashboardData(), { wrapper: setup() });
  await waitFor(() => expect(result.current.data.valorEmEstoque).toBe(130));
  let finishOld!: (value: any) => void;
  mocks.fetch.mockImplementationOnce(() => new Promise(resolve => { finishOld = resolve; }));
  act(() => { void result.current.refreshData(); });
  mocks.fetch.mockImplementation(() => new Promise(() => {}));
  mocks.userId = 'account-b'; rerender();
  expect(result.current.data).toMatchObject({ valorEmEstoque: 0, hasData: false, loading: true });
  await act(async () => finishOld({ valorEmEstoque: 999 }));
  expect(result.current.data).toMatchObject({ valorEmEstoque: 0, hasData: false });
  expect(mocks.fetch).toHaveBeenLastCalledWith('account-b', expect.any(String), expect.any(String), expect.any(AbortSignal));
});

it('does not fetch the unused customer dashboard when the admin dashboard is shown', () => {
  const { result } = renderHook(() => useDashboardData(false), { wrapper: setup() });
  expect(mocks.fetch).not.toHaveBeenCalled();
  expect(result.current.data.loading).toBe(false);
});

it('reports an initial failure without claiming that the stock is zero', async () => {
  mocks.fetch.mockRejectedValue(new Error('offline'));
  const { result } = renderHook(() => useDashboardData(), { wrapper: setup() });
  await waitFor(() => expect(result.current.data.error).not.toBeNull());
  expect(result.current.data).toMatchObject({ hasData: false, loading: false });
});
