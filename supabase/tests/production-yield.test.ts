import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { beforeAll, beforeEach, afterAll, it, expect } from 'vitest';
const id=(n:number)=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const owner=id(1),other=id(2),recipe=id(10),employee=id(20),task=id(30),link=id(40);
let db:PGlite;
type Task={id:string;status:string;updated_at:string;rendimento_previsto:number|null;rendimento_real:number|null;rendimento_unidade:string|null;receita_nome:string|null};
async function current(key=task){return (await db.query<{data:Task}>('select to_jsonb(t) as data from producao_tarefas t where id=$1',[key])).rows[0].data;}
async function move(status:string,real:number|null=null,version?:string,key=task){return (await db.query<{data:Task}>('select mover_tarefa_producao($1,$2::producao_status,$3::timestamptz,$4) as data',[key,status,version??(await current(key)).updated_at,real])).rows[0].data;}
beforeAll(async()=>{
  db=new PGlite();
  await db.exec(`create role authenticated; create role anon; create role service_role;
    create schema auth; create schema private;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create function private.can_use_app() returns boolean language sql stable as $$ select coalesce(nullif(current_setting('test.access',true),'')::boolean,true) $$;
    create function private.account_access(uuid) returns jsonb language sql stable as $$ select jsonb_build_object('can_access',private.can_use_app()) $$;
    create function public.update_updated_at_column() returns trigger language plpgsql as $$ begin new.updated_at=clock_timestamp();return new;end $$;
    create table receitas(id uuid primary key,user_id uuid,nome text,rendimento_valor numeric,rendimento_unidade text);
    create table folha_pagamento(id uuid primary key,user_id uuid,nome text);
    create table producao_areas(id uuid primary key,user_id uuid,ativo boolean);
    create table producao_tarefas_recorrentes(id uuid primary key,user_id uuid,area_id uuid,titulo text,receita_id uuid,quantidade numeric,funcionario_id uuid,dias_semana integer[],hora_inicio time,hora_fim time,data_inicio date,data_fim date,observacoes text,ativo boolean default true,created_at timestamptz default now());
    create table producao_links_compartilhados(id uuid primary key,user_id uuid,data_producao date,expira_em timestamptz,revogado_em timestamptz);
    grant usage on schema public,auth,private to authenticated,anon,service_role;`);
  await db.exec(readFileSync('supabase/migrations/20260719163553_9c5012ef-52f5-421b-ad3d-b5ac39ece0a3.sql','utf8'));
  await db.exec(`alter table producao_tarefas add column area_id uuid,add column recorrente_id uuid,add column inicio_previsto timestamptz,add column fim_previsto timestamptz;
    alter table producao_tarefas_historico add column origem text default 'app';
    grant select on receitas to authenticated;
    create function fail_history() returns trigger language plpgsql as $$ begin if current_setting('test.fail_history',true)='true' then raise exception 'history failure' using errcode='23514';end if;return new;end $$;
    create trigger fail_history before insert on producao_tarefas_historico for each row execute function fail_history();`);
  await db.exec(readFileSync('supabase/migrations/20261111180000_rendimento_producao.sql','utf8'));
},30000);
afterAll(async()=>{await db.close();});
beforeEach(async()=>{
  await db.exec(`reset role;select set_config('test.fail_history','false',false),set_config('test.access','true',false);
    truncate producao_tarefas,receitas,folha_pagamento,producao_links_compartilhados,producao_tarefas_recorrentes cascade;
    insert into receitas values('${recipe}','${owner}','Massa de cenoura',12,'un'),('${id(11)}','${other}','Outra receita',5,'kg');
    insert into folha_pagamento values('${employee}','${owner}','Ana');
    insert into producao_tarefas(id,user_id,data_producao,titulo,receita_id,quantidade,funcionario_id) values
      ('${task}','${owner}','2026-11-11','Assar bolos','${recipe}',6,'${employee}');
    insert into producao_links_compartilhados values('${link}','${owner}','2026-11-11',now()+interval '1 day',null);
    set role authenticated;select set_config('request.jwt.claim.sub','${owner}',false);`);
});
it('captures yield times batches and preserves the plan after a recipe edit',async()=>{
  expect(await current()).toMatchObject({rendimento_previsto:72,rendimento_real:null,rendimento_unidade:'un',receita_nome:'Massa de cenoura'});
  await db.exec(`reset role;update receitas set rendimento_valor=20 where id='${recipe}';set role authenticated;`);
  await move('em_producao');expect((await current()).rendimento_previsto).toBe(72);
});
it('requires actual yield, accepts explicit zero and records status/history atomically',async()=>{
  await move('em_producao');const before=await current();
  await expect(move('feito')).rejects.toMatchObject({code:'22023'});expect(await current()).toEqual(before);
  const done=await move('feito',0);expect(done.rendimento_real).toBe(0);expect(done.status).toBe('feito');
  expect((await db.query('select rendimento_real::float as real from producao_tarefas_historico where para_status=$1',['feito'])).rows).toEqual([{real:0}]);
});
it.each([-1,1.1234,1e12])('rejects invalid actual yield %s without completing',async real=>{
  const before=await current();await expect(move('feito',real)).rejects.toMatchObject({code:'22023'});expect(await current()).toEqual(before);
});
it('rolls back the completion if recording history fails',async()=>{
  const before=await current();await db.query("select set_config('test.fail_history','true',false)");
  await expect(move('feito',70)).rejects.toMatchObject({code:'23514'});expect(await current()).toEqual(before);
});
it('rejects stale edits and acknowledges a repeated successful completion once',async()=>{
  const before=await current();await move('em_producao');
  await expect(move('feito',70,before.updated_at)).rejects.toMatchObject({code:'40001'});
  const running=await current();await move('feito',70,running.updated_at);await move('feito',70,running.updated_at);
  expect((await db.query('select id from producao_tarefas_historico where para_status=$1',['feito'])).rows).toHaveLength(1);
});
it('reopening clears actual yield on the task but preserves the completed historical record',async()=>{
  await move('feito',70);await move('em_producao');expect((await current()).rendimento_real).toBeNull();
  expect((await db.query('select rendimento_real::float as real from producao_tarefas_historico where para_status=$1',['feito'])).rows).toEqual([{real:70}]);
});
it('does not fabricate actual yield for historical completed tasks',async()=>{
  await db.exec(`reset role;update producao_tarefas set status='feito',rendimento_previsto=null,rendimento_real=null where id='${task}';set role authenticated;`);
  expect((await current()).rendimento_real).toBeNull();expect((await current()).rendimento_previsto).toBeNull();
});
it('prevents another account and inactive accounts from moving a task',async()=>{
  const before=await current();await db.query("select set_config('request.jwt.claim.sub',$1,false)",[other]);
  await expect(move('feito',70,before.updated_at)).rejects.toMatchObject({code:'P0002'});
  await db.query("select set_config('request.jwt.claim.sub',$1,false),set_config('test.access','false',false)",[owner]);
  await expect(move('feito',70,before.updated_at)).rejects.toMatchObject({code:'42501'});
});
it('shared completion requires a valid link and explicit yield; app users cannot call the service entrypoint',async()=>{
  let before=await current();
  await expect(db.query('select avancar_producao_compartilhada($1,$2,$3,null)',[link,task,before.updated_at])).rejects.toMatchObject({code:'42501'});
  await db.exec('reset role;set role service_role');
  await db.query('select avancar_producao_compartilhada($1,$2,$3,null)',[link,task,before.updated_at]);before=await current();
  await expect(db.query('select avancar_producao_compartilhada($1,$2,$3,null)',[link,task,before.updated_at])).rejects.toMatchObject({code:'22023'});
  await db.query('select avancar_producao_compartilhada($1,$2,$3,71)',[link,task,before.updated_at]);
  expect((await current()).rendimento_real).toBe(71);
  await db.exec(`reset role;update producao_links_compartilhados set revogado_em=now();set role service_role;`);
  await expect(db.query('select avancar_producao_compartilhada($1,$2,$3,71)',[link,task,before.updated_at])).rejects.toMatchObject({code:'42501'});
});
it('materializes each recurrence once with its planned yield and creation history',async()=>{
  await db.exec(`reset role;insert into producao_tarefas_recorrentes(id,user_id,titulo,receita_id,quantidade,funcionario_id,dias_semana,hora_inicio,hora_fim) values('${id(50)}','${owner}','Receita da quarta','${recipe}',2,'${employee}',array[3],'22:00','02:00');set role authenticated;`);
  const run=()=>db.query<{n:number}>("select materializar_cronograma_producao('2026-11-11','America/Sao_Paulo') as n");
  expect((await run()).rows[0].n).toBe(1);expect((await run()).rows[0].n).toBe(0);
  expect((await db.query('select rendimento_previsto::float as previsto,extract(epoch from (fim_previsto-inicio_previsto))/3600 as horas from producao_tarefas where recorrente_id=$1',[id(50)])).rows).toEqual([{previsto:24,horas:'4.0000000000000000'}]);
});
