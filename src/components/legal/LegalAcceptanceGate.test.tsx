import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ user: { id: 'one' } as { id: string } | null, getStatus: vi.fn(), record: vi.fn(), signOut: vi.fn() }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: mocks.user, signOut: mocks.signOut }) }));
vi.mock('@/lib/legal', async () => {
  const actual = await vi.importActual<typeof import('@/lib/legal')>('@/lib/legal');
  return { ...actual, LEGAL_RELEASE: { ...actual.LEGAL_RELEASE, status: 'published' }, getLegalStatus: mocks.getStatus, recordLegalAcceptance: mocks.record };
});
import { LegalAcceptanceGate } from './LegalAcceptanceGate';

function mount(path = '/') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[path]}><LegalAcceptanceGate><p>Recursos da conta</p></LegalAcceptanceGate></MemoryRouter></QueryClientProvider>);
}
beforeEach(() => { vi.clearAllMocks(); mocks.user = { id: 'one' }; mocks.getStatus.mockResolvedValue({ version: '2026-10-28.1', content_sha256: 'a'.repeat(64), accepted: false }); mocks.record.mockResolvedValue(undefined); });
describe('legal acknowledgement after authentication', () => {
  it.each(['/minha-privacidade', '/planos', '/termos-de-uso', '/politica-de-privacidade', '/cookies', '/auth'])('preserves access to %s without a receipt', path => {
    mount(path);
    expect(screen.getByText('Recursos da conta')).toBeInTheDocument();
    expect(mocks.getStatus).not.toHaveBeenCalled();
  });
  it('never creates receipts for an unauthenticated session', () => {
    mocks.user = null; mount();
    expect(mocks.getStatus).not.toHaveBeenCalled();
    expect(mocks.record).not.toHaveBeenCalled();
  });
  it('covers newly authenticated users regardless of their sign-in provider', async () => {
    mount();
    await waitFor(() => expect(mocks.getStatus).toHaveBeenCalledOnce());
    expect(screen.queryByText('Recursos da conta')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Aceitar e continuar' })).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Aceito os Termos de Uso' }));
    expect(screen.getByRole('button', { name: 'Aceitar e continuar' })).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Estou ciente da Política de Privacidade' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Aceitar e continuar' })).toBeEnabled());
    mocks.getStatus.mockResolvedValue({ version: '2026-10-28.1', content_sha256: 'a'.repeat(64), accepted: true });
    fireEvent.click(screen.getByRole('button', { name: 'Aceitar e continuar' }));
    await screen.findByText('Recursos da conta');
    expect(mocks.record).toHaveBeenCalledOnce();
  });
  it('stays blocked when saving fails and offers retry', async () => {
    mocks.record.mockRejectedValue(new Error('Falha ao salvar'));
    mount();
    await act(async () => { await Promise.resolve(); });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Aceito os Termos de Uso' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Estou ciente da Política de Privacidade' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Aceitar e continuar' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Aceitar e continuar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Falha ao salvar');
    expect(screen.queryByText('Recursos da conta')).not.toBeInTheDocument();
  });
  it('does not treat a network error as acceptance', async () => {
    mocks.getStatus.mockRejectedValue(new Error('Sem conexão')); mount();
    expect(await screen.findByRole('alert')).toHaveTextContent('Sem conexão');
    expect(screen.queryByText('Recursos da conta')).not.toBeInTheDocument();
  });
});
