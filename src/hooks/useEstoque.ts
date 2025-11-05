// @ts-nocheck - Arquivo temporariamente desabilitado durante migração de banco de dados
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Produto {
  id: string;
  user_id: string;
  nome: string;
  codigo_interno: number;
  codigos_barras: string[];
  marcas: string[];
  categorias: string[];
  unidade_compra: string;
  custo_unitario: number;
  estoque_atual: number;
  estoque_minimo: number;
  unidade_uso: string | null;
  fator_conversao: number | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export function useEstoque() {
  const { user } = useAuth();

  const gerarCodigoInterno = async (): Promise<number> => {
    if (!user) return 1;

    const { data, error } = await supabase
      .rpc('gerar_proximo_codigo_interno', { p_user_id: user.id });

    if (error) {
      console.error('Erro ao gerar código interno:', error);
      return 1;
    }

    return (data as number) || 1;
  };

  const fetchProdutos = async (filters?: {
    search?: string;
    marcas?: string[];
    categorias?: string[];
    unidade?: string;
    abaixoMinimo?: boolean;
  }) => {
    if (!user) return [];

    let query = supabase
      .from('produtos')
      .select('*')
      .eq('user_id', user.id)
      .eq('ativo', true)
      .order('codigo_interno', { ascending: true });

    if (filters?.search) {
      const searchTerm = `%${filters.search}%`;
      query = query.or(`nome.ilike.${searchTerm},codigo_interno.eq.${parseInt(filters.search) || 0},codigos_barras.cs.{${filters.search}}`);
    }

    if (filters?.unidade) {
      query = query.eq('unidade_compra', filters.unidade);
    }

    const { data, error } = await query;

    if (error) {
      toast.error('Erro ao carregar produtos');
      console.error(error);
      return [];
    }

    let produtos = data || [];

    // Filtros locais (arrays)
    if (filters?.marcas && filters.marcas.length > 0) {
      produtos = produtos.filter(p => 
        p.marcas?.some(m => filters.marcas!.includes(m))
      );
    }

    if (filters?.categorias && filters.categorias.length > 0) {
      produtos = produtos.filter(p => 
        p.categorias?.some(c => filters.categorias!.includes(c))
      );
    }

    if (filters?.abaixoMinimo) {
      produtos = produtos.filter(p => 
        p.estoque_minimo && p.estoque_atual < p.estoque_minimo
      );
    }

    return produtos;
  };

  const createProduto = async (data: Partial<Produto>) => {
    if (!user) {
      toast.error('Usuário não autenticado');
      return null;
    }

    const { data: produto, error } = await supabase
      .from('produtos')
      .insert({
        ...data,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        toast.error('Código interno já existe. Tente outro.');
      } else {
        toast.error('Erro ao criar produto');
      }
      console.error(error);
      return null;
    }

    toast.success('Produto criado com sucesso');
    return produto;
  };

  const updateProduto = async (id: string, data: Partial<Produto>) => {
    if (!user) {
      toast.error('Usuário não autenticado');
      return null;
    }

    const { data: produto, error } = await supabase
      .from('produtos')
      .update(data)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        toast.error('Código interno já existe. Tente outro.');
      } else {
        toast.error('Erro ao atualizar produto');
      }
      console.error(error);
      return null;
    }

    toast.success('Produto atualizado com sucesso');
    return produto;
  };

  const deleteProduto = async (id: string) => {
    if (!user) {
      toast.error('Usuário não autenticado');
      return false;
    }

    const { error } = await supabase
      .from('produtos')
      .update({ ativo: false })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      toast.error('Erro ao desativar produto');
      console.error(error);
      return false;
    }

    toast.success('Produto desativado com sucesso');
    return true;
  };

  const fetchHistoricoProduto = async (produtoId: string) => {
    if (!user) return [];

    const { data, error } = await supabase
      .from('movimentacoes')
      .select('*, comprovantes(numero)')
      .eq('produto_id', produtoId)
      .eq('user_id', user.id)
      .order('data_hora', { ascending: false});

    if (error) {
      console.error(error);
      return [];
    }

    return data || [];
  };

  return {
    gerarCodigoInterno,
    fetchProdutos,
    createProduto,
    updateProduto,
    deleteProduto,
    fetchHistoricoProduto,
  };
}
