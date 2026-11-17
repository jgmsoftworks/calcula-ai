// @vitest-environment jsdom
import React from 'react';
import '@/test/setup';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Movimentacao from '../Movimentacao';
import { RegistrarPerdaModal } from '@/components/estoque/perdas/RegistrarPerdaModal';
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn(), user: { id:'owner' } }));
vi.mock('@/hooks/useAuth', () => ({useAuth: () => ({user:mocks.user})}));
vi.mock('@/integrations/supabase/client', () => ({supabase: {rpc:mocks.rpc,from:mocks.from,channel:()=>({on:()=>({subscribe:()=>({})})}),removeChannel:vi.fn()}}));
vi.mock('sonner', () => ({toast:{success:vi.fn(),error:vi.fn()}}));
vi.mock('@/hooks/useProdutosPage',()=>({ useProdutosMovimentacao:()=>({produtos:[],resumo:{categorias:[],totalBusca:0},isPending:false,refetch:vi.fn(),fetchNextPage:vi.fn()}) }));
const recipe = { id:'r1',nome:'Recheio de Ninho',numero_sequencial:1,rendimento_valor:2,rendimento_unidade:'kg',status:'finalizada',markup:{tipo:'sub_receita'},ingredientes:[{quantidade:1,produto:{custo_unitario:50,unidade_uso:null,fator_conversao:null}}] };
const item = {id:'i1',user_id:'owner',receita_id:'r1',unidade:'kg',estoque_atual:1.5,estoque_minimo:2,receita:recipe};
beforeEach(()=>{
  vi.clearAllMocks();
  mocks.rpc.mockResolvedValue({data:{id:'receipt'},error:null});
  mocks.from.mockImplementation(table=>{
    const data = table==='geladeira_itens'?[item]:table==='folha_pagamento'?[{id:'person',nome:'Maria'}]:[];
    const q={select:()=>q,eq:()=>q,order:()=>q,range:()=>q,abortSignal:()=>q,
      then:(resolve:(v:unknown)=>unknown)=>Promise.resolve({data,error:null}).then(resolve)};return q;
  });
});
afterEach(cleanup);
function mount(ui: React.ReactNode) { return render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}>{ui}</QueryClientProvider>); }
async function select(label:string,option:string) {
  fireEvent.keyDown(screen.getByRole('combobox',{name:label}),{key:'Enter'});
  fireEvent.keyDown(await screen.findByRole('option',{name:option}),{key:'Enter'});
}
describe('Prepared products in existing stock screens',()=>{
  it('shows every registered product type and filters fridge cards by type and search without losing the other circles',async()=>{
    const tipos=[{id:'fillings',nome:'Recheios'},{id:'slices',nome:'Fatias'},{id:'pies',nome:'Tortas'}];
    const items=[
      {...item,receita:{...recipe,tipo_produto:tipos[0]}},
      {...item,id:'i2',receita_id:'r2',receita:{...recipe,id:'r2',nome:'Bolo de chocolate',tipo_produto:tipos[1]}},
      {...item,id:'i3',receita_id:'r3',receita:{...recipe,id:'r3',nome:'Pão de ló',tipo_produto:null}},
    ];
    mocks.from.mockImplementation(table=>{
      const data=table==='geladeira_itens'?items:table==='tipos_produto'?tipos:[];
      const q={select:()=>q,eq:()=>q,order:()=>q,range:()=>q,abortSignal:()=>q,
        then:(resolve:(v:unknown)=>unknown)=>Promise.resolve({data,error:null}).then(resolve)};return q;
    });
    mount(<Movimentacao />);
    fireEvent.click(screen.getByRole('button',{name:'Geladeira'}));
    const circle=(name:string)=>screen.getByRole('button',{name:new RegExp(name)});
    await screen.findByRole('heading',{name:'Bolo de chocolate'});
    expect(within(circle('Tortas')).getByText('0')).toBeInTheDocument();
    expect(screen.queryByRole('button',{name:/Sub-receitas|Receitas finais/})).not.toBeInTheDocument();
    fireEvent.click(circle('Fatias'));
    expect(circle('Fatias')).toHaveAttribute('aria-pressed','true');
    expect(screen.getByRole('heading',{name:'Bolo de chocolate'})).toBeInTheDocument();
    expect(screen.queryByRole('heading',{name:'Recheio de Ninho'})).not.toBeInTheDocument();
    expect(within(circle('Recheios')).getByText('1')).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('Buscar na Geladeira...'),{target:{value:'Ninho'}});
    expect(screen.getByText('Nenhum produto encontrado')).toBeInTheDocument();
    expect(within(circle('Fatias')).getByText('0')).toBeInTheDocument();
    expect(within(circle('Sem tipo')).getByText('0')).toBeInTheDocument();
    fireEvent.click(circle('Recheios'));
    expect(screen.getByRole('heading',{name:'Recheio de Ninho'})).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('Buscar na Geladeira...'),{target:{value:''}});
    fireEvent.click(circle('Sem tipo'));
    expect(screen.getByRole('heading',{name:'Pão de ló'})).toBeInTheDocument();
    expect(screen.queryByRole('heading',{name:'Recheio de Ninho'})).not.toBeInTheDocument();
    fireEvent.click(circle('Todos'));
    expect(screen.getAllByRole('heading',{level:4})).toHaveLength(3);
    fireEvent.click(circle('Tortas'));
    expect(screen.getByText('Nenhum produto encontrado')).toBeInTheDocument();
  });
  it('adds a fridge item to the shared cart with locked recipe cost and submits its source',async()=>{
    mount(<Movimentacao />);
    fireEvent.click(screen.getByRole('button',{name:'Geladeira'}));
    fireEvent.click(await screen.findByText('Recheio de Ninho'));
    expect(screen.getByLabelText('Custo por kg')).toHaveAttribute('readonly');
    expect(screen.getByLabelText('Custo por kg')).toHaveValue('R$ 25,00');
    await select('Motivo','Produção interna');
    fireEvent.click(screen.getByRole('button',{name:/Adicionar ao carrinho/}));
    // The cart persists when returning to purchased products.
    fireEvent.click(screen.getByRole('button',{name:'Lista de Produtos'}));
    expect(screen.getByText('Recheio de Ninho')).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole('combobox'),{key:'Enter'});
    fireEvent.keyDown(await screen.findByRole('option',{name:'Maria'}),{key:'Enter'});
    fireEvent.click(screen.getByRole('button',{name:'Finalizar e Gerar Comprovante'}));
    await waitFor(()=>expect(mocks.rpc).toHaveBeenCalledWith('finalizar_movimentacao_integrada',expect.objectContaining({p_itens:[expect.objectContaining({produto_id:'i1',origem_estoque:'geladeira',quantidade:1,custo_aplicado:25})],p_responsavel:'Maria'})));
  });
  it('registers fridge losses in the existing loss dialog with the fridge item ID',async()=>{
    const saved=vi.fn();mount(<RegistrarPerdaModal open onOpenChange={vi.fn()} onSaved={saved} />);
    fireEvent.click(screen.getByRole('button',{name:/^Geladeira/}));
    fireEvent.click(await screen.findByRole('button',{name:'Adicionar Recheio de Ninho'}));
    fireEvent.click(screen.getByRole('button',{name:'Adicionar'}));
    fireEvent.click(screen.getByRole('button',{name:'Registrar 1 perda'}));
    expect(screen.getByText(/quantidade será descontada do saldo da Geladeira/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:'Sim, dar baixa no estoque'}));
    await waitFor(()=>expect(mocks.rpc).toHaveBeenCalledWith('registrar_perdas_geladeira',expect.objectContaining({p_itens:[{tipo:'geladeira',item_id:'i1',quantidade:1}],p_baixar_estoque:true})));
    await waitFor(()=>expect(saved).toHaveBeenCalledOnce());
  });
});
