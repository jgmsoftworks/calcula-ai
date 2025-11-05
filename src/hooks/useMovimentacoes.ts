// @ts-nocheck - Arquivo temporariamente desabilitado durante migração de banco de dados
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ItemCarrinho {
  produto_id: string;
  produto_nome: string;
  tipo: 'entrada' | 'saida';
  motivo: string;
  quantidade: number;
  custo_aplicado: number;
  subtotal: number;
}

export interface Comprovante {
  id: string;
  numero: number;
  responsavel: string;
  observacao: string | null;
  data_hora: string;
}

export function useMovimentacoes() {
  const { user } = useAuth();

  const gerarNumeroComprovante = async (): Promise<number> => {
    if (!user) return 1;

    const { data, error } = await supabase
      .rpc('gerar_proximo_numero_comprovante', { p_user_id: user.id });

    if (error) {
      console.error('Erro ao gerar número de comprovante:', error);
      return 1;
    }

    return data || 1;
  };

  const finalizarMovimentacao = async (
    items: ItemCarrinho[],
    responsavel: string,
    observacao?: string
  ): Promise<Comprovante | null> => {
    if (!user) {
      toast.error('Usuário não autenticado');
      return null;
    }

    if (items.length === 0) {
      toast.error('Adicione pelo menos um item ao carrinho');
      return null;
    }

    if (!responsavel.trim()) {
      toast.error('Informe o responsável pela movimentação');
      return null;
    }

    try {
      // 1. Verificar estoque para saídas
      for (const item of items) {
        if (item.tipo === 'saida') {
          const { data: produto } = await supabase
            .from('produtos')
            .select('estoque_atual, nome')
            .eq('id', item.produto_id)
            .single();

          if (produto && produto.estoque_atual < item.quantidade) {
            toast.error(
              `Estoque insuficiente para ${produto.nome}. Disponível: ${produto.estoque_atual}`
            );
            return null;
          }
        }
      }

      // 2. Criar comprovante
      const numeroComprovante = await gerarNumeroComprovante();

      // Determinar tipo do comprovante baseado nos itens
      const tiposUnicos = [...new Set(items.map(item => item.tipo))];
      const tipoComprovante = tiposUnicos.length === 1 
        ? tiposUnicos[0]  // Se todos forem do mesmo tipo, usar esse tipo
        : 'entrada';       // Se misturado, usar entrada como padrão

      const { data: comprovante, error: comprovanteError } = await supabase
        .from('comprovantes')
        .insert({
          user_id: user.id,
          numero: numeroComprovante,
          tipo: tipoComprovante,
          responsavel: responsavel.trim(),
          observacao: observacao?.trim() || null,
          data_hora: new Date().toISOString(),
        })
        .select()
        .single();

      if (comprovanteError) throw comprovanteError;

      // 3. Criar movimentações e atualizar estoque
      for (const item of items) {
        console.log('📝 Inserindo movimentação:', {
          produto_id: item.produto_id,
          produto_nome: item.produto_nome,
          tipo: item.tipo,
          motivo: item.motivo,
          quantidade: item.quantidade,
        });

        if (!item.produto_id) {
          console.error('❌ ERRO: produto_id é null/undefined para item:', item);
          throw new Error(`Item sem produto_id: ${item.produto_nome}`);
        }

        // Criar movimentação
        const { error: movError } = await supabase.from('movimentacoes').insert({
          user_id: user.id,
          comprovante_id: comprovante.id,
          produto_id: item.produto_id,
          tipo: item.tipo,
          motivo: item.motivo,
          quantidade: item.quantidade,
          custo_aplicado: item.custo_aplicado,
          subtotal: item.subtotal,
          responsavel: responsavel.trim(),
          origem: 'mini-pdv',
          data_hora: new Date().toISOString(),
        });

        if (movError) throw movError;

        // Atualizar estoque
        const { data: produtoAtual } = await supabase
          .from('produtos')
          .select('estoque_atual')
          .eq('id', item.produto_id)
          .single();

        if (produtoAtual) {
          const novoEstoque =
            item.tipo === 'entrada'
              ? produtoAtual.estoque_atual + item.quantidade
              : produtoAtual.estoque_atual - item.quantidade;

          // Se for ENTRADA, atualizar o custo_unitario do produto com o novo valor
          const updateData: any = { estoque_atual: novoEstoque };
          if (item.tipo === 'entrada') {
            updateData.custo_unitario = item.custo_aplicado;
          }

          const { error: updateError } = await supabase
            .from('produtos')
            .update(updateData)
            .eq('id', item.produto_id);

          if (updateError) throw updateError;
        }
      }

      toast.success('Movimentação registrada com sucesso');
      return comprovante;
    } catch (error) {
      console.error('Erro ao finalizar movimentação:', error);
      toast.error('Erro ao registrar movimentação');
      return null;
    }
  };

  const fetchHistoricoGeral = async (filters?: {
    dataInicio?: string;
    dataFim?: string;
    tipo?: 'entrada' | 'saida';
    produtoId?: string;
    responsavel?: string;
  }) => {
    if (!user) return [];

    let query = supabase
      .from('movimentacoes')
      .select('*, produtos(nome), comprovantes(numero)')
      .eq('user_id', user.id)
      .order('data_hora', { ascending: false });

    if (filters?.dataInicio) {
      query = query.gte('data_hora', filters.dataInicio);
    }

    if (filters?.dataFim) {
      query = query.lte('data_hora', filters.dataFim);
    }

    if (filters?.tipo) {
      query = query.eq('tipo', filters.tipo);
    }

    if (filters?.produtoId) {
      query = query.eq('produto_id', filters.produtoId);
    }

    if (filters?.responsavel) {
      query = query.ilike('responsavel', `%${filters.responsavel}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error(error);
      toast.error('Erro ao carregar histórico');
      return [];
    }

    return data || [];
  };

  const fetchComprovante = async (comprovanteId: string) => {
    if (!user) return null;

    const { data: comprovante, error: comprovanteError } = await supabase
      .from('comprovantes')
      .select('*')
      .eq('id', comprovanteId)
      .eq('user_id', user.id)
      .single();

    if (comprovanteError) {
      console.error(comprovanteError);
      return null;
    }

    const { data: movimentacoes, error: movError } = await supabase
      .from('movimentacoes')
      .select('*, produtos(nome)')
      .eq('comprovante_id', comprovanteId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (movError) {
      console.error(movError);
      return null;
    }

    return {
      ...comprovante,
      movimentacoes: movimentacoes || [],
    };
  };

  return {
    gerarNumeroComprovante,
    finalizarMovimentacao,
    fetchHistoricoGeral,
    fetchComprovante,
  };
}
