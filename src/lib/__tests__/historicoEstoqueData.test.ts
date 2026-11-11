import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchHistoricoEstoque, normalizarMovimentacaoGeladeira } from '../historicoEstoqueData';
const mocks=vi.hoisted(()=>({from:vi.fn(),gte:vi.fn(),lte:vi.fn()}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{from:mocks.from}}));
const frozen:any={id:'f',item_id:'i',receita_nome:'Recheio',created_at:'2026-11-11T12:00:00Z',tipo:'saida',quantidade:-0.5,custo_unitario:20,unidade:'kg',motivo:'Perda - Vencimento',responsavel:'Maria',comprovantes:{numero:5}};
beforeEach(()=>{
 vi.clearAllMocks();mocks.from.mockImplementation(table=>{
  const data=table==='movimentacoes'?[{id:'p',data_hora:'2026-11-10T12:00:00Z',tipo:'entrada',responsavel:'João'}]:[frozen];
  const q={select:()=>q,neq:()=>q,eq:()=>q,order:()=>q,range:()=>q,gt:()=>q,lt:()=>q,
   gte:(...args:any[])=>{mocks.gte(...args);return q},lte:(...args:any[])=>{mocks.lte(...args);return q},
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
});
