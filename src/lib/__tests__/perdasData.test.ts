import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { fetchPerdasData } from '../perdasData';
import { setBusinessRegion } from '../business-region';
import type { Perda } from '@/types/perdas';

type Page = { data: Perda[] | null; error: Error | null };
const mocks = vi.hoisted(() => ({ from: vi.fn(), eq: vi.fn(), gte: vi.fn(), lte: vi.fn(), range: vi.fn(), pages: [] as Page[] }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: mocks.from } }));
const loss = (id: string): Perda => ({ id, user_id: 'synthetic-owner', tipo: 'produto', produto_id: 'flour', receita_id: null,
  nome_item: 'Farinha', quantidade: 1, custo_unitario: 5, custo_total: 5, motivo: 'Vencimento', motivo_outro: null,
  observacao: null, responsavel: null, data_perda: '2026-11-11T12:00:00Z', created_at: '', updated_at: '' });
beforeEach(() => {
  vi.resetAllMocks(); mocks.pages = []; setBusinessRegion('BR');
  mocks.from.mockImplementation(() => {
    const query = {
      select: () => query, order: () => query,
      eq: (...args: unknown[]) => { mocks.eq(...args); return query; },
      gte: (...args: unknown[]) => { mocks.gte(...args); return query; },
      lte: (...args: unknown[]) => { mocks.lte(...args); return query; },
      range: (...args: unknown[]) => { mocks.range(...args); return query; },
      then: (resolve: (result: Page) => unknown) => Promise.resolve(mocks.pages.shift() ?? { data: [], error: null }).then(resolve),
    };
    return query;
  });
});
afterEach(() => setBusinessRegion('BR'));

it('reads all pages with the account and type filters preserved', async () => {
  mocks.pages = [{ data: Array.from({ length: 500 }, (_, index) => loss(String(index))), error: null }, { data: [loss('500')], error: null }];
  const rows = await fetchPerdasData('synthetic-owner', { tipo: 'produto' });
  expect(rows).toHaveLength(501);
  expect(rows.reduce((total, row) => total + row.custo_total, 0)).toBe(2505);
  expect(mocks.range.mock.calls).toEqual([[0, 499], [500, 999]]);
  expect(mocks.eq.mock.calls).toEqual([['user_id', 'synthetic-owner'], ['tipo', 'produto'], ['user_id', 'synthetic-owner'], ['tipo', 'produto']]);
});

it.each([
  ['BR', '2026-11-11', '2026-11-11T03:00:00.000Z', '2026-11-12T02:59:59.999Z'],
  ['PT', '2026-03-29', '2026-03-29T00:00:00.000Z', '2026-03-29T22:59:59.999Z'],
] as const)('uses the business-local date bounds in %s, including daylight saving', async (country, date, start, end) => {
  setBusinessRegion(country);
  await fetchPerdasData('synthetic-owner', { dataInicio: date, dataFim: date });
  expect(mocks.gte).toHaveBeenCalledWith('data_perda', start);
  expect(mocks.lte).toHaveBeenCalledWith('data_perda', end);
});

it('rejects a failed later page instead of returning partial totals', async () => {
  mocks.pages = [{ data: Array.from({ length: 500 }, (_, index) => loss(String(index))), error: null }, { data: null, error: new Error('offline') }];
  await expect(fetchPerdasData('synthetic-owner')).rejects.toThrow('offline');
});
