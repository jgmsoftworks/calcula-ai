import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { calcularDadosReceita, fetchReceitasPage, fetchTodasReceitas } from '../receitasData';

vi.mock('@/integrations/supabase/client', async () => {
  const { createClient } = await import('@supabase/supabase-js');
  return { supabase: createClient('https://example.supabase.co', 'public-test-key', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (input, init) => globalThis.fetch(input, init) },
  }) };
});
const fetchMock = vi.fn();
function response(data: unknown[], total = data.length) {
  return new Response(JSON.stringify(data), { status: 200, headers: {
    'Content-Type': 'application/json', 'Content-Range': `0-${Math.max(0, data.length - 1)}/${total}`,
  } });
}
const urlAt = (index: number) => new URL(fetchMock.mock.calls[index][0]);
beforeEach(() => { fetchMock.mockReset(); vi.stubGlobal('fetch', fetchMock); });
afterEach(() => vi.unstubAllGlobals());

describe('recipe page queries', () => {
  it('fetches only the requested page with a stable order and owner filter', async () => {
    fetchMock.mockResolvedValue(response([{ id: 'recipe' }], 382));
    const result = await fetchReceitasPage('owner', {}, 2);
    const params = urlAt(0).searchParams;
    expect(params.get('limit')).toBe('24');
    expect(params.get('offset')).toBe('24');
    expect(params.get('user_id')).toBe('eq.owner');
    expect(params.get('order')).toBe('numero_sequencial.desc,id.desc');
    expect(result.total).toBe(382);
    expect(result.receitas).toHaveLength(1);
  });

  it('applies search, type and sub-recipe exclusion before pagination, preserving null markups', async () => {
    const markup = '00000000-0000-0000-0000-000000000002';
    fetchMock.mockResolvedValueOnce(response([{ id: markup }])).mockResolvedValueOnce(response([], 0));
    await fetchReceitasPage('owner', { search: '  bolo  ', tipo: 'type', subReceita: 'normal' }, 3);
    const params = urlAt(1).searchParams;
    expect(params.get('nome')).toBe('ilike.%bolo%');
    expect(params.get('tipo_produto_id')).toBe('eq.type');
    expect(params.get('or')).toBe(`(markup_id.is.null,markup_id.not.in.(${markup}))`);
    expect(params.get('offset')).toBe('48');
    expect(urlAt(0).searchParams.get('user_id')).toBe('eq.owner');
  });

  it('searches recipe numbers and skips the recipe query when there are no sub-recipe markups', async () => {
    fetchMock.mockImplementation(() => response([]));
    await fetchReceitasPage('owner', { search: '42' });
    expect(urlAt(0).searchParams.get('or')).toBe('(numero_sequencial.eq.42,nome.ilike.%42%)');
    fetchMock.mockClear();
    expect(await fetchReceitasPage('owner', { subReceita: 'subreceita' })).toEqual({ receitas: [], total: 0 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('combines numeric search with sub-recipe exclusion', async () => {
    const markup = '00000000-0000-0000-0000-000000000002';
    fetchMock.mockResolvedValueOnce(response([{ id: markup }])).mockResolvedValueOnce(response([]));
    await fetchReceitasPage('owner', { search: '42', subReceita: 'normal' });
    expect(urlAt(1).searchParams.get('or')).toBe(`(and(or(numero_sequencial.eq.42,nome.ilike.%42%),or(markup_id.is.null,markup_id.not.in.(${markup}))))`);
  });

  it('exports every page instead of just the 24 visible recipes', async () => {
    fetchMock.mockImplementation((input: string) => {
      const params = new URL(input).searchParams;
      const offset = Number(params.get('offset'));
      expect(params.get('nome')).toBe('ilike.%bolo%');
      return response(Array.from({ length: Math.min(250, 1001 - offset) }, (_, i) => ({ id: String(offset + i) })), 1001);
    });
    const result = await fetchTodasReceitas('owner', { search: 'bolo' });
    expect(result).toHaveLength(1001);
    expect(new Set(result.map(item => item.id)).size).toBe(1001);
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });

  it('propagates database failures instead of treating them as an empty list', async () => {
    fetchMock.mockImplementation(() => new Response(JSON.stringify({ message: 'unavailable' }), { status: 403 }));
    await expect(fetchReceitasPage('owner')).rejects.toMatchObject({ message: 'unavailable' });
  });
});

describe('recipe costs', () => {
  it('preserves conversion, yield, labor and missing-product rules', () => {
    const result = calcularDadosReceita({
      ingredientes: [
        { quantidade: 250, produto: { custo_unitario: 8, unidade_uso: 'g', fator_conversao: 1000 } },
        { quantidade: 2, produto: null },
      ],
      embalagens: [{ quantidade: 2, produto: { custo_unitario: 6, unidade_uso: 'un', fator_conversao: 0 } }],
      mao_obra: [{ valor_total: 3 }, { valor_total: 7 }],
      sub_receitas: [
        { quantidade: 3, sub_receita: { preco_venda: 40, rendimento_valor: 10 } },
        { quantidade: 2, sub_receita: { preco_venda: 10, rendimento_valor: 0 } },
      ],
    });
    expect(result).toMatchObject({ custo_ingredientes: 2, custo_embalagens: 12, custo_mao_obra: 10, custo_sub_receitas: 32,
      total_ingredientes: 2, total_embalagens: 1, total_sub_receitas: 2 });
    expect(calcularDadosReceita({})).toMatchObject({ custo_ingredientes: 0, custo_embalagens: 0, custo_mao_obra: 0, custo_sub_receitas: 0 });
  });
});
