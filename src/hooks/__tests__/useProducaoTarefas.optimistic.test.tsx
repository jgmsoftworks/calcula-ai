import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useProducaoTarefas, type ProducaoTarefa } from '../useProducaoTarefas';

const mocks=vi.hoisted(()=>({rpc:vi.fn(),read:vi.fn()}));
vi.mock('@/hooks/useAuth',()=>({useAuth:()=>({user:{id:'fixture-user'}})}));
vi.mock('@/hooks/use-toast',()=>({toast:vi.fn()}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{rpc:mocks.rpc,from:()=>{
  const query={select:()=>query,eq:()=>query,order:()=>query,range:mocks.read};return query;
},channel:()=>{const channel={on:()=>channel,subscribe:()=>channel};return channel;},removeChannel:vi.fn()}}));
const task=(id:string)=>({id,titulo:id,status:'a_fazer',updated_at:'2026-11-11T12:00:00Z'} as ProducaoTarefa);
function deferred<T>(){let resolve!:(value:T)=>void;const promise=new Promise<T>(r=>{resolve=r;});return {promise,resolve};}
let rows:ProducaoTarefa[];
beforeEach(()=>{vi.clearAllMocks();rows=[task('one'),task('two')];mocks.read.mockImplementation(()=>Promise.resolve({data:rows,error:null}));});
afterEach(cleanup);
async function setup(){
  const client=new QueryClient({defaultOptions:{queries:{retry:false,gcTime:0}}});
  const wrapper=({children}:{children:ReactNode})=><QueryClientProvider client={client}>{children}</QueryClientProvider>;
  const view=renderHook(()=>useProducaoTarefas('2026-11-11'),{wrapper});
  await waitFor(()=>expect(view.result.current.data).toHaveLength(2));return {...view,client};
}
it('moves immediately, stays at the destination through a stale refresh, and settles once',async()=>{
  const gate=deferred<{data:ProducaoTarefa;error:null}>();mocks.rpc.mockReturnValue(gate.promise);
  const {result}=await setup();let saving!:Promise<ProducaoTarefa>;
  act(()=>{saving=result.current.mover(rows[0],'em_producao');});
  expect(result.current.data?.[0].status).toBe('em_producao');expect(result.current.pendingIds.has('one')).toBe(true);
  await act(async()=>{await result.current.refetch();});expect(result.current.data?.[0].status).toBe('em_producao');
  rows=[{...rows[0],status:'em_producao',updated_at:'2026-11-11T12:01:00Z'},rows[1]];
  await act(async()=>{gate.resolve({data:rows[0],error:null});await saving;});
  expect(result.current.data?.[0].status).toBe('em_producao');expect(result.current.pendingIds.size).toBe(0);expect(mocks.rpc).toHaveBeenCalledOnce();
});
it('rolls back only the failed task while another move remains in flight',async()=>{
  const failed=deferred<{data:null;error:Error}>(),successful=deferred<{data:ProducaoTarefa;error:null}>();
  mocks.rpc.mockReturnValueOnce(failed.promise).mockReturnValueOnce(successful.promise);
  const {result}=await setup();let first!:Promise<unknown>,second!:Promise<unknown>;
  act(()=>{first=result.current.mover(rows[0],'em_producao').catch(error=>error);second=result.current.mover(rows[1],'em_producao');});
  expect(result.current.data?.map(t=>t.status)).toEqual(['em_producao','em_producao']);
  await act(async()=>{failed.resolve({data:null,error:new Error('Falha ao salvar')});await first;});
  expect(result.current.data?.map(t=>t.status)).toEqual(['a_fazer','em_producao']);
  rows=[rows[0],{...rows[1],status:'em_producao'}];
  await act(async()=>{successful.resolve({data:rows[1],error:null});await second;});
  expect(result.current.data?.map(t=>t.status)).toEqual(['a_fazer','em_producao']);
});
it('shows the new order before saving and restores the order if the server rejects it',async()=>{
  const gate=deferred<{error:Error}>();mocks.rpc.mockReturnValue(gate.promise);
  const {result}=await setup();let saving!:Promise<unknown>;
  act(()=>{saving=result.current.reordenar('a_fazer',[rows[1],rows[0]]).catch(error=>error);});
  expect(result.current.data?.map(t=>t.id)).toEqual(['two','one']);
  await act(async()=>{gate.resolve({error:new Error('Conflito de versão')});await saving;});
  expect(result.current.data?.map(t=>t.id)).toEqual(['one','two']);expect(result.current.pendingIds.size).toBe(0);
});
