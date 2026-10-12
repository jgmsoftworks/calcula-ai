import { supabase } from '@/integrations/supabase/client';
import type { ReceitaComDados } from '@/types/receitas';

export const RECEITAS_PAGE_SIZE = 24;
export interface ReceitaFilters {
  search?: string;
  tipo?: string;
  status?: 'rascunho' | 'finalizada';
  subReceita?: string;
}

// Keep the same costing rules used by the editor. Counts come from relations
// already fetched for costing, avoiding three redundant aggregate joins.
interface ProdutoCusto {
  quantidade: number;
  produto: { custo_unitario: number; unidade_uso: string | null; fator_conversao: number | null } | null;
}
interface ComponentesCusto {
  ingredientes?: ProdutoCusto[];
  embalagens?: ProdutoCusto[];
  mao_obra?: { valor_total: number }[];
  sub_receitas?: { quantidade: number; sub_receita: { preco_venda: number; rendimento_valor: number | null } | null }[];
}
export function calcularDadosReceita<T extends ComponentesCusto>(receita: T) {
  const custoProdutos = (items: ProdutoCusto[] | undefined) => (items || []).reduce((sum, item) => {
    const produto = item.produto;
    if (!produto) return sum;
    const unitario = produto.unidade_uso
      ? produto.custo_unitario / (produto.fator_conversao || 1)
      : produto.custo_unitario;
    return sum + unitario * item.quantidade;
  }, 0);
  return {
    ...receita,
    total_ingredientes: receita.ingredientes?.length || 0,
    total_embalagens: receita.embalagens?.length || 0,
    total_sub_receitas: receita.sub_receitas?.length || 0,
    custo_ingredientes: custoProdutos(receita.ingredientes),
    custo_embalagens: custoProdutos(receita.embalagens),
    custo_mao_obra: receita.mao_obra?.reduce((sum, item) => sum + (item.valor_total || 0), 0) || 0,
    custo_sub_receitas: receita.sub_receitas?.reduce((sum, item) => {
      if (!item.sub_receita) return sum;
      const { preco_venda, rendimento_valor } = item.sub_receita;
      return sum + (rendimento_valor && rendimento_valor > 0 ? preco_venda / rendimento_valor : preco_venda) * item.quantidade;
    }, 0) || 0,
  };
}

export async function fetchReceitasPage(
  userId: string,
  filters: ReceitaFilters = {},
  page = 1,
  pageSize = RECEITAS_PAGE_SIZE,
  signal?: AbortSignal,
): Promise<{ receitas: ReceitaComDados[]; total: number }> {
  let subMarkupIds: string[] = [];
  if (filters.subReceita === 'subreceita' || filters.subReceita === 'normal') {
    let markupsQuery = supabase.from('markups').select('id').eq('user_id', userId).eq('tipo', 'sub_receita');
    if (signal) markupsQuery = markupsQuery.abortSignal(signal);
    const { data, error } = await markupsQuery;
    if (error) throw error;
    subMarkupIds = (data || []).map(item => item.id);
    if (filters.subReceita === 'subreceita' && !subMarkupIds.length) return { receitas: [], total: 0 };
  }

  let query = supabase.from('receitas').select(`
    *, tipo_produto:tipos_produto(id, nome), markup:markups(id, nome, tipo),
    ingredientes:receita_ingredientes(quantidade, produto:produtos(custo_unitario, unidade_uso, fator_conversao)),
    embalagens:receita_embalagens(quantidade, produto:produtos(custo_unitario, unidade_uso, fator_conversao)),
    mao_obra:receita_mao_obra(valor_total),
    sub_receitas:receita_sub_receitas!receita_sub_receitas_receita_id_fkey(
      quantidade, sub_receita:receitas!receita_sub_receitas_sub_receita_id_fkey(preco_venda, rendimento_valor)
    )
  `, { count: 'exact' }).eq('user_id', userId)
    .order('numero_sequencial', { ascending: false }).order('id', { ascending: false });
  const orFilters: string[] = [];
  const search = filters.search?.trim();
  if (search) {
    if (/^\d+$/.test(search) && Number.isSafeInteger(Number(search)) && Number(search) <= 2147483647) {
      orFilters.push(`numero_sequencial.eq.${Number(search)},nome.ilike.%${search}%`);
    } else {
      query = query.ilike('nome', `%${search}%`);
    }
  }
  if (filters.tipo && filters.tipo !== 'all') query = query.eq('tipo_produto_id', filters.tipo);
  if (filters.status) query = query.eq('status', filters.status);
  if (subMarkupIds.length) {
    if (filters.subReceita === 'subreceita') query = query.in('markup_id', subMarkupIds);
    else orFilters.push(`markup_id.is.null,markup_id.not.in.(${subMarkupIds.join(',')})`);
  }
  if (orFilters.length) {
    query = query.or(orFilters.length === 1 ? orFilters[0] : `and(${orFilters.map(filter => `or(${filter})`).join(',')})`);
  }
  const size = Math.min(250, Math.max(1, Math.floor(pageSize)));
  const start = (Math.max(1, Math.floor(page)) - 1) * size;
  query = query.range(start, start + size - 1);
  if (signal) query = query.abortSignal(signal);
  const { data, error, count } = await query;
  if (error) throw error;
  return { receitas: (data || []).map(calcularDadosReceita) as ReceitaComDados[], total: count || 0 };
}

// Export all filtered records, including records outside the visible page and
// beyond PostgREST's default row limit. Only called when the user exports.
export async function fetchTodasReceitas(userId: string, filters: ReceitaFilters = {}) {
  const receitas: ReceitaComDados[] = [];
  let page = 1;
  while (true) {
    const result = await fetchReceitasPage(userId, filters, page, 250);
    receitas.push(...result.receitas);
    if (!result.receitas.length || receitas.length >= result.total) return receitas;
    page++;
  }
}
