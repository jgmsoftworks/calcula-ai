import { supabase } from '@/integrations/supabase/client';

export interface TipoProduto {
  id: string;
  nome: string;
  imagem_url?: string | null;
}

export const tiposProdutoKey = (userId?: string) => ['receitas-tipos', userId] as const;
export const ordenarTiposProduto = (tipos: TipoProduto[]) => [...tipos].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

export async function fetchTiposProduto(userId: string, signal?: AbortSignal): Promise<TipoProduto[]> {
  let query = supabase.from('tipos_produto').select('*').eq('user_id', userId).order('nome');
  if (signal) query = query.abortSignal(signal);
  const { data, error } = await query;
  // An unavailable request is not an empty catalog: let the query retry and show the error.
  if (error) throw error;
  return ordenarTiposProduto(data || []);
}

export async function salvarTipoProduto(userId: string, input: Pick<TipoProduto, 'nome' | 'imagem_url'>, id?: string): Promise<TipoProduto> {
  if (!input.nome.trim()) throw new Error('Informe o nome do tipo.');
  let imagem_url = input.imagem_url ?? null;
  if (imagem_url?.startsWith('data:')) {
    if (!imagem_url.startsWith('data:image/jpeg;base64,')) throw new Error('Ajuste a foto antes de salvar.');
    const bytes = Uint8Array.from(atob(imagem_url.split(',')[1]), char => char.charCodeAt(0));
    if (!bytes.length || bytes.length > 5 * 1024 * 1024) throw new Error('A foto deve ter até 5 MB.');
    const path = `${userId}/tipos-produto/${crypto.randomUUID()}.jpg`;
    const storage = supabase.storage.from('receitas-images');
    const { error } = await storage.upload(path, new Blob([bytes], { type: 'image/jpeg' }), { contentType: 'image/jpeg', upsert: false });
    if (error) throw error;
    imagem_url = storage.getPublicUrl(path).data.publicUrl;
  }
  const payload = { nome: input.nome.trim(), imagem_url };
  const query = id
    ? supabase.from('tipos_produto').update(payload).eq('id', id).eq('user_id', userId)
    : supabase.from('tipos_produto').insert({ ...payload, user_id: userId });
  const { data, error } = await query.select('*').single();
  if (error) throw error;
  if (!data) throw new Error('Não foi possível confirmar o salvamento.');
  return data;
}
