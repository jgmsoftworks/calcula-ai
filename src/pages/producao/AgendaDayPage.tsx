import { ETAPAS } from '@/lib/producaoEtapas';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { addDays, format, isValid, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatInTimeZone } from 'date-fns-tz';
import { ArrowLeft, ChevronLeft, ChevronRight, Plus, Printer, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { ProducaoBoard, ProducaoCard } from '@/components/producao/ProducaoBoard';
import { ConcluirProducaoModal } from '@/components/producao/ConcluirProducaoModal';
import { CompartilharProducaoDialog } from '@/components/producao/CompartilharProducaoDialog';
import { useProducaoTarefas, type ProducaoTarefa, type ProducaoStatus } from '@/hooks/useProducaoTarefas';
import { temReceitaProducao, formatarRendimento } from '@/lib/producaoRendimento';
import { getBusinessRegion } from '@/lib/business-region';
import { toast } from '@/hooks/use-toast';
import { imprimirProducao } from '@/lib/producaoPdf';

const normalizarBusca = (value:string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');
const fail=(cause:unknown)=>toast({title:'Não foi possível concluir a ação',description:(cause as Error)?.message||'Tente novamente.',variant:'destructive'});
type Confirmation={id:string;kind:'cancelar'|'restaurar'|'reabrir';status?:ProducaoStatus};

export default function AgendaDayPage() {
  const {date=''}=useParams();
  const navigate=useNavigate();
  const parsed=parseISO(date);
  const valid=isValid(parsed)&&/^\d{4}-\d{2}-\d{2}$/.test(date);
  const api=useProducaoTarefas(valid?date:'',true);
  const tasks=api.data??[];
  const [search,setSearch]=useState('');
  const [area,setArea]=useState('todas');
  const [responsavel,setResponsavel]=useState('todos');
  const [canceladas,setCanceladas]=useState(false);
  const [share,setShare]=useState(false);
  const [history,setHistory]=useState<string|null>(null);
  const [completion,setCompletion]=useState<ProducaoTarefa|null>(null);
  const [confirm,setConfirm]=useState<Confirmation|null>(null);
  const active=tasks.filter(t=>!t.cancelado_em);
  const canceled=tasks.filter(t=>t.cancelado_em);
  const filtered=!!search.trim()||area!=='todas'||responsavel!=='todos';
  const visible=(canceladas?canceled:active).filter(t=>(area==='todas'||(area==='sem'?!t.area_id:t.area_id===area))
    &&(responsavel==='todos'||t.funcionario_id===responsavel)
    &&normalizarBusca([t.titulo,t.receita?.nome,t.receita_nome,t.funcionario?.nome].join(' ')).includes(normalizarBusca(search.trim())));
  const areas=Array.from(new Map(tasks.filter(t=>t.area).map(t=>[t.area_id,t.area!])).entries());
  const employees=Array.from(new Map(tasks.map(t=>[t.funcionario_id,t.funcionario?.nome??'Responsável indisponível'])).entries());
  const changeDay=(next:string)=>{setCompletion(null);setHistory(null);setConfirm(null);navigate(`/producao/agenda/${next}`);};
  const requestMove=(task:ProducaoTarefa,status:ProducaoStatus)=>{
    if(task.status===status)return false;
    if(task.status==='a_fazer'&&status==='feito'){toast({title:'Inicie a produção antes de finalizar.'});return false;}
    if(status==='a_fazer'||task.status==='feito'){setConfirm({id:task.id,kind:'reabrir',status});return false;}
    if(status==='feito'&&temReceitaProducao(task)){setCompletion(task);return false;}
    void api.mover(task,status).catch(fail);
    return true;
  };
  const finish=async(real:number)=>{
    if(!completion)return;
    try {await api.mover(completion,'feito',real);}
    catch(cause){
      // Close the stale form and refetch; never silently submit an old yield against a new recipe/version.
      if((cause as {code?:string}).code==='40001'){setCompletion(null);await api.refetch();toast({title:'A tarefa foi atualizada',description:'Confira os novos dados e finalize novamente.'});}
      throw cause;
    }
  };
  const confirmedTask=tasks.find(t=>t.id===confirm?.id);
  const confirmationPending=!!confirmedTask&&api.pendingIds.has(confirmedTask.id);
  const applyConfirmation=async()=>{
    if(!confirm||!confirmedTask)return;
    try {
      if(confirm.kind==='reabrir')await api.mover(confirmedTask,confirm.status??'em_producao');
      else await api.cancelar(confirmedTask,confirm.kind==='restaurar');
      setConfirm(null);
    }catch(cause){fail(cause);await api.refetch();setConfirm(null);}
  };
  const detailed=tasks.find(t=>t.id===history);
  if(!valid)return <div className="space-y-4"><p>Data inválida.</p><Button onClick={()=>navigate('/producao/agenda')}>Voltar à agenda</Button></div>;
  return <div className="min-w-0 space-y-5">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div><Button variant="ghost" size="sm" className="-ml-3 mb-2" onClick={()=>navigate('/producao/agenda')}><ArrowLeft className="mr-2 h-4 w-4"/>Agenda</Button>
        <h1 className="text-2xl font-semibold capitalize">{format(parsed,"EEEE, dd 'de' MMMM",{locale:ptBR})}</h1>
        {!api.isError&&!api.isLoading&&<p className="mt-1 text-sm text-muted-foreground">{active.length} tarefas no dia{filtered?` · ${visible.length} no filtro`:''}</p>}
      </div>
      <div className="flex flex-wrap gap-2 pt-2">
        <Button variant="outline" aria-label="Imprimir tarefas exibidas" disabled={!visible.length||api.isError} onClick={()=>void imprimirProducao(date,visible,filtered?'Filtros aplicados':canceladas?'Tarefas canceladas':'Todas as tarefas').catch(fail)}><Printer className="h-4 w-4"/><span className="hidden sm:inline">Imprimir</span></Button>
        <Button variant="outline" onClick={()=>setShare(true)} disabled={!active.length||api.isError}><Share2 className="h-4 w-4"/><span className="hidden sm:inline">Compartilhar</span></Button>
        <Button onClick={()=>navigate(`/producao/agenda/${date}/nova`)}><Plus className="h-4 w-4"/>Nova tarefa</Button>
      </div>
    </header>
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="icon" aria-label="Dia anterior" onClick={()=>changeDay(format(addDays(parsed,-1),'yyyy-MM-dd'))}><ChevronLeft/></Button>
      <Input aria-label="Dia da produção" type="date" className="w-auto" value={date} onChange={e=>{if(e.target.value)changeDay(e.target.value);}}/>
      <Button variant="outline" size="icon" aria-label="Próximo dia" onClick={()=>changeDay(format(addDays(parsed,1),'yyyy-MM-dd'))}><ChevronRight/></Button>
      <Button variant="ghost" onClick={()=>changeDay(formatInTimeZone(new Date(),getBusinessRegion().timeZone,'yyyy-MM-dd'))}>Hoje</Button>
    </div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(200px,1fr)_220px_250px]">
      <Input aria-label="Buscar tarefas" placeholder="Buscar tarefa, receita ou responsável…" value={search} onChange={e=>setSearch(e.target.value)}/>
      <Select value={area} onValueChange={setArea}><SelectTrigger aria-label="Filtrar área"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="todas">Todas as áreas</SelectItem><SelectItem value="sem">Sem área</SelectItem>{areas.map(([id,a])=><SelectItem key={id} value={id!}>{a.nome}</SelectItem>)}</SelectContent></Select>
      <Select value={responsavel} onValueChange={setResponsavel}><SelectTrigger aria-label="Filtrar responsável"><SelectValue/></SelectTrigger><SelectContent searchable><SelectItem value="todos">Todos os responsáveis</SelectItem>{employees.map(([id,nome])=><SelectItem key={id} value={id}>{nome}</SelectItem>)}</SelectContent></Select>
    </div>
    <div className="flex flex-wrap items-center gap-3 text-sm">
      {filtered&&<Button variant="ghost" size="sm" onClick={()=>{setSearch('');setArea('todas');setResponsavel('todos');}}>Limpar filtros</Button>}
      {(canceled.length>0||canceladas)&&<Button size="sm" variant={canceladas?'secondary':'ghost'} onClick={()=>setCanceladas(v=>!v)}>{canceladas?'Voltar ao quadro':`Canceladas (${canceled.length})`}</Button>}
      {filtered&&!canceladas&&<span className="text-xs text-muted-foreground">Limpe os filtros para reorganizar a ordem das tarefas.</span>}
    </div>
    {api.isError?<div role="alert" className="rounded-xl border border-destructive/30 p-6"><p>Não foi possível carregar a produção deste dia.</p><Button className="mt-3" variant="outline" onClick={()=>void api.refetch()}>Tentar novamente</Button></div>
      :api.isLoading?<p role="status" className="py-10 text-center text-muted-foreground">Carregando produção…</p>
      :canceladas?<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{visible.map(t=><div key={t.id}><p className="mb-2 text-xs text-muted-foreground">{t.duplicada_de?'Cópia duplicada arquivada':'Cancelada neste dia'}</p><ProducaoCard tarefa={t} pending={api.pendingIds.has(t.id)} onHistory={()=>setHistory(t.id)} onRestore={()=>setConfirm({id:t.id,kind:'restaurar'})}/></div>)}{!visible.length&&<p>Nenhuma tarefa cancelada neste filtro.</p>}</div>
      :<ProducaoBoard tasks={visible} pendingIds={api.pendingIds} allowReorder={!filtered}
        onAdvance={t=>requestMove(t,t.status==='a_fazer'?'em_producao':'feito')} onMove={requestMove}
        onReorder={(status,column)=>void api.reordenar(status,column).catch(fail)}
        onEdit={t=>navigate(`/producao/agenda/${date}/${t.id}/editar`)} onHistory={t=>setHistory(t.id)}
        onCancel={t=>setConfirm({id:t.id,kind:'cancelar'})} onReopen={t=>setConfirm({id:t.id,kind:'reabrir',status:t.status==='feito'?'em_producao':'a_fazer'})}/>}
    {completion&&<ConcluirProducaoModal tarefa={completion} onClose={()=>setCompletion(null)} onConfirm={finish}/>}
    <CompartilharProducaoDialog key={date} dataStr={date} open={share} onOpenChange={setShare}/>
    <AlertDialog open={!!confirm} onOpenChange={open=>{if(!open&&!confirmationPending)setConfirm(null);}}>
      <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{confirm?.kind==='cancelar'?'Cancelar tarefa deste dia?':confirm?.kind==='restaurar'?'Restaurar tarefa?':'Reabrir tarefa?'}</AlertDialogTitle>
        <AlertDialogDescription className="break-words">{confirmedTask?.titulo}. {confirm?.kind==='cancelar'?'A tarefa sairá do quadro deste dia. O histórico será preservado e você poderá restaurá-la. O cronograma dos outros dias continua igual.':confirm?.kind==='restaurar'?(confirmedTask?.duplicada_de?'Esta cópia voltará como uma tarefa avulsa.':'A tarefa voltará ao quadro deste dia.'):confirm?.status!=='a_fazer'&&confirmedTask?.status==='feito'?'A conclusão atual será desfeita. O rendimento anterior continuará no histórico e será solicitado novamente ao finalizar.':'A tarefa voltará para A fazer, sem início nem tempo de produção. Ao iniciar novamente, será registrado um novo horário. Os eventos anteriores continuarão no histórico.'}</AlertDialogDescription>
      </AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={confirmationPending}>Voltar</AlertDialogCancel><Button variant={confirm?.kind==='cancelar'?'destructive':'default'} disabled={confirmationPending||!confirmedTask} onClick={()=>void applyConfirmation()}>{confirmationPending?'Salvando…':'Confirmar'}</Button></AlertDialogFooter></AlertDialogContent>
    </AlertDialog>
    <Dialog open={!!detailed} onOpenChange={open=>{if(!open)setHistory(null);}}><DialogContent className="max-w-xl"><DialogHeader><DialogTitle>Histórico da tarefa</DialogTitle><DialogDescription className="break-words">{detailed?.titulo}</DialogDescription></DialogHeader>
      <div className="max-h-[65vh] space-y-4 overflow-y-auto pr-2">{detailed&&<ProducaoCard tarefa={detailed}/>}
        {[...(detailed?.historico??[])].sort((a,b)=>b.movido_em.localeCompare(a.movido_em)).map(event=><div key={event.id} className="border-l-2 pl-3 text-sm"><p className="font-medium">{event.evento_tipo==='cancelamento'?'Tarefa cancelada':event.evento_tipo==='restauracao'?'Tarefa restaurada':event.evento_tipo==='edicao'?'Dados da tarefa editados':event.evento_tipo==='responsavel'?'Responsável alterado':event.de_status?`${ETAPAS.find(e=>e.id===event.de_status)?.nome} → ${ETAPAS.find(e=>e.id===event.para_status)?.nome}`:'Tarefa criada'}</p><p className="text-xs text-muted-foreground">{formatInTimeZone(event.movido_em,getBusinessRegion().timeZone,'dd/MM/yyyy HH:mm')}{event.origem==='link_compartilhado'?' · Link compartilhado':''}</p>{event.rendimento_real!=null&&<p className="mt-1">Realizado: {formatarRendimento(event.rendimento_real)} {event.rendimento_unidade}</p>}</div>)}
      </div></DialogContent></Dialog>
  </div>;
}
