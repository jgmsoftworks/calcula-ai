import { fetchHistoricoEstoque, type FiltrosHistoricoEstoque } from '@/lib/historicoEstoqueData';
import { useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { produtosKey } from '@/lib/produtosData';
import { totalizarSaidasPorProduto, verificarSaldosDisponiveis } from '@/lib/validacaoMovimentacao';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ItemCarrinho {
  produto_id: string;
  origem_estoque?: 'produto' | 'geladeira';
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
  const queryClient = useQueryClient();
  // Repetir uma solicitação de rede não deve criar um novo comprovante.
  const tentativa = useRef<{ assinatura: string; id: string } | null>(null);

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

    const responsavelNormalizado = responsavel.trim();
    const observacaoNormalizada = observacao?.trim() || null;
    if (!responsavelNormalizado || responsavelNormalizado.length > 120) {
      toast.error('Informe o responsável pela movimentação.');
      return null;
    }
    if ((observacaoNormalizada?.length ?? 0) > 2000) {
      toast.error('A observação está muito longa.');
      return null;
    }

    let saidas;
    try {
      // Considera o conjunto completo, inclusive o mesmo produto repetido no carrinho.
      totalizarSaidasPorProduto(items);
      const produtos = items.filter(item => item.origem_estoque !== 'geladeira');
      saidas = produtos.length ? totalizarSaidasPorProduto(produtos) : new Map();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Confira os itens do carrinho.');
      return null;
    }

    const itensParaGravar = items.map(item => ({
      produto_id: item.produto_id,
      origem_estoque: item.origem_estoque || 'produto',
      tipo: item.tipo,
      motivo: item.motivo.trim(),
      quantidade: item.quantidade,
      custo_aplicado: item.custo_aplicado,
      subtotal: item.subtotal,
    }));
    const assinatura = JSON.stringify({
      itens: itensParaGravar,
      responsavel: responsavelNormalizado,
      observacao: observacaoNormalizada,
    });
    // Uma operação já confirmada pelo servidor pode perder a resposta de rede.
    // Nesse caso, reutilize o mesmo UUID para consultar o resultado idempotente;
    // não repita a pré-checagem contra um saldo que já foi atualizado.
    const retomandoTentativa = tentativa.current?.assinatura === assinatura;
    if (!retomandoTentativa) tentativa.current = null;

    try {
      // Validação amigável no cliente. A verificação definitiva, com bloqueio
      // de concorrência, é feita na transação SQL abaixo.
      if (saidas.size && !retomandoTentativa) {
        const { data: saldos, error: saldoError } = await supabase
          .from('produtos')
          .select('id,nome,estoque_atual')
          .eq('user_id', user.id)
          .in('id', [...saidas.keys()]);
        if (saldoError) throw saldoError;
        const mensagem = verificarSaldosDisponiveis(saidas, saldos || []);
        if (mensagem) {
          toast.error(mensagem);
          return null;
        }
      }

      if (!tentativa.current) {
        tentativa.current = { assinatura, id: crypto.randomUUID() };
      }

      // Uma única chamada: comprovante, todas as movimentações e todos os
      // saldos são gravados juntos. Qualquer falha cancela a operação inteira.
      const { data: comprovante, error } = await supabase.rpc(
        'finalizar_movimentacao_integrada',
        {
          p_itens: itensParaGravar,
          p_responsavel: responsavelNormalizado,
          p_observacao: observacaoNormalizada,
          p_request_id: tentativa.current.id,
        }
      );

      if (error) {
        if (error.code === 'P0001' || error.message?.startsWith('Estoque insuficiente')) {
          toast.error(error.message);
          return null;
        }
        if (error.code === 'P0002') {
          toast.error('Um produto foi removido ou está indisponível. Atualize o estoque e tente novamente.');
          return null;
        }
        if (['23514', '22023', '42501'].includes(error.code)) {
          toast.error(error.message);
          return null;
        }
        throw error;
      }

      tentativa.current = null;
      void queryClient.invalidateQueries({ queryKey: produtosKey(user.id), refetchType: 'none' });
      void queryClient.invalidateQueries({ queryKey: ['geladeira', user.id] });
      toast.success('Movimentação registrada com sucesso');
      return comprovante as unknown as Comprovante;
    } catch (error) {
      console.error('Erro ao finalizar movimentação:', error);
      toast.error('Não foi possível concluir a movimentação. Nenhuma saída foi confirmada; confira o histórico antes de tentar novamente.');
      return null;
    }
  };

  const fetchHistoricoGeral = useCallback(async (filters?: FiltrosHistoricoEstoque) => {
    if (!user?.id) return [];
    try { return await fetchHistoricoEstoque(user.id, filters); }
    catch (error) { toast.error('Erro ao carregar histórico'); throw error; }
  }, [user?.id]);

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

    try {
      const movimentacoes = await fetchHistoricoEstoque(user.id, { comprovanteId });
      return { ...comprovante, movimentacoes };
    } catch (error) { console.error(error); return null; }
  };

  return {
    gerarNumeroComprovante,
    finalizarMovimentacao,
    fetchHistoricoGeral,
    fetchComprovante,
  };
}
