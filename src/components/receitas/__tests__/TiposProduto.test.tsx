import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProjecaoTab } from '../ProjecaoTab';
import { tiposProdutoKey } from '@/lib/tiposProdutoData';

type Tipo = { id: string; nome: string };
const db = vi.hoisted(() => ({
  user: { id: 'owner-a' },
  rows: [] as Tipo[],
  read: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  usage: vi.fn(),
  toast: vi.fn(),
}));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: db.user }) }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: db.toast }) }));
vi.mock('../MaoObraModal', () => ({ MaoObraModal: () => null }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  from: (table: string) => {
    let action = 'read';
    let payload: any;
    let signal: AbortSignal | undefined;
    const filters: Record<string, string> = {};
    const execute = async () => {
      if (table === 'receitas') return db.usage(filters);
      if (action === 'update') {
        db.update(payload, filters);
        db.rows = db.rows.map(row => row.id === filters.id ? { ...row, ...payload } : row);
        return { error: null };
      }
      if (action === 'delete') {
        db.remove(filters);
        db.rows = db.rows.filter(row => row.id !== filters.id);
        return { error: null };
      }
      if (action === 'insert') {
        const row = { id: 'new-type', nome: payload.nome };
        db.rows.push(row);
        return { data: row, error: null };
      }
      return db.read({ userId: filters.user_id, signal });
    };
    const builder: any = {
      select: () => builder,
      eq: (key: string, value: string) => { filters[key] = value; return builder; },
      order: () => builder,
      abortSignal: (value: AbortSignal) => { signal = value; return builder; },
      insert: (value: any) => { action = 'insert'; payload = value; return builder; },
      update: (value: any) => { action = 'update'; payload = value; return builder; },
      delete: () => { action = 'delete'; return builder; },
      single: execute,
      then: (resolve: any, reject: any) => execute().then(resolve, reject),
    };
    return builder;
  },
} }));

const clients: QueryClient[] = [];
beforeEach(() => {
  vi.clearAllMocks();
  db.user = { id: 'owner-a' };
  db.rows = [{ id: 'cake', nome: 'Bolo' }, { id: 'bread', nome: 'Pão de ló' }];
  db.read.mockImplementation(async () => ({ data: [...db.rows], error: null }));
  db.usage.mockResolvedValue({ count: 0, error: null });
});
afterEach(() => { cleanup(); clients.splice(0).forEach(client => client.clear()); vi.restoreAllMocks(); });

function mount(savedName = 'Bolo salvo') {
  const client = new QueryClient({ defaultOptions: { queries: { retryDelay: 0, gcTime: 0 } } });
  clients.push(client);
  function Harness() {
    const [tipo, setTipo] = useState('cake');
    return <ProjecaoTab receita={{ tipo_produto: { id: 'cake', nome: savedName } }}
      formData={{ tipo_produto_id: tipo }} onFormChange={(field, value) => { if (field === 'tipo_produto_id') setTipo(value); }} />;
  }
  const node = () => <QueryClientProvider client={client}><Harness /></QueryClientProvider>;
  const result = render(node());
  return { client, rerender: () => result.rerender(node()) };
}
const tipoControl = () => screen.getByRole('combobox', { name: 'Tipo de Produto *' });
const openTypes = () => fireEvent.keyDown(tipoControl(), { key: 'Enter' });
const deferred = () => {
  let resolve!: (value: any) => void;
  const promise = new Promise<any>(r => { resolve = r; });
  return { promise, resolve };
};

describe('product type loading and shared catalog', () => {
  it('preserves the saved label during loading and searches a short catalog without accents', async () => {
    const request = deferred();
    db.read.mockReturnValueOnce(request.promise);
    mount();
    expect(tipoControl()).toBeDisabled();
    expect(tipoControl()).toHaveTextContent('Bolo salvo');
    await act(async () => request.resolve({ data: db.rows, error: null }));
    await waitFor(() => expect(tipoControl()).toBeEnabled());
    expect(tipoControl()).toHaveTextContent('Bolo');
    openTypes();
    fireEvent.change(await screen.findByRole('textbox', { name: 'Buscar opção' }), { target: { value: 'pao' } });
    expect(screen.getAllByRole('option')).toHaveLength(1);
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Buscar opção' }), { key: 'Enter' });
    await waitFor(() => expect(tipoControl()).toHaveTextContent('Pão de ló'));
  });

  it('retries failed requests, explains the error and recovers without losing the selection', async () => {
    db.read.mockResolvedValue({ data: null, error: new Error('offline') });
    mount();
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar os tipos de produto');
    expect(db.read).toHaveBeenCalledTimes(3);
    expect(tipoControl()).toHaveTextContent('Bolo salvo');
    expect(screen.queryByText('Nenhum tipo de produto cadastrado')).not.toBeInTheDocument();
    db.read.mockResolvedValue({ data: db.rows, error: null });
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
    expect(tipoControl()).toHaveTextContent('Bolo');
    openTypes();
    expect(await screen.findByRole('option', { name: 'Pão de ló' })).toBeInTheDocument();
  });

  it('updates the selected label and shared list immediately after rename and create', async () => {
    const { client } = mount();
    await waitFor(() => expect(tipoControl()).toHaveTextContent(/^Bolo$/));
    fireEvent.click(screen.getByRole('button', { name: 'Gerenciar tipos de produto' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Editar Bolo' }));
    fireEvent.change(within(dialog).getByRole('textbox'), { target: { value: 'Bolo caseiro' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Salvar tipo de produto' }));
    await waitFor(() => expect(within(dialog).getByText('Bolo caseiro')).toBeInTheDocument());
    expect(document.getElementById('tipo_produto_id')).toHaveTextContent('Bolo caseiro');
    expect(db.update).toHaveBeenCalledWith({ nome: 'Bolo caseiro' }, { id: 'cake', user_id: 'owner-a' });
    expect(client.getQueryData(tiposProdutoKey('owner-a'))).toContainEqual({ id: 'cake', nome: 'Bolo caseiro' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Criar Novo Tipo' }));
    fireEvent.change(within(dialog).getByLabelText('Novo Tipo de Produto'), { target: { value: 'Torta' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Criar tipo de produto' }));
    await waitFor(() => expect(document.getElementById('tipo_produto_id')).toHaveTextContent('Torta'));
    fireEvent.keyDown(dialog, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(tipoControl()).toHaveTextContent('Torta');
    expect(client.getQueryData(tiposProdutoKey('owner-a'))).toContainEqual({ id: 'new-type', nome: 'Torta' });
  });

  it('ignores a late request from the previous account', async () => {
    const oldRequest = deferred();
    db.read.mockReturnValueOnce(oldRequest.promise);
    const { rerender, client } = mount();
    await waitFor(() => expect(db.read).toHaveBeenCalledTimes(1));
    const oldSignal = db.read.mock.calls[0][0].signal as AbortSignal;
    db.user = { id: 'owner-b' };
    db.read.mockResolvedValue({ data: [{ id: 'cake', nome: 'Tipo da segunda conta' }], error: null });
    rerender();
    await waitFor(() => expect(tipoControl()).toHaveTextContent('Tipo da segunda conta'));
    expect(oldSignal.aborted).toBe(true);
    await act(async () => oldRequest.resolve({ data: [{ id: 'cake', nome: 'Tipo da primeira conta' }], error: null }));
    expect(tipoControl()).toHaveTextContent('Tipo da segunda conta');
    expect(client.getQueryData(tiposProdutoKey('owner-b'))).toEqual([{ id: 'cake', nome: 'Tipo da segunda conta' }]);
    expect(db.read.mock.calls[1][0].userId).toBe('owner-b');
  });

  it('does not delete a type when the usage check fails', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    db.usage.mockResolvedValue({ count: null, error: new Error('offline') });
    mount();
    await waitFor(() => expect(tipoControl()).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Gerenciar tipos de produto' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Excluir Bolo' }));
    await waitFor(() => expect(db.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Erro' })));
    expect(db.remove).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Editar Bolo' })).toBeInTheDocument();
  });
});
