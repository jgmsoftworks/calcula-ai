import { supabase } from '@/integrations/supabase/client';
import type { Produto } from '@/hooks/useEstoque';

export interface ProdutoFilters {
  search?: string;
  marcas?: string[];
  categorias?: string[];
  unidade?: string;
  abaixoMinimo?: boolean;
}

export const produtosKey = (userId?: string) => ['produtos-catalogo', userId] as const;
const COLUMNS = 'id,user_id,nome,codigo_interno,codigos_barras,marcas,categorias,unidade_compra,custo_unitario,estoque_atual,estoque_minimo,unidade_uso,fator_conversao,imagem_url,ativo,created_at,updated_at';

export async function fetchCatalogoProdutos(userId: string, signal?: AbortSignal): Promise<Produto[]> {
  const produtos: Produto[] = [];
  const pageSize = 500;
  // Read every page so local filters also find records beyond the API row limit.
  for (let start = 0; ; start += pageSize) {
    let query = supabase.from('produtos').select(COLUMNS)
      .eq('user_id', userId).eq('ativo', true)
      .order('codigo_interno', { ascending: true }).order('id', { ascending: true })
      .range(start, start + pageSize - 1);
    if (signal) query = query.abortSignal(signal);
    const { data, error } = await query;
    if (error) throw error;
    produtos.push(...(data || []).map(p => ({
      ...p,
      nome: String(p.nome || '').trim(),
      unidade_compra: String(p.unidade_compra || '').toLowerCase(),
    })));
    if (!data || data.length < pageSize) return produtos;
  }
}

export function filtrarProdutos(produtos: Produto[], filters: ProdutoFilters = {}) {
  const search = filters.search?.trim().toLowerCase();
  const codigo = search && /^\d+$/.test(search) ? Number(search) : null;
  const normalizeUnit = (unit?: string) => unit === 'kg' ? 'k' : unit;
  return produtos.filter(p =>
    (!search || p.nome.toLowerCase().includes(search) || p.codigo_interno === codigo || p.codigos_barras?.some(cb => cb.includes(search))) &&
    (!filters.unidade || normalizeUnit(p.unidade_compra) === normalizeUnit(filters.unidade)) &&
    (!filters.marcas?.length || p.marcas?.some(m => filters.marcas!.includes(m))) &&
    (!filters.categorias?.length || p.categorias?.some(c => filters.categorias!.includes(c))) &&
    (!filters.abaixoMinimo || (p.estoque_minimo > 0 && p.estoque_atual < p.estoque_minimo))
  );
}
