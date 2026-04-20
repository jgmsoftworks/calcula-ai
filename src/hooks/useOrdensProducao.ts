import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface TarefaAvulsa {
  id: string;
  user_id: string;
  nome: string;
  descricao: string | null;
  tempo_estimado_minutos: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface OrdemProducaoItem {
  id: string;
  ordem_id: string;
  tipo_item: 'receita' | 'tarefa_avulsa';
  receita_id: string | null;
  tarefa_avulsa_id: string | null;
  descricao_customizada: string | null;
  quantidade: number;
  funcionario_id: string | null;
  funcionario_nome: string | null;
  hora_inicio_prevista: string | null;
  hora_fim_prevista: string | null;
  hora_inicio_real: string | null;
  hora_fim_real: string | null;
  status: 'pendente' | 'em_andamento' | 'concluido' | 'cancelado';
  observacoes: string | null;
  ordem: number;
  receita?: { id: string; nome: string } | null;
  tarefa_avulsa?: { id: string; nome: string } | null;
}

export interface OrdemProducao {
  id: string;
  user_id: string;
  numero_sequencial: number;
  titulo: string;
  descricao: string | null;
  data_prevista: string | null;
  status: 'pendente' | 'em_andamento' | 'concluida' | 'cancelada';
  observacoes: string | null;
  created_at: string;
  updated_at: string;
  itens?: OrdemProducaoItem[];
}

export function useOrdensProducao() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [ordens, setOrdens] = useState<OrdemProducao[]>([]);
  const [tarefasAvulsas, setTarefasAvulsas] = useState<TarefaAvulsa[]>([]);
  const [loading, setLoading] = useState(true);
  const hasLoadedRef = useRef(false);

  const fetchOrdens = useCallback(async (showLoader = false) => {
    if (!user) return;
    if (showLoader) setLoading(true);
    const { data, error } = await supabase
      .from('ordens_producao')
      .select(`
        *,
        itens:ordens_producao_itens(
          *,
          receita:receitas(id, nome),
          tarefa_avulsa:tarefas_avulsas(id, nome)
        )
      `)
      .eq('user_id', user.id)
      .order('numero_sequencial', { ascending: false });

    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      setOrdens((data as any) || []);
    }
    if (showLoader) setLoading(false);
  }, [user, toast]);

  const fetchTarefasAvulsas = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('tarefas_avulsas')
      .select('*')
      .eq('user_id', user.id)
      .eq('ativo', true)
      .order('nome');
    if (!error) setTarefasAvulsas((data as any) || []);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const initial = !hasLoadedRef.current;
    hasLoadedRef.current = true;
    fetchOrdens(initial);
    fetchTarefasAvulsas();
  }, [user, fetchOrdens, fetchTarefasAvulsas]);

  const criarOrdem = async (input: { titulo: string; descricao?: string; data_prevista?: string; observacoes?: string }) => {
    if (!user) return null;
    const { data: numData } = await supabase.rpc('gerar_proximo_numero_op', { p_user_id: user.id });
    const { data, error } = await supabase
      .from('ordens_producao')
      .insert({
        user_id: user.id,
        numero_sequencial: numData || 1,
        titulo: input.titulo,
        descricao: input.descricao || null,
        data_prevista: input.data_prevista || null,
        observacoes: input.observacoes || null,
      })
      .select()
      .single();
    if (error) {
      toast({ title: 'Erro ao criar ordem', description: error.message, variant: 'destructive' });
      return null;
    }
    toast({ title: 'Ordem criada', description: `OP #${data.numero_sequencial}` });
    setOrdens((prev) => [{ ...(data as any), itens: [] }, ...prev]);
    return data;
  };

  const atualizarOrdem = async (id: string, updates: Partial<OrdemProducao>) => {
    const prev = ordens;
    setOrdens((curr) => curr.map((o) => (o.id === id ? { ...o, ...updates } : o)));
    const { error } = await supabase.from('ordens_producao').update(updates).eq('id', id);
    if (error) {
      setOrdens(prev);
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      return false;
    }
    return true;
  };

  const deletarOrdem = async (id: string) => {
    const prev = ordens;
    setOrdens((curr) => curr.filter((o) => o.id !== id));
    const { error } = await supabase.from('ordens_producao').delete().eq('id', id);
    if (error) {
      setOrdens(prev);
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      return false;
    }
    toast({ title: 'Ordem excluída' });
    return true;
  };

  const adicionarItem = async (ordemId: string, item: Partial<OrdemProducaoItem>) => {
    const { data, error } = await supabase
      .from('ordens_producao_itens')
      .insert({
        ordem_id: ordemId,
        tipo_item: item.tipo_item || 'receita',
        receita_id: item.receita_id || null,
        tarefa_avulsa_id: item.tarefa_avulsa_id || null,
        descricao_customizada: item.descricao_customizada || null,
        quantidade: item.quantidade || 1,
        funcionario_id: item.funcionario_id || null,
        funcionario_nome: item.funcionario_nome || null,
        hora_inicio_prevista: item.hora_inicio_prevista || null,
        hora_fim_prevista: item.hora_fim_prevista || null,
        status: item.status || 'pendente',
        observacoes: item.observacoes || null,
      } as any)
      .select(`*, receita:receitas(id, nome), tarefa_avulsa:tarefas_avulsas(id, nome)`)
      .single();
    if (error) {
      toast({ title: 'Erro ao adicionar item', description: error.message, variant: 'destructive' });
      return false;
    }
    setOrdens((curr) =>
      curr.map((o) => (o.id === ordemId ? { ...o, itens: [...(o.itens || []), data as any] } : o))
    );
    return true;
  };

  const atualizarItem = async (id: string, updates: Partial<OrdemProducaoItem>) => {
    const prev = ordens;
    setOrdens((curr) =>
      curr.map((o) => ({
        ...o,
        itens: (o.itens || []).map((it) => (it.id === id ? { ...it, ...updates } as OrdemProducaoItem : it)),
      }))
    );
    const { error } = await supabase.from('ordens_producao_itens').update(updates as any).eq('id', id);
    if (error) {
      setOrdens(prev);
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      return false;
    }
    return true;
  };

  const removerItem = async (id: string) => {
    const prev = ordens;
    setOrdens((curr) =>
      curr.map((o) => ({ ...o, itens: (o.itens || []).filter((it) => it.id !== id) }))
    );
    const { error } = await supabase.from('ordens_producao_itens').delete().eq('id', id);
    if (error) {
      setOrdens(prev);
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      return false;
    }
    return true;
  };

  const criarTarefaAvulsa = async (input: { nome: string; descricao?: string; tempo_estimado_minutos?: number }) => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('tarefas_avulsas')
      .insert({
        user_id: user.id,
        nome: input.nome,
        descricao: input.descricao || null,
        tempo_estimado_minutos: input.tempo_estimado_minutos || 0,
      })
      .select()
      .single();
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      return null;
    }
    setTarefasAvulsas((prev) => [...prev, data as any].sort((a, b) => a.nome.localeCompare(b.nome)));
    return data;
  };

  const deletarTarefaAvulsa = async (id: string) => {
    const prev = tarefasAvulsas;
    setTarefasAvulsas((curr) => curr.filter((t) => t.id !== id));
    const { error } = await supabase.from('tarefas_avulsas').delete().eq('id', id);
    if (error) {
      setTarefasAvulsas(prev);
    }
  };

  return {
    ordens,
    tarefasAvulsas,
    loading,
    refetch: fetchOrdens,
    criarOrdem,
    atualizarOrdem,
    deletarOrdem,
    adicionarItem,
    atualizarItem,
    removerItem,
    criarTarefaAvulsa,
    deletarTarefaAvulsa,
  };
}
