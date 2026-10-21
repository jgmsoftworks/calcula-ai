import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), signal: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: mocks.rpc } }));
import { fetchProdutosPage } from '../produtosPageData';
beforeEach(() => vi.resetAllMocks());

describe('product page API', () => {
  it('sends all combined filters, caps the page size and propagates cancellation without accepting an owner parameter', async () => {
    const response = { data: { produtos: [{ nome: ' Morango ', unidade_compra: 'KG' }], pagina: 2, total: 41, totalBusca: 60, categorias: [] }, error: null };
    const query = Object.assign(Promise.resolve(response), { abortSignal: mocks.signal });
    mocks.signal.mockReturnValue(query); mocks.rpc.mockReturnValue(query);
    const signal = new AbortController().signal;
    const result = await fetchProdutosPage({ search: '  morango ', marcas: ['Marca A'], categorias: ['Frutas'], unidade: 'kg', abaixoMinimo: true }, 2, signal);
    expect(mocks.rpc).toHaveBeenCalledWith('listar_produtos_pagina', { p_busca: 'morango', p_marcas: ['Marca A'], p_categorias: ['Frutas'], p_unidade: 'kg', p_abaixo_minimo: true, p_pagina: 2, p_tamanho: 40 });
    expect(mocks.signal).toHaveBeenCalledWith(signal);
    expect(result.produtos[0]).toMatchObject({ nome: 'Morango', unidade_compra: 'kg' });
    expect(result.total).toBe(41);
  });
  it('never turns failed or malformed responses into a successful empty catalog', async () => {
    mocks.rpc.mockResolvedValueOnce({ data: null, error: new Error('offline') });
    await expect(fetchProdutosPage()).rejects.toThrow('offline');
    mocks.rpc.mockResolvedValueOnce({ data: null, error: null });
    await expect(fetchProdutosPage()).rejects.toThrow('Resposta de produtos inválida');
  });
});
