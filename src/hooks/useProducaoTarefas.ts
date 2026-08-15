import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

export type ProducaoStatus = 'a_fazer' | 'em_producao' | 'feito';

export interface ProducaoTarefa {
  id: string;
  user_id: string;
  data_producao: string;
  titulo: string;
  receita_id: string | null;
  quantidade: number | null;
  funcionario_id: string;
  status: ProducaoStatus;
  observacoes: string | null;
  ordem: number;
  inicio_previsto: string | null;
  fim_previsto: string | null;
  iniciado_em: string | null;
  concluido_em: string | null;
  area_id: string | null;
  recorrente_id: string | null;
  created_at: string;
  updated_at: string;
  receita?: { id: string; nome: string; imagem_url: string | null } | null;
  funcionario?: { id: string; nome: string; cargo: string | null } | null;
  area?: { id: string; nome: string; cor: string } | null;
  historico?: Array<{
    id: string;
    de_status: ProducaoStatus | null;
    para_status: ProducaoStatus;
    movido_em: string;
    evento_tipo: 'status' | 'responsavel';
    funcionario_anterior_id: string | null;
    funcionario_novo_id: string | null;
    origem: 'app' | 'link_compartilhado';
  }>;
}

export function useProducaoTarefas(dataProducao: string) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const key = ['producao-tarefas', user?.id, dataProducao];

  const query = useQuery({
    queryKey: key,
    enabled: !!user?.id && !!dataProducao,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('producao_tarefas')
        .select(`
          *,
          receita:receitas!producao_tarefas_receita_id_fkey(id, nome, imagem_url),
          funcionario:folha_pagamento!producao_tarefas_funcionario_id_fkey(id, nome, cargo),
          area:producao_areas!producao_tarefas_area_id_fkey(id, nome, cor),
          historico:producao_tarefas_historico(
            id, de_status, para_status, movido_em, evento_tipo,
            funcionario_anterior_id, funcionario_novo_id, origem
          )
        `)
        .eq('user_id', user!.id)
        .eq('data_producao', dataProducao)
        .order('ordem', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as ProducaoTarefa[];
    },
  });

  useEffect(() => {
    if (!user?.id || !dataProducao) return;

    const invalidate = () => {
      void qc.invalidateQueries({ queryKey: ['producao-tarefas', user.id, dataProducao] });
    };

    const channel = supabase
      .channel(`producao-tarefas:${user.id}:${dataProducao}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'producao_tarefas' },
        invalidate,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'producao_tarefas_historico' },
        invalidate,
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user?.id, dataProducao, qc]);

  const criar = useMutation({
    mutationFn: async (input: {
      titulo: string;
      funcionario_id: string;
      receita_id?: string | null;
      quantidade?: number | null;
      observacoes?: string | null;
      inicio_previsto?: string | null;
      fim_previsto?: string | null;
      area_id?: string | null;
      recorrente_id?: string | null;
    }) => {
      const { data, error } = await supabase
        .from('producao_tarefas')
        .insert({
          user_id: user!.id,
          data_producao: dataProducao,
          titulo: input.titulo,
          funcionario_id: input.funcionario_id,
          receita_id: input.receita_id ?? null,
          quantidade: input.quantidade ?? null,
          observacoes: input.observacoes ?? null,
          inicio_previsto: input.inicio_previsto ?? null,
          fim_previsto: input.fim_previsto ?? null,
          area_id: input.area_id ?? null,
          recorrente_id: input.recorrente_id ?? null,
          status: 'a_fazer',
          ordem: (query.data?.filter((t) => t.status === 'a_fazer').length ?? 0),
        })
        .select()
        .single();
      if (error) throw error;
      await supabase.from('producao_tarefas_historico').insert({
        user_id: user!.id,
        tarefa_id: data.id,
        de_status: null,
        para_status: 'a_fazer',
        movido_por: user!.id,
      });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      toast({ title: 'Tarefa criada' });
    },
    onError: (e: any) => toast({ title: 'Erro ao criar', description: e.message, variant: 'destructive' }),
  });

  const mover = useMutation({
    mutationFn: async ({ tarefa, novoStatus }: { tarefa: ProducaoTarefa; novoStatus: ProducaoStatus }) => {
      if (tarefa.status === novoStatus) return;
      const patch: any = { status: novoStatus };
      if (novoStatus === 'em_producao' && !tarefa.iniciado_em) patch.iniciado_em = new Date().toISOString();
      if (novoStatus === 'feito' && !tarefa.concluido_em) patch.concluido_em = new Date().toISOString();
      const { error } = await supabase.from('producao_tarefas').update(patch).eq('id', tarefa.id);
      if (error) throw error;
      await supabase.from('producao_tarefas_historico').insert({
        user_id: user!.id,
        tarefa_id: tarefa.id,
        de_status: tarefa.status,
        para_status: novoStatus,
        movido_por: user!.id,
      });
    },
    onMutate: async ({ tarefa, novoStatus }) => {
      await qc.cancelQueries({ queryKey: key });
      const anterior = qc.getQueryData<ProducaoTarefa[]>(key);
      const agora = new Date().toISOString();

      qc.setQueryData<ProducaoTarefa[]>(key, (atual = []) =>
        atual.map((item) => {
          if (item.id !== tarefa.id) return item;
          return {
            ...item,
            status: novoStatus,
            iniciado_em: novoStatus === 'em_producao' && !item.iniciado_em ? agora : item.iniciado_em,
            concluido_em: novoStatus === 'feito' && !item.concluido_em ? agora : item.concluido_em,
          };
        }),
      );

      return { anterior };
    },
    onError: (e: any, _variables, context) => {
      if (context?.anterior) qc.setQueryData(key, context.anterior);
      toast({ title: 'Erro ao mover', description: e.message, variant: 'destructive' });
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: key });
    },
  });

  const alterarResponsavel = useMutation({
    mutationFn: async ({ tarefa, funcionarioId }: { tarefa: ProducaoTarefa; funcionarioId: string }) => {
      if (tarefa.funcionario_id === funcionarioId) return;
      const { error } = await supabase
        .from('producao_tarefas')
        .update({ funcionario_id: funcionarioId })
        .eq('id', tarefa.id)
        .eq('user_id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      toast({ title: 'Responsável atualizado' });
    },
    onError: (e: any) => toast({ title: 'Erro ao trocar responsável', description: e.message, variant: 'destructive' }),
  });

  const remover = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('producao_tarefas').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      toast({ title: 'Tarefa removida' });
    },
  });

  return { ...query, criar, mover, alterarResponsavel, remover };
}
