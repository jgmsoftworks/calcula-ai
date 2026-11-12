import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { usePerdasConsulta } from '../usePerdasConsulta';
import type { Perda } from '@/types/perdas';

const mocks = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock('../usePerdas', () => ({ usePerdas: () => ({ fetchPerdas: mocks.fetch }) }));
afterEach(() => { cleanup(); vi.resetAllMocks(); });

it('keeps the newer result when an old filter request finishes last', async () => {
  let finish!: (rows: Perda[]) => void;
  mocks.fetch.mockImplementationOnce(() => new Promise<Perda[]>(resolve => { finish = resolve; }));
  const { result, rerender } = renderHook(({ filters }) => usePerdasConsulta(filters), { initialProps: { filters: { dataInicio: '2026-10-01' } } });
  const latest: Perda[] = [{ id: 'latest', user_id: 'synthetic-owner', tipo: 'produto', produto_id: 'flour', receita_id: null,
    nome_item: 'Farinha', quantidade: 1, custo_unitario: 5, custo_total: 5, motivo: 'Vencimento', motivo_outro: null,
    observacao: null, responsavel: null, data_perda: '2026-11-11T12:00:00Z', created_at: '', updated_at: '' }];
  mocks.fetch.mockResolvedValueOnce(latest);
  rerender({ filters: { dataInicio: '2026-11-01' } });
  await waitFor(() => expect(result.current.loading).toBe(false));
  await act(async () => finish([{ ...latest[0], id: 'outdated' }]));
  expect(result.current.perdas.map(row => row.id)).toEqual(['latest']);
});

it('allows retry after a failed request without changing the filters', async () => {
  mocks.fetch.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce([]);
  const { result } = renderHook(() => usePerdasConsulta());
  await waitFor(() => expect(result.current.error).toBe(true));
  expect(result.current.loading).toBe(false);
  act(() => result.current.reload());
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.error).toBe(false);
  expect(mocks.fetch).toHaveBeenCalledTimes(2);
});
