import { useQueryClient } from '@tanstack/react-query';
import { produtosKey } from '@/lib/produtosData';
import { useState, useRef, useCallback } from 'react';
import { fetchPerdasData, type FiltrosPerdas } from '@/lib/perdasData';
import type { Perda } from '@/types/perdas';
export type { Perda } from '@/types/perdas';
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

export interface NovaPerdaInput {
  tipo: 'produto' | 'receita' | 'geladeira';
  geladeira_item_id?: string | null;
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
  const queryClient = useQueryClient();
  const tentativa = useRef<{ assinatura: string; id: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchPerdas = useCallback(async (filters?: FiltrosPerdas): Promise<Perda[]> => {
    if (!user?.id) return [];
    setLoading(true);
    try {
      return await fetchPerdasData(user.id, filters);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao carregar perdas');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

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
      const geladeira = referencia.tipo === 'geladeira';
      if (inputs.some(input => (input.tipo === 'geladeira') !== geladeira)) throw new Error('Registre as perdas da Geladeira em um lote separado.');
      const args = {
        p_itens: inputs.map(input => ({
          tipo: input.tipo,
          item_id: input.tipo === 'geladeira' ? input.geladeira_item_id : input.tipo === 'produto' ? input.produto_id : input.receita_id,
          quantidade: input.quantidade,
        })),
        p_motivo: referencia.motivo,
        p_motivo_outro: referencia.motivo === 'Outro' ? referencia.motivo_outro || null : null,
        p_observacao: referencia.observacao || null,
        p_responsavel: referencia.responsavel || null,
        p_baixar_estoque: referencia.baixar_estoque,
      };
      const assinatura = JSON.stringify(args);
      if (tentativa.current?.assinatura !== assinatura) tentativa.current = { assinatura, id: crypto.randomUUID() };
      const { error } = geladeira
        ? await supabase.rpc('registrar_perdas_geladeira', { ...args, p_request_id: tentativa.current.id })
        : await supabase.rpc('registrar_perdas_transacional', args);
      if (error) throw error;
      tentativa.current = null;
      void queryClient.invalidateQueries({ queryKey: ['geladeira', user.id] });
      void queryClient.invalidateQueries({ queryKey: produtosKey(user.id) });

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

  const calcularCustoReceita = useCallback(async (receitaId: string): Promise<number> => {
    const { data, error } = await supabase.rpc('calcular_custo_receita', { p_receita_id: receitaId });
    if (error) {
      console.error(error);
      return 0;
    }
    return Number(data) || 0;
  }, []);

  return { loading, fetchPerdas, registrarPerda, registrarPerdas, excluirPerda, calcularCustoReceita };
}
