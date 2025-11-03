import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface MovimentacaoHistorico {
  id: string;
  created_at: string;
  data: string;
  tipo: string;
  quantidade: number;
  custo_unitario: number;
  observacao: string | null;
  fornecedor_id?: string | null;
  produto_id?: string;
  receita_id?: string;
  preco_venda?: number;
  // Relacionamentos
  produtos?: {
    nome: string;
    unidade: string;
  };
  receitas?: {
    nome: string;
  };
  fornecedores?: {
    nome: string;
  };
}

interface UseHistoricoOptions {
  origem: 'estoque' | 'vitrine';
  produtoId?: string;
  receitaId?: string;
  autoLoad?: boolean;
}

interface Filtros {
  tipo?: string;
  fornecedor_id?: string;
  produto_id?: string;
  receita_id?: string;
  data_inicial?: string;
  data_final?: string;
}

export function useHistoricoMovimentacoes(options: UseHistoricoOptions) {
  const { origem, produtoId, receitaId, autoLoad = true } = options;
  const { user } = useAuth();
  
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoHistorico[]>([]);
  const [loading, setLoading] = useState(false);
  const [limite, setLimite] = useState(50);
  const [hasMore, setHasMore] = useState(false);

  const loadMovimentacoes = async (filtros?: Filtros) => {
    if (!user) return;
    
    setLoading(true);
    try {
      if (origem === 'estoque') {
        let query = supabase
          .from('movimentacoes')
          .select(`
            id,
            created_at,
            data,
            tipo,
            quantidade,
            custo_unitario,
            observacao,
            fornecedor_id,
            produto_id,
            produtos!inner (
              nome,
              unidade
            ),
            fornecedores (
              nome
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(limite);

        if (produtoId) {
          query = query.eq('produto_id', produtoId);
        }
        
        if (filtros?.produto_id) {
          query = query.eq('produto_id', filtros.produto_id);
        }
        
        if (filtros?.tipo) {
          query = query.eq('tipo', filtros.tipo as 'entrada' | 'saida');
        }
        
        if (filtros?.fornecedor_id) {
          query = query.eq('fornecedor_id', filtros.fornecedor_id);
        }
        
        if (filtros?.data_inicial) {
          query = query.gte('created_at', new Date(filtros.data_inicial).toISOString());
        }
        
        if (filtros?.data_final) {
          const dataFinal = new Date(filtros.data_final);
          dataFinal.setHours(23, 59, 59, 999);
          query = query.lte('created_at', dataFinal.toISOString());
        }

        const { data, error } = await query;
        
        if (error) throw error;
        
        setMovimentacoes(data || []);
        setHasMore((data || []).length >= limite);
      } else if (origem === 'vitrine') {
        let query = supabase
          .from('movimentacoes_receitas')
          .select(`
            id,
            created_at,
            data,
            tipo,
            quantidade,
            custo_unitario,
            preco_venda,
            observacao,
            receita_id,
            receitas!inner (
              nome
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(limite);

        if (receitaId) {
          query = query.eq('receita_id', receitaId);
        }
        
        if (filtros?.receita_id) {
          query = query.eq('receita_id', filtros.receita_id);
        }
        
        if (filtros?.tipo) {
          query = query.eq('tipo', filtros.tipo as 'entrada' | 'venda' | 'perdas' | 'brindes');
        }
        
        if (filtros?.data_inicial) {
          query = query.gte('created_at', new Date(filtros.data_inicial).toISOString());
        }
        
        if (filtros?.data_final) {
          const dataFinal = new Date(filtros.data_final);
          dataFinal.setHours(23, 59, 59, 999);
          query = query.lte('created_at', dataFinal.toISOString());
        }

        const { data, error } = await query;
        
        if (error) throw error;
        
        setMovimentacoes(data || []);
        setHasMore((data || []).length >= limite);
      }
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
      setMovimentacoes([]);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    setLimite(prev => prev + 50);
  };

  const refresh = (filtros?: Filtros) => {
    setLimite(50);
    loadMovimentacoes(filtros);
  };

  useEffect(() => {
    if (autoLoad && user) {
      loadMovimentacoes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, limite, produtoId, receitaId, origem, autoLoad]);

  return {
    movimentacoes,
    loading,
    loadMore,
    hasMore,
    refresh,
    loadMovimentacoes,
  };
}
