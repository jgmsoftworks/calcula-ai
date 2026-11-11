import { useState, type ReactNode } from 'react';
import { DndContext, DragOverlay, PointerSensor, KeyboardSensor, useSensor, useSensors, useDroppable, pointerWithin, closestCenter, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy, sortableKeyboardCoordinates, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChefHat, Clock, GripVertical, MoreHorizontal, Pencil, History, Trash2, RotateCcw, ArrowUp, ArrowDown, Loader2, User } from 'lucide-react';
import { formatInTimeZone } from 'date-fns-tz';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { getBusinessRegion } from '@/lib/business-region';
import { rendimentoDaTarefa, formatarRendimento, temReceitaProducao, type ProducaoRendimento } from '@/lib/producaoRendimento';
import type { ProducaoStatus } from '@/hooks/useProducaoTarefas';

export const ETAPAS: {id:ProducaoStatus;nome:string;cor:string}[] = [
  {id:'a_fazer',nome:'A fazer',cor:'bg-slate-400'},
  {id:'em_producao',nome:'Em produção',cor:'bg-primary'},
  {id:'feito',nome:'Feito',cor:'bg-emerald-500'},
];
export type BoardTask = ProducaoRendimento & {
  id:string;titulo:string;status:ProducaoStatus;observacoes?:string|null;cancelado_em?:string|null;duplicada_de?:string|null;
  inicio_previsto?:string|null;fim_previsto?:string|null;iniciado_em?:string|null;concluido_em?:string|null;
  funcionario?:{nome:string;id?:string}|null;area?:{nome:string;cor?:string|null}|null;
};
export function ProducaoCard({tarefa,pending,onAdvance,onEdit,onHistory,onCancel,onReopen,onRestore,onUp,onDown,handle}: {
  tarefa:BoardTask;pending?:boolean;onAdvance?:()=>void;onEdit?:()=>void;onHistory?:()=>void;onCancel?:()=>void;
  onReopen?:()=>void;onRestore?:()=>void;onUp?:()=>void;onDown?:()=>void;handle?:ReactNode;
}) {
  const rendimento=rendimentoDaTarefa(tarefa);
  const atraso=!tarefa.cancelado_em && tarefa.status!=='feito' && tarefa.fim_previsto && new Date(tarefa.fim_previsto).getTime()<Date.now();
  const hora=(value:string)=>formatInTimeZone(value,getBusinessRegion().timeZone,'HH:mm');
  const hasMenu=onEdit||onHistory||onCancel||onReopen||onUp||onDown;
  return <article aria-label={tarefa.titulo} aria-busy={pending} className={cn('min-w-0 rounded-xl border bg-card p-4 shadow-sm',pending&&'opacity-70')}>
    <div className="flex items-start gap-3">
      {tarefa.receita?.imagem_url ? <img src={tarefa.receita.imagem_url} alt="" loading="lazy" className="h-12 w-12 shrink-0 rounded-xl object-cover"/>
        : <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><ChefHat className="h-5 w-5"/></div>}
      <div className="min-w-0 flex-1">
        {tarefa.area && <p className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground"><span className="h-2 w-2 shrink-0 rounded-full" style={{backgroundColor:tarefa.area.cor??'#64748b'}}/>{tarefa.area.nome}</p>}
        <h3 className="break-words text-sm font-semibold leading-snug">{tarefa.titulo}</h3>
        {(tarefa.receita?.nome||tarefa.receita_nome) && (tarefa.receita?.nome||tarefa.receita_nome)!==tarefa.titulo && <p className="mt-1 break-words text-xs text-muted-foreground">{tarefa.receita?.nome||tarefa.receita_nome}</p>}
      </div>
      {hasMenu && <DropdownMenu><DropdownMenuTrigger asChild><Button type="button" variant="ghost" size="icon" disabled={pending} className="-mr-2 -mt-2 shrink-0" aria-label={`Opções de ${tarefa.titulo}`}><MoreHorizontal/></Button></DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {onEdit && <DropdownMenuItem onSelect={onEdit}><Pencil className="mr-2 h-4 w-4"/>Editar tarefa</DropdownMenuItem>}
          {onHistory && <DropdownMenuItem onSelect={onHistory}><History className="mr-2 h-4 w-4"/>Ver histórico</DropdownMenuItem>}
          {onUp && <DropdownMenuItem onSelect={onUp}><ArrowUp className="mr-2 h-4 w-4"/>Mover para cima</DropdownMenuItem>}
          {onDown && <DropdownMenuItem onSelect={onDown}><ArrowDown className="mr-2 h-4 w-4"/>Mover para baixo</DropdownMenuItem>}
          {onReopen && <DropdownMenuItem onSelect={onReopen}><RotateCcw className="mr-2 h-4 w-4"/>{tarefa.status==='feito'?'Reabrir produção':'Voltar para A fazer'}</DropdownMenuItem>}
          {onCancel && <DropdownMenuItem onSelect={onCancel} className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4"/>Cancelar tarefa do dia</DropdownMenuItem>}
        </DropdownMenuContent>
      </DropdownMenu>}
    </div>
    {temReceitaProducao(tarefa) && <dl className="my-4 grid grid-cols-2 gap-3 rounded-lg bg-primary/5 px-3 py-2.5 text-sm">
      <div><dt className="text-xs text-muted-foreground">Previsto</dt><dd className="mt-1 break-words font-semibold">{rendimento.previsto===null?'Não informado':`${formatarRendimento(rendimento.previsto)} ${rendimento.unidade}`}</dd></div>
      <div><dt className="text-xs text-muted-foreground">Realizado</dt><dd className="mt-1 break-words font-semibold text-primary">{rendimento.real===null?'—':`${formatarRendimento(rendimento.real)} ${rendimento.unidade}`}</dd></div>
    </dl>}
    <div className="my-3 space-y-2 text-xs text-muted-foreground">
      <p className="flex items-start gap-2"><User className="h-4 w-4 shrink-0"/><span className="break-words">{tarefa.funcionario?.nome??'Sem responsável'}</span></p>
      {(tarefa.inicio_previsto||tarefa.fim_previsto) && <p className="flex flex-wrap items-center gap-2"><Clock className="h-4 w-4"/>{tarefa.inicio_previsto?hora(tarefa.inicio_previsto):'—'} – {tarefa.fim_previsto?hora(tarefa.fim_previsto):'—'}{atraso && <span className="rounded-md bg-amber-100 px-2 py-0.5 text-amber-800 dark:bg-amber-950 dark:text-amber-200">Atrasada</span>}</p>}
      {tarefa.observacoes && <p className="whitespace-pre-wrap break-words border-l-2 pl-2 leading-relaxed">{tarefa.observacoes}</p>}
    </div>
    {(onAdvance||onRestore||handle) && <div className="flex items-center gap-2 border-t pt-3">
      {handle}
      {onAdvance && <Button type="button" className="min-w-0 flex-1" variant={tarefa.status==='em_producao'?'default':'outline'} disabled={pending} onClick={onAdvance}>{pending?<Loader2 className="animate-spin"/>:null}{tarefa.status==='a_fazer'?'Iniciar produção':'Finalizar produção'}</Button>}
      {onRestore && <Button type="button" variant="outline" className="flex-1" disabled={pending} onClick={onRestore}>{pending?<Loader2 className="animate-spin"/>:<RotateCcw/>}Restaurar tarefa</Button>}
    </div>}
  </article>;
}

interface BoardProps<T extends BoardTask> {
  tasks:T[];pendingIds:Set<string>;allowReorder?:boolean;
  onAdvance:(task:T)=>void;onMove?:(task:T,status:ProducaoStatus)=>void;onReorder?:(status:ProducaoStatus,tasks:T[])=>void;
  onEdit?:(task:T)=>void;onHistory?:(task:T)=>void;onCancel?:(task:T)=>void;onReopen?:(task:T)=>void;
}
export function ProducaoBoard<T extends BoardTask>(props:BoardProps<T>) {
  const {tasks,pendingIds,allowReorder=false,onMove,onReorder}=props;
  const [tab,setTab]=useState<ProducaoStatus>('a_fazer');
  const [active,setActive]=useState<T|null>(null);
  const sensors=useSensors(useSensor(PointerSensor,{activationConstraint:{distance:8}}),useSensor(KeyboardSensor,{coordinateGetter:sortableKeyboardCoordinates}));
  const dragEnd=(event:DragEndEvent)=>{
    setActive(null);
    if(!event.over||!allowReorder||pendingIds.size) return;
    const task=tasks.find(t=>t.id===event.active.id);if(!task) return;
    const target=tasks.find(t=>t.id===event.over!.id);
    const status=target?.status??ETAPAS.find(e=>e.id===event.over!.id)?.id;if(!status) return;
    if(status!==task.status){onMove?.(task,status);return;}
    const column=tasks.filter(t=>t.status===status);
    const from=column.findIndex(t=>t.id===task.id),to=target?column.findIndex(t=>t.id===target.id):column.length-1;
    if(from!==to) onReorder?.(status,arrayMove(column,from,to));
  };
  const bump=(task:T,delta:number)=>{
    const column=tasks.filter(t=>t.status===task.status),from=column.findIndex(t=>t.id===task.id);
    onReorder?.(task.status,arrayMove(column,from,from+delta));
  };
  return <>
    <div role="tablist" aria-label="Etapa da produção" className="mb-4 grid grid-cols-3 gap-1 rounded-xl bg-muted/60 p-1 lg:hidden">
      {ETAPAS.map(stage=><button type="button" role="tab" key={stage.id} aria-selected={tab===stage.id} aria-controls={`board-${stage.id}`} onClick={()=>setTab(stage.id)} className={cn('rounded-lg px-1 py-3 text-xs font-medium',tab===stage.id?'bg-card text-primary shadow-sm':'text-muted-foreground')}>{stage.nome} <span className="ml-1 tabular-nums">{tasks.filter(t=>t.status===stage.id).length}</span></button>)}
    </div>
    <DndContext sensors={sensors} collisionDetection={args=>{const hits=pointerWithin(args);const cards=hits.filter(hit=>tasks.some(t=>t.id===hit.id));return cards.length?cards:hits.length?hits:closestCenter(args);}}
      onDragStart={event=>setActive(tasks.find(t=>t.id===event.active.id)??null)} onDragEnd={dragEnd} onDragCancel={()=>setActive(null)}>
      <div className="grid min-w-0 grid-cols-1 items-start gap-4 lg:grid-cols-3">
        {ETAPAS.map(stage=>{
          const column=tasks.filter(t=>t.status===stage.id);
          return <BoardColumn key={stage.id} stage={stage} count={column.length} selected={tab===stage.id}>
            <SortableContext items={column.map(t=>t.id)} strategy={verticalListSortingStrategy}>
              {column.map((task,index)=><SortableTask key={task.id} task={task} props={props} disabled={!allowReorder||pendingIds.size>0}
                onUp={allowReorder&&index>0?()=>bump(task,-1):undefined} onDown={allowReorder&&index<column.length-1?()=>bump(task,1):undefined}/>)}
            </SortableContext>
            {!column.length && <p className="py-9 text-center text-sm text-muted-foreground">Nenhuma tarefa nesta etapa.</p>}
          </BoardColumn>;
        })}
      </div>
      <DragOverlay>{active?<div className="rotate-1 opacity-90"><ProducaoCard tarefa={active}/></div>:null}</DragOverlay>
    </DndContext>
  </>;
}
function BoardColumn({stage,count,selected,children}:{stage:typeof ETAPAS[number];count:number;selected:boolean;children:ReactNode}) {
  const {setNodeRef,isOver}=useDroppable({id:stage.id});
  return <section ref={setNodeRef} id={`board-${stage.id}`} aria-label={stage.nome} className={cn('min-w-0 rounded-2xl border bg-muted/25 p-3 lg:block',!selected&&'hidden',isOver&&'border-primary bg-primary/5')}>
    <header className="mb-3 flex items-center gap-2 px-1 py-2"><span className={cn('h-2 w-2 rounded-full',stage.cor)}/><h2 className="text-sm font-semibold">{stage.nome}</h2><span className="ml-auto text-sm tabular-nums text-muted-foreground">{count}</span></header>
    <div className="space-y-3">{children}</div>
  </section>;
}
function SortableTask<T extends BoardTask>({task,props,disabled,onUp,onDown}:{task:T;props:BoardProps<T>;disabled:boolean;onUp?:()=>void;onDown?:()=>void}) {
  const {setNodeRef,setActivatorNodeRef,attributes,listeners,transform,transition,isDragging}=useSortable({id:task.id,disabled});
  const pending=props.pendingIds.has(task.id)||props.pendingIds.has('order');
  return <div ref={setNodeRef} style={{transform:CSS.Transform.toString(transform),transition,opacity:isDragging ? 0.25 : 1}}>
    <ProducaoCard tarefa={task} pending={pending}
      handle={props.onReorder?<button type="button" ref={setActivatorNodeRef} {...attributes} {...listeners} disabled={disabled} aria-label={`Reordenar ${task.titulo}`} className="flex h-10 w-10 shrink-0 touch-none items-center justify-center rounded-lg text-muted-foreground hover:bg-muted disabled:opacity-30"><GripVertical className="h-4 w-4"/></button>:undefined}
      onAdvance={task.status!=='feito'?()=>props.onAdvance(task):undefined}
      onEdit={props.onEdit&&task.status!=='feito'?()=>props.onEdit!(task):undefined}
      onHistory={props.onHistory?()=>props.onHistory!(task):undefined}
      onCancel={props.onCancel&&task.status!=='feito'?()=>props.onCancel!(task):undefined}
      onReopen={props.onReopen&&task.status!=='a_fazer'?()=>props.onReopen!(task):undefined}
      onUp={props.pendingIds.size?undefined:onUp} onDown={props.pendingIds.size?undefined:onDown}/>
  </div>;
}
