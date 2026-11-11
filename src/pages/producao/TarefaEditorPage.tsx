import { useRef, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import { isValid, parseISO } from 'date-fns';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ReceitaProducaoFields } from '@/components/producao/ReceitaProducaoFields';
import { useProducaoTarefas, type ProducaoTarefa, type ProducaoInput } from '@/hooks/useProducaoTarefas';
import { useProducaoAreas, type ProducaoArea } from '@/hooks/useProducaoAreas';
import { useProducaoOpcoes, type FuncionarioOpt } from '@/hooks/useProducaoOpcoes';
import { getBusinessRegion } from '@/lib/business-region';
import { rendimentoPrevisto, type ReceitaRendimento } from '@/lib/producaoRendimento';

export default function TarefaEditorPage(){
  const {date='',id}=useParams();const navigate=useNavigate();
  const valid=isValid(parseISO(date))&&/^\d{4}-\d{2}-\d{2}$/.test(date);
  const api=useProducaoTarefas(valid?date:'');const areas=useProducaoAreas();const options=useProducaoOpcoes();
  const [revision,setRevision]=useState(0);
  const task=api.data?.find(t=>t.id===id);
  const back=()=>navigate(`/producao/agenda/${date}`,{replace:true});
  if(!valid)return <p>Data inválida.</p>;
  if(api.isLoading||areas.isLoading||options.isPending)return <p role="status">Carregando tarefa…</p>;
  if(api.isError||areas.isError||options.isError)return <div role="alert" className="space-y-3"><p>Não foi possível carregar os dados.</p><Button onClick={()=>{void api.refetch();void areas.refetch();void options.refetch();}}>Tentar novamente</Button><Button variant="outline" onClick={back}>Voltar</Button></div>;
  if(id&&(!task||task.cancelado_em||task.status==='feito'))return <div className="space-y-3"><p>{!task?'Tarefa não encontrada.':'Reabra ou restaure a tarefa no quadro antes de editar.'}</p><Button onClick={back}>Voltar ao quadro</Button></div>;
  return <TaskForm key={`${id??'nova'}:${revision}`} date={date} task={task} areas={areas.data??[]} employees={options.data.funcionarios} recipes={options.data.receitas} onBack={back}
    onReload={async()=>{await api.refetch();setRevision(v=>v+1);}}
    onSave={async(input,key,version)=>{if(version)await api.editar(version,input);else await api.criar(key,input);back();}}/>;
}

function TaskForm({date,task,areas,employees,recipes,onBack,onReload,onSave}:{date:string;task?:ProducaoTarefa;areas:ProducaoArea[];employees:FuncionarioOpt[];recipes:ReceitaRendimento[];onBack:()=>void;onReload:()=>Promise<void>;onSave:(input:ProducaoInput,key:string,version?:ProducaoTarefa)=>Promise<void>}){
  const [version]=useState(task);
  const [key]=useState(()=>crypto.randomUUID());
  const zone=getBusinessRegion().timeZone;
  const [title,setTitle]=useState(task?.titulo??'');const [area,setArea]=useState(task?.area_id??'');
  const [employee,setEmployee]=useState(task?.funcionario_id??'');const [recipe,setRecipe]=useState(task?.receita_id??'');
  const [quantity,setQuantity]=useState(task?.quantidade??1);const [notes,setNotes]=useState(task?.observacoes??'');
  const [start,setStart]=useState(task?.inicio_previsto?formatInTimeZone(task.inicio_previsto,zone,"yyyy-MM-dd'T'HH:mm"):'');
  const [end,setEnd]=useState(task?.fim_previsto?formatInTimeZone(task.fim_previsto,zone,"yyyy-MM-dd'T'HH:mm"):'');
  const [saving,setSaving]=useState(false);const lock=useRef(false);const [error,setError]=useState('');const [conflict,setConflict]=useState(false);
  const recipeLocked=task?.status==='em_producao';
  const valid=!!title.trim()&&!!employee&&(!recipe||rendimentoPrevisto(recipes.find(r=>r.id===recipe),quantity)!==null);
  const submit=async(event:FormEvent)=>{
    event.preventDefault();if(!valid||lock.current||conflict)return;
    lock.current=true;setSaving(true);setError('');
    try{
      const from=start?fromZonedTime(start,zone).toISOString():null;const to=end?fromZonedTime(end,zone).toISOString():null;
      if(from&&to&&to<from)throw new Error('O fim previsto precisa ser após o início.');
      await onSave({titulo:title.trim(),area_id:area||null,funcionario_id:employee,receita_id:recipe||null,quantidade:recipe?quantity:null,observacoes:notes.trim()||null,inicio_previsto:from,fim_previsto:to},key,version);
    }catch(cause){setError((cause as Error).message||'Não foi possível salvar. Tente novamente.');if((cause as {code?:string}).code==='40001')setConflict(true);}
    finally{lock.current=false;setSaving(false);}
  };
  return <div className="mx-auto max-w-5xl space-y-6 pb-6">
    <header><Button variant="ghost" className="-ml-3 mb-3" onClick={onBack} disabled={saving}><ArrowLeft className="mr-2 h-4 w-4"/>Voltar ao quadro</Button><h1 id="task-title" className="text-2xl font-semibold">{task?'Editar tarefa do dia':'Nova tarefa do dia'}</h1><p className="mt-1 text-sm text-muted-foreground">{date.split('-').reverse().join('/')}{task?.recorrente_id?' · Esta edição vale apenas para este dia.':''}</p></header>
    <form aria-labelledby="task-title" className="space-y-5" onSubmit={submit}>
      <fieldset disabled={saving} className="grid min-w-0 gap-5 lg:grid-cols-2">
        <section className="min-w-0 space-y-5 rounded-2xl border bg-card p-5 sm:p-6"><h2 className="font-semibold">Dados da tarefa</h2>
          <div className="space-y-2"><Label htmlFor="task-name">Título da tarefa</Label><Input id="task-name" value={title} required onChange={e=>setTitle(e.target.value)}/></div>
          <div className="space-y-2"><Label htmlFor="task-area">Área</Label><Select value={area||'sem'} onValueChange={v=>setArea(v==='sem'?'':v)} disabled={saving}><SelectTrigger id="task-area"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="sem">Sem área</SelectItem>{area&&!areas.some(a=>a.id===area)&&<SelectItem value={area}>{task?.area?.nome??'Área indisponível'}</SelectItem>}{areas.map(a=><SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label htmlFor="task-employee">Responsável</Label><Select value={employee} onValueChange={setEmployee} disabled={saving}><SelectTrigger id="task-employee"><SelectValue placeholder="Selecione"/></SelectTrigger><SelectContent searchable searchLabel="Buscar responsável">{employee&&!employees.some(f=>f.id===employee)&&<SelectItem value={employee}>{task?.funcionario?.nome??'Responsável indisponível'}</SelectItem>}{employees.map(f=><SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}</SelectContent></Select></div>
        </section>
        <section className="min-w-0 space-y-5 rounded-2xl border bg-card p-5 sm:p-6"><h2 className="font-semibold">Receita e rendimento</h2><ReceitaProducaoFields receitas={recipes} receitaId={recipe} quantidade={quantity} onRecipeChange={v=>{setRecipe(v);setQuantity(1);}} onQuantityChange={setQuantity} disabled={saving||recipeLocked}/>{recipeLocked&&<p className="text-xs text-muted-foreground">Para mudar a receita ou a quantidade, volte a tarefa para A fazer no quadro.</p>}</section>
        <section className="min-w-0 space-y-5 rounded-2xl border bg-card p-5 sm:p-6"><h2 className="font-semibold">Horários previstos</h2><div className="space-y-2"><Label htmlFor="task-start">Início</Label><Input id="task-start" type="datetime-local" value={start} onChange={e=>setStart(e.target.value)}/></div><div className="space-y-2"><Label htmlFor="task-end">Fim</Label><Input id="task-end" type="datetime-local" value={end} onChange={e=>setEnd(e.target.value)}/></div></section>
        <section className="min-w-0 space-y-3 rounded-2xl border bg-card p-5 sm:p-6"><Label htmlFor="task-notes">Observações (opcional)</Label><Textarea id="task-notes" rows={6} value={notes} onChange={e=>setNotes(e.target.value)}/></section>
      </fieldset>
      {error&&<div role="alert" className="space-y-3 rounded-xl border border-destructive/30 p-4 text-sm"><p>{error}</p>{conflict&&<Button type="button" variant="outline" onClick={()=>void onReload()}>Recarregar dados e descartar este rascunho</Button>}</div>}
      <footer className="flex justify-end gap-3 border-t pt-5"><Button type="button" variant="outline" onClick={onBack} disabled={saving}>Cancelar</Button><Button type="submit" disabled={!valid||saving||conflict}>{saving&&<Loader2 className="mr-2 h-4 w-4 animate-spin"/>}{task?'Salvar alterações':'Criar tarefa'}</Button></footer>
    </form>
  </div>;
}
