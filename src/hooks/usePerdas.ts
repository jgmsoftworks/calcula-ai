import { useState } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const MOTIVOS_PERDA = [
  'Vencimento',
  'Quebra',
  'Queima',
  'Cliente devolveu',
  'Erro de produção',
  'Outro',
] as const;

export type MotivoPerda = typeof MOTIVOS_PERDA[number];

export interface Perda {
  id: string;
  user_id: string;
  tipo: 'produto' | 'receita';
  produto_id: string | null;
  receita_id: string | null;
  nome_item: string;
  quantidade: number;
  custo_unitario: number;
  custo_total: number;
  motivo: string;
  motivo_outro: string | null;
  observacao: string | null;
  responsavel: string | null;
  data_perda: string;
  created_at: string;
  updated_at: string;
}

export interface NovaPerdaInput {
  tipo: 'produto' | 'receita';
  produto_id?: string | null;
  receita_id?: string | null;
  nome_item: string;
  quantidade: number;
  custo_unitario: number;
  motivo: MotivoPerda;
  motivo_outro?: string;
  observacao?: string;
  responsavel?: string;
  baixar_estoque: boolean;
}

export function usePerdas() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const fetchPerdas = async (filters?: {
    tipo?: 'produto' | 'receita';
    dataInicio?: string;
    dataFim?: string;
  }): Promise<Perda[]> => {
    if (!user) return [];
    setLoading(true);
    try {
      let q = supabase
        .from('perdas')
        .select('*')
        .eq('user_id', user.id)
        .order('data_perda', { ascending: false });

      if (filters?.tipo) q = q.eq('tipo', filters.tipo);
      if (filters?.dataInicio) q = q.gte('data_perda', filters.dataInicio);
      if (filters?.dataFim) q = q.lte('data_perda', filters.dataFim);

      const { data, error } = await q;
      if (error) throw error;
      return (data as Perda[]) || [];
    } catch (e) {
      console.error(e);
      toast.error('Erro ao carregar perdas');
      return [];
    } finally {
      setLoading(false);
    }
  };

  const registrarPerda = async (input: NovaPerdaInput): Promise<boolean> => {
    if (!user) {
      toast.error('Usuário não autenticado');
      return false;
    }

    const custo_total = +(input.quantidade * input.custo_unitario).toFixed(2);

    try {
      // 1. Inserir registro de perda
      const { error: perdaError } = await supabase.from('perdas').insert({
        user_id: user.id,
        tipo: input.tipo,
        produto_id: input.tipo === 'produto' ? input.produto_id : null,
        receita_id: input.tipo === 'receita' ? input.receita_id : null,
        nome_item: input.nome_item,
        quantidade: input.quantidade,
        custo_unitario: input.custo_unitario,
        custo_total,
        motivo: input.motivo,
        motivo_outro: input.motivo === 'Outro' ? input.motivo_outro || null : null,
        observacao: input.observacao || null,
        responsavel: input.responsavel || null,
        data_perda: new Date().toISOString(),
      });

      if (perdaError) throw perdaError;

      // 2. Dar baixa no estoque somente quando o usuário confirmar.
      if (input.baixar_estoque) {
        if (input.tipo === 'produto' && input.produto_id) {
          await darBaixaProduto(input.produto_id, input.quantidade, input.custo_unitario, input.motivo, input.responsavel);
        } else if (input.tipo === 'receita' && input.receita_id) {
          await darBaixaIngredientesReceita(input.receita_id, input.quantidade, input.motivo, input.responsavel);
        }
      }

      toast.success(input.baixar_estoque
        ? 'Perda registrada e estoque atualizado'
        : 'Perda registrada sem movimentar o estoque');
      return true;
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Erro ao registrar perda');
      return false;
    }
  };

  const darBaixaProduto = async (
    produtoId: string,
    quantidade: number,
    custoUnitario: number,
    motivo: string,
    responsavel?: string,
  ) => {
    const { data: produto } = await supabase
      .from('produtos')
      .select('estoque_atual, nome')
      .eq('id', produtoId)
      .single();

    if (!produto) return;

    const novoEstoque = Math.max(0, produto.estoque_atual - quantidade);

    await supabase.from('movimentacoes').insert({
      user_id: user!.id,
      produto_id: produtoId,
      tipo: 'saida',
      motivo: `Perda - ${motivo}`,
      quantidade,
      custo_aplicado: custoUnitario,
      subtotal: +(quantidade * custoUnitario).toFixed(2),
      responsavel: responsavel || 'Sistema',
      origem: 'perdas',
      data_hora: new Date().toISOString(),
    });

    await supabase.from('produtos').update({ estoque_atual: novoEstoque }).eq('id', produtoId);
  };

  const darBaixaIngredientesReceita = async (
    receitaId: string,
    quantidadeReceita: number,
    motivo: string,
    responsavel?: string,
  ) => {
    const { data: ingredientes } = await supabase
      .from('receita_ingredientes')
      .select('quantidade, produto:produtos(id, nome, custo_unitario, fator_conversao, unidade_uso, estoque_atual)')
      .eq('receita_id', receitaId);

    if (!ingredientes) return;

    for (const ing of ingredientes as any[]) {
      const produto = ing.produto;
      if (!produto) continue;

      // Quantidade total a baixar: qtd da receita * qtd da perda
      // Converter para unidade de compra usando fator_conversao se houver
      let qtdBaixa = ing.quantidade * quantidadeReceita;
      if (produto.unidade_uso && produto.fator_conversao && produto.fator_conversao > 0) {
        qtdBaixa = qtdBaixa / produto.fator_conversao;
      }

      const custoAplicado = produto.custo_unitario || 0;
      const novoEstoque = Math.max(0, (produto.estoque_atual || 0) - qtdBaixa);

      await supabase.from('movimentacoes').insert({
        user_id: user!.id,
        produto_id: produto.id,
        tipo: 'saida',
        motivo: `Perda Receita - ${motivo}`,
        quantidade: +qtdBaixa.toFixed(4),
        custo_aplicado: custoAplicado,
        subtotal: +(qtdBaixa * custoAplicado).toFixed(2),
        responsavel: responsavel || 'Sistema',
        origem: 'perdas',
        data_hora: new Date().toISOString(),
      });

      await supabase.from('produtos').update({ estoque_atual: novoEstoque }).eq('id', produto.id);
    }
  };

  const excluirPerda = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase.from('perdas').delete().eq('id', id);
      if (error) throw error;
      toast.success('Perda excluída');
      return true;
    } catch (e) {
      console.error(e);
      toast.error('Erro ao excluir perda');
      return false;
    }
  };

  const calcularCustoReceita = async (receitaId: string): Promise<number> => {
    const { data, error } = await supabase.rpc('calcular_custo_receita', { p_receita_id: receitaId });
    if (error) {
      console.error(error);
      return 0;
    }
    return Number(data) || 0;
  };

  return { loading, fetchPerdas, registrarPerda, excluirPerda, calcularCustoReceita };
}
