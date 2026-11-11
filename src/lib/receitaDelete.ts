import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

export type UsoReceita = {
  tipo: 'receita' | 'geladeira';
  id: string;
  nome: string;
  imagem_url: string | null;
  numero_sequencial?: number;
  updated_at: string;
  vinculos?: { id: string; updated_at: string; quantidade: number }[];
  estoque_atual?: number;
  estoque_minimo?: number;
  unidade?: string;
};
export type ExclusaoReceita = {
  receita: { id: string; nome: string; imagem_url: string | null; updated_at: string };
  usos: UsoReceita[];
};
export const usoReceitaKey = (uso: UsoReceita) => `${uso.tipo}:${uso.id}`;

export async function carregarUsosReceita(id: string, signal?: AbortSignal): Promise<ExclusaoReceita> {
  let query = supabase.rpc('listar_usos_receita', { p_receita_id: id });
  if (signal) query = query.abortSignal(signal);
  const { data, error } = await query;
  if (error) throw error;
  if (!data || typeof data !== 'object' || Array.isArray(data) || !data.receita || !Array.isArray(data.usos)) {
    throw new Error('Não foi possível conferir os usos desta receita.');
  }
  return data as unknown as ExclusaoReceita;
}

export async function excluirReceitaComVinculos(contexto: ExclusaoReceita, removidos: Set<string>) {
  if (contexto.usos.some(uso => !removidos.has(usoReceitaKey(uso)))) {
    throw new Error('Marque todos os usos para remoção antes de excluir a receita.');
  }
  const { error } = await supabase.rpc('excluir_receita_com_vinculos', {
    p_receita_id: contexto.receita.id,
    p_expected_updated_at: contexto.receita.updated_at,
    p_usos: contexto.usos as unknown as Json,
  });
  if (error) throw error;
}
