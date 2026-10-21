import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Produto } from '../useEstoque';
const mocks = vi.hoisted(() => ({ userId: 'account-a', fetch: vi.fn() }));
vi.mock('../useAuth', () => ({ useAuth: () => ({ user: { id: mocks.userId } }) }));
vi.mock('@/lib/produtosData', async importOriginal => ({ ...await importOriginal<object>(), fetchCatalogoProdutos: mocks.fetch }));
import { useProdutos } from '../useProdutos';
afterEach(() => { cleanup(); mocks.fetch.mockReset(); mocks.userId = 'account-a'; });
const strawberry = { id: '1', nome: 'Morango', codigo_interno: 1, unidade_compra: 'kg' } as Produto;
const flour = { id: '2', nome: 'Farinha', codigo_interno: 2, unidade_compra: 'kg' } as Produto;
function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return { client, wrapper: ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider> };
}

describe('shared product catalog', () => {
  it('deduplicates concurrent consumers and makes repeated searches without new requests', async () => {
    mocks.fetch.mockResolvedValue([strawberry, flour]);
    const { wrapper, client } = setup();
    const { result, rerender } = renderHook(({ search }) => [useProdutos({ search }), useProdutos()], { wrapper, initialProps: { search: '' } });
    await waitFor(() => expect(result.current[0].produtos).toHaveLength(2));
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    for (const search of ['m', 'mo', 'mor', 'morango']) rerender({ search });
    expect(result.current[0].produtos).toEqual([strawberry]);
    expect(result.current[1].produtos).toHaveLength(2);
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    client.clear();
  });

  it('keeps cached data during a refresh and never shows another account’s products', async () => {
    mocks.fetch.mockResolvedValueOnce([strawberry]);
    const { wrapper, client } = setup();
    const { result, rerender } = renderHook(() => useProdutos(), { wrapper });
    await waitFor(() => expect(result.current.produtos).toEqual([strawberry]));
    let resolve!: (value: Produto[]) => void;
    mocks.fetch.mockImplementation(() => new Promise<Produto[]>(done => { resolve = done; }));
    const refresh = result.current.refetch();
    await waitFor(() => expect(result.current.isFetching).toBe(true));
    expect(result.current.isPending).toBe(false);
    expect(result.current.produtos).toEqual([strawberry]);
    resolve([flour]); await refresh;
    await waitFor(() => expect(result.current.produtos).toEqual([flour]));
    mocks.userId = 'account-b'; rerender();
    expect(result.current.produtos).toEqual([]);
    expect(result.current.isPending).toBe(true);
    await waitFor(() => expect(mocks.fetch).toHaveBeenLastCalledWith('account-b', expect.any(AbortSignal)));
    resolve([strawberry]);
    await waitFor(() => expect(result.current.produtos).toEqual([strawberry]));
    client.clear();
  });
});
