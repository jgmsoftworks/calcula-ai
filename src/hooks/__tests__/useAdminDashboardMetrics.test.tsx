import React from 'react';
import { renderHook, waitFor, cleanup, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, it, expect, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ admin: true, userId:'admin-a', invoke:vi.fn(), from:vi.fn(), rpc:vi.fn() }));
vi.mock('../useAuth', () => ({ useAuth: () => ({ isAdmin:mocks.admin, user:{id:mocks.userId} }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {from:mocks.from,rpc:mocks.rpc,functions:{invoke:mocks.invoke}} }));
import { useAdminDashboardMetrics } from '../useAdminDashboardMetrics';
const clients: QueryClient[] = [];
function setup() {
  const client = new QueryClient({ defaultOptions:{queries:{retry:false,retryDelay:0}} }); clients.push(client);
  mocks.from.mockImplementation((table:string) => {
    const result = { data:table==='profiles'?Array.from({length:10},(_,i)=>({user_id:String(i),plan:'professional',created_at:'2026-10-01'})):[],error:null,count:0 };
    return {select:()=>({eq:()=>Promise.resolve(result),then:(resolve:Function)=>Promise.resolve(result).then(resolve as never)})};
  });
  mocks.rpc.mockResolvedValue({data:[],error:null});
  return ({children}:{children:React.ReactNode})=><QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
afterEach(()=>{cleanup();clients.splice(0).forEach(c=>c.clear());vi.resetAllMocks();mocks.admin=true;mocks.userId='admin-a';});
it('does not infer revenue from ten professional profiles',async()=>{
  const report={current:{financial:{currencies:[{currency:'brl',mrr:89.7}]}},legacy:null};mocks.invoke.mockResolvedValue({data:report,error:null});
  const {result}=renderHook(()=>useAdminDashboardMetrics(),{wrapper:setup()});
  await waitFor(()=>expect(result.current.metrics.loading).toBe(false));
  expect(result.current.metrics.totalCadastros).toBe(10);
  expect(result.current.metrics.financial).toEqual(report);
});
it('does not request financial information for a non-admin',()=>{
  mocks.admin=false;renderHook(()=>useAdminDashboardMetrics(),{wrapper:setup()});expect(mocks.invoke).not.toHaveBeenCalled();
});
it('clears stale financial values when a refresh fails',async()=>{
  mocks.invoke.mockResolvedValue({data:{current:{financial:{currencies:[{currency:'brl',mrr:89.7}]}}},error:null});
  const {result}=renderHook(()=>useAdminDashboardMetrics(),{wrapper:setup()});
  await waitFor(()=>expect(result.current.metrics.financial).not.toBeNull());
  mocks.invoke.mockResolvedValue({data:null,error:new Error('timeout')});
  await act(async()=>{await result.current.refreshMetrics();});
  await waitFor(()=>expect(result.current.metrics.financialError).not.toBeNull());
  expect(result.current.metrics.financial).toBeNull();
});
