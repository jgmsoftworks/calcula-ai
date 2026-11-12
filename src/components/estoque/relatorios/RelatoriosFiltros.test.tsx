import { cleanup, render, screen, waitFor, fireEvent } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RelatorioMovimentacoes } from './RelatorioMovimentacoes';
import { RelatorioRanking } from './RelatorioRanking';

const mocks = vi.hoisted(() => ({ fetch: vi.fn(), excel: vi.fn(), pdf: vi.fn() }));
vi.mock('@/hooks/useMovimentacoes', () => ({ useMovimentacoes: () => ({ fetchHistoricoGeral: mocks.fetch }) }));
vi.mock('@/hooks/useExportRelatorioEstoque', () => ({ useExportRelatorioEstoque: () => ({
  exportando: null, exportarRelatorioExcel: mocks.excel, exportarRelatorioPDF: mocks.pdf,
}) }));
afterEach(() => { cleanup(); vi.resetAllMocks(); });

describe.each([RelatorioMovimentacoes, RelatorioRanking])('report date filters', Report => {
  it('passes dates without duplicate times and applies draft filters only on demand', async () => {
    mocks.fetch.mockResolvedValue([]);
    const { container } = render(<Report />);
    await waitFor(() => expect(mocks.fetch).toHaveBeenCalledTimes(1));
    const [filters] = mocks.fetch.mock.calls[0];
    expect(filters.dataInicio).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(filters.dataFim).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const date = container.querySelector('input[type="date"]')!;
    fireEvent.change(date, { target: { value: '2026-10-01' } });
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: /Aplicar/ }));
    await waitFor(() => expect(mocks.fetch).toHaveBeenCalledTimes(2));
    expect(mocks.fetch.mock.calls[1][0].dataInicio).toBe('2026-10-01');
  });
  it('exports the applied period even when the date inputs have unapplied changes', async () => {
    mocks.fetch.mockResolvedValue([]);
    const { container } = render(<Report />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Excel' })).not.toBeDisabled());
    const applied = mocks.fetch.mock.calls[0][0];
    fireEvent.change(container.querySelector('input[type="date"]')!, { target: { value: '2020-01-01' } });
    fireEvent.click(screen.getByRole('button', { name: 'Excel' }));
    fireEvent.click(screen.getByRole('button', { name: 'PDF' }));
    for (const exporter of [mocks.excel, mocks.pdf]) {
      expect(exporter.mock.calls[0][0].filtros).toContain(`Período: ${applied.dataInicio} a ${applied.dataFim}`);
    }
  });
  it('shows a query failure, blocks exports and allows retrying', async () => {
    mocks.fetch.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce([]);
    render(<Report />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar');
    expect(screen.getByRole('button', { name: 'Excel' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'PDF' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /Aplicar/ }));
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
    await waitFor(() => expect(screen.getByRole('button', { name: 'Excel' })).not.toBeDisabled());
  });
});
