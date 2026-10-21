import React from 'react';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ProdutosPage } from '@/lib/produtosPageData';
const mocks = vi.hoisted(() => ({ userId: 'account-a', fetch: vi.fn() }));
vi.mock('../useAuth', () => ({ useAuth: () => ({ user: { id: mocks.userId } }) }));
vi.mock('@/lib/produtosPageData', () => ({ PRODUTOS_PAGE_SIZE: 40, fetchProdutosPage: mocks.fetch }));
import { useProdutosPage, useProdutosMovimentacao } from '../useProdutosPage';
const pageData = (pagina: number, total = 81): ProdutosPage => ({
  pagina, total, totalBusca: total, categorias: [{ nome: 'Frutas', count: total, imagem: null }],
  produtos: Array.from({ length: Math.min(40, total - (pagina - 1) * 40) }, (_, i) => ({ id: String((pagina - 1) * 40 + i), nome: `Produto ${(pagina - 1) * 40 + i}` })) as ProdutosPage['produtos'],
});
function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return { client, wrapper: ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider> };
}
afterEach(() => { cleanup(); mocks.fetch.mockReset(); mocks.userId = 'account-a'; vi.useRealTimers(); });

describe('products fetched by page', () => {
  it('keeps the previous page visible while the next one loads and retains global totals', async () => {
    mocks.fetch.mockResolvedValueOnce(pageData(1));
    const { wrapper, client } = setup();
    const { result, rerender } = renderHook(({ page }) => useProdutosPage({}, page), { wrapper, initialProps: { page: 1 } });
    await waitFor(() => expect(result.current.produtos).toHaveLength(40));
    let finish!: (data: ProdutosPage) => void;
    mocks.fetch.mockImplementation(() => new Promise<ProdutosPage>(resolve => { finish = resolve; }));
    rerender({ page: 2 });
    expect(result.current.produtos[0].id).toBe('0');
    expect(result.current.isPlaceholderData).toBe(true);
    expect(result.current.data?.total).toBe(81);
    await act(async () => finish(pageData(2)));
    await waitFor(() => expect(result.current.produtos[0].id).toBe('40'));
    expect(mocks.fetch).toHaveBeenLastCalledWith(expect.objectContaining({ search: '' }), 2, expect.any(AbortSignal));
    client.clear();
  });

  it('waits for a brief typing pause and searches the server once, including items outside loaded pages', async () => {
    mocks.fetch.mockResolvedValue(pageData(1));
    const { wrapper, client } = setup();
    const { result, rerender } = renderHook(({ search }) => useProdutosPage({ search }), { wrapper, initialProps: { search: '' } });
    await waitFor(() => expect(result.current.produtos).toHaveLength(40));
    for (const search of ['m', 'mo', 'mor', 'morango']) rerender({ search });
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    mocks.fetch.mockResolvedValue({ ...pageData(1, 1), produtos: [{ id: 'outside-page', nome: 'Morango' }] });
    await waitFor(() => expect(result.current.produtos[0].id).toBe('outside-page'));
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
    expect(mocks.fetch).toHaveBeenLastCalledWith({ search: 'morango' }, 1, expect.any(AbortSignal));
    client.clear();
  });

  it('does not show one account’s cached results or categories after switching accounts', async () => {
    mocks.fetch.mockResolvedValue(pageData(1));
    const { wrapper, client } = setup();
    const { result, rerender } = renderHook(() => useProdutosPage(), { wrapper });
    await waitFor(() => expect(result.current.produtos).toHaveLength(40));
    mocks.fetch.mockImplementation(() => new Promise(() => {}));
    mocks.userId = 'account-b'; rerender();
    expect(result.current.produtos).toEqual([]);
    expect(result.current.data).toBeUndefined();
    expect(result.current.isPending).toBe(true);
    client.clear();
  });

  it('appends movement pages, preserves every loaded product, and keeps complete category counts', async () => {
    mocks.fetch.mockImplementation((_filters, page) => Promise.resolve(pageData(page)));
    const { wrapper, client } = setup();
    const { result } = renderHook(() => useProdutosMovimentacao(), { wrapper });
    await waitFor(() => expect(result.current.produtos).toHaveLength(40));
    expect(result.current.resumo?.categorias[0].count).toBe(81);
    await act(async () => { await result.current.fetchNextPage(); });
    await waitFor(() => expect(result.current.produtos).toHaveLength(80));
    await act(async () => { await result.current.fetchNextPage(); });
    await waitFor(() => expect(result.current.produtos).toHaveLength(81));
    expect(result.current.hasNextPage).toBe(false);
    expect(new Set(result.current.produtos.map(p => p.id)).size).toBe(81);
    client.clear();
  });
});
