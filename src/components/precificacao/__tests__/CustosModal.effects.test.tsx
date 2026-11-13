import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { CustosModal } from '../CustosModal';
import type { MarkupBlock } from '@/types/configurations';

const m = vi.hoisted(() => ({
  user: { id: 'synthetic-owner' }, from: vi.fn(), load: vi.fn(), save: vi.fn(),
  remove: vi.fn(), toast: vi.fn(), removeChannel: vi.fn(),
}));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: m.user }) }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: m.toast }) }));
vi.mock('@/hooks/useOptimizedUserConfigurations', () => ({ useOptimizedUserConfigurations: () => ({
  loadConfiguration: m.load, saveConfiguration: m.save, deleteMultipleConfigurations: m.remove,
}) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  from: m.from, removeChannel: m.removeChannel,
  channel: () => { const channel = { on: () => channel, subscribe: () => channel }; return channel; },
} }));
const bloco: MarkupBlock = {
  id: 'normal', nome: 'Loja', periodo: 'todos', lucroDesejado: 20, gastoSobreFaturamento: 0,
  impostos: 0, taxasMeiosPagamento: 0, comissoesPlataformas: 0, outros: 0, valorEmReal: 0,
};
beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'log').mockImplementation(() => {});
  m.load.mockImplementation(async (type: string) => type === 'faturamentos_historicos'
    ? [{ id: 'revenue', valor: 1000, mes: '2026-11-01' }] : { rent: true });
  m.save.mockResolvedValue(undefined);
  m.from.mockImplementation((table: string) => {
    const result = { data: table === 'despesas_fixas' ? [{ id: 'rent', nome: 'Aluguel sintético', valor: 100, ativo: true }] : [], error: null };
    const query = { select: () => query, eq: () => query, order: () => query,
      then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve) };
    return query;
  });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it('loads costs once, preserves the saved calculation and does not reload when a checkbox changes', async () => {
  const update = vi.fn(), changeOpen = vi.fn();
  const view = render(<CustosModal open onOpenChange={changeOpen} markupBlock={bloco} onMarkupUpdate={update} />);
  await screen.findByText('Aluguel sintético');
  await waitFor(() => expect(screen.getByRole('checkbox', { name: 'Considerar' })).toBeChecked());
  expect(m.from).toHaveBeenCalledTimes(3);
  fireEvent.click(screen.getByRole('checkbox', { name: 'Considerar' }));
  fireEvent.click(screen.getByRole('button', { name: /Salvar/ }));
  await waitFor(() => expect(update).toHaveBeenCalledWith(expect.objectContaining({ gastoSobreFaturamento: 0 })));
  view.rerender(<CustosModal open onOpenChange={changeOpen} markupBlock={bloco} onMarkupUpdate={update} />);
  fireEvent.click(screen.getByRole('checkbox', { name: 'Considerar' }));
  fireEvent.click(screen.getByRole('button', { name: /Salvar/ }));
  await waitFor(() => expect(update).toHaveBeenLastCalledWith(expect.objectContaining({ gastoSobreFaturamento: 10 })));
  expect(m.from).toHaveBeenCalledTimes(3);
});

it('does not reload costs when the same block receives a new period', async () => {
  const onOpenChange = vi.fn();
  const view = render(<CustosModal open onOpenChange={onOpenChange} markupBlock={bloco} />);
  await screen.findByText('Aluguel sintético');
  await act(async () => view.rerender(<CustosModal open onOpenChange={onOpenChange} markupBlock={{ ...bloco, periodo: '12' }} />));
  expect(m.from).toHaveBeenCalledTimes(3);
  expect(screen.getByRole('checkbox', { name: 'Considerar' })).toBeChecked();
});
