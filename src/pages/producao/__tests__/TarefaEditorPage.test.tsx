import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import TarefaEditorPage from '../TarefaEditorPage';
const state=vi.hoisted(()=>({tasks:[] as any[],criar:vi.fn(),editar:vi.fn(),refetch:vi.fn()}));
vi.mock('@/hooks/useProducaoTarefas',()=>({useProducaoTarefas:()=>({data:state.tasks,isLoading:false,criar:state.criar,editar:state.editar,refetch:state.refetch})}));
vi.mock('@/hooks/useProducaoAreas',()=>({useProducaoAreas:()=>({data:[],isLoading:false})}));
vi.mock('@/hooks/useProducaoOpcoes',()=>({useProducaoOpcoes:()=>({data:{funcionarios:[{id:'emp',nome:'Ana'}],receitas:[{id:'recipe',nome:'Bolo',imagem_url:'https://example.test/bolo.png',rendimento_valor:12,rendimento_unidade:'un'}]},isPending:false})}));
function open(edit=false){return render(<MemoryRouter initialEntries={[`/producao/agenda/2026-11-11/${edit?'task/editar':'nova'}`]}><Routes><Route path="/producao/agenda/:date/nova" element={<TarefaEditorPage/>}/><Route path="/producao/agenda/:date/:id/editar" element={<TarefaEditorPage/>}/><Route path="/producao/agenda/:date" element={<p>Quadro do dia</p>}/></Routes></MemoryRouter>);}
beforeEach(()=>{vi.clearAllMocks();state.tasks=[];state.criar.mockResolvedValue({});state.editar.mockResolvedValue({});state.refetch.mockResolvedValue({});});afterEach(cleanup);
it('guards a double submit and retries with the same idempotency key',async()=>{
  let reject:(e:Error)=>void;state.criar.mockImplementationOnce(()=>new Promise((_resolve,fail)=>{reject=fail;}));open();
  fireEvent.change(screen.getByLabelText('Título da tarefa'),{target:{value:'Assar bolos'}});
  fireEvent.keyDown(screen.getByRole('combobox',{name:'Responsável'}),{key:'ArrowDown'});fireEvent.keyDown(await screen.findByRole('option',{name:'Ana'}),{key:'Enter'});
  const submit=screen.getByRole('button',{name:'Criar tarefa'});fireEvent.click(submit);fireEvent.click(submit);expect(state.criar).toHaveBeenCalledOnce();expect(submit).toBeDisabled();
  await act(async()=>reject(new Error('Sem conexão')));expect(screen.getByRole('alert')).toHaveTextContent('Sem conexão');const key=state.criar.mock.calls[0][0];
  fireEvent.click(screen.getByRole('button',{name:'Criar tarefa'}));await waitFor(()=>expect(screen.getByText('Quadro do dia')).toBeInTheDocument());expect(state.criar.mock.calls[1][0]).toBe(key);
});
it('edits quantity, title, observations and the schedule in the full page',async()=>{
  state.tasks=[{id:'task',titulo:'Assar',funcionario_id:'emp',receita_id:'recipe',quantidade:2,status:'a_fazer',updated_at:'2026-11-11T12:00:00Z'}];open(true);
  fireEvent.change(screen.getByLabelText('Título da tarefa'),{target:{value:'Assar bolos do dia'}});
  fireEvent.change(screen.getByLabelText('Observações (opcional)'),{target:{value:'Separar para amanhã'}});
  fireEvent.change(screen.getByLabelText('Início'),{target:{value:'2026-11-11T09:00'}});
  fireEvent.change(screen.getByLabelText('Fim'),{target:{value:'2026-11-11T10:00'}});
  fireEvent.click(screen.getByRole('button',{name:'Salvar alterações'}));await waitFor(()=>expect(state.editar).toHaveBeenCalledWith(state.tasks[0],expect.objectContaining({titulo:'Assar bolos do dia',quantidade:2,observacoes:'Separar para amanhã',inicio_previsto:'2026-11-11T12:00:00.000Z',fim_previsto:'2026-11-11T13:00:00.000Z'})));
});
it('keeps a conflicting draft for review and requires an explicit reload',async()=>{
  state.tasks=[{id:'task',titulo:'Assar',funcionario_id:'emp',receita_id:null,quantidade:null,status:'a_fazer',updated_at:'2026-11-11T12:00:00Z'}];state.editar.mockRejectedValue({code:'40001',message:'A tarefa mudou'});open(true);fireEvent.change(screen.getByLabelText('Título da tarefa'),{target:{value:'Meu rascunho'}});fireEvent.click(screen.getByRole('button',{name:'Salvar alterações'}));await screen.findByRole('alert');expect(screen.getByLabelText('Título da tarefa')).toHaveValue('Meu rascunho');expect(screen.getByRole('button',{name:'Salvar alterações'})).toBeDisabled();expect(screen.getByRole('button',{name:'Recarregar dados e descartar este rascunho'})).toBeInTheDocument();
});
