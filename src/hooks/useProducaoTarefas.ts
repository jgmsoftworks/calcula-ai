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
  iniciado_em: string | null;
  concluido_em: string | null;
  created_at: string;
  updated_at: string;
  receita?: { id: string; nome: string; foto_url: string | null } | null;
  funcionario?: { id: string; nome: string; cargo: string | null } | null;
  historico?: Array<{
    id: string;
    de_status: ProducaoStatus | null;
    para_status: ProducaoStatus;
    movido_em: string;
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
          receita:receitas(id, nome, foto_url),
          funcionario:folha_pagamento(id, nome, cargo),
          historico:producao_tarefas_historico(id, de_status, para_status, movido_em)
        `)
        .eq('user_id', user!.id)
        .eq('data_producao', dataProducao)
        .order('ordem', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as ProducaoTarefa[];
    },
  });

  const criar = useMutation({
    mutationFn: async (input: {
      titulo: string;
      funcionario_id: string;
      receita_id?: string | null;
      quantidade?: number | null;
      observacoes?: string | null;
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
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
    onError: (e: any) => toast({ title: 'Erro ao mover', description: e.message, variant: 'destructive' }),
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

  return { ...query, criar, mover, remover };
}
