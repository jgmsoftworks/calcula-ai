import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { fetchTiposProduto, tiposProdutoKey } from '@/lib/tiposProdutoData';

export function useTiposProduto(enabled = true) {
  const { user } = useAuth();
  return useQuery({
    queryKey: tiposProdutoKey(user?.id),
    queryFn: ({ signal }) => fetchTiposProduto(user!.id, signal),
    enabled: enabled && !!user?.id,
    staleTime: 60_000,
    retry: 2,
  });
}
