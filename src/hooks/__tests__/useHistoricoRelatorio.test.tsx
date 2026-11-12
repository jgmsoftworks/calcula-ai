import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import type { MovimentoHistorico } from '@/lib/historicoEstoqueData';
import { useHistoricoRelatorio } from '../useHistoricoRelatorio';

const mocks = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock('../useMovimentacoes', () => ({ useMovimentacoes: () => ({ fetchHistoricoGeral: mocks.fetch }) }));
afterEach(() => { cleanup(); vi.resetAllMocks(); });

function movement(id: string): MovimentoHistorico {
  return {
    id, user_id: 'synthetic-user', produto_id: 'synthetic-product', quantidade: 2,
    tipo: 'entrada', origem_estoque: 'produto', produtos: { nome: 'Farinha' },
    data_hora: '2026-11-01T12:00:00Z', created_at: '2026-11-01T12:00:00Z',
    updated_at: '2026-11-01T12:00:00Z', comprovante_id: null, custo_aplicado: 5,
    custo_unitario: 5, subtotal: 10, motivo: null, observacao: null, origem: null,
    responsavel: null,
  };
}

it('ignores a late response after newer filters have completed', async () => {
  let finishOld!: (rows: MovimentoHistorico[]) => void;
  mocks.fetch.mockImplementationOnce(() => new Promise<MovimentoHistorico[]>(resolve => { finishOld = resolve; }));
  const { result, rerender } = renderHook(({ filters }) => useHistoricoRelatorio(filters), {
    initialProps: { filters: { dataInicio: '2026-10-01' } },
  });
  const newest = [movement('current')];
  mocks.fetch.mockResolvedValueOnce(newest);
  rerender({ filters: { dataInicio: '2026-11-01' } });
  await waitFor(() => expect(result.current.loading).toBe(false));
  await act(async () => { finishOld([movement('outdated')]); });
  expect(result.current.movimentacoes.map(row => row.id)).toEqual(['current']);
  expect(result.current.error).toBe(false);
});

it('releases loading after failure and allows a retry with the same filters', async () => {
  mocks.fetch.mockRejectedValueOnce(new Error('offline'));
  const { result, rerender } = renderHook(({ filters }) => useHistoricoRelatorio(filters), {
    initialProps: { filters: { dataInicio: '2026-11-01' } },
  });
  await waitFor(() => expect(result.current.error).toBe(true));
  expect(result.current.loading).toBe(false);
  mocks.fetch.mockResolvedValueOnce([]);
  rerender({ filters: { dataInicio: '2026-11-01' } });
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.error).toBe(false);
  expect(mocks.fetch).toHaveBeenCalledTimes(2);
});
