import type { ProducaoRendimento } from '@/lib/producaoRendimento';
import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

export type ProducaoStatus = 'a_fazer' | 'em_producao' | 'feito';

export interface ProducaoTarefa extends ProducaoRendimento {
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
  cancelado_em?: string | null;
  duplicada_de?: string | null;
  tempo_producao_segundos?: number | null;
  etapa_iniciada_em?: string | null;
  created_at: string;
  updated_at: string;
  receita?: { id: string; nome: string; imagem_url: string | null; rendimento_valor?: number | null; rendimento_unidade?: string | null } | null;
  funcionario?: { id: string; nome: string; cargo: string | null } | null;
  area?: { id: string; nome: string; cor: string } | null;
  historico?: Array<{
    id: string;
    de_status: ProducaoStatus | null;
    para_status: ProducaoStatus;
    movido_em: string;
    evento_tipo: 'status' | 'responsavel' | 'cancelamento' | 'restauracao' | 'edicao';
    detalhes?: Record<string, unknown> | null;
    funcionario_anterior_id: string | null;
    funcionario_novo_id: string | null;
    origem: 'app' | 'link_compartilhado';
    rendimento_previsto?: number | null; rendimento_real?: number | null; rendimento_unidade?: string | null;
  }>;
}

export interface ProducaoInput {
  titulo: string; funcionario_id: string; receita_id: string | null; quantidade: number | null;
  observacoes: string | null; inicio_previsto: string | null; fim_previsto: string | null; area_id: string | null;
}
export function useProducaoTarefas(dataProducao: string, materializar = false) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const key = ['producao-tarefas', user?.id, dataProducao];
  const locks = useRef(new Set<string>());
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  // Keep the visual position stable while RPCs and realtime refetches settle.
  // Server data remains authoritative; removing this layer also rolls back failures.
  const [moving, setMoving] = useState<Record<string, ProducaoStatus>>({});
  const [ordering, setOrdering] = useState<{status:ProducaoStatus;ids:string[]}|null>(null);
  const syncChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const preparation = useQuery({
    queryKey: ['producao-materializar', user?.id, dataProducao], enabled: !!user?.id && !!dataProducao && materializar,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { getBusinessRegion } = await import('@/lib/business-region');
      const { error } = await supabase.rpc('materializar_cronograma_producao', {p_data:dataProducao,p_timezone:getBusinessRegion().timeZone});
      if (error) throw error;
      return true;
    },
  });
  const query = useQuery({
    queryKey: key, enabled: !!user?.id && !!dataProducao && (!materializar || preparation.isSuccess),
    queryFn: async () => {
      const tasks: ProducaoTarefa[] = [];
      for (let offset=0;;offset+=500) {
        const {data,error} = await supabase.from('producao_tarefas').select(`*,
          receita:receitas!producao_tarefas_receita_id_fkey(id,nome,imagem_url,rendimento_valor,rendimento_unidade),
          funcionario:folha_pagamento!producao_tarefas_funcionario_id_fkey(id,nome,cargo),
          area:producao_areas!producao_tarefas_area_id_fkey(id,nome,cor),
          historico:producao_tarefas_historico(id,de_status,para_status,movido_em,evento_tipo,funcionario_anterior_id,funcionario_novo_id,origem,rendimento_previsto,rendimento_real,rendimento_unidade,detalhes)
        `).eq('user_id',user!.id).eq('data_producao',dataProducao).order('ordem').order('inicio_previsto',{nullsFirst:false}).order('id').range(offset,offset+499);
        if(error) throw error;
        tasks.push(...(data ?? []) as unknown as ProducaoTarefa[]);
        if(!data || data.length<500) return tasks;
      }
    },
  });
  useEffect(() => {
    if (!user?.id || !dataProducao) return;
    const invalidate = () => { void qc.invalidateQueries({queryKey:['producao-tarefas',user.id,dataProducao]}); };
    const channel = supabase.channel(`producao:${user.id}:${dataProducao}`)
      .on('broadcast',{event:'refresh'},invalidate)
      .on('postgres_changes',{event:'*',schema:'public',table:'producao_tarefas',filter:`user_id=eq.${user.id}`},invalidate)
      .on('postgres_changes',{event:'*',schema:'public',table:'producao_tarefas_historico',filter:`user_id=eq.${user.id}`},invalidate).subscribe();
    syncChannelRef.current=channel;
    return () => { syncChannelRef.current=null; void supabase.removeChannel(channel); };
  },[user?.id,dataProducao,qc]);
  const refresh = async () => {
    if(materializar) await preparation.refetch();
    return query.refetch();
  };
  const run = async <T,>(id:string, action:()=>Promise<T>) => {
    if(locks.current.has(id)) throw new Error('Esta tarefa já está sendo salva.');
    locks.current.add(id);setPendingIds(new Set(locks.current));
    try {
      const result=await action();
      if(syncChannelRef.current?.state==='joined') void syncChannelRef.current.send({type:'broadcast',event:'refresh',payload:{}});
      await qc.invalidateQueries({queryKey:key});
      return result;
    } finally {
      locks.current.delete(id);setPendingIds(new Set(locks.current));
      setMoving(current=>{const next={...current};delete next[id];return next;});
      if(id==='order')setOrdering(null);
    }
  };
  const saveResult = (data: unknown) => {
    const task=data as ProducaoTarefa;
    qc.setQueryData<ProducaoTarefa[]>(key,current => current?.map(item => item.id===task.id?{...item,...task}:item));
    return task;
  };
  const criar = (chave:string,input:ProducaoInput) => run('new',async()=>{
    const {data,error}=await supabase.rpc('criar_tarefa_producao',{p_data:dataProducao,p_chave:chave,p_input:{...input}});
    if(error) throw error;toast({title:'Tarefa criada'});return saveResult(data);
  });
  const editar = (tarefa:ProducaoTarefa,input:ProducaoInput) => run(tarefa.id,async()=>{
    const {data,error}=await supabase.rpc('editar_tarefa_producao',{p_tarefa_id:tarefa.id,p_expected_updated_at:tarefa.updated_at,p_input:{...input}});
    if(error) throw error;toast({title:'Tarefa atualizada'});return saveResult(data);
  });
  const mover = (tarefa:ProducaoTarefa,novoStatus:ProducaoStatus,rendimentoReal?:number) => run(tarefa.id,async()=>{
    setMoving(current=>({...current,[tarefa.id]:novoStatus}));
    const {data,error}=await supabase.rpc('mover_tarefa_producao',{p_tarefa_id:tarefa.id,p_status:novoStatus,p_expected_updated_at:tarefa.updated_at,p_rendimento_real:rendimentoReal??null});
    if(error){await qc.invalidateQueries({queryKey:key});throw error;}return saveResult(data);
  });
  const cancelar = (tarefa:ProducaoTarefa,restaurar=false) => run(tarefa.id,async()=>{
    const {data,error}=await supabase.rpc('cancelar_tarefa_producao',{p_tarefa_id:tarefa.id,p_expected_updated_at:tarefa.updated_at,p_restaurar:restaurar});
    if(error) throw error;toast({title:restaurar?'Tarefa restaurada':'Tarefa cancelada',description:'O histórico foi preservado.'});return saveResult(data);
  });
  const reordenar = (status:ProducaoStatus,tarefas:ProducaoTarefa[]) => run('order',async()=>{
    setOrdering({status,ids:tarefas.map(t=>t.id)});
    const {error}=await supabase.rpc('reordenar_tarefas_producao',{p_data:dataProducao,p_status:status,p_ids:tarefas.map(t=>t.id),p_versions:Object.fromEntries(tarefas.map(t=>[t.id,t.updated_at]))});
    if(error){await qc.invalidateQueries({queryKey:key});throw error;}
  });
  let data=query.data?.map(task=>moving[task.id]?{...task,status:moving[task.id]}:task);
  if(data&&ordering){
    const positions=new Map(ordering.ids.map((id,index)=>[id,index]));
    const column=data.filter(task=>task.status===ordering.status).sort((a,b)=>(positions.get(a.id)??Infinity)-(positions.get(b.id)??Infinity));
    let index=0;data=data.map(task=>task.status===ordering.status?column[index++]:task);
  }
  return {...query,data,isLoading:query.isLoading || (materializar && preparation.isPending),isError:query.isError || (materializar && preparation.isError),error:query.error || (materializar?preparation.error:null),refetch:refresh,criar,editar,mover,cancelar,reordenar,pendingIds};
}
