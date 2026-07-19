import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

export interface ProducaoRecorrente {
  id: string;
  user_id: string;
  area_id: string;
  titulo: string;
  receita_id: string | null;
  quantidade: number | null;
  funcionario_id: string;
  dias_semana: number[];
  hora_inicio: string | null;
  hora_fim: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  observacoes: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  receita?: { id: string; nome: string; imagem_url: string | null } | null;
  funcionario?: { id: string; nome: string; cargo: string | null } | null;
  area?: { id: string; nome: string; cor: string } | null;
}

export interface RecorrenteInput {
  area_id: string;
  titulo: string;
  funcionario_id: string;
  receita_id?: string | null;
  quantidade?: number | null;
  dias_semana: number[];
  hora_inicio?: string | null;
  hora_fim?: string | null;
  data_inicio?: string | null;
  data_fim?: string | null;
  observacoes?: string | null;
}

export function useProducaoRecorrentes(areaId?: string) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const key = ['producao-recorrentes', user?.id, areaId ?? 'all'];

  const query = useQuery({
    queryKey: key,
    enabled: !!user?.id,
    queryFn: async () => {
      let q = supabase
        .from('producao_tarefas_recorrentes')
        .select(`
          *,
          receita:receitas!producao_tarefas_recorrentes_receita_id_fkey(id, nome, imagem_url),
          funcionario:folha_pagamento!producao_tarefas_recorrentes_funcionario_id_fkey(id, nome, cargo),
          area:producao_areas!producao_tarefas_recorrentes_area_id_fkey(id, nome, cor)
        `)
        .eq('user_id', user!.id)
        .eq('ativo', true)
        .order('created_at', { ascending: true });
      if (areaId) q = q.eq('area_id', areaId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as ProducaoRecorrente[];
    },
  });

  const criar = useMutation({
    mutationFn: async (input: RecorrenteInput) => {
      const { data, error } = await supabase
        .from('producao_tarefas_recorrentes')
        .insert({ user_id: user!.id, ...input })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['producao-recorrentes'] });
      toast({ title: 'Tarefa recorrente criada' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const atualizar = useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Partial<RecorrenteInput>) => {
      const { error } = await supabase.from('producao_tarefas_recorrentes').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['producao-recorrentes'] }),
  });

  const remover = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('producao_tarefas_recorrentes').update({ ativo: false }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['producao-recorrentes'] });
      toast({ title: 'Removida' });
    },
  });

  return { ...query, criar, atualizar, remover };
}
