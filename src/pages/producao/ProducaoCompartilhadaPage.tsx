import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatInTimeZone } from 'date-fns-tz';
import { ChefHat, Loader2, RefreshCw } from 'lucide-react';
import { ConcluirProducaoModal } from '@/components/producao/ConcluirProducaoModal';
import { ProducaoBoard, type BoardTask } from '@/components/producao/ProducaoBoard';
import { temReceitaProducao } from '@/lib/producaoRendimento';
import { getBusinessRegion } from '@/lib/business-region';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type SharedTask=BoardTask&{updated_at:string;funcionario_id?:string};
const normalize=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export default function ProducaoCompartilhadaPage(){
  const {token=''}=useParams();
  const [tasks,setTasks]=useState<SharedTask[]>([]);const [date,setDate]=useState('');const [expires,setExpires]=useState('');const [channelName,setChannelName]=useState('');
  const [search,setSearch]=useState('');const [employee,setEmployee]=useState('todos');
  const [loading,setLoading]=useState(true);const [error,setError]=useState('');const [moveError,setMoveError]=useState('');
  const [pending,setPending]=useState<Set<string>>(new Set());const locks=useRef(new Set<string>());
  const [completion,setCompletion]=useState<SharedTask|null>(null);
  const channel=useRef<ReturnType<typeof supabase.channel>|null>(null);
  const sequence=useRef(0);const alive=useRef(true);
  const load=useCallback(async(quiet=false)=>{
    if(quiet&&locks.current.size)return;
    const request=++sequence.current;
    if(!quiet)setLoading(true);
    try{
      const {data,error:failure}=await supabase.functions.invoke('producao-compartilhada',{body:{action:'get',token}});
      if(failure||data?.error)throw new Error(data?.error??'Não foi possível carregar. O link pode ter expirado.');
      if(!alive.current||request!==sequence.current)return;
      setTasks((data.tasks??[]).filter((t:SharedTask)=>!t.cancelado_em));setDate(data.date);setExpires(data.expiresAt);setChannelName(data.syncChannel??'');setError('');
    }catch(cause){if(alive.current&&request===sequence.current)setError((cause as Error).message);}
    finally{if(alive.current&&request===sequence.current)setLoading(false);}
  },[token]);
  useEffect(()=>{alive.current=true;setTasks([]);setDate('');setCompletion(null);void load();return()=>{alive.current=false;sequence.current++;};},[load]);
  useEffect(()=>{
    const refresh=()=>{if(document.visibilityState==='visible')void load(true);};
    const timer=window.setInterval(refresh,30_000);window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);
    return()=>{window.clearInterval(timer);window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh);};
  },[load]);
  useEffect(()=>{
    if(!channelName)return;
    const connection=supabase.channel(channelName).on('broadcast',{event:'refresh'},()=>void load(true)).subscribe();channel.current=connection;
    return()=>{channel.current=null;void supabase.removeChannel(connection);};
  },[channelName,load]);
  const move=async(task:SharedTask,real?:number)=>{
    if(locks.current.has(task.id))return;
    locks.current.add(task.id);setPending(new Set(locks.current));sequence.current++;setLoading(false);setMoveError('');
    try{
      const {data,error:failure}=await supabase.functions.invoke('producao-compartilhada',{body:{action:'move',token,taskId:task.id,expectedUpdatedAt:task.updated_at,rendimentoReal:real??null}});
      if(failure||data?.error){
        const details=failure?.context instanceof Response?await failure.context.clone().json().catch(()=>null):null;
        throw new Error(data?.error??details?.error??'Não foi possível avançar. Confira os dados atualizados e tente novamente.');
      }
      if(!alive.current)return;
      setTasks(current=>current.map(t=>t.id===task.id?{...t,...data.task}:t));
      if(channel.current?.state==='joined')void channel.current.send({type:'broadcast',event:'refresh',payload:{taskId:task.id}});
    }catch(cause){if(alive.current){setCompletion(null);setMoveError((cause as Error).message+' Confira a tarefa e tente novamente.');}throw cause;}
    finally{
      locks.current.delete(task.id);if(alive.current){setPending(new Set(locks.current));await load(true);}
    }
  };
  const employees=Array.from(new Set(tasks.map(t=>t.funcionario?.nome).filter(Boolean))) as string[];
  const visible=tasks.filter(t=>(employee==='todos'||t.funcionario?.nome===employee)&&normalize([t.titulo,t.receita?.nome,t.receita_nome,t.funcionario?.nome,t.area?.nome].join(' ')).includes(normalize(search.trim())));
  if(loading&&!date)return <main className="flex min-h-screen items-center justify-center"><Loader2 aria-label="Carregando produção" className="animate-spin text-primary"/></main>;
  if(error&&!date)return <main className="mx-auto max-w-md space-y-4 p-8"><h1 className="text-xl font-semibold">Produção indisponível</h1><p role="alert">{error}</p><Button onClick={()=>void load()}>Tentar novamente</Button></main>;
  return <main className="min-h-screen bg-background">
    <header className="border-b bg-card"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-6"><div className="flex items-center gap-3"><div className="rounded-xl bg-primary/10 p-3 text-primary"><ChefHat/></div><div><p className="text-sm text-muted-foreground">Produção do dia</p><h1 className="text-xl font-semibold capitalize">{date&&format(parseISO(date),"EEEE, dd 'de' MMMM",{locale:ptBR})}</h1></div></div><p className="text-xs text-muted-foreground">Link válido até {expires&&formatInTimeZone(expires,getBusinessRegion().timeZone,'dd/MM HH:mm')}</p></div></header>
    <div className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6">
      <div className="flex flex-wrap gap-3"><Input className="min-w-48 flex-1" aria-label="Buscar produção" placeholder="Buscar tarefa, receita ou responsável…" value={search} onChange={e=>setSearch(e.target.value)}/><Select value={employee} onValueChange={setEmployee}><SelectTrigger aria-label="Filtrar responsável" className="w-full sm:w-64"><SelectValue/></SelectTrigger><SelectContent searchable><SelectItem value="todos">Todos os responsáveis</SelectItem>{employees.map(name=><SelectItem key={name} value={name}>{name}</SelectItem>)}</SelectContent></Select><Button variant="outline" disabled={loading||pending.size>0} onClick={()=>void load()} aria-label="Atualizar produção"><RefreshCw className={loading?'animate-spin':''}/></Button></div>
      {(error||moveError)&&<p role="alert" className="rounded-xl border border-destructive/30 p-4 text-sm text-destructive">{error||moveError}</p>}
      <ProducaoBoard tasks={visible} pendingIds={pending} onAdvance={task=>{if(task.status==='em_producao'&&temReceitaProducao(task))setCompletion(task);else void move(task).catch(()=>{});}}/>
    </div>
    {completion&&<ConcluirProducaoModal tarefa={completion} onClose={()=>setCompletion(null)} onConfirm={real=>move(completion,real)}/>}
  </main>;
}
