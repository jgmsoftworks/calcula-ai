import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

export interface ProducaoArea {
  id: string;
  user_id: string;
  nome: string;
  cor: string;
  ordem: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export function useProducaoAreas() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const key = ['producao-areas', user?.id];

  const query = useQuery({
    queryKey: key,
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('producao_areas')
        .select('*')
        .eq('user_id', user!.id)
        .eq('ativo', true)
        .order('ordem', { ascending: true })
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as ProducaoArea[];
    },
  });

  const criar = useMutation({
    mutationFn: async (input: { nome: string; cor: string }) => {
      const { data, error } = await supabase
        .from('producao_areas')
        .insert({
          user_id: user!.id,
          nome: input.nome,
          cor: input.cor,
          ordem: query.data?.length ?? 0,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      toast({ title: 'Área criada' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const atualizar = useMutation({
    mutationFn: async ({ id, ...patch }: { id: string; nome?: string; cor?: string; ordem?: number }) => {
      const { error } = await supabase.from('producao_areas').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const remover = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('producao_areas').update({ ativo: false }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      toast({ title: 'Área removida' });
    },
  });

  return { ...query, criar, atualizar, remover };
}
