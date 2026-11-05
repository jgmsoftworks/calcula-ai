import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { useReceitas } from '../useReceitas';
import type { RecipeSaveRequest } from '@/lib/recipe-save';

const m = vi.hoisted(() => ({
  from: vi.fn(), rpc: vi.fn(), write: vi.fn(), requestAccess: vi.fn(),
  success: vi.fn(), error: vi.fn(), user: { id: 'owner' } as { id: string } | null,
}));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: m.from, rpc: m.rpc } }));
vi.mock('../useAuth', () => ({ useAuth: () => ({ user: m.user }) }));
vi.mock('@/contexts/PlanLimitContext', () => ({ usePlanGate: () => ({ requestAccess: m.requestAccess }) }));
vi.mock('sonner', () => ({ toast: { success: m.success, error: m.error } }));

const recipe = {
  id: 'original', user_id: 'owner', numero_sequencial: 7, nome: 'Bolo',
  tipo_produto_id: 'tipo', rendimento_valor: 12, rendimento_unidade: 'un',
  observacoes: 'Receita de teste', status: 'rascunho', preco_venda: 9.9,
  tempo_preparo_total: 60, tempo_preparo_unidade: 'minutos', tempo_preparo_mao_obra: 30,
  peso_unitario: 80, conservacao: { geladeira: 3 }, markup_id: 'markup',
};
const children = {
  receita_ingredientes: [{ id: 'ingredient', produto_id: 'flour', quantidade: 200, produto: { nome: 'Farinha' } }],
  receita_sub_receitas: [{ id: 'sub', sub_receita_id: 'filling', quantidade: 2 }],
  receita_embalagens: [{ id: 'package', produto_id: 'box', quantidade: 1 }],
  receita_passos_preparo: [{ id: 'step', ordem: 1, descricao: 'Assar' }],
  receita_mao_obra: [{ id: 'labor', funcionario_id: 'person', funcionario_nome: 'Pessoa', funcionario_cargo: 'Produção', custo_por_hora: 20, tempo: 30, unidade_tempo: 'minutos', valor_total: 10 }],
};
const tables = Object.keys(children) as (keyof typeof children)[];
let existingNames: { nome: string }[];
let readError: string | null;
let source: typeof recipe;
let empty: boolean;
function confirmed(request: RecipeSaveRequest) {
  return { data: { id: request.p_receita_id, numero_sequencial: 8, updated_at: '2026-11-05T12:00:00Z' }, error: null };
}
beforeEach(() => {
  vi.clearAllMocks();
  m.user = { id: 'owner' }; source = structuredClone(recipe); empty = false;
  existingNames = []; readError = null;
  m.requestAccess.mockResolvedValue(true);
  m.rpc.mockImplementation(async (_name, request) => confirmed(request));
  m.write.mockImplementation(() => { throw new Error('Duplication must not write individual rows'); });
  m.from.mockImplementation(table => {
    let names = false;
    const response = () => ({
      data: names ? existingNames : empty ? [] : children[table as keyof typeof children] || [],
      error: readError === (names ? 'names' : table) ? { code: '42501', message: 'Read denied' } : null,
    });
    const query = {
      select: () => query, eq: () => query, order: () => query,
      ilike: () => { names = true; return query; },
      single: async () => ({ data: source, error: null }),
      insert: m.write, update: m.write, delete: m.write,
      then: (resolve: (value: ReturnType<typeof response>) => unknown) => Promise.resolve(response()).then(resolve),
    };
    return query;
  });
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('Atomic recipe duplication', () => {
  it('copies the recipe and every component in one RPC with fresh IDs, leaving source IDs untouched', async () => {
    const { result } = renderHook(useReceitas);
    await act(async () => { expect(await result.current.duplicarReceita('original')).toBe(true); });
    expect(m.rpc).toHaveBeenCalledOnce(); expect(m.write).not.toHaveBeenCalled();
    const [name, request] = m.rpc.mock.calls[0];
    expect(name).toBe('salvar_receita_completa');
    expect(request).toMatchObject({ p_criar: true, p_expected_updated_at: null, p_expected_components: null });
    expect(request.p_receita).toEqual({
      nome: 'Bolo (Cópia)', tipo_produto_id: 'tipo', rendimento_valor: 12, rendimento_unidade: 'un',
      observacoes: 'Receita de teste', status: 'rascunho', preco_venda: 9.9,
      tempo_preparo_total: 60, tempo_preparo_unidade: 'minutos', tempo_preparo_mao_obra: 30,
      peso_unitario: 80, conservacao: { geladeira: 3 }, markup_id: 'markup',
    });
    const components = request.p_componentes;
    expect(components.ingredientes[0]).toEqual({ id: expect.any(String), produto_id: 'flour', quantidade: 200 });
    expect(components.sub_receitas[0]).toMatchObject({ sub_receita_id: 'filling', quantidade: 2 });
    expect(components.embalagens[0]).toMatchObject({ produto_id: 'box', quantidade: 1 });
    expect(components.passos[0]).toMatchObject({ ordem: 1, descricao: 'Assar' });
    expect(components.mao_obra[0]).toMatchObject({ ...children.receita_mao_obra[0], id: expect.any(String) });
    const ids = Object.values(components).flatMap((items: any) => items.map((item: any) => item.id));
    expect(new Set([...ids, request.p_receita_id, request.p_request_id]).size).toBe(7);
    expect(ids.some(id => ['ingredient', 'sub', 'package', 'step', 'labor'].includes(id as string))).toBe(false);
    expect(children.receita_ingredientes[0].id).toBe('ingredient');
    expect(m.success).toHaveBeenCalledExactlyOnceWith('Receita duplicada: "Bolo (Cópia)"');
  });

  it.each(tables)('does not create anything when reading %s fails', async table => {
    readError = table;
    const { result } = renderHook(useReceitas);
    await act(async () => { expect(await result.current.duplicarReceita('original')).toBe(false); });
    expect(m.rpc).not.toHaveBeenCalled(); expect(m.write).not.toHaveBeenCalled();
    expect(m.success).not.toHaveBeenCalled(); expect(m.error).toHaveBeenCalledOnce();
  });

  it('stops if the available copy names cannot be loaded', async () => {
    readError = 'names';
    const { result } = renderHook(useReceitas);
    await act(async () => { expect(await result.current.duplicarReceita('original')).toBe(false); });
    expect(m.rpc).not.toHaveBeenCalled(); expect(m.success).not.toHaveBeenCalled();
  });

  it.each(['42501', '23503', '23514'])('never reports success on a rejected transaction (%s)', async code => {
    m.rpc.mockResolvedValue({ data: null, error: { code, message: 'Synthetic rejected transaction' } });
    const { result } = renderHook(useReceitas);
    await act(async () => { expect(await result.current.duplicarReceita('original')).toBe(false); });
    expect(m.success).not.toHaveBeenCalled(); expect(m.error).toHaveBeenCalledOnce();
    expect(result.current.loading).toBe(false);
  });

  it.each([null, { id: 'wrong-recipe', numero_sequencial: 8, updated_at: '2026-11-05T12:00:00Z' }])(
    'rejects missing or mismatched success confirmation', async data => {
      m.rpc.mockResolvedValue({ data, error: null });
      const { result } = renderHook(useReceitas);
      await act(async () => { expect(await result.current.duplicarReceita('original')).toBe(false); });
      expect(m.success).not.toHaveBeenCalled(); expect(m.error).toHaveBeenCalledOnce();
    },
  );

  it('retries the identical copy after a lost response even if the last plan slot was consumed', async () => {
    m.rpc.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    const { result, rerender } = renderHook(useReceitas);
    await act(async () => { expect(await result.current.duplicarReceita('original')).toBe(false); });
    const first = structuredClone(m.rpc.mock.calls[0][1]);
    const reads = m.from.mock.calls.length;
    m.requestAccess.mockResolvedValue(false);
    source.nome = 'Original alterada'; existingNames = [{ nome: 'Bolo (Cópia)' }];
    rerender();
    await act(async () => { expect(await result.current.duplicarReceita('original')).toBe(true); });
    expect(m.rpc.mock.calls[1][1]).toEqual(first);
    expect(m.from).toHaveBeenCalledTimes(reads); expect(m.requestAccess).toHaveBeenCalledOnce();
    expect(m.success).toHaveBeenCalledOnce();
  });

  it('shares one in-flight operation for rapid repeated clicks and waits for confirmation', async () => {
    let finish!: (response: ReturnType<typeof confirmed>) => void;
    m.rpc.mockReturnValue(new Promise(resolve => { finish = resolve; }));
    const { result } = renderHook(useReceitas);
    let first!: Promise<boolean>, second!: Promise<boolean>;
    act(() => { first = result.current.duplicarReceita('original'); second = result.current.duplicarReceita('original'); });
    expect(first).toBe(second);
    await waitFor(() => expect(m.rpc).toHaveBeenCalledOnce());
    expect(m.success).not.toHaveBeenCalled(); expect(result.current.loading).toBe(true);
    await act(async () => { finish(confirmed(m.rpc.mock.calls[0][1])); expect(await first).toBe(true); });
    expect(m.success).toHaveBeenCalledOnce(); expect(m.requestAccess).toHaveBeenCalledOnce();
  });

  it('uses a new ID and the next available name for a deliberate second copy after success', async () => {
    const { result } = renderHook(useReceitas);
    await act(async () => { await result.current.duplicarReceita('original'); });
    existingNames = [{ nome: 'Bolo (Cópia)' }, { nome: 'Bolo (Cópia 2)' }];
    await act(async () => { await result.current.duplicarReceita('original'); });
    const [first, second] = m.rpc.mock.calls.map(call => call[1]);
    expect(second.p_receita.nome).toBe('Bolo (Cópia 3)');
    expect(second.p_receita_id).not.toBe(first.p_receita_id);
    expect(second.p_request_id).not.toBe(first.p_request_id);
    expect(m.requestAccess).toHaveBeenCalledTimes(2);
  });

  it('keeps all five empty arrays when duplicating an empty draft', async () => {
    empty = true;
    const { result } = renderHook(useReceitas);
    await act(async () => { expect(await result.current.duplicarReceita('original')).toBe(true); });
    expect(m.rpc.mock.calls[0][1].p_componentes).toEqual({ ingredientes: [], sub_receitas: [], embalagens: [], passos: [], mao_obra: [] });
  });

  it('opens the plan dialog on a server quota denial without success or an extra generic error', async () => {
    m.rpc.mockResolvedValue({ data: null, error: { code: '23514', message: 'Você atingiu o limite do seu plano.' } });
    const { result } = renderHook(useReceitas);
    await act(async () => { expect(await result.current.duplicarReceita('original')).toBe(false); });
    expect(m.requestAccess).toHaveBeenCalledTimes(2);
    expect(m.success).not.toHaveBeenCalled(); expect(m.error).not.toHaveBeenCalled();
  });

  it('does not reuse an unconfirmed copy after switching accounts', async () => {
    m.rpc.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    const { result, rerender } = renderHook(useReceitas);
    await act(async () => { await result.current.duplicarReceita('original'); });
    const first = m.rpc.mock.calls[0][1];
    m.user = { id: 'another-owner' }; rerender();
    await act(async () => { await result.current.duplicarReceita('original'); });
    expect(m.rpc.mock.calls[1][1].p_receita_id).not.toBe(first.p_receita_id);
    expect(m.requestAccess).toHaveBeenCalledTimes(2);
  });
});
