import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchCatalogoEstoque, removerCatalogoEstoque, salvarCatalogoEstoque } from './catalogoEstoqueData';

type Result = { data: unknown; error: Error | null };
const db = vi.hoisted(() => ({
  execute: vi.fn<(...args: unknown[]) => Promise<Result>>(),
  upload: vi.fn(),
}));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  storage: { from: () => ({ upload: db.upload, getPublicUrl: (path: string) => ({ data: { publicUrl: `https://example.test/${path}` } }) }) },
  from: (table: string) => {
    let action = 'read';
    let payload: unknown;
    let signal: AbortSignal | undefined;
    const filters: Record<string, unknown> = {};
    const execute = () => db.execute({ table, action, payload, filters, signal });
    const builder = {
      select: () => builder,
      eq: (key: string, value: unknown) => { filters[key] = value; return builder; },
      overlaps: (key: string, value: string[]) => { filters[key] = value; return builder; },
      order: () => builder,
      limit: () => builder,
      abortSignal: (value: AbortSignal) => { signal = value; return builder; },
      insert: (value: unknown) => { action = 'insert'; payload = value; return builder; },
      update: (value: unknown) => { action = 'update'; payload = value; return builder; },
      single: execute,
      then: (resolve: (value: Result) => unknown, reject?: (reason: unknown) => unknown) => execute().then(resolve, reject),
    };
    return builder;
  },
} }));

beforeEach(() => {
  vi.clearAllMocks();
  db.execute.mockResolvedValue({ data: { id: 'saved', nome: 'Chocolate', ativo: true }, error: null });
  db.upload.mockResolvedValue({ error: null });
});

describe.each(['marcas', 'categorias'] as const)('photos and ownership in %s', tabela => {
  it('uploads cropped photos under the owner and saves the returned URL with the trimmed name', async () => {
    await salvarCatalogoEstoque(tabela, 'owner', { nome: ' Chocolate ', imagem_url: 'data:image/jpeg;base64,aW1hZ2U=' });
    expect(db.upload).toHaveBeenCalledWith(expect.stringMatching(new RegExp(`^owner/${tabela}/.+\\.jpg$`)), expect.any(Blob), { contentType: 'image/jpeg', upsert: false });
    expect(db.execute).toHaveBeenCalledWith(expect.objectContaining({ table: tabela, action: 'insert', payload: { nome: 'Chocolate', imagem_url: expect.stringContaining(`https://example.test/owner/${tabela}/`), user_id: 'owner' } }));
  });
  it('keeps or removes an existing photo without reupload, updating only the owned record', async () => {
    for (const imagem_url of ['https://example.test/photo.jpg', null]) {
      await salvarCatalogoEstoque(tabela, 'owner', { nome: 'Chocolate', imagem_url }, 'item');
      expect(db.execute).toHaveBeenLastCalledWith(expect.objectContaining({ table: tabela, action: 'update', payload: { nome: 'Chocolate', imagem_url }, filters: { id: 'item', user_id: 'owner' } }));
    }
    expect(db.upload).not.toHaveBeenCalled();
  });
  it('does not write the record after a failed upload or invalid input', async () => {
    db.upload.mockResolvedValue({ error: new Error('upload failed') });
    await expect(salvarCatalogoEstoque(tabela, 'owner', { nome: 'Chocolate', imagem_url: 'data:image/jpeg;base64,aW1hZ2U=' })).rejects.toThrow('upload failed');
    await expect(salvarCatalogoEstoque(tabela, 'owner', { nome: ' ' })).rejects.toThrow('Informe o nome');
    await expect(salvarCatalogoEstoque(tabela, 'owner', { nome: 'Chocolate', imagem_url: 'data:image/svg+xml,bad' })).rejects.toThrow('Ajuste a foto');
    expect(db.execute).not.toHaveBeenCalled();
  });
  it('propagates storage/database failures and refuses an unconfirmed write', async () => {
    db.execute.mockResolvedValueOnce({ data: null, error: new Error('database failed') });
    await expect(salvarCatalogoEstoque(tabela, 'owner', { nome: 'Chocolate' }, 'item')).rejects.toThrow('database failed');
    db.execute.mockResolvedValueOnce({ data: null, error: null });
    await expect(salvarCatalogoEstoque(tabela, 'owner', { nome: 'Chocolate' }, 'item')).rejects.toThrow('confirmar');
  });
  it('reads only active owned records, supports cancellation and exposes errors', async () => {
    const signal = new AbortController().signal;
    db.execute.mockResolvedValueOnce({ data: [{ id: 'z', nome: 'Z' }, { id: 'a', nome: 'A' }], error: null });
    expect((await fetchCatalogoEstoque(tabela, 'owner', signal)).map(item => item.id)).toEqual(['a', 'z']);
    expect(db.execute).toHaveBeenCalledWith(expect.objectContaining({ table: tabela, filters: { user_id: 'owner', ativo: true }, signal }));
    db.execute.mockResolvedValueOnce({ data: null, error: new Error('read failed') });
    await expect(fetchCatalogoEstoque(tabela, 'owner')).rejects.toThrow('read failed');
  });
  it('protects products linked by name or legacy ID and fails closed if the usage check fails', async () => {
    const item = { id: 'item', nome: 'Chocolate', ativo: true };
    db.execute.mockResolvedValueOnce({ data: [{ id: 'product' }], error: null });
    await expect(removerCatalogoEstoque(tabela, 'owner', item)).rejects.toThrow('em uso');
    expect(db.execute).toHaveBeenCalledWith(expect.objectContaining({ table: 'produtos', filters: { user_id: 'owner', [tabela]: ['Chocolate', 'item'] } }));
    expect(db.execute).toHaveBeenCalledTimes(1);
    db.execute.mockResolvedValueOnce({ data: null, error: new Error('lookup failed') });
    await expect(removerCatalogoEstoque(tabela, 'owner', item)).rejects.toThrow('lookup failed');
    expect(db.execute).toHaveBeenCalledTimes(2);
  });
  it('soft-deletes unused records scoped to their owner', async () => {
    db.execute.mockResolvedValueOnce({ data: [], error: null });
    await removerCatalogoEstoque(tabela, 'owner', { id: 'item', nome: 'Chocolate', ativo: true });
    expect(db.execute).toHaveBeenLastCalledWith(expect.objectContaining({ table: tabela, action: 'update', payload: { ativo: false }, filters: { id: 'item', user_id: 'owner' } }));
  });
});
