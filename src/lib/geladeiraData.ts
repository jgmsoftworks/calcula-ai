import { supabase } from '@/integrations/supabase/client';
import { calcularDadosReceita, RECEITA_CUSTO_SELECT } from '@/lib/receitasData';
import type { ReceitaComDados } from '@/types/receitas';
import type { Database } from '@/integrations/supabase/types';

export type GeladeiraItem = Database['public']['Tables']['geladeira_itens']['Row'] & { receita: ReceitaComDados };
export type GeladeiraMovimentacao = Database['public']['Tables']['geladeira_movimentacoes']['Row'];
export type GeladeiraOperacao = 'entrada' | 'saida' | 'ajuste' | 'minimo' | 'remocao';
export const OPERACAO_LABEL: Record<GeladeiraOperacao, string> = {
  entrada: 'Entrada', saida: 'Saída', ajuste: 'Ajuste de saldo', minimo: 'Estoque mínimo', remocao: 'Remoção',
};
export function custoUnitarioGeladeira(receita: ReceitaComDados): number | null {
  if (!receita.rendimento_valor || !Number.isFinite(receita.rendimento_valor) || receita.rendimento_valor <= 0) return null;
  const total = (receita.custo_ingredientes || 0) + (receita.custo_embalagens || 0)
    + (receita.custo_mao_obra || 0) + (receita.custo_sub_receitas || 0);
  return Number.isFinite(total) && total >= 0 ? total / receita.rendimento_valor : null;
}
export function receitaPodeEntrar(receita: ReceitaComDados) {
  return receita.status === 'finalizada' && !!receita.rendimento_unidade?.trim() && custoUnitarioGeladeira(receita) !== null;
}
export async function fetchGeladeira(userId: string, signal?: AbortSignal): Promise<GeladeiraItem[]> {
  const items: GeladeiraItem[] = [];
  for (let offset = 0; ; offset += 250) {
    let query = supabase.from('geladeira_itens').select(`*, receita:receitas(${RECEITA_CUSTO_SELECT})`)
      .eq('user_id', userId).order('id').range(offset, offset + 249);
    if (signal) query = query.abortSignal(signal);
    const { data, error } = await query;
    if (error) throw error;
    for (const row of data || []) {
      const typed = row as unknown as GeladeiraItem & { receita: Parameters<typeof calcularDadosReceita>[0] & ReceitaComDados };
      if (!typed.receita) throw new Error('Não foi possível carregar a receita de um item. Tente novamente.');
      items.push({ ...typed, receita: calcularDadosReceita(typed.receita) });
    }
    if (!data || data.length < 250) return items.sort((a, b) => a.receita.nome.localeCompare(b.receita.nome));
  }
}
export function geladeiraComoProduto(item: GeladeiraItem) {
  return {
    ...item, id: item.id, nome: item.receita.nome, codigo_interno: item.receita.numero_sequencial,
    unidade_compra: item.unidade, unidade_uso: null, fator_conversao: null,
    custo_unitario: custoUnitarioGeladeira(item.receita) ?? 0,
    custo_indisponivel: custoUnitarioGeladeira(item.receita) === null,
    imagem_url: item.receita.imagem_url, marcas: [], codigos_barras: [], ativo: true,
    categorias: [item.receita.markup?.tipo === 'sub_receita' ? 'Sub-receitas' : 'Receitas finais'],
    origem_estoque: 'geladeira' as const,
  };
}
