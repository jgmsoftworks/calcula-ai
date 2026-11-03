// Real form, ingredient inputs and hook; RPC responses are controlled in memory.
// Transaction semantics and RLS are exercised separately against PostgreSQL.
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReceitaForm } from '@/components/receitas/ReceitaForm';

const m = vi.hoisted(() => ({
  from: vi.fn(), rpc: vi.fn(), success: vi.fn(), error: vi.fn(), close: vi.fn(),
  requestAccess: vi.fn(), user: { id: 'synthetic-owner' }, track: vi.fn(),
}));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: m.from, rpc: m.rpc } }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: m.user }) }));
vi.mock('@/contexts/PlanLimitContext', () => ({ usePlanGate: () => ({ requestAccess: m.requestAccess }) }));
vi.mock('sonner', () => ({ toast: { success: m.success, error: m.error } }));
vi.mock('@/lib/funnel-analytics', () => ({ trackRecipeCreated: m.track }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (s: string) => s }) }));
vi.mock('@/components/receitas/GeralTab', () => ({
  GeralTab: ({formData,onFormChange}: any) => <label>Nome<input value={formData.nome} onChange={e=>onFormChange('nome',e.target.value)} /></label>,
}));
vi.mock('@/components/receitas/SubReceitasTab', () => ({ SubReceitasTab: () => <div>Sub</div> }));
vi.mock('@/components/receitas/EmbalagensTa', () => ({ EmbalagensTa: () => <div>Embalagens</div> }));
vi.mock('@/components/receitas/ProjecaoTab', () => ({ ProjecaoTab: () => <div>Projeção</div> }));
vi.mock('@/components/receitas/PrecificacaoTab', () => ({ PrecificacaoTab: () => <div>Precificação</div> }));

const produto = { user_id:m.user.id,id:'chocolate',nome:'Chocolate sintético',custo_unitario:40,unidade_compra:'kg',unidade_uso:'g',fator_conversao:1000,ativo:true };
const otherProduto = {...produto,id:'cacau',nome:'Cacau sintético'};
const ingredient = {id:'ingredient-1',receita_id:'recipe-1',produto_id:produto.id,quantidade:100,produto};
const recipe = {
  id:'recipe-1',user_id:m.user.id,numero_sequencial:1,nome:'Bolo sintético',rendimento_valor:10,
  rendimento_unidade:'un',tempo_preparo_total:30,tempo_preparo_mao_obra:0,conservacao:null,
  observacoes:null,imagem_url:null,markup_id:null,preco_venda:40,status:'finalizada',peso_unitario:100,
  created_at:'2026-11-01T00:00:00Z',updated_at:'2026-11-01T00:00:00Z',embalagens:[],sub_receitas:[],passos:[],mao_obra:[],ingredientes:[ingredient],
};
beforeEach(() => {
  vi.clearAllMocks();
  m.requestAccess.mockResolvedValue(true);
  m.rpc.mockImplementation(async (_name, request) => ({
    data: {id:request.p_receita_id,numero_sequencial:1,updated_at:'2026-11-03T00:00:00Z'}, error:null,
  }));
  m.from.mockImplementation(table => {
    const data = table === 'produtos' ? [produto,otherProduto] : [];
    const query = {
      select:()=>query, eq:()=>query, order:()=>query,
      maybeSingle:async()=>({data:null,error:null}),
      then:(resolve:any)=>Promise.resolve({data,error:null}).then(resolve),
    };
    return query;
  });
});
afterEach(cleanup);
function open(create=false) {
  return render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}>
    <ReceitaForm receita={create?null:structuredClone(recipe) as any} onClose={m.close}/>
  </QueryClientProvider>);
}
async function changeIngredient() {
  open();
  await waitFor(()=>expect(screen.getByLabelText('Nome')).toHaveValue('Bolo sintético'));
  fireEvent.change(screen.getByLabelText('Nome'),{target:{value:'Bolo alterado'}});
  fireEvent.click(screen.getByRole('button',{name:'Próximo'}));
  const quantities=await screen.findAllByDisplayValue('100');
  fireEvent.change(quantities[0],{target:{value:'200'}});
  await waitFor(()=>expect(screen.getAllByDisplayValue('200').length).toBeGreaterThan(0));
}
async function save(fromStep=1,create=false) {
  for(let i=fromStep;i<5;i++) fireEvent.click(screen.getByRole('button',{name:'Próximo'}));
  fireEvent.click(screen.getByRole('button',{name:create?'Criar':'Atualizar'}));
  await waitFor(()=>expect(screen.getByRole('button',{name:create?'Criar':'Atualizar'})).toBeEnabled());
}
describe('Atomic save feedback and retries',()=>{
  it('sends one complete RPC and only then reports success',async()=>{
    await changeIngredient(); await save();
    expect(m.rpc).toHaveBeenCalledTimes(1);
    expect(m.rpc).toHaveBeenCalledWith('salvar_receita_completa',expect.objectContaining({
      p_receita_id:'recipe-1',p_criar:false,p_expected_updated_at:recipe.updated_at,
      p_receita:expect.objectContaining({nome:'Bolo alterado'}),
      p_componentes:expect.objectContaining({ingredientes:[{id:'ingredient-1',produto_id:'chocolate',quantidade:200}]}),
    }));
    expect(m.success).toHaveBeenCalledTimes(1);expect(m.close).toHaveBeenCalledTimes(1);
    expect(m.error).not.toHaveBeenCalled();
  });
  it.each(['42501','23503','23514'])('retains entered fields and stays open on returned error %s',async code=>{
    m.rpc.mockResolvedValue({data:null,error:{code,message:'Synthetic rejected transaction'}});
    await changeIngredient();await save();
    expect(m.success).not.toHaveBeenCalled();expect(m.close).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Suas alterações continuam aqui');
    for(let i=0;i<4;i++) fireEvent.click(screen.getByRole('button',{name:'Etapa anterior'}));
    expect(screen.getAllByDisplayValue('200').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button',{name:'Etapa anterior'}));
    expect(screen.getByLabelText('Nome')).toHaveValue('Bolo alterado');
  });
  it('does not show success or accept a second click while the RPC is pending',async()=>{
    let finish!: (value:any)=>void;
    m.rpc.mockReturnValue(new Promise(resolve=>{finish=resolve;}));
    await changeIngredient();
    for(let i=1;i<5;i++) fireEvent.click(screen.getByRole('button',{name:'Próximo'}));
    const button=screen.getByRole('button',{name:'Atualizar'});
    fireEvent.click(button);fireEvent.click(button);
    expect(m.rpc).toHaveBeenCalledTimes(1);expect(m.success).not.toHaveBeenCalled();expect(m.close).not.toHaveBeenCalled();
    finish({data:{id:'recipe-1',numero_sequencial:1,updated_at:'2026-11-03T00:00:00Z'},error:null});
    await waitFor(()=>expect(m.close).toHaveBeenCalledTimes(1));
  });
  it('reuses the recipe and request IDs after an ambiguous network failure, including creation',async()=>{
    m.rpc.mockResolvedValueOnce({data:null,error:{message:'Failed to fetch'}});
    open(true);fireEvent.change(screen.getByLabelText('Nome'),{target:{value:'Bolo novo'}});
    await save(0,true);
    const first=m.rpc.mock.calls[0][1];
    expect(m.track).not.toHaveBeenCalled();expect(m.close).not.toHaveBeenCalled();expect(m.success).not.toHaveBeenCalled();
    await save(5,true);
    expect(m.rpc.mock.calls[1][1]).toEqual(first);
    expect(m.success).toHaveBeenCalledTimes(1);expect(m.close).toHaveBeenCalledTimes(1);expect(m.track).toHaveBeenCalledTimes(1);
  });
  it('uses a new request ID if the user changes data after a failure, keeping the same recipe ID',async()=>{
    m.rpc.mockRejectedValueOnce(new TypeError('Network failure'));
    open(true);fireEvent.change(screen.getByLabelText('Nome'),{target:{value:'Antes'}});
    await save(0,true);const first=m.rpc.mock.calls[0][1];
    for(let i=0;i<5;i++) fireEvent.click(screen.getByRole('button',{name:'Etapa anterior'}));
    fireEvent.change(screen.getByLabelText('Nome'),{target:{value:'Depois'}});
    await save(0,true);const second=m.rpc.mock.calls[1][1];
    expect(second.p_receita_id).toBe(first.p_receita_id);expect(second.p_request_id).not.toBe(first.p_request_id);
    expect(second.p_receita.nome).toBe('Depois');
  });
  it('shows the plan-limit dialog on server rejection without closing the form',async()=>{
    m.rpc.mockResolvedValue({data:null,error:{code:'23514',message:'Você atingiu o limite do seu plano.'}});
    open(true);fireEvent.change(screen.getByLabelText('Nome'),{target:{value:'Sexta'}});
    await save(0,true);
    expect(m.requestAccess).toHaveBeenCalledWith('receitas');expect(m.close).not.toHaveBeenCalled();expect(m.success).not.toHaveBeenCalled();
  });
  it('explains a stale edit and rejects missing success confirmation',async()=>{
    m.rpc.mockResolvedValueOnce({data:null,error:{code:'40001'}});
    await changeIngredient();await save();
    expect(screen.getByRole('alert')).toHaveTextContent('mudou desde que você abriu');
    m.rpc.mockResolvedValueOnce({data:null,error:null});await save(5);
    expect(m.success).not.toHaveBeenCalled();expect(m.close).not.toHaveBeenCalled();
  });
});
