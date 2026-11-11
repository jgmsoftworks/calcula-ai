import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ProducaoCompartilhadaPage from '../ProducaoCompartilhadaPage';
const mocks=vi.hoisted(()=>({invoke:vi.fn()}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{functions:{invoke:mocks.invoke},channel:()=>{const channel={state:'joined',on:()=>channel,subscribe:()=>channel,send:async()=>{}};return channel;},removeChannel:()=>{}}}));
const tarefa={id:'task',titulo:'Assar bolos',receita_id:'recipe',receita_nome:'Massa',quantidade:6,status:'em_producao',updated_at:'2026-11-11T12:00:00Z',rendimento_previsto:72,rendimento_real:null,rendimento_unidade:'un',funcionario:{nome:'Ana'}};
beforeEach(()=>{vi.clearAllMocks();mocks.invoke.mockImplementation((_name,{body})=>Promise.resolve({data:body.action==='get'?{tasks:[tarefa],date:'2026-11-11',expiresAt:'2026-11-12T12:00:00Z',syncChannel:'test'}:{task:{...tarefa,status:'feito',rendimento_real:body.rendimentoReal}},error:null}));});
afterEach(cleanup);
async function open(){render(<MemoryRouter initialEntries={['/producao-compartilhada/token']}><Routes><Route path="/producao-compartilhada/:token" element={<ProducaoCompartilhadaPage/>}/></Routes></MemoryRouter>);await screen.findByText('Assar bolos');}
describe('Shared production completion',()=>{
  it('opens yield confirmation and cancels without moving the task',async()=>{
    await open();fireEvent.click(screen.getByRole('button',{name:'Marcar como feito'}));
    expect(screen.getByLabelText('Quanto rendeu? (un)')).toHaveValue('');
    fireEvent.click(screen.getByRole('button',{name:'Cancelar'}));
    expect(screen.getByRole('button',{name:'Marcar como feito'})).toBeInTheDocument();
    expect(mocks.invoke.mock.calls.every(([,args])=>args.body.action==='get')).toBe(true);
  });
  it('sends the actual yield and the task version only on confirmation',async()=>{
    await open();fireEvent.click(screen.getByRole('button',{name:'Marcar como feito'}));
    fireEvent.change(screen.getByLabelText('Quanto rendeu? (un)'),{target:{value:'70'}});
    fireEvent.click(screen.getByRole('button',{name:'Finalizar produção'}));
    await waitFor(()=>expect(mocks.invoke).toHaveBeenCalledWith('producao-compartilhada',{body:{action:'move',token:'token',taskId:'task',expectedUpdatedAt:tarefa.updated_at,rendimentoReal:70}}));
    await waitFor(()=>expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText(/Realizado: 70 un/)).toBeInTheDocument();
  });
});
