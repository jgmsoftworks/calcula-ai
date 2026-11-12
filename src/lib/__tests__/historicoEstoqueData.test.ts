import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchHistoricoEstoque, normalizarMovimentacaoGeladeira } from '../historicoEstoqueData';
const mocks=vi.hoisted(()=>({from:vi.fn(),gte:vi.fn(),lte:vi.fn()}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{from:mocks.from}}));
const frozen: Parameters<typeof normalizarMovimentacaoGeladeira>[0]={id:'f',user_id:'owner',receita_id:'r',saldo_anterior:2,saldo_atual:1.5,observacao:null,request_id:'req',solicitacao:{},comprovante_id:'c',item_id:'i',receita_nome:'Recheio',created_at:'2026-11-11T12:00:00Z',tipo:'saida',quantidade:-0.5,custo_unitario:20,unidade:'kg',motivo:'Perda - Vencimento',responsavel:'Maria',comprovantes:{numero:5}};
beforeEach(()=>{
 vi.clearAllMocks();mocks.from.mockImplementation(table=>{
  const data=table==='movimentacoes'?[{id:'p',data_hora:'2026-11-10T12:00:00Z',tipo:'entrada',responsavel:'João'}]:[frozen];
  const q={select:()=>q,neq:()=>q,eq:()=>q,order:()=>q,range:()=>q,gt:()=>q,lt:()=>q,
   gte:(...args:unknown[])=>{mocks.gte(...args);return q},lte:(...args:unknown[])=>{mocks.lte(...args);return q},
   then:(resolve:(v:unknown)=>unknown)=>Promise.resolve({data,error:null}).then(resolve)};return q;
 });
});
describe('Unified stock history',()=>{
 it('merges both ledgers by time and displays signed freezer withdrawals as positive quantities',async()=>{
  const rows=await fetchHistoricoEstoque('owner');
  expect(rows.map(row=>row.id)).toEqual(['f','p']);
  expect(rows[0]).toMatchObject({quantidade:0.5,subtotal:10,tipo:'saida',origem:'Geladeira',unidade:'kg',produtos:{nome:'Recheio'},comprovantes:{numero:5}});
 });
 it('uses the whole business-local date range, supports source and responsible filters',async()=>{
  const rows=await fetchHistoricoEstoque('owner',{origemEstoque:'geladeira',dataInicio:'2026-11-11',dataFim:'2026-11-11',responsavel:'maria'});
  expect(mocks.from).toHaveBeenCalledTimes(1);
  expect(mocks.gte).toHaveBeenCalledWith('created_at','2026-11-11T03:00:00.000Z');
  expect(mocks.lte).toHaveBeenCalledWith('created_at','2026-11-12T02:59:59.999Z');
  expect(rows).toHaveLength(1);
 });
 it('preserves historical names and unknown cost instead of fabricating zero',()=>{
  expect(normalizarMovimentacaoGeladeira({...frozen,item_id:null,receita_id:null,custo_unitario:null})).toMatchObject({produtos:{nome:'Recheio'},subtotal:null,custo_aplicado:null});
 });
 it.each(['produto', 'geladeira'] as const)('reads every page and retains filters for %s', async origemEstoque => {
  const eq = vi.fn();
  const range = vi.fn();
  const lt = vi.fn();
  const gte = vi.fn();
  const lte = vi.fn();
  const source = origemEstoque === 'geladeira' ? 'geladeira_movimentacoes' : 'movimentacoes';
  const timeColumn = origemEstoque === 'geladeira' ? 'created_at' : 'data_hora';
  const itemColumn = origemEstoque === 'geladeira' ? 'item_id' : 'produto_id';
  mocks.from.mockImplementation(() => {
   let start = 0;
   let end = 0;
   const rows = Array.from({ length: 501 }, (_, index) => ({
    ...frozen, id: String(index).padStart(3, '0'), data_hora: frozen.created_at,
   }));
   const q = {
    select: () => q, neq: () => q, order: () => q,
    eq: (...args: unknown[]) => { eq(...args); return q; },
    lt: (...args: unknown[]) => { lt(...args); return q; },
    gte: (...args: unknown[]) => { gte(...args); return q; },
    lte: (...args: unknown[]) => { lte(...args); return q; },
    range: (from: number, to: number) => { start = from; end = to; range(from, to); return q; },
    then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: rows.slice(start, end + 1), error: null }).then(resolve),
   };
   return q;
  });
  const rows = await fetchHistoricoEstoque('owner', {
   origemEstoque, tipo: 'saida', produtoId: 'item', comprovanteId: 'receipt',
   dataInicio: '2026-11-11', dataFim: '2026-11-11',
  });
  expect(rows).toHaveLength(501);
  expect(new Set(rows.map(row => row.id)).size).toBe(501);
  expect(mocks.from.mock.calls).toEqual([[source], [source]]);
  expect(range.mock.calls).toEqual([[0, 499], [500, 999]]);
  expect(eq.mock.calls.filter(([column]) => column === 'user_id')).toEqual([['user_id', 'owner'], ['user_id', 'owner']]);
  expect(eq).toHaveBeenCalledWith(itemColumn, 'item');
  expect(eq).toHaveBeenCalledWith('comprovante_id', 'receipt');
  expect(gte).toHaveBeenCalledWith(timeColumn, '2026-11-11T03:00:00.000Z');
  expect(lte).toHaveBeenCalledWith(timeColumn, '2026-11-12T02:59:59.999Z');
  if (origemEstoque === 'geladeira') expect(lt.mock.calls).toEqual([['quantidade', 0], ['quantidade', 0]]);
  else expect(eq).toHaveBeenCalledWith('tipo', 'saida');
 });
 it('propagates source failures instead of returning an incomplete report', async () => {
  const failure = new Error('source unavailable');
  mocks.from.mockImplementation(() => {
   const q = { select: () => q, neq: () => q, eq: () => q, order: () => q, range: () => q,
    then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: null, error: failure }).then(resolve) };
   return q;
  });
  await expect(fetchHistoricoEstoque('owner')).rejects.toBe(failure);
 });
});
