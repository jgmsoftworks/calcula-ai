import type { ProducaoTarefa, ProducaoStatus } from '@/hooks/useProducaoTarefas';
type TestTask=Partial<ProducaoTarefa>&Pick<ProducaoTarefa,'id'|'titulo'|'status'>;
type TestDnd={children?:React.ReactNode;onDragEnd:(event:{active:{id:string};over:{id:string}|null})=>void};
import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AgendaDayPage from '../AgendaDayPage';
const state=vi.hoisted(()=>({tasks:[] as TestTask[],error:false,pending:new Set<string>(),mover:vi.fn(),cancelar:vi.fn(),refetch:vi.fn(),reordenar:vi.fn(),dnd:{} as TestDnd,pdf:vi.fn()}));
vi.mock('@/hooks/useProducaoTarefas',()=>({useProducaoTarefas:()=>({data:state.tasks,isLoading:false,isError:state.error,pendingIds:state.pending,mover:state.mover,cancelar:state.cancelar,refetch:state.refetch,reordenar:state.reordenar})}));
vi.mock('@/components/producao/CompartilharProducaoDialog',()=>({CompartilharProducaoDialog:()=>null}));
vi.mock('@/lib/producaoPdf',()=>({imprimirProducao:state.pdf}));
vi.mock('@dnd-kit/core',()=>({DndContext:(props:TestDnd)=>{state.dnd=props;return <>{props.children}</>;},DragOverlay:()=>null,useDroppable:()=>({setNodeRef:()=>{},isOver:false}),MouseSensor:class {},TouchSensor:class {},KeyboardSensor:class {},useSensor:()=>({}),useSensors:()=>[],pointerWithin:()=>[],closestCenter:()=>[]}));
vi.mock('@dnd-kit/sortable',()=>({SortableContext:({children}:{children:React.ReactNode})=><>{children}</>,useSortable:()=>({setNodeRef:()=>{},setActivatorNodeRef:()=>{},attributes:{},listeners:{},isDragging:false}),verticalListSortingStrategy:()=>{},sortableKeyboardCoordinates:()=>{},arrayMove:<T,>(items:T[],from:number,to:number)=>{const result=[...items];result.splice(to,0,result.splice(from,1)[0]);return result;}}));
const task=(id:string,status:ProducaoStatus='a_fazer')=>({id,titulo:`Tarefa ${id}`,status,area_id:null,funcionario_id:'emp',funcionario:{id:'emp',nome:'Ana',cargo:null},quantidade:1,receita_id:null,updated_at:'2026-11-11T12:00:00Z',historico:[]});
const tree=()=> <MemoryRouter initialEntries={['/producao/agenda/2026-11-11']}><Routes><Route path="/producao/agenda/:date" element={<AgendaDayPage/>}/><Route path="/producao/agenda/:date/nova" element={<h1>Página de nova tarefa</h1>}/></Routes></MemoryRouter>;
function open(){return render(tree());}
async function menu(name:string){fireEvent.pointerDown(screen.getByRole('button',{name:`Opções de Tarefa ${name}`}),{button:0,ctrlKey:false,pointerType:'mouse'});await screen.findByRole('menu');}
beforeEach(()=>{vi.clearAllMocks();state.tasks=[];state.error=false;state.pending=new Set();state.mover.mockResolvedValue({});state.cancelar.mockResolvedValue({});state.reordenar.mockResolvedValue({});state.refetch.mockResolvedValue({});state.pdf.mockResolvedValue(undefined);});
afterEach(cleanup);
it('shows a query failure and retry, never a misleading zero count',()=>{
  state.error=true;open();expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível carregar');expect(screen.queryByText('0 tarefas no dia')).not.toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:'Tentar novamente'}));expect(state.refetch).toHaveBeenCalledOnce();
});
it('opens a dedicated page for creating tasks',()=>{open();fireEvent.click(screen.getByRole('button',{name:'Nova tarefa'}));expect(screen.getByRole('heading',{name:'Página de nova tarefa'})).toBeInTheDocument();expect(screen.queryByRole('dialog')).not.toBeInTheDocument();});
it('disables only the pending task and allows an independent task to advance',()=>{
  state.tasks=[task('one'),task('two')];state.pending.add('one');open();
  const cards=screen.getAllByRole('article');expect(within(cards[0]).getByRole('button',{name:'Iniciar produção'})).toBeDisabled();fireEvent.click(within(cards[1]).getByRole('button',{name:'Iniciar produção'}));expect(state.mover).toHaveBeenCalledWith(state.tasks[1],'em_producao');
});
it('requires confirmation to cancel, supports backing out without writes',async()=>{
  state.tasks=[task('one')];open();await menu('one');fireEvent.click(screen.getByRole('menuitem',{name:'Cancelar tarefa do dia'}));
  expect(state.cancelar).not.toHaveBeenCalled();expect(screen.getByRole('alertdialog')).toHaveTextContent('histórico será preservado');fireEvent.click(screen.getByRole('button',{name:'Voltar'}));expect(state.cancelar).not.toHaveBeenCalled();
  await menu('one');fireEvent.click(screen.getByRole('menuitem',{name:'Cancelar tarefa do dia'}));fireEvent.click(screen.getByRole('button',{name:'Confirmar'}));await waitFor(()=>expect(state.cancelar).toHaveBeenCalledWith(state.tasks[0],false));
});
it('offers reopening instead of canceling a completed task',async()=>{
  state.tasks=[task('done','feito')];open();await menu('done');expect(screen.queryByRole('menuitem',{name:'Cancelar tarefa do dia'})).not.toBeInTheDocument();expect(screen.getByRole('menuitem',{name:'Reabrir produção'})).toBeInTheDocument();
});
it('reorders tasks inside a column and prevents skipping production',()=>{
  state.tasks=[task('one'),task('two')];open();act(()=>state.dnd.onDragEnd({active:{id:'one'},over:{id:'two'}}));expect(state.reordenar).toHaveBeenCalledWith('a_fazer',[state.tasks[1],state.tasks[0]]);
  act(()=>state.dnd.onDragEnd({active:{id:'one'},over:{id:'feito'}}));expect(state.mover).not.toHaveBeenCalled();
});
it('searches accents and prints only visible tasks; filters disable reordering',()=>{
  state.tasks=[{...task('one'),titulo:'Bolo de maçã'},task('two')];open();fireEvent.change(screen.getByLabelText('Buscar tarefas'),{target:{value:'maca'}});
  expect(screen.queryByText('Tarefa two')).not.toBeInTheDocument();expect(screen.getByRole('button',{name:'Mover Bolo de maçã'})).toBeEnabled();fireEvent.click(screen.getByRole('button',{name:'Imprimir tarefas exibidas'}));expect(state.pdf).toHaveBeenCalledWith('2026-11-11',[state.tasks[0]],'Filtros aplicados');
});
it('allows dragging between stages while searching, without reordering the filtered subset',()=>{
  state.tasks=[task('one'),task('two')];open();fireEvent.change(screen.getByLabelText('Buscar tarefas'),{target:{value:'Tarefa'}});
  act(()=>state.dnd.onDragEnd({active:{id:'one'},over:{id:'em_producao'}}));
  expect(state.mover).toHaveBeenCalledWith(state.tasks[0],'em_producao');
  act(()=>state.dnd.onDragEnd({active:{id:'one'},over:{id:'two'}}));expect(state.reordenar).not.toHaveBeenCalled();
});
it('keeps another task draggable while one task is saving and accepts a mobile stage tab',()=>{
  state.tasks=[task('one'),task('two')];state.pending.add('one');open();
  expect(screen.getByRole('button',{name:'Mover Tarefa one'})).toBeDisabled();
  expect(screen.getByRole('button',{name:'Mover Tarefa two'})).toBeEnabled();
  act(()=>state.dnd.onDragEnd({active:{id:'one'},over:{id:'tab-em_producao'}}));expect(state.mover).not.toHaveBeenCalled();
  act(()=>state.dnd.onDragEnd({active:{id:'two'},over:{id:'tab-em_producao'}}));expect(state.mover).toHaveBeenCalledWith(state.tasks[1],'em_producao');
});
it('dragging a recipe to Feito asks for yield and canceling leaves the task in production',()=>{
  state.tasks=[{...task('one','em_producao'),receita_id:'r',rendimento_previsto:12,rendimento_unidade:'un'}];open();
  act(()=>state.dnd.onDragEnd({active:{id:'one'},over:{id:'feito'}}));
  expect(screen.getByLabelText('Quanto rendeu? (un)')).toBeInTheDocument();expect(state.mover).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button',{name:'Cancelar'}));expect(state.mover).not.toHaveBeenCalled();
});
it('preserves recipe photos and full titles and has mobile stage tabs',()=>{
  state.tasks=[{...task('one'),titulo:'Uma receita com um nome completo muito longo para caber no cartão',receita:{id:'r',nome:'Receita',imagem_url:'https://example.test/bolo.png'}}];const {container}=open();expect(container.querySelector('img')).toHaveAttribute('src','https://example.test/bolo.png');expect(screen.getByText(state.tasks[0].titulo).className).not.toMatch(/truncate|line-clamp/);fireEvent.click(screen.getByRole('tab',{name:/Em produção/}));expect(screen.getByRole('tab',{name:/Em produção/})).toHaveAttribute('aria-selected','true');
});
it('keeps canceled tasks out of the board and restores a duplicate only after explanation',()=>{
  state.tasks=[task('one'),{...task('copy'),cancelado_em:'2026-11-11',duplicada_de:'one'}];open();expect(screen.queryByText('Tarefa copy')).not.toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:'Canceladas (1)'}));fireEvent.click(screen.getByRole('button',{name:'Restaurar tarefa'}));expect(screen.getByRole('alertdialog')).toHaveTextContent('tarefa avulsa');expect(state.cancelar).not.toHaveBeenCalled();
});
it('a stale completion closes and refreshes so a retry uses the updated version',async()=>{
  state.tasks=[{...task('one','em_producao'),receita_id:'r',rendimento_previsto:12,rendimento_unidade:'un'}];state.mover.mockRejectedValueOnce({code:'40001',message:'A tarefa mudou'});const view=open();
  fireEvent.click(screen.getByRole('button',{name:'Finalizar produção'}));fireEvent.change(screen.getByLabelText('Quanto rendeu? (un)'),{target:{value:'11'}});fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'Finalizar produção'}));await waitFor(()=>expect(screen.queryByRole('dialog')).not.toBeInTheDocument());expect(state.refetch).toHaveBeenCalledOnce();
  state.tasks=[{...state.tasks[0],updated_at:'2026-11-11T13:00:00Z'}];view.rerender(tree());fireEvent.click(screen.getByRole('button',{name:'Finalizar produção'}));fireEvent.change(screen.getByLabelText('Quanto rendeu? (un)'),{target:{value:'12'}});fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'Finalizar produção'}));await waitFor(()=>expect(state.mover).toHaveBeenLastCalledWith(state.tasks[0],'feito',12));
});

it('returning to A fazer explains the reset and restores the start action without an old start time',async()=>{
  state.tasks=[{...task('one','em_producao'),iniciado_em:'2026-11-11T18:15:00Z'}];const view=open();
  expect(screen.getByText('Início: 15:15')).toBeInTheDocument();await menu('one');fireEvent.click(screen.getByRole('menuitem',{name:'Voltar para A fazer'}));
  expect(screen.getByRole('alertdialog')).toHaveTextContent('sem início nem tempo de produção');
  fireEvent.click(screen.getByRole('button',{name:'Confirmar'}));await waitFor(()=>expect(state.mover).toHaveBeenCalledWith(state.tasks[0],'a_fazer'));
  state.tasks=[{...state.tasks[0],status:'a_fazer',iniciado_em:null}];view.rerender(tree());
  expect(screen.queryByText('Início: 15:15')).not.toBeInTheDocument();expect(screen.getByRole('button',{name:'Iniciar produção'})).toBeEnabled();
});
