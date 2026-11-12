import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { NotificationSettings } from './NotificationSettings';

const mocks = vi.hoisted(() => ({ from: vi.fn(), read: vi.fn(), upsert: vi.fn(), success: vi.fn(), error: vi.fn() }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'synthetic-user' } }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: mocks.from } }));
vi.mock('sonner', () => ({ toast: { success: mocks.success, error: mocks.error } }));
beforeEach(() => {
  const query = { select: () => query, eq: () => query, single: mocks.read, maybeSingle: mocks.read, upsert: mocks.upsert };
  mocks.from.mockReturnValue(query);
  mocks.read.mockResolvedValue({ data: null, error: null });
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => { cleanup(); vi.resetAllMocks(); vi.restoreAllMocks(); });

it('reports a failed save and never confirms success', async () => {
  mocks.upsert.mockResolvedValue({ error: { message: 'write failed' } });
  render(<NotificationSettings />);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Salvar Configurações' })).not.toBeDisabled());
  fireEvent.click(screen.getByRole('button', { name: 'Salvar Configurações' }));
  await waitFor(() => expect(mocks.error).toHaveBeenCalledWith('Erro ao salvar configurações'));
  expect(mocks.success).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Salvar Configurações' })).not.toBeDisabled();
});

it('updates the existing account/type setting and preserves valid saved preferences', async () => {
  mocks.read.mockResolvedValue({ data: { configuration: { low_stock: false, low_margin_alerts: false, cost_anomalies: 'invalid', unknown: true } }, error: null });
  mocks.upsert.mockResolvedValue({ error: null });
  render(<NotificationSettings />);
  const stock = screen.getByRole('switch', { name: /Estoque Baixo/ });
  await waitFor(() => expect(stock).not.toBeDisabled());
  expect(stock).not.toBeChecked();
  expect(screen.getByRole('switch', { name: 'Anomalias de Custo' })).toBeChecked();
  fireEvent.click(stock);
  fireEvent.click(screen.getByRole('button', { name: 'Salvar Configurações' }));
  await waitFor(() => expect(mocks.success).toHaveBeenCalledTimes(1));
  expect(mocks.upsert).toHaveBeenCalledWith({
    user_id: 'synthetic-user', type: 'notification_settings',
    configuration: { low_stock: true, unpriced_recipes: true, cost_anomalies: true, sales_opportunities: true, engagement_reminders: true, low_margin_alerts: false },
  }, { onConflict: 'user_id,type' });
});

it('does not overwrite preferences when loading fails and offers a retry', async () => {
  mocks.read.mockResolvedValueOnce({ data: null, error: { message: 'offline' } }).mockResolvedValueOnce({ data: { configuration: { low_stock: false } }, error: null });
  render(<NotificationSettings />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar');
  expect(screen.getByRole('button', { name: 'Salvar Configurações' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Salvar Configurações' })).not.toBeDisabled());
  expect(screen.getByRole('switch', { name: /Estoque Baixo/ })).not.toBeChecked();
  expect(mocks.upsert).not.toHaveBeenCalled();
});
