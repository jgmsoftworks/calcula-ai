// @vitest-environment jsdom
import React from 'react';
import '@/test/setup';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import Geladeira from '../Geladeira';
const mocks = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: mocks }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'owner' } }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn() } }));
const recipe = { id:'r1',nome:'Recheio de Ninho',numero_sequencial:1,rendimento_valor:2,rendimento_unidade:'kg',status:'finalizada',markup:{tipo:'sub_receita'},ingredientes:[{quantidade:1,produto:{custo_unitario:50,unidade_uso:null,fator_conversao:null}}] };
const item = {id:'i1',user_id:'owner',receita_id:'r1',unidade:'kg',estoque_atual:1.5,estoque_minimo:2,receita:recipe};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.from.mockImplementation(table => {
    const data = table === 'geladeira_itens' ? [item] : table === 'receitas' ? [recipe] : [];
    const query = { select:()=>query,eq:()=>query,order:()=>query,range:()=>query,abortSignal:()=>query,
      then:(resolve: (r:unknown)=>unknown) => Promise.resolve({ data, count:data.length, error:null }).then(resolve) };
    return query;
  });
  mocks.rpc.mockResolvedValue({data:'event',error:null});
});
afterEach(cleanup);
async function open() {
  render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><BrowserRouter><Geladeira /></BrowserRouter></QueryClientProvider>);
  await screen.findAllByText('Recheio de Ninho');
}
describe('Geladeira interaction', () => {
  it('shows the recipe cost for the stored amount and supports name filtering', async () => {
    await open();
    expect(screen.getAllByText(/37,50/).length).toBeGreaterThan(0);
    fireEvent.change(screen.getByRole('textbox',{name:'Buscar na Geladeira'}),{target:{value:'inexistente'}});
    expect(screen.getByText('Nenhuma receita encontrada')).toBeInTheDocument();
  });
  it('keeps only the recipe list here and registers new items with zero balance', async () => {
    mocks.from.mockImplementation(table => {
      const data = table === 'receitas' ? [recipe] : [];
      const query = { select:()=>query,eq:()=>query,order:()=>query,range:()=>query,abortSignal:()=>query,
        then:(resolve: (r:unknown)=>unknown) => Promise.resolve({ data, count:data.length, error:null }).then(resolve) };
      return query;
    });
    render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><BrowserRouter><Geladeira /></BrowserRouter></QueryClientProvider>);
    await screen.findByText('Sua Geladeira está vazia');
    expect(screen.queryByRole('button',{name:'Histórico'})).not.toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button',{name:'Adicionar receita'})[0]);
    const selector = await screen.findByRole('combobox',{name:'Selecionar receita'});
    await waitFor(() => expect(selector).not.toBeDisabled());
    expect(screen.queryByRole('textbox', { name: 'Buscar receita' })).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Buscar receita...')).not.toBeInTheDocument();
    fireEvent.keyDown(selector,{key:'Enter'});
    const search = await screen.findByRole('textbox', { name: 'Buscar receita' });
    fireEvent.change(search, { target: { value: '1' } });
    fireEvent.keyDown(await screen.findByRole('option',{name:/Recheio de Ninho/}),{key:'Enter'});
    expect(screen.queryByLabelText('Quantidade (kg)')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:'Salvar'}));
    await waitFor(()=>expect(mocks.rpc).toHaveBeenCalledWith('cadastrar_item_geladeira',{p_receita_id:'r1',p_estoque_minimo:0}));
    await waitFor(()=>expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});
