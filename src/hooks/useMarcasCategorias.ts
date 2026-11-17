import { useCallback } from 'react';
import { useAuth } from './useAuth';
import { fetchCatalogoEstoque, type CatalogoEstoqueItem } from '@/lib/catalogoEstoqueData';
import { createLogger } from '@/lib/logger';

export type Marca = CatalogoEstoqueItem;
export type Categoria = CatalogoEstoqueItem;
const log = createLogger('catalogo-estoque');

export function useMarcasCategorias() {
  const { user } = useAuth();
  const fetchMarcas = useCallback(async () => {
    if (!user?.id) return [];
    try { return await fetchCatalogoEstoque('marcas', user.id); }
    catch (error) { log.error('Erro ao carregar marcas', error); return []; }
  }, [user?.id]);
  const fetchCategorias = useCallback(async () => {
    if (!user?.id) return [];
    try { return await fetchCatalogoEstoque('categorias', user.id); }
    catch (error) { log.error('Erro ao carregar categorias', error); return []; }
  }, [user?.id]);
  return { fetchMarcas, fetchCategorias };
}
