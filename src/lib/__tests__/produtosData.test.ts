import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Produto } from '@/hooks/useEstoque';
type Page = { data: Produto[] | null; error: Error | null };
type QueryMethod = ReturnType<typeof vi.fn<(...args: unknown[]) => CatalogQuery>>;
interface CatalogQuery extends PromiseLike<Page> {
  select: QueryMethod;
  eq: QueryMethod;
  order: QueryMethod;
  range: QueryMethod;
  abortSignal: QueryMethod;
}
const mocks = vi.hoisted(() => ({ from: vi.fn(), pages: [] as Page[] }));
function queryFor(next: () => Page): CatalogQuery {
  const query: CatalogQuery = {
    select: vi.fn(() => query), eq: vi.fn(() => query), order: vi.fn(() => query),
    range: vi.fn(() => query), abortSignal: vi.fn(() => query),
    then: (resolve, reject) => Promise.resolve(next()).then(resolve, reject),
  };
  return query;
}
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: mocks.from } }));
import { fetchCatalogoProdutos, filtrarProdutos } from '../produtosData';
const produto = (id: number, overrides: Partial<Produto> = {}): Produto => ({ user_id: 'account-a', custo_unitario: 5, unidade_uso: null, fator_conversao: null, imagem_url: null, ativo: true, created_at: '', updated_at: '', id: String(id), nome: `Produto ${id}`, codigo_interno: id, unidade_compra: 'kg', codigos_barras: ['7890123'], marcas: ['Marca A'], categorias: ['Frutas'], estoque_minimo: 2, estoque_atual: 1, ...overrides });
beforeEach(() => { mocks.from.mockReset(); mocks.pages = []; });

describe('product catalog loading and filtering', () => {
  it('reads all pages, carries the account and cancellation signal and normalizes display fields', async () => {
    mocks.pages = [{ data: Array.from({ length: 500 }, (_, i) => produto(i)), error: null }, { data: [produto(500, { nome: '  Último produto  ', unidade_compra: 'KG' })], error: null }];
    const builders: CatalogQuery[] = [];
    mocks.from.mockImplementation(() => {
      const query = queryFor(() => mocks.pages.shift() ?? { data: [], error: null });
      builders.push(query); return query;
    });
    const signal = new AbortController().signal;
    const result = await fetchCatalogoProdutos('account-a', signal);
    expect(result).toHaveLength(501);
    expect(result[500]).toMatchObject({ nome: 'Último produto', unidade_compra: 'kg' });
    expect(builders[0].eq).toHaveBeenCalledWith('user_id', 'account-a');
    expect(builders[0].range).toHaveBeenCalledWith(0, 499);
    expect(builders[1].range).toHaveBeenCalledWith(500, 999);
    expect(builders[1].abortSignal).toHaveBeenCalledWith(signal);
  });

  it('propagates a failed page rather than returning a partial or empty successful catalog', async () => {
    const query = queryFor(() => ({ data: null, error: new Error('offline') }));
    mocks.from.mockReturnValue(query);
    await expect(fetchCatalogoProdutos('account-a')).rejects.toThrow('offline');
  });

  it('searches names, exact internal codes and barcodes locally while combining the other filters', () => {
    const items = [produto(12, { nome: 'Morango fresco', unidade_compra: 'k' }), produto(20, { nome: 'Farinha', estoque_atual: 3 }), produto(30, { nome: 'Embalagem', marcas: ['Marca B'], categorias: ['Embalagens'], codigos_barras: ['999'] })];
    expect(filtrarProdutos(items, { search: ' MORANGO ' })).toEqual([items[0]]);
    expect(filtrarProdutos(items, { search: '12' })).toEqual([items[0], items[1]]); // The second barcode also matches 12.
    expect(filtrarProdutos(items, { search: '12abc' })).toEqual([]);
    expect(filtrarProdutos(items, { search: '999' })).toEqual([items[2]]);
    expect(filtrarProdutos(items, { categorias: ['Frutas'], marcas: ['Marca A'], abaixoMinimo: true, unidade: 'kg' })).toEqual([items[0]]);
    expect(mocks.from).not.toHaveBeenCalled();
  });
});
