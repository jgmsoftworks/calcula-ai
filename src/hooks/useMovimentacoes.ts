// @ts-nocheck - Arquivo temporariamente desabilitado durante migração de banco de dados
import { useRef } from 'react';
import { totalizarSaidasPorProduto, verificarSaldosDisponiveis } from '@/lib/validacaoMovimentacao';
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
      saidas = totalizarSaidasPorProduto(items);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Confira os itens do carrinho.');
      return null;
    }

    const itensParaGravar = items.map(item => ({
      produto_id: item.produto_id,
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
        'finalizar_movimentacao_estoque',
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
        if (error.code === '23514') {
          toast.error('Esta movimentação deixaria um produto com estoque negativo.');
          return null;
        }
        throw error;
      }

      tentativa.current = null;
      toast.success('Movimentação registrada com sucesso');
      return comprovante as Comprovante;
    } catch (error) {
      console.error('Erro ao finalizar movimentação:', error);
      toast.error('Não foi possível concluir a movimentação. Nenhuma saída foi confirmada; confira o histórico antes de tentar novamente.');
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
