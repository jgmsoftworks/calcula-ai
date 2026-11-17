import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProjecaoTab } from '../ProjecaoTab';
import { tiposProdutoKey } from '@/lib/tiposProdutoData';

type Tipo = { id: string; nome: string; imagem_url?: string | null };
type Result = { data?: Tipo | Tipo[] | null; count?: number; error: Error | null };
type Payload = { nome: string; user_id?: string; imagem_url?: string | null };
const db = vi.hoisted(() => ({
  user: { id: 'owner-a' },
  rows: [] as Tipo[],
  read: vi.fn<(options: { userId: string; signal?: AbortSignal }) => Promise<Result>>(),
  update: vi.fn(),
  remove: vi.fn(),
  usage: vi.fn<(...args: unknown[]) => Promise<Result>>(),
  toast: vi.fn(),
  upload: vi.fn(),
  writeError: null as Error | null,
}));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: db.user }) }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: db.toast }) }));
vi.mock('../MaoObraModal', () => ({ MaoObraModal: () => null }));
vi.mock('@/components/ui/image-cropper-modal', () => ({ ImageCropperModal: ({ onCropComplete, onClose }: { onCropComplete: (value: string) => void; onClose: () => void }) => <button type="button" onClick={() => { onCropComplete('data:image/jpeg;base64,aW1hZ2U='); onClose(); }}>Confirmar corte de teste</button> }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  storage: { from: () => ({ upload: db.upload, getPublicUrl: (path: string) => ({ data: { publicUrl: `https://example.test/${path}` } }) }) },
  from: (table: string) => {
    let action = 'read';
    let payload: Payload = { nome: '' };
    let signal: AbortSignal | undefined;
    const filters: Record<string, string> = {};
    const execute = async () => {
      if (table === 'receitas') return db.usage(filters);
      if (action === 'update') {
        db.update(payload, filters);
        if (db.writeError) return { data: null, error: db.writeError };
        db.rows = db.rows.map(row => row.id === filters.id ? { ...row, ...payload } : row);
        return { data: db.rows.find(row => row.id === filters.id), error: null };
      }
      if (action === 'delete') {
        db.remove(filters);
        db.rows = db.rows.filter(row => row.id !== filters.id);
        return { error: null };
      }
      if (action === 'insert') {
        if (db.writeError) return { data: null, error: db.writeError };
        const row = { id: 'new-type', nome: payload.nome, imagem_url: payload.imagem_url };
        db.rows.push(row);
        return { data: row, error: null };
      }
      return db.read({ userId: filters.user_id, signal });
    };
    const builder = {
      select: () => builder,
      eq: (key: string, value: string) => { filters[key] = value; return builder; },
      order: () => builder,
      abortSignal: (value: AbortSignal) => { signal = value; return builder; },
      insert: (value: Payload) => { action = 'insert'; payload = value; return builder; },
      update: (value: Payload) => { action = 'update'; payload = value; return builder; },
      delete: () => { action = 'delete'; return builder; },
      single: execute,
      then: (resolve: (value: Result) => unknown, reject?: (reason: unknown) => unknown) => execute().then(resolve, reject),
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
  db.upload.mockResolvedValue({ data: { path: 'photo' }, error: null });
  db.writeError = null;
  vi.stubGlobal('URL', class extends URL { static createObjectURL() { return 'blob:test-photo'; } static revokeObjectURL() {} });
});
afterEach(() => { cleanup(); clients.splice(0).forEach(client => client.clear()); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

function mount(savedName = 'Bolo salvo') {
  const client = new QueryClient({ defaultOptions: { queries: { retryDelay: 0, gcTime: 0 } } });
  clients.push(client);
  function Harness() {
    const [tipo, setTipo] = useState('cake');
    return <ProjecaoTab receita={{ tipo_produto: { id: 'cake', nome: savedName } }}
      formData={{ nome: '', tipo_produto_id: tipo, rendimento_valor: 1, rendimento_unidade: 'un', observacoes: '', status: 'finalizada', preco_venda: 0, markup_id: null, markup_tipo: null, peso_unitario: 0, tempo_preparo_total: 0, tempo_preparo_unidade: 'minutos', tempo_preparo_mao_obra: 0, conservacao: null }} onFormChange={(field, value) => { if (field === 'tipo_produto_id' && typeof value === 'string') setTipo(value); }} />;
  }
  const node = () => <QueryClientProvider client={client}><Harness /></QueryClientProvider>;
  const result = render(node());
  return { client, rerender: () => result.rerender(node()) };
}
const tipoControl = () => screen.getByRole('combobox', { name: 'Tipo de Produto *' });
const openTypes = () => fireEvent.keyDown(tipoControl(), { key: 'Enter' });
const deferred = () => {
  let resolve!: (value: Result) => void;
  const promise = new Promise<Result>(r => { resolve = r; });
  return { promise, resolve };
};

describe('product type loading and shared catalog', () => {
  it('uploads only on save, reopens the saved photo and removes its reference without another upload', async () => {
    const { client } = mount();
    await waitFor(() => expect(tipoControl()).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Gerenciar tipos de produto' }));
    fireEvent.click(screen.getByRole('button', { name: 'Criar Novo Tipo' }));
    fireEvent.change(screen.getByLabelText('Novo Tipo de Produto'), { target: { value: 'Torta' } });
    fireEvent.change(screen.getByLabelText('Foto do tipo de produto'), { target: { files: [new File(['picture'], 'torta.png', { type: 'image/png' })] } });
    fireEvent.click(screen.getByText('Confirmar corte de teste'));
    expect(db.upload).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Criar tipo de produto' }));
    await screen.findByAltText('Foto de Torta');
    expect(db.upload).toHaveBeenCalledWith(expect.stringMatching(/^owner-a\/tipos-produto\/.+\.jpg$/), expect.any(Blob), { contentType: 'image/jpeg', upsert: false });
    expect(client.getQueryData(tiposProdutoKey('owner-a'))).toContainEqual(expect.objectContaining({ id: 'new-type', imagem_url: expect.stringContaining('https://example.test/owner-a/tipos-produto/') }));
    fireEvent.click(screen.getByRole('button', { name: 'Editar Torta' }));
    expect(screen.getByAltText('Foto do tipo')).toHaveAttribute('src', db.rows.find(t => t.id === 'new-type')!.imagem_url);
    fireEvent.click(screen.getByRole('button', { name: 'Remover foto' }));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar tipo de produto' }));
    await waitFor(() => expect(screen.queryByAltText('Foto de Torta')).not.toBeInTheDocument());
    expect(db.rows.find(t => t.id === 'new-type')?.imagem_url).toBeNull();
    expect(db.upload).toHaveBeenCalledTimes(1);
  });

  it.each(['upload', 'save'])('preserves the saved type and editor when photo %s fails', async stage => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    db.rows[0].imagem_url = 'https://example.test/old.jpg';
    if (stage === 'upload') db.upload.mockResolvedValue({ error: new Error('offline') });
    else db.writeError = new Error('offline');
    mount();
    await waitFor(() => expect(tipoControl()).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Gerenciar tipos de produto' }));
    fireEvent.click(screen.getByRole('button', { name: 'Editar Bolo' }));
    fireEvent.change(screen.getByLabelText('Foto do tipo de produto'), { target: { files: [new File(['picture'], 'bolo.png', { type: 'image/png' })] } });
    fireEvent.click(screen.getByText('Confirmar corte de teste'));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar tipo de produto' }));
    await waitFor(() => expect(db.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Erro' })));
    expect(screen.getByLabelText('Nome do tipo')).toHaveValue('Bolo');
    expect(screen.getByAltText('Foto de Bolo')).toHaveAttribute('src', 'https://example.test/old.jpg');
    expect(db.rows[0].imagem_url).toBe('https://example.test/old.jpg');
    if (stage === 'upload') expect(db.update).not.toHaveBeenCalled();
  });

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
    fireEvent.change(within(dialog).getByLabelText('Nome do tipo'), { target: { value: 'Bolo caseiro' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Salvar tipo de produto' }));
    await waitFor(() => expect(within(dialog).getByText('Bolo caseiro')).toBeInTheDocument());
    expect(document.getElementById('tipo_produto_id')).toHaveTextContent('Bolo caseiro');
    expect(db.update).toHaveBeenCalledWith({ nome: 'Bolo caseiro', imagem_url: null }, { id: 'cake', user_id: 'owner-a' });
    expect(client.getQueryData(tiposProdutoKey('owner-a'))).toContainEqual({ id: 'cake', nome: 'Bolo caseiro', imagem_url: null });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Criar Novo Tipo' }));
    fireEvent.change(within(dialog).getByLabelText('Novo Tipo de Produto'), { target: { value: 'Torta' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Criar tipo de produto' }));
    await waitFor(() => expect(document.getElementById('tipo_produto_id')).toHaveTextContent('Torta'));
    fireEvent.keyDown(dialog, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(tipoControl()).toHaveTextContent('Torta');
    expect(client.getQueryData(tiposProdutoKey('owner-a'))).toContainEqual({ id: 'new-type', nome: 'Torta', imagem_url: null });
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
