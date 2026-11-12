import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useNotifications } from '../useNotifications';

type Notice = { id: string; title: string; message: string; type: string; read: boolean; created_at: string };
type Result = { data: Notice[] | null; error: Error | null };
const mocks = vi.hoisted(() => ({
  userId: 'account-a' as string | null, from: vi.fn(), read: vi.fn(), write: vi.fn(), channel: vi.fn(), removeChannel: vi.fn(),
  callbacks: [] as ((payload: { new: Notice }) => void)[],
}));
vi.mock('../useAuth', () => ({ useAuth: () => ({ user: mocks.userId ? { id: mocks.userId } : null }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: mocks.from, channel: mocks.channel, removeChannel: mocks.removeChannel } }));
const notice = (id: string): Notice => ({ id, title: id, message: 'synthetic', type: 'info', read: false, created_at: '2026-11-12T12:00:00Z' });

beforeEach(() => {
  mocks.userId = 'account-a'; mocks.callbacks = [];
  const query = { select: () => query, eq: () => query, update: () => query, order: () => query, limit: mocks.read,
    then: (resolve: (value: { error: null }) => unknown) => mocks.write().then(resolve) };
  mocks.from.mockReturnValue(query);
  mocks.read.mockResolvedValue({ data: [], error: null });
  mocks.channel.mockImplementation(() => {
    const channel = { on: (_event: string, _filter: unknown, callback: (payload: { new: Notice }) => void) => { mocks.callbacks.push(callback); return channel; }, subscribe: () => channel };
    return channel;
  });
});
afterEach(() => { cleanup(); vi.resetAllMocks(); });

it('clears data on account changes and ignores an older account response and subscription', async () => {
  let finish!: (value: Result) => void;
  mocks.read.mockImplementationOnce(() => new Promise<Result>(resolve => { finish = resolve; }));
  const { result, rerender } = renderHook(() => useNotifications());
  const oldEvent = mocks.callbacks[0];
  mocks.read.mockResolvedValueOnce({ data: [notice('account-b-notice')], error: null });
  mocks.userId = 'account-b'; rerender();
  await waitFor(() => expect(result.current.loading).toBe(false));
  await act(async () => { finish({ data: [notice('outdated-account-a')], error: null }); oldEvent({ new: notice('late-event') }); });
  expect(result.current.notifications.map(row => row.id)).toEqual(['account-b-notice']);
  expect(mocks.removeChannel).toHaveBeenCalledTimes(1);
});

it('finishes loading with no session and clears previously loaded notifications', async () => {
  mocks.read.mockResolvedValueOnce({ data: [notice('old')], error: null });
  const { result, rerender } = renderHook(() => useNotifications());
  await waitFor(() => expect(result.current.unreadCount).toBe(1));
  mocks.userId = null; rerender();
  expect(result.current.notifications).toEqual([]);
  expect(result.current.loading).toBe(false);
  expect(result.current.unreadCount).toBe(0);
});

it('does not duplicate a notification already returned by the initial query', async () => {
  mocks.read.mockResolvedValueOnce({ data: [notice('same')], error: null });
  const { result } = renderHook(() => useNotifications());
  await waitFor(() => expect(result.current.loading).toBe(false));
  act(() => mocks.callbacks[0]({ new: notice('same') }));
  expect(result.current.notifications.map(row => row.id)).toEqual(['same']);
  expect(result.current.unreadCount).toBe(1);
});

it('does not mark the new account notifications as read when an old write finishes', async () => {
  mocks.read.mockResolvedValueOnce({ data: [notice('account-a')], error: null });
  const { result, rerender } = renderHook(() => useNotifications());
  await waitFor(() => expect(result.current.loading).toBe(false));
  let finish!: (result: { error: null }) => void;
  mocks.write.mockImplementationOnce(() => new Promise<{ error: null }>(resolve => { finish = resolve; }));
  let pending!: Promise<void>;
  act(() => { pending = result.current.markAllAsRead(); });
  await waitFor(() => expect(mocks.write).toHaveBeenCalledTimes(1));
  mocks.read.mockResolvedValueOnce({ data: [notice('account-b')], error: null });
  mocks.userId = 'account-b'; rerender();
  await waitFor(() => expect(result.current.loading).toBe(false));
  await act(async () => { finish({ error: null }); await pending; });
  expect(result.current.notifications.map(row => row.id)).toEqual(['account-b']);
  expect(result.current.unreadCount).toBe(1);
});
