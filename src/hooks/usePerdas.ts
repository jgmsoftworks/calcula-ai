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

  const registrarPerdas = async (
    inputs: NovaPerdaInput[],
    options?: { silent?: boolean },
  ): Promise<boolean> => {
    if (!user) {
      if (!options?.silent) toast.error('Usuário não autenticado');
      return false;
    }

    if (inputs.length === 0) {
      if (!options?.silent) toast.error('Adicione ao menos um item à perda');
      return false;
    }

    const referencia = inputs[0];

    try {
      const { error } = await supabase.rpc('registrar_perdas_transacional', {
        p_itens: inputs.map(input => ({
          tipo: input.tipo,
          item_id: input.tipo === 'produto' ? input.produto_id : input.receita_id,
          quantidade: input.quantidade,
        })),
        p_motivo: referencia.motivo,
        p_motivo_outro: referencia.motivo === 'Outro' ? referencia.motivo_outro || null : null,
        p_observacao: referencia.observacao || null,
        p_responsavel: referencia.responsavel || null,
        p_baixar_estoque: referencia.baixar_estoque,
      });
      if (error) throw error;

      if (!options?.silent) {
        toast.success(referencia.baixar_estoque
          ? `${inputs.length === 1 ? 'Perda registrada' : 'Perdas registradas'} e estoque atualizado`
          : `${inputs.length === 1 ? 'Perda registrada' : 'Perdas registradas'} sem movimentar o estoque`);
      }
      return true;
    } catch (e: unknown) {
      console.error(e);
      const mensagem = typeof e === 'object' && e !== null && 'message' in e
        ? String(e.message)
        : 'Erro ao registrar perda';
      toast.error(mensagem);
      return false;
    }
  };

  const registrarPerda = async (
    input: NovaPerdaInput,
    options?: { silent?: boolean },
  ): Promise<boolean> => registrarPerdas([input], options);

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

  return { loading, fetchPerdas, registrarPerda, registrarPerdas, excluirPerda, calcularCustoReceita };
}
