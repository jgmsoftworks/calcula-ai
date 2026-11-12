import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { Json } from '@/integrations/supabase/types';
import { useOptimizedUserConfigurations } from '../useOptimizedUserConfigurations';

type Result = { data: { configuration: Json } | null; error: { message: string } | null };
const mocks = vi.hoisted(() => ({ userId: 'account-a' as string | null, from: vi.fn(), read: vi.fn(), write: vi.fn(), upsert: vi.fn(), eq: vi.fn() }));
vi.mock('../useAuth', () => ({ useAuth: () => ({ user: mocks.userId ? { id: mocks.userId } : null }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: mocks.from } }));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}

beforeEach(() => {
  mocks.userId = 'account-a';
  const query = { select: () => query, eq: mocks.eq, maybeSingle: mocks.read,
    insert: () => query, update: () => query, delete: () => query, upsert: mocks.upsert,
    then: (resolve: (value: { error: null }) => unknown) => mocks.write().then(resolve) };
  mocks.eq.mockReturnValue(query);
  mocks.upsert.mockReturnValue(query);
  mocks.from.mockReturnValue(query);
  mocks.read.mockResolvedValue({ data: null, error: null });
  mocks.write.mockResolvedValue({ error: null });
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => { cleanup(); vi.resetAllMocks(); vi.restoreAllMocks(); });

it('isolates cached values by account, including logout and returning to an earlier account', async () => {
  mocks.read.mockResolvedValueOnce({ data: { configuration: 'logo-a' }, error: null });
  const { result, rerender } = renderHook(() => useOptimizedUserConfigurations());
  expect(await result.current.loadConfiguration('business_logo')).toBe('logo-a');
  mocks.userId = 'account-b'; rerender();
  mocks.read.mockResolvedValueOnce({ data: { configuration: 'logo-b' }, error: null });
  expect(await result.current.loadConfiguration('business_logo')).toBe('logo-b');
  mocks.userId = null; rerender();
  expect(await result.current.loadConfiguration('business_logo')).toBeNull();
  mocks.userId = 'account-a'; rerender();
  expect(await result.current.loadConfiguration('business_logo')).toBeNull();
  expect(mocks.eq).toHaveBeenCalledWith('user_id', 'account-b');
});

it('discards a pending response after an account switch', async () => {
  const pending = deferred<Result>();
  mocks.read.mockReturnValueOnce(pending.promise);
  const { result, rerender } = renderHook(() => useOptimizedUserConfigurations());
  const oldRead = result.current.loadConfiguration('business_logo');
  mocks.userId = 'account-b'; rerender();
  pending.resolve({ data: { configuration: 'old-account' }, error: null });
  expect(await oldRead).toBeNull();
  expect(await result.current.loadConfiguration('business_logo')).toBeNull();
});

it('does not replace a successful save with an older pending read', async () => {
  const pending = deferred<Result>();
  mocks.read.mockReturnValueOnce(pending.promise);
  const { result } = renderHook(() => useOptimizedUserConfigurations());
  const oldRead = result.current.loadConfiguration('business_logo');
  await result.current.saveConfiguration('business_logo', 'new-logo');
  pending.resolve({ data: { configuration: 'old-logo' }, error: null });
  await oldRead;
  expect(await result.current.loadConfiguration('business_logo')).toBe('new-logo');
});

it('invalidates both cached and pending reads without losing a newer request', async () => {
  const old = deferred<Result>();
  const fresh = deferred<Result>();
  mocks.read.mockReturnValueOnce(old.promise).mockReturnValueOnce(fresh.promise);
  const { result } = renderHook(() => useOptimizedUserConfigurations());
  const oldRead = result.current.loadConfiguration('business_logo');
  act(() => result.current.invalidateCache('business_logo'));
  const freshRead = result.current.loadConfiguration('business_logo');
  old.resolve({ data: { configuration: 'old' }, error: null });
  fresh.resolve({ data: { configuration: 'fresh' }, error: null });
  expect(await freshRead).toBe('fresh');
  await oldRead;
  expect(await result.current.loadConfiguration('business_logo')).toBe('fresh');
  expect(mocks.read).toHaveBeenCalledTimes(2);
});

it.each([false, 0, ''])('preserves valid JSON values such as %j', async configuration => {
  mocks.read.mockResolvedValueOnce({ data: { configuration }, error: null });
  const { result } = renderHook(() => useOptimizedUserConfigurations());
  expect(await result.current.loadConfiguration('synthetic-setting')).toBe(configuration);
});

it('shares concurrent reads and re-reads after the existing 30 second cache duration', async () => {
  const now = vi.spyOn(Date, 'now').mockReturnValue(1000);
  mocks.read.mockResolvedValue({ data: { configuration: [100, 200] }, error: null });
  const { result } = renderHook(() => useOptimizedUserConfigurations());
  const values = await Promise.all([result.current.loadConfiguration('faturamentos_historicos'), result.current.loadConfiguration('faturamentos_historicos')]);
  expect(values).toEqual([[100, 200], [100, 200]]);
  expect(mocks.read).toHaveBeenCalledTimes(1);
  now.mockReturnValue(31001);
  await result.current.loadConfiguration('faturamentos_historicos');
  expect(mocks.read).toHaveBeenCalledTimes(2);
});

it('reports write failures and never caches a value that was not saved', async () => {
  mocks.write.mockResolvedValueOnce({ error: { message: 'write failed' } });
  const { result } = renderHook(() => useOptimizedUserConfigurations());
  await expect(result.current.saveConfiguration('business_logo', 'unsaved')).rejects.toMatchObject({ message: 'write failed' });
  expect(await result.current.loadConfiguration('business_logo')).toBeNull();
});

it('saves through the existing account/type unique key without a read-before-write race', async () => {
  const { result } = renderHook(() => useOptimizedUserConfigurations());
  await result.current.saveConfiguration('faturamentos_historicos', [100, 200]);
  expect(mocks.upsert).toHaveBeenCalledWith({ user_id: 'account-a', type: 'faturamentos_historicos', configuration: [100, 200] }, { onConflict: 'user_id,type' });
  expect(mocks.read).not.toHaveBeenCalled();
  expect(await result.current.loadConfiguration('faturamentos_historicos')).toEqual([100, 200]);
});

it('propagates deletion failures, including partial failures in a batch', async () => {
  mocks.write.mockResolvedValue({ error: { message: 'delete failed' } });
  const { result } = renderHook(() => useOptimizedUserConfigurations());
  await expect(result.current.deleteConfiguration('business_logo')).rejects.toMatchObject({ message: 'delete failed' });
  mocks.write.mockResolvedValueOnce({ error: null }).mockResolvedValueOnce({ error: { message: 'delete failed' } });
  await expect(result.current.deleteMultipleConfigurations(['one', 'two'])).rejects.toThrow();
});

it('does not cache a failed read, so a later request can recover', async () => {
  mocks.read.mockResolvedValueOnce({ data: null, error: { message: 'offline' } })
    .mockResolvedValueOnce({ data: { configuration: 'recovered' }, error: null });
  const { result } = renderHook(() => useOptimizedUserConfigurations());
  expect(await result.current.loadConfiguration('business_logo')).toBeNull();
  expect(await result.current.loadConfiguration('business_logo')).toBe('recovered');
});

it('drops values read during an unfinished write even if the cache was explicitly invalidated', async () => {
  const pendingWrite = deferred<{ error: null }>();
  mocks.write.mockReturnValueOnce(pendingWrite.promise);
  mocks.read.mockResolvedValueOnce({ data: { configuration: 'previous value' }, error: null })
    .mockResolvedValueOnce({ data: { configuration: 'persisted value' }, error: null });
  const { result } = renderHook(() => useOptimizedUserConfigurations());
  const save = result.current.saveConfiguration('business_logo', 'persisted value');
  result.current.invalidateCache();
  await result.current.loadConfiguration('business_logo');
  pendingWrite.resolve({ error: null });
  await save;
  expect(await result.current.loadConfiguration('business_logo')).toBe('persisted value');
});

it('never claims to save without an active account', async () => {
  mocks.userId = null;
  const { result } = renderHook(() => useOptimizedUserConfigurations());
  await expect(result.current.saveConfiguration('business_logo', 'new')).rejects.toThrow();
  expect(mocks.write).not.toHaveBeenCalled();
});

it('removes a cached setting after a confirmed deletion', async () => {
  const { result } = renderHook(() => useOptimizedUserConfigurations());
  await result.current.saveConfiguration('business_logo', 'new');
  await result.current.deleteConfiguration('business_logo');
  expect(await result.current.loadConfiguration('business_logo')).toBeNull();
  expect(mocks.eq).toHaveBeenCalledWith('user_id', 'account-a');
  expect(mocks.eq).toHaveBeenCalledWith('type', 'business_logo');
});
