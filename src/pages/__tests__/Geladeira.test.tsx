// @vitest-environment jsdom
import React from 'react';
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
  it('accepts fractional stock entries and retries with the same request ID after a lost response', async () => {
    await open();
    mocks.rpc.mockResolvedValueOnce({data:null,error:{message:'Falha de conexão'}});
    fireEvent.click(screen.getAllByRole('button',{name:'Entrada de Recheio de Ninho'})[0]);
    const input = screen.getByLabelText('Quantidade (kg)');
    fireEvent.focus(input); fireEvent.change(input,{target:{value:'0,25'}}); fireEvent.blur(input);
    fireEvent.click(screen.getByRole('button',{name:'Salvar'}));
    await screen.findByRole('alert');
    expect(mocks.rpc.mock.calls[0][1].p_quantidade).toBe(0.25);
    fireEvent.click(screen.getByRole('button',{name:'Salvar'}));
    await waitFor(()=>expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(mocks.rpc.mock.calls[1][1].p_request_id).toBe(mocks.rpc.mock.calls[0][1].p_request_id);
  });
  it('rejects a withdrawal above the available balance before sending a write', async () => {
    await open(); fireEvent.click(screen.getAllByRole('button',{name:'Saída de Recheio de Ninho'})[0]);
    const input = screen.getByLabelText('Quantidade (kg)');
    fireEvent.focus(input);fireEvent.change(input,{target:{value:'10'}});fireEvent.blur(input);
    fireEvent.click(screen.getByRole('button',{name:'Salvar'}));
    expect(await screen.findByRole('alert')).toHaveTextContent('maior que o saldo');
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
