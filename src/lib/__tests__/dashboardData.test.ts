import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  tables: {} as Record<string, any[]>,
  requests: [] as { table: string; from?: number; to?: number; filters: any[]; signal?: AbortSignal; order?: string }[],
  fail: '' as string,
  failFrom: 0,
}));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  from: (table: string) => {
    const request: typeof mocks.requests[number] = { table, filters: [] };
    const query: any = {
      select: (columns: string) => {
        if (table === 'receitas' && /custo_(ingredientes|embalagens|mao_obra|sub_receitas)/.test(columns)) {
          throw new Error('column receitas.custo_ingredientes does not exist');
        }
        return query;
      },
      eq: (...args: any[]) => { request.filters.push(args); return query; },
      gte: (...args: any[]) => { request.filters.push(args); return query; },
      lte: (...args: any[]) => { request.filters.push(args); return query; },
      order: (column: string) => { request.order = column; return query; },
      range: (from: number, to: number) => { request.from = from; request.to = to; return query; },
      abortSignal: (signal: AbortSignal) => { request.signal = signal; return query; },
      maybeSingle: () => { query.single = true; return query; },
      then: (resolve: any, reject: any) => {
        mocks.requests.push(request);
        const failed = table === mocks.fail && (request.from || 0) >= mocks.failFrom;
        const rows = mocks.tables[table] || [];
        return Promise.resolve({
          data: failed ? null : query.single ? rows[0] || null : rows.slice(request.from, (request.to ?? rows.length) + 1),
          error: failed ? new Error('offline') : null,
        }).then(resolve, reject);
      },
    };
    return query;
  },
} }));

import { fetchDashboardData } from '../dashboardData';

const signal = new AbortController().signal;
const fetch = () => fetchDashboardData('account-a', '2026-10-01T03:00:00.000Z', '2026-10-21T18:00:00.000Z', signal);
const movement = (extra: Record<string, unknown>) => ({ tipo: 'entrada', quantidade: 1, custo_aplicado: 1, subtotal: 1, motivo: 'Compra', data_hora: '2026-10-21T12:00:00Z', ...extra });
const recipe = (extra: Record<string, unknown>) => {
  const { custo_ingredientes = 2, ...fields } = extra;
  return { preco_venda: 10, rendimento_valor: 1,
    ingredientes: [{ quantidade: 1, produto: { custo_unitario: custo_ingredientes, unidade_uso: null, fator_conversao: 1 } }],
    embalagens: [], mao_obra: [], sub_receitas: [], markup: { tipo: 'produto' }, ...fields };
};

beforeEach(() => {
  mocks.tables = {};
  mocks.requests = [];
  mocks.fail = '';
  mocks.failFrom = 0;
});

describe('dashboard totals with shared movement data', () => {
  it('preserves stock, costs, revenue, recipe average and chart values with four requests instead of seven', async () => {
    mocks.tables = {
      produtos: [{ estoque_atual: 20, custo_unitario: 5 }, { estoque_atual: 3, custo_unitario: 10 }],
      movimentacoes: [
        movement({ quantidade: 10, custo_aplicado: 4, subtotal: 50 }),
        movement({ quantidade: 3, custo_aplicado: 2, subtotal: 0, motivo: 'Ajuste de inventário' }),
        movement({ quantidade: 2, custo_aplicado: 4, subtotal: 8, motivo: 'Devolução ao fornecedor' }),
        movement({ tipo: 'saida', quantidade: 2, custo_aplicado: 5, subtotal: 30 }),
        movement({ tipo: 'saida', quantidade: 1, custo_aplicado: 3, subtotal: 0 }),
      ],
      receitas: [recipe({ custo_ingredientes: 40, rendimento_valor: 8 }), recipe({ preco_venda: 0 }), recipe({ custo_ingredientes: 1000, markup: { tipo: 'sub_receita' } })],
      estoque_fechamentos_mensais: [{ valor_estoque_fechamento: 120 }],
    };
    const result = await fetch();
    expect(result).toMatchObject({ valorEmEstoque: 130, totalEntradasMes: 64, totalSaidasMes: 33 });
    expect(result.cmvResult).toEqual({
      cmvDisponivel: true, cmvValor: 22, cmvPercentual: 75,
      breakdown: { estoqueInicial: 120, estoqueInicialEstimado: false, comprasLiquidas: 32, estoqueFinal: 130, faturamentoLiquido: 33 },
    });
    expect(result.dailyMovements.find(day => day.day === '21')).toEqual({ day: '21', entradas: 64, saidas: 33 });
    expect(mocks.requests).toHaveLength(4);
    expect(mocks.requests.filter(r => r.table === 'movimentacoes')).toHaveLength(1);
    for (const request of mocks.requests) {
      expect(request.filters).toContainEqual(['user_id', 'account-a']);
      expect(request.signal).toBe(signal);
    }
  });

  it('calculates recipe CMV from real relations, including conversion, packaging, labor and sub-recipes', async () => {
    mocks.tables.receitas = [recipe({
      rendimento_valor: 2, preco_venda: 20,
      ingredientes: [{ quantidade: 500, produto: { custo_unitario: 10, unidade_uso: 'g', fator_conversao: 1000 } }],
      embalagens: [{ quantidade: 2, produto: { custo_unitario: 1, unidade_uso: null, fator_conversao: 1 } }],
      mao_obra: [{ valor_total: 3 }],
      sub_receitas: [{ quantidade: 2, sub_receita: { preco_venda: 20, rendimento_valor: 4 } }],
    })];
    const result = await fetch();
    // (5 + 2 + 3 + 10) / 2 portions / 20 sale price = 50%.
    expect(result.cmvResult.cmvPercentual).toBe(50);
  });

  it('includes records beyond 1000 in every dataset and in the final totals', async () => {
    mocks.tables = {
      produtos: Array.from({ length: 1001 }, () => ({ estoque_atual: 1, custo_unitario: 1 })),
      movimentacoes: Array.from({ length: 1001 }, (_, i) => movement(i === 1000 ? { tipo: 'saida', quantidade: 2, custo_aplicado: 7, subtotal: 14 } : {})),
      receitas: Array.from({ length: 1001 }, (_, i) => recipe(i === 1000 ? { preco_venda: 40, custo_ingredientes: 20 } : {})),
      estoque_fechamentos_mensais: [{ valor_estoque_fechamento: 0 }],
    };
    const result = await fetch();
    expect(result).toMatchObject({ valorEmEstoque: 1001, totalEntradasMes: 1000, totalSaidasMes: 14 });
    expect(result.cmvResult.cmvPercentual).toBeCloseTo((1000 * 20 + 50) / 1001);
    expect(result.cmvResult.breakdown.faturamentoLiquido).toBe(14);
    for (const table of ['produtos', 'movimentacoes', 'receitas']) {
      const pages = mocks.requests.filter(r => r.table === table);
      expect(pages.map(r => [r.from, r.to])).toEqual([[0, 499], [500, 999], [1000, 1499]]);
      expect(pages.every(r => r.order === 'id')).toBe(true);
    }
  });

  it('retains the previous estimation and no-revenue behavior when there is no monthly closing', async () => {
    mocks.tables = { produtos: [{ estoque_atual: 10, custo_unitario: 2 }], movimentacoes: [movement({ quantidade: 5, custo_aplicado: 2, subtotal: 10 })] };
    const result = await fetch();
    expect(result.cmvResult).toEqual({
      cmvDisponivel: true, cmvValor: 0, cmvPercentual: null,
      breakdown: { estoqueInicial: 10, estoqueInicialEstimado: true, comprasLiquidas: 10, estoqueFinal: 20, faturamentoLiquido: null },
    });
    expect(mocks.requests.filter(r => r.table === 'movimentacoes')).toHaveLength(1);
  });

  it('rejects a failed later page instead of presenting a partial total', async () => {
    mocks.tables.produtos = Array.from({ length: 501 }, () => ({ estoque_atual: 1, custo_unitario: 1 }));
    mocks.fail = 'produtos'; mocks.failFrom = 500;
    await expect(fetch()).rejects.toThrow('offline');
  });

  it('does not substitute an estimated closing when its request failed', async () => {
    mocks.fail = 'estoque_fechamentos_mensais';
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(fetch()).rejects.toThrow('offline');
    log.mockRestore();
  });
});
