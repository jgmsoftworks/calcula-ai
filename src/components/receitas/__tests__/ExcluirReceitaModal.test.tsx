import React, { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ExcluirReceitaModal } from '../ExcluirReceitaModal';
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), deleted: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: mocks.rpc } }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'owner' } }) }));
vi.mock('@/i18n/localizeText', () => ({ localizeText: (text: string) => text }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ i18n: { language: 'pt-BR' } }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), info: vi.fn() } }));
const contexto = {
  receita: { id: 'target', nome: 'Recheio de Ninho', imagem_url: null, updated_at: '2026-11-11T12:00:00Z' },
  usos: [
    { tipo: 'receita', id: 'cake', nome: 'Bolo Nuvem', numero_sequencial: 12, imagem_url: '/bolo.jpg', updated_at: 'version', vinculos: [{ id: 'link', updated_at: 'version', quantidade: 2 }] },
    { tipo: 'receita', id: 'pie', nome: 'Torta de morango', numero_sequencial: 13, imagem_url: null, updated_at: 'version', vinculos: [{ id: 'link2', updated_at: 'version', quantidade: 3 }] },
  ],
};
const response = (data: unknown, error: unknown = null) => Object.assign(Promise.resolve({ data, error }), { abortSignal() { return this; } });
beforeEach(() => {
  vi.clearAllMocks();
  mocks.rpc.mockImplementation(name => response(name === 'listar_usos_receita' ? contexto : null));
});
afterEach(cleanup);
function App() {
  const [open, setOpen] = useState(true);
  return <><button onClick={() => setOpen(true)}>Abrir</button>{open && <ExcluirReceitaModal receitaId="target" nome="Recheio de Ninho" onClose={() => setOpen(false)} onDeleted={mocks.deleted} />}</>;
}
async function open() {
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><App /></QueryClientProvider>);
  await screen.findByText('Bolo Nuvem');
}
const removeAll = () => {
  fireEvent.click(screen.getByRole('button', { name: 'Remover vínculo com Bolo Nuvem' }));
  fireEvent.click(screen.getByRole('button', { name: 'Remover vínculo com Torta de morango' }));
};
describe('Recipe deletion confirmation', () => {
  it.each(['Cancelar', 'Fechar'])('discards pending removals on %s and starts clean when reopened', async closeLabel => {
    await open();
    expect(screen.getByRole('button', { name: 'Excluir receita' })).toBeDisabled();
    expect(screen.getByRole('dialog').querySelector('img')).toHaveAttribute('src', '/bolo.jpg');
    removeAll();
    expect(screen.getByRole('button', { name: 'Excluir receita' })).toBeEnabled();
    expect(mocks.rpc.mock.calls.map(call => call[0])).toEqual(['listar_usos_receita']);
    fireEvent.click(screen.getByRole('button', { name: closeLabel }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(mocks.deleted).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Abrir' }));
    await screen.findByText('Bolo Nuvem');
    expect(screen.getByRole('button', { name: 'Excluir receita' })).toBeDisabled();
    expect(screen.queryByText('Remoção pendente')).not.toBeInTheDocument();
    expect(mocks.rpc.mock.calls.every(call => call[0] === 'listar_usos_receita')).toBe(true);
  });
  it('requires every use, allows undo and sends one atomic confirmation', async () => {
    await open();
    fireEvent.click(screen.getByRole('button', { name: 'Remover vínculo com Bolo Nuvem' }));
    expect(screen.getByRole('button', { name: 'Excluir receita' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Desfazer remoção de Bolo Nuvem' }));
    expect(screen.queryByText('Remoção pendente')).not.toBeInTheDocument();
    removeAll();
    fireEvent.click(screen.getByRole('button', { name: 'Excluir receita' }));
    await waitFor(() => expect(mocks.deleted).toHaveBeenCalledTimes(1));
    expect(mocks.rpc).toHaveBeenLastCalledWith('excluir_receita_com_vinculos', {
      p_receita_id: 'target', p_expected_updated_at: contexto.receita.updated_at, p_usos: contexto.usos,
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
  it('keeps the dialog and selections on a failure so the user can retry or cancel', async () => {
    await open(); removeAll();
    mocks.rpc.mockImplementationOnce(() => response(null, { code: '500', message: 'Failure' }));
    fireEvent.click(screen.getByRole('button', { name: 'Excluir receita' }));
    await screen.findByRole('alert');
    expect(screen.getAllByText('Remoção pendente')).toHaveLength(2);
    expect(mocks.deleted).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
  it('requires a fresh review when the server reports a changed dependency', async () => {
    await open(); removeAll();
    mocks.rpc.mockImplementationOnce(() => response(null, { code: '40001' }));
    fireEvent.click(screen.getByRole('button', { name: 'Excluir receita' }));
    await screen.findByRole('alert');
    expect(screen.getByRole('button', { name: 'Excluir receita' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Atualizar lista' }));
    await screen.findByText('Bolo Nuvem');
    expect(screen.queryByText('Remoção pendente')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Excluir receita' })).toBeDisabled();
  });
  it('does not allow confirmation when checking uses fails', async () => {
    mocks.rpc.mockImplementation(() => response(null, { code: '500' }));
    render(<QueryClientProvider client={new QueryClient()}><App /></QueryClientProvider>);
    await screen.findByRole('alert');
    expect(screen.getByRole('button', { name: 'Excluir receita' })).toBeDisabled();
  });
  it('includes the fridge balance and defers its removal until confirmation', async () => {
    const usos = [...contexto.usos, { tipo: 'geladeira', id: 'fridge', nome: 'Geladeira', imagem_url: null, estoque_atual: 5, unidade: 'kg', updated_at: 'v' }];
    mocks.rpc.mockImplementation(name => response(name === 'listar_usos_receita' ? { ...contexto, usos } : null));
    await open(); removeAll();
    expect(screen.getByText('Saldo: 5 kg')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Excluir receita' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Remover vínculo com Geladeira' }));
    expect(screen.getByRole('button', { name: 'Excluir receita' })).toBeEnabled();
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
  });
  it('confirms a recipe with no uses without requiring removals', async () => {
    mocks.rpc.mockImplementation(name => response(name === 'listar_usos_receita' ? { ...contexto, usos: [] } : null));
    render(<QueryClientProvider client={new QueryClient()}><App /></QueryClientProvider>);
    await screen.findByText(/não possui vínculos/);
    fireEvent.click(screen.getByRole('button', { name: 'Excluir receita' }));
    await waitFor(() => expect(mocks.deleted).toHaveBeenCalledOnce());
  });
});
