import { useEffect, useState } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { produtosKey, type ProdutoFilters } from '@/lib/produtosData';
import { fetchProdutosPage, PRODUTOS_PAGE_SIZE } from '@/lib/produtosPageData';

function useSearchFilters(filters: ProdutoFilters) {
  const [search, setSearch] = useState(filters.search || '');
  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(filters.search || ''), 150);
    return () => window.clearTimeout(timer);
  }, [filters.search]);
  return { filters: { ...filters, search }, searching: search !== (filters.search || '') };
}

export function useProdutosPage(filters: ProdutoFilters = {}, page = 1) {
  const { user } = useAuth();
  const deferred = useSearchFilters(filters);
  const query = useQuery({
    queryKey: [...produtosKey(user?.id), 'page', deferred.filters, page],
    queryFn: ({ signal }) => fetchProdutosPage(deferred.filters, page, signal),
    enabled: !!user?.id,
    staleTime: 30_000,
    refetchOnMount: 'always',
    retry: 1,
    placeholderData: (previous, previousQuery) => previousQuery?.queryKey[1] === user?.id ? previous : undefined,
  });
  return { ...query, searching: deferred.searching, produtos: query.data?.produtos || [] };
}

export function useProdutosMovimentacao(filters: ProdutoFilters = {}) {
  const { user } = useAuth();
  const deferred = useSearchFilters(filters);
  const query = useInfiniteQuery({
    queryKey: [...produtosKey(user?.id), 'movement', deferred.filters],
    queryFn: ({ signal, pageParam }) => fetchProdutosPage(deferred.filters, pageParam, signal),
    initialPageParam: 1,
    getNextPageParam: last => last.pagina * PRODUTOS_PAGE_SIZE < last.total ? last.pagina + 1 : undefined,
    enabled: !!user?.id,
    staleTime: 30_000,
    refetchOnMount: 'always',
    retry: 1,
    placeholderData: (previous, previousQuery) => previousQuery?.queryKey[1] === user?.id ? previous : undefined,
  });
  // A product can move between pages if the catalog changes while browsing.
  const produtos = Array.from(new Map(query.data?.pages.flatMap(page => page.produtos).map(p => [p.id, p])).values());
  return { ...query, searching: deferred.searching, produtos, resumo: query.data?.pages[0] };
}
