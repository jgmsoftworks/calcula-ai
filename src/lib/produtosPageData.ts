import { supabase } from '@/integrations/supabase/client';
import type { Produto } from '@/hooks/useEstoque';
import type { ProdutoFilters } from './produtosData';

export const PRODUTOS_PAGE_SIZE = 40;
export interface CategoriaResumo { nome: string; count: number; imagem: string | null }
export interface ProdutosPage {
  produtos: Produto[];
  total: number;
  pagina: number;
  totalBusca: number;
  categorias: CategoriaResumo[];
}

export async function fetchProdutosPage(filters: ProdutoFilters = {}, page = 1, signal?: AbortSignal): Promise<ProdutosPage> {
  let query = supabase.rpc('listar_produtos_pagina', {
    p_busca: filters.search?.trim() || '',
    p_marcas: filters.marcas || [],
    p_categorias: filters.categorias || [],
    p_unidade: filters.unidade || '',
    p_abaixo_minimo: !!filters.abaixoMinimo,
    p_pagina: Math.min(2147483647, Math.max(1, Math.floor(Number.isFinite(page) ? page : 1))),
    p_tamanho: PRODUTOS_PAGE_SIZE,
  });
  if (signal) query = query.abortSignal(signal);
  const { data, error } = await query;
  if (error) throw error;
  if (!data || typeof data !== 'object' || Array.isArray(data) || !Array.isArray(data.produtos)) {
    throw new Error('Resposta de produtos inválida');
  }
  const result = data as unknown as ProdutosPage;
  return { ...result, produtos: result.produtos.map(p => ({
    ...p, nome: p.nome.trim(), unidade_compra: p.unidade_compra.toLowerCase(),
  })) };
}
