import { supabase } from '@/integrations/supabase/client';
import { uploadCatalogoFoto } from './catalogoFoto';

export type CatalogoEstoqueTabela = 'marcas' | 'categorias';
export interface CatalogoEstoqueItem { id: string; nome: string; ativo: boolean; imagem_url?: string | null }
export const catalogoEstoqueKey = (tabela: CatalogoEstoqueTabela, userId?: string) => ['estoque-catalogo', tabela, userId] as const;
export const ordenarCatalogo = (items: CatalogoEstoqueItem[]) => [...items].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

export async function fetchCatalogoEstoque(tabela: CatalogoEstoqueTabela, userId: string, signal?: AbortSignal): Promise<CatalogoEstoqueItem[]> {
  let query = supabase.from(tabela).select('*').eq('user_id', userId).eq('ativo', true).order('nome');
  if (signal) query = query.abortSignal(signal);
  const { data, error } = await query;
  if (error) throw error;
  return ordenarCatalogo(data || []);
}

export async function salvarCatalogoEstoque(tabela: CatalogoEstoqueTabela, userId: string, input: Pick<CatalogoEstoqueItem, 'nome' | 'imagem_url'>, id?: string): Promise<CatalogoEstoqueItem> {
  const nome = input.nome.trim();
  if (!nome) throw new Error('Informe o nome.');
  const imagem_url = await uploadCatalogoFoto(userId, tabela, input.imagem_url);
  const payload = { nome, imagem_url };
  const query = id
    ? supabase.from(tabela).update(payload).eq('id', id).eq('user_id', userId)
    : supabase.from(tabela).insert({ ...payload, user_id: userId });
  const { data, error } = await query.select('*').single();
  if (error) throw error;
  if (!data) throw new Error('Não foi possível confirmar o salvamento.');
  return data;
}

export async function removerCatalogoEstoque(tabela: CatalogoEstoqueTabela, userId: string, item: CatalogoEstoqueItem) {
  // Product selectors store names; also protect legacy references that use IDs.
  const { data: usages, error: usageError } = await supabase.from('produtos').select('id').eq('user_id', userId).overlaps(tabela, [item.nome, item.id]).limit(1);
  if (usageError) throw usageError;
  if (usages?.length) throw new Error(tabela === 'marcas' ? 'Não é possível remover marca em uso.' : 'Não é possível remover categoria em uso.');
  const { data, error } = await supabase.from(tabela).update({ ativo: false }).eq('id', item.id).eq('user_id', userId).select('id').single();
  if (error) throw error;
  if (!data) throw new Error('Não foi possível confirmar a remoção.');
}
