import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { fetchCatalogoProdutos, filtrarProdutos, produtosKey, type ProdutoFilters } from '@/lib/produtosData';

export function useProdutos(filters: ProdutoFilters = {}) {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: produtosKey(user?.id),
    queryFn: ({ signal }) => fetchCatalogoProdutos(user!.id, signal),
    enabled: !!user?.id,
    staleTime: 30_000,
    // Keep the existing list visible on return while checking for stock changes.
    refetchOnMount: 'always',
    retry: 1,
  });
  return { ...query, produtos: filtrarProdutos(query.data || [], filters) };
}
