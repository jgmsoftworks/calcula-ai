import { supabase } from '@/integrations/supabase/client';

export interface TipoProduto {
  id: string;
  nome: string;
}

export const tiposProdutoKey = (userId?: string) => ['receitas-tipos', userId] as const;
export const ordenarTiposProduto = (tipos: TipoProduto[]) => [...tipos].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

export async function fetchTiposProduto(userId: string, signal?: AbortSignal): Promise<TipoProduto[]> {
  let query = supabase.from('tipos_produto').select('id, nome').eq('user_id', userId).order('nome');
  if (signal) query = query.abortSignal(signal);
  const { data, error } = await query;
  // An unavailable request is not an empty catalog: let the query retry and show the error.
  if (error) throw error;
  return ordenarTiposProduto(data || []);
}
