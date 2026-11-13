// @vitest-environment jsdom
import React from 'react';
import '@/test/setup';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import Geladeira from '../Geladeira';
const mocks = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: mocks }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'owner' } }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn() } }));
const recipe = { id:'r1',nome:'Recheio de Ninho',numero_sequencial:1,imagem_url:'/recheio.jpg',rendimento_valor:2,rendimento_unidade:'kg',status:'finalizada',markup:{tipo:'sub_receita'},ingredientes:[{quantidade:1,produto:{custo_unitario:50,unidade_uso:null,fator_conversao:null}}] };
const item = {id:'i1',user_id:'owner',receita_id:'r1',unidade:'kg',estoque_atual:1.5,estoque_minimo:2,receita:recipe};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.from.mockImplementation(table => {
    const data = table === 'geladeira_itens' ? [item] : table === 'receitas' ? [recipe] : [];
    const query = { select:()=>query,eq:()=>query,order:()=>query,range:()=>query,abortSignal:()=>query,
      single:()=>Promise.resolve({data:{...recipe,ingredientes:[{id:'ingredient',quantidade:1,produto:{nome:'Leite em pó',custo_unitario:50,unidade_compra:'kg',fator_conversao:1}}],embalagens:[],sub_receitas:[],mao_obra:[],passos:[],observacoes:'Conservar refrigerado.'},error:null}),
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
  it('distinguishes same-name recipes by category, searches it and keeps the selected category', async () => {
    const recipes = [
      { ...recipe, id: 'cake', nome: 'Choconinho', numero_sequencial: 21, tipo_produto: { id: 'cakes', nome: 'Bolos no pote' } },
      { ...recipe, id: 'slice', nome: 'Choconinho', numero_sequencial: 22, tipo_produto: { id: 'slices', nome: 'Fatias' } },
      { ...recipe, id: 'uncategorized', nome: 'Choconinho', numero_sequencial: 23, tipo_produto: null },
    ];
    mocks.from.mockImplementation(table => {
      const data = table === 'receitas' ? recipes : [];
      const query = { select:()=>query,eq:()=>query,order:()=>query,range:()=>query,abortSignal:()=>query,
        then:(resolve: (r:unknown)=>unknown) => Promise.resolve({ data, count:data.length, error:null }).then(resolve) };
      return query;
    });
    render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><BrowserRouter><Geladeira /></BrowserRouter></QueryClientProvider>);
    await screen.findByText('Sua Geladeira está vazia');
    fireEvent.click(screen.getAllByRole('button', { name: 'Adicionar receita' })[0]);
    const selector = await screen.findByRole('combobox', { name: 'Selecionar receita' });
    await waitFor(() => expect(selector).not.toBeDisabled());
    fireEvent.keyDown(selector, { key: 'Enter' });
    const options = await screen.findAllByRole('option');
    expect(options).toHaveLength(3);
    expect(options[0]).toHaveTextContent('Categoria: Bolos no pote');
    expect(options[1]).toHaveTextContent('Categoria: Fatias');
    expect(options[2]).toHaveTextContent('Categoria: Sem categoria');
    expect(options[0]).toHaveTextContent('#21 · Sub-receita');
    expect(options[0].querySelector('img')).toHaveAttribute('src', '/recheio.jpg');
    fireEvent.change(screen.getByRole('textbox', { name: 'Buscar receita' }), { target: { value: 'fatias' } });
    const matching = screen.getAllByRole('option');
    expect(matching).toHaveLength(1);
    fireEvent.keyDown(matching[0], { key: 'Enter' });
    expect(screen.getByRole('region', { name: 'Dados da receita selecionada' })).toHaveTextContent('Categoria: Fatias');
    fireEvent.keyDown(selector, { key: 'Enter' });
    fireEvent.change(screen.getByRole('textbox', { name: 'Buscar receita' }), { target: { value: '23' } });
    fireEvent.keyDown(screen.getByRole('option'), { key: 'Enter' });
    const details = screen.getByRole('region', { name: 'Dados da receita selecionada' });
    expect(details).toHaveTextContent('Categoria: Sem categoria');
    expect(details).not.toHaveTextContent('Fatias');
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar à Geladeira' }));
    await waitFor(() => expect(mocks.rpc).toHaveBeenCalledWith('cadastrar_item_geladeira', { p_receita_id: 'uncategorized', p_estoque_minimo: 0 }));
  });
  it('opens the complete recipe with its saved photo without editing or moving stock', async () => {
    await open();
    expect(screen.getAllByRole('img',{name:recipe.nome})[0]).toHaveAttribute('src','/recheio.jpg');
    fireEvent.click(screen.getAllByRole('button',{name:`Ver informações de ${recipe.nome}`})[0]);
    const dialog=await screen.findByRole('dialog',{name:'Detalhes da receita #1'});
    expect(within(dialog).getByRole('img',{name:recipe.nome})).toHaveAttribute('src','/recheio.jpg');
    expect(within(dialog).getByText('Leite em pó')).toBeInTheDocument();
    expect(within(dialog).getByText('Conservar refrigerado.')).toBeInTheDocument();
    expect(within(dialog).queryByRole('textbox')).not.toBeInTheDocument();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('edits the fridge minimum through the pencil without changing the recipe or balance', async () => {
    await open();
    fireEvent.click(screen.getAllByRole('button',{name:`Editar ${recipe.nome} na Geladeira`})[0]);
    expect(screen.getByRole('dialog',{name:'Editar item da Geladeira'})).toBeInTheDocument();
    expect(screen.queryByLabelText(/Saldo inicial/)).not.toBeInTheDocument();
    expect(screen.getByLabelText('Quantidade atual (kg)')).toHaveValue('1,5');
    expect(screen.getByLabelText('Quantidade atual (kg)')).not.toHaveAttribute('readonly');
    fireEvent.change(screen.getByLabelText('Estoque mínimo (kg)'),{target:{value:'3'}});
    fireEvent.click(screen.getByRole('button',{name:'Salvar'}));
    await waitFor(()=>expect(mocks.rpc).toHaveBeenCalledWith('movimentar_geladeira',expect.objectContaining({p_receita_id:'r1',p_tipo:'minimo',p_quantidade:0,p_estoque_minimo:3})));
  });
  it.each([
    ['2,5',2.5,'62,50'],
    ['0,75',0.75,'18,75'],
    ['0',0,'0,00'],
  ])('changes the current quantity to %s and recalculates the total before saving', async (input, quantity, total) => {
    await open();
    fireEvent.click(screen.getAllByRole('button',{name:`Editar ${recipe.nome} na Geladeira`})[0]);
    fireEvent.change(screen.getByLabelText('Quantidade atual (kg)'),{target:{value:input}});
    expect((screen.getByLabelText('Valor total em estoque') as HTMLInputElement).value).toContain(total);
    fireEvent.change(screen.getByLabelText('Estoque mínimo (kg)'),{target:{value:'1'}});
    fireEvent.change(screen.getByLabelText('Observação (opcional)'),{target:{value:'Conferência do estoque'}});
    fireEvent.click(screen.getByRole('button',{name:'Salvar'}));
    await waitFor(()=>expect(mocks.rpc).toHaveBeenCalledWith('movimentar_geladeira',{
      p_receita_id:'r1',p_tipo:'ajuste',p_quantidade:quantity,p_estoque_minimo:1,
      p_saldo_esperado:1.5,p_observacao:'Conferência do estoque',p_request_id:expect.any(String),
    }));
    await waitFor(()=>expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
  it('reloads a changed balance before allowing a new adjustment', async () => {
    mocks.rpc.mockResolvedValueOnce({data:null,error:{code:'40001',message:'O saldo mudou. Recarregue a Geladeira.'}});
    await open();
    fireEvent.click(screen.getAllByRole('button',{name:`Editar ${recipe.nome} na Geladeira`})[0]);
    fireEvent.change(screen.getByLabelText('Quantidade atual (kg)'),{target:{value:'3'}});
    fireEvent.click(screen.getByRole('button',{name:'Salvar'}));
    expect(await screen.findByRole('alert')).toHaveTextContent('O saldo mudou');
    expect(screen.getByRole('button',{name:'Salvar'})).toBeDisabled();
    expect(screen.getByLabelText('Quantidade atual (kg)')).toHaveValue('3');
    mocks.from.mockImplementation(table => {
      const data = table === 'geladeira_itens' ? [{...item,estoque_atual:2}] : [];
      const query = { select:()=>query,eq:()=>query,order:()=>query,range:()=>query,abortSignal:()=>query,
        then:(resolve: (r:unknown)=>unknown) => Promise.resolve({ data, count:data.length, error:null }).then(resolve) };
      return query;
    });
    fireEvent.click(screen.getByRole('button',{name:'Recarregar saldo'}));
    await waitFor(()=>expect(screen.getByLabelText('Quantidade atual (kg)')).toHaveValue('2'));
    fireEvent.change(screen.getByLabelText('Quantidade atual (kg)'),{target:{value:'3'}});
    fireEvent.click(screen.getByRole('button',{name:'Salvar'}));
    await waitFor(()=>expect(mocks.rpc).toHaveBeenLastCalledWith('movimentar_geladeira',expect.objectContaining({p_tipo:'ajuste',p_quantidade:3,p_saldo_esperado:2})));
  });
  it('requires confirmation to remove only the list entry, including an item with a balance', async () => {
    await open();
    fireEvent.click(screen.getAllByRole('button',{name:`Remover ${recipe.nome} da Geladeira`})[0]);
    expect(screen.getByText('A receita cadastrada não será apagada')).toBeInTheDocument();
    expect(screen.getByText(/deixará de aparecer na Geladeira/)).toHaveTextContent('1,5 kg');
    expect(mocks.rpc).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button',{name:'Cancelar'}));
    expect(mocks.rpc).not.toHaveBeenCalled();
    fireEvent.click(screen.getAllByRole('button',{name:`Remover ${recipe.nome} da Geladeira`})[0]);
    fireEvent.click(screen.getByRole('button',{name:'Remover'}));
    await waitFor(()=>expect(mocks.rpc).toHaveBeenCalledWith('remover_item_da_geladeira',{p_receita_id:'r1',p_request_id:expect.any(String)}));
    await waitFor(()=>expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
  it('shows the recipe cost for the stored amount and supports name filtering', async () => {
    await open();
    expect(screen.getAllByText(/37,50/).length).toBeGreaterThan(0);
    fireEvent.change(screen.getByRole('textbox',{name:'Buscar na Geladeira'}),{target:{value:'inexistente'}});
    expect(screen.getByText('Nenhuma receita encontrada')).toBeInTheDocument();
  });
  it('loads the selected recipe details, replaces them on selection and registers with zero balance', async () => {
    const cake = { ...recipe, id:'r2', nome:'Bolo Nuvem', numero_sequencial:2, imagem_url:null, rendimento_valor:10, rendimento_unidade:'un', markup:{tipo:'receita_final'} };
    mocks.from.mockImplementation(table => {
      const data = table === 'receitas' ? [recipe, cake] : [];
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
    expect(screen.queryByLabelText(/Estoque mínimo/)).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Dados da receita selecionada' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Adicionar à Geladeira' })).toBeDisabled();
    fireEvent.keyDown(selector,{key:'Enter'});
    const search = await screen.findByRole('textbox', { name: 'Buscar receita' });
    fireEvent.change(search, { target: { value: '1' } });
    const recipeOption = await screen.findByRole('option',{name:/Recheio de Ninho/});
    expect(recipeOption.querySelector('img')).toHaveAttribute('src', '/recheio.jpg');
    fireEvent.keyDown(recipeOption,{key:'Enter'});
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    const details = within(screen.getByRole('region', { name: 'Dados da receita selecionada' }));
    expect(details.getByRole('img', { name: 'Recheio de Ninho' })).toHaveAttribute('src', '/recheio.jpg');
    expect(details.getByText(/Sub-receita/)).toBeInTheDocument();
    expect(details.getByText('2 kg')).toBeInTheDocument();
    expect(details.getByText('Custo por kg')).toBeInTheDocument();
    expect(details.getByText(/25,00/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Quantidade (kg)')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Estoque mínimo (kg)'), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText('Saldo inicial (kg)'), { target: { value: '1,25' } });
    expect((screen.getByLabelText('Valor total em estoque') as HTMLInputElement).value).toMatch(/31,25/);
    expect(mocks.rpc).not.toHaveBeenCalled();
    fireEvent.keyDown(selector, { key: 'Enter' });
    fireEvent.change(await screen.findByRole('textbox', { name: 'Buscar receita' }), { target: { value: 'nuvem' } });
    const cakeOption = await screen.findByRole('option', { name: /Bolo Nuvem/ });
    expect(cakeOption.querySelector('img')).toBeNull();
    fireEvent.keyDown(cakeOption, { key: 'Enter' });
    const newDetails = within(screen.getByRole('region', { name: 'Dados da receita selecionada' }));
    expect(newDetails.getByRole('heading', { name: 'Bolo Nuvem' })).toBeInTheDocument();
    expect(newDetails.queryByRole('img')).not.toBeInTheDocument();
    expect(newDetails.getByText(/Receita final/)).toBeInTheDocument();
    expect(newDetails.getByText('10 un')).toBeInTheDocument();
    expect(newDetails.getByText('Custo por un')).toBeInTheDocument();
    expect(newDetails.getByText(/5,00/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Estoque mínimo (kg)')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Estoque mínimo (un)')).toHaveValue('');
    expect(screen.getByLabelText('Estoque mínimo (un)')).toHaveAttribute('placeholder', '');
    expect(screen.getByLabelText('Saldo inicial (un)')).toHaveValue('');
    expect(screen.getByLabelText('Valor total em estoque')).toHaveValue('');
    fireEvent.click(screen.getByRole('button',{name:'Adicionar à Geladeira'}));
    await waitFor(()=>expect(mocks.rpc).toHaveBeenCalledWith('cadastrar_item_geladeira',{p_receita_id:'r2',p_estoque_minimo:0}));
    await waitFor(()=>expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
  it('calculates the initial stock value and keeps one request across a failed save and retry', async () => {
    mocks.from.mockImplementation(table => {
      const data = table === 'receitas' ? [recipe] : [];
      const query = { select:()=>query,eq:()=>query,order:()=>query,range:()=>query,abortSignal:()=>query,
        then:(resolve: (r:unknown)=>unknown) => Promise.resolve({ data, count:data.length, error:null }).then(resolve) };
      return query;
    });
    mocks.rpc.mockResolvedValueOnce({data:null,error:{message:'Falha na conexão'}}).mockResolvedValueOnce({data:'event',error:null});
    render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><BrowserRouter><Geladeira /></BrowserRouter></QueryClientProvider>);
    await screen.findByText('Sua Geladeira está vazia');
    fireEvent.click(screen.getAllByRole('button',{name:'Adicionar receita'})[0]);
    const selector=await screen.findByRole('combobox',{name:'Selecionar receita'});
    await waitFor(()=>expect(selector).not.toBeDisabled());
    fireEvent.keyDown(selector,{key:'Enter'});
    fireEvent.keyDown(await screen.findByRole('option',{name:/Recheio de Ninho/}),{key:'Enter'});
    const quantity=screen.getByLabelText('Saldo inicial (kg)'), total=screen.getByLabelText('Valor total em estoque');
    expect(quantity).toHaveValue('');
    expect(quantity).toHaveAttribute('placeholder','');
    expect(total).toHaveAttribute('readonly');
    fireEvent.change(quantity,{target:{value:'1,25'}});
    expect((total as HTMLInputElement).value).toMatch(/31,25/);
    fireEvent.change(quantity,{target:{value:''}});
    expect(total).toHaveValue('');
    fireEvent.change(quantity,{target:{value:'2,5'}});
    expect((total as HTMLInputElement).value).toMatch(/62,50/);
    fireEvent.change(screen.getByLabelText('Estoque mínimo (kg)'),{target:{value:'1'}});
    const submit=screen.getByRole('button',{name:'Adicionar à Geladeira'});
    fireEvent.click(submit);
    await screen.findByRole('alert');
    expect(mocks.rpc).toHaveBeenCalledWith('cadastrar_item_geladeira_com_saldo',{p_receita_id:'r1',p_saldo_inicial:2.5,p_estoque_minimo:1,p_request_id:expect.any(String)});
    expect(quantity).toHaveValue('2,5');
    fireEvent.click(submit);
    await waitFor(()=>expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(mocks.rpc).toHaveBeenCalledTimes(2);
    expect(mocks.rpc.mock.calls[1]).toEqual(mocks.rpc.mock.calls[0]);
  });
});
