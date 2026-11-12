import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import RelatoriosPerdas from '../RelatoriosPerdas';

const mocks = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock('@/hooks/usePerdas', () => ({ usePerdas: () => ({ fetchPerdas: mocks.fetch, loading: false }) }));
afterEach(() => { cleanup(); vi.resetAllMocks(); });

it('clears both the visible dates and the query instead of reusing the old closure', async () => {
  mocks.fetch.mockResolvedValue([]);
  render(<RelatoriosPerdas />);
  await waitFor(() => expect(mocks.fetch).toHaveBeenCalledTimes(1));
  fireEvent.change(screen.getByLabelText('Data inicial'), { target: { value: '2026-11-01' } });
  fireEvent.change(screen.getByLabelText('Data final'), { target: { value: '2026-11-11' } });
  fireEvent.click(screen.getByRole('button', { name: 'Aplicar' }));
  await waitFor(() => expect(mocks.fetch).toHaveBeenCalledTimes(2));
  expect(mocks.fetch.mock.lastCall?.[0]).toEqual({ dataInicio: '2026-11-01', dataFim: '2026-11-11' });
  fireEvent.click(screen.getByRole('button', { name: 'Limpar' }));
  await waitFor(() => expect(mocks.fetch).toHaveBeenCalledTimes(3));
  expect(mocks.fetch.mock.lastCall?.[0]).toEqual({});
  expect(screen.getByLabelText('Data inicial')).toHaveValue('');
  expect(screen.getByLabelText('Data final')).toHaveValue('');
});

it('shows loading failures and keeps export unavailable until a successful query', async () => {
  mocks.fetch.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce([]);
  render(<RelatoriosPerdas />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar as perdas');
  expect(screen.getByRole('button', { name: 'Exportar CSV' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Aplicar' }));
  await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  expect(mocks.fetch).toHaveBeenCalledTimes(2);
});
