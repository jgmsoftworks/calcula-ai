import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { beforeAll, beforeEach, afterAll, it, expect } from 'vitest';
const id=(n:number)=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const owner=id(1),other=id(2),recipe=id(10),employee=id(20),task=id(30),link=id(40);
let db:PGlite;
let archivalProof:unknown;
let resetRepairProof:{task:Task;history:Record<string,unknown>};
type Task={iniciado_em:string|null;id:string;status:string;updated_at:string;rendimento_previsto:number|null;rendimento_real:number|null;rendimento_unidade:string|null;receita_nome:string|null;cancelado_em:string|null;duplicada_de:string|null;recorrente_id:string|null;ordem:number;tempo_producao_segundos:number|null};
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
    alter table producao_tarefas_historico add column origem text default 'app', add column evento_tipo text default 'status' check(evento_tipo in ('status','responsavel'));
    grant select on receitas to authenticated;
    create function fail_history() returns trigger language plpgsql as $$ begin if current_setting('test.fail_history',true)='true' then raise exception 'history failure' using errcode='23514';end if;return new;end $$;
    create trigger fail_history before insert on producao_tarefas_historico for each row execute function fail_history();`);
  await db.exec(readFileSync('supabase/migrations/20261111180000_rendimento_producao.sql','utf8'));
  await db.exec(`insert into folha_pagamento values('${employee}','${owner}','Ana');
    insert into producao_tarefas(id,user_id,data_producao,titulo,funcionario_id,recorrente_id,status) values
      ('${id(60)}','${owner}','2026-11-11','Duplicada','${employee}','${id(50)}','a_fazer'),
      ('${id(61)}','${owner}','2026-11-11','Duplicada','${employee}','${id(50)}','em_producao');
    update producao_tarefas set iniciado_em='2026-11-11T18:15:00Z',concluido_em='2026-11-11T18:20:00Z' where id='${id(60)}';
    insert into producao_tarefas_historico(user_id,tarefa_id,para_status) values('${owner}','${id(60)}','a_fazer');`);
  await db.exec(readFileSync('supabase/migrations/20261111193000_corrigir_kanban_producao.sql','utf8'));
  resetRepairProof={task:await current(id(60)),history:(await db.query<{detalhes:Record<string,unknown>}>("select detalhes from producao_tarefas_historico where evento_tipo='edicao'")).rows[0]?.detalhes};
  archivalProof=(await db.query(`select (select count(*)::int from producao_tarefas) total,
    (select count(*)::int from producao_tarefas where cancelado_em is null) active,
    (select count(*)::int from producao_tarefas_historico) history,
    (select duplicada_de::text from producao_tarefas where id='${id(60)}') principal`)).rows[0];

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
  await move('em_producao');const before=await current();await expect(move('feito',real)).rejects.toMatchObject({code:'22023'});expect(await current()).toEqual(before);
});
it('rolls back the completion if recording history fails',async()=>{
  await move('em_producao');const before=await current();await db.query("select set_config('test.fail_history','true',false)");
  await expect(move('feito',70)).rejects.toMatchObject({code:'23514'});expect(await current()).toEqual(before);
});
it('rejects stale edits and acknowledges a repeated successful completion once',async()=>{
  const before=await current();await move('em_producao');
  await expect(move('feito',70,before.updated_at)).rejects.toMatchObject({code:'40001'});
  const running=await current();await move('feito',70,running.updated_at);await move('feito',70,running.updated_at);
  expect((await db.query('select id from producao_tarefas_historico where para_status=$1',['feito'])).rows).toHaveLength(1);
});
it('reopening clears actual yield on the task but preserves the completed historical record',async()=>{
  await move('em_producao');await move('feito',70);await move('em_producao');expect((await current()).rendimento_real).toBeNull();
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
  await db.exec(`reset role;insert into producao_tarefas_recorrentes(id,user_id,titulo,receita_id,quantidade,funcionario_id,dias_semana,hora_inicio,hora_fim,data_inicio) values('${id(50)}','${owner}','Receita da quarta','${recipe}',2,'${employee}',array[3],'22:00','02:00','2026-11-11');set role authenticated;`);
  const run=()=>db.query<{n:number}>("select materializar_cronograma_producao('2026-11-11','America/Sao_Paulo') as n");
  expect((await run()).rows[0].n).toBe(1);expect((await run()).rows[0].n).toBe(0);
  expect((await db.query('select rendimento_previsto::float as previsto,extract(epoch from (fim_previsto-inicio_previsto))/3600 as horas from producao_tarefas where recorrente_id=$1',[id(50)])).rows).toEqual([{previsto:24,horas:'4.0000000000000000'}]);
});
const input={titulo:'Produzir bolo',funcionario_id:employee,receita_id:recipe,quantidade:2,area_id:null,observacoes:null,inicio_previsto:null,fim_previsto:null};
async function create(key=id(70),value=input){return(await db.query<{data:Task}>("select criar_tarefa_producao('2026-11-11',$1,$2::jsonb) data",[key,JSON.stringify(value)])).rows[0].data;}
async function cancel(key=task,restore=false){return(await db.query<{data:Task}>('select cancelar_tarefa_producao($1,$2,$3) data',[key,(await current(key)).updated_at,restore])).rows[0].data;}
it('archives duplicate executions without deleting either row or its historical events',()=>{
  expect(archivalProof).toEqual({total:2,active:1,history:3,principal:id(61)});
});
it('requires starting production before completion',async()=>{
  const before=await current();await expect(move('feito',50)).rejects.toMatchObject({code:'23514'});expect(await current()).toEqual(before);
});
it('creates task and history once despite a retry with the same request key',async()=>{
  const first=await create();const second=await create();expect(second.id).toBe(first.id);
  expect((await db.query('select id from producao_tarefas_historico where tarefa_id=$1',[first.id])).rows).toHaveLength(1);
});
it('rolls back creation when history fails and permits a safe retry',async()=>{
  await db.query("select set_config('test.fail_history','true',false)");await expect(create()).rejects.toMatchObject({code:'23514'});
  expect((await db.query('select id from producao_tarefas where criacao_chave=$1',[id(70)])).rows).toHaveLength(0);
  await db.query("select set_config('test.fail_history','false',false)");expect((await create()).rendimento_previsto).toBe(24);
});
it('blocks destructive deletion even for the owner and preserves all history',async()=>{
  await move('em_producao');await expect(db.query('delete from producao_tarefas where id=$1',[task])).rejects.toMatchObject({code:'42501'});
  expect((await db.query('select id from producao_tarefas_historico where tarefa_id=$1',[task])).rows).toHaveLength(1);
});
it('cancellation does not rematerialize a recurring execution and restoration preserves its identity',async()=>{
  await db.exec(`reset role;insert into producao_tarefas_recorrentes(id,user_id,titulo,funcionario_id,dias_semana,data_inicio) values('${id(50)}','${owner}','Quarta','${employee}',array[3],'2026-11-11');update producao_tarefas set recorrente_id='${id(50)}' where id='${task}';set role authenticated;`);
  const stopped=await cancel();expect(stopped.cancelado_em).not.toBeNull();
  expect((await db.query<{n:number}>("select materializar_cronograma_producao('2026-11-11') n")).rows[0].n).toBe(0);
  await expect(move('em_producao')).rejects.toMatchObject({code:'23514'});
  const restored=await cancel(task,true);expect(restored.cancelado_em).toBeNull();expect(restored.recorrente_id).toBe(id(50));
  expect((await db.query('select evento_tipo from producao_tarefas_historico where tarefa_id=$1 order by movido_em',[task])).rows).toEqual([{evento_tipo:'cancelamento'},{evento_tipo:'restauracao'}]);
});
it('requires reopening before canceling a completed task',async()=>{
  await move('em_producao');await move('feito',24);await expect(cancel()).rejects.toMatchObject({code:'23514'});
});
it('restores an archived duplicate as an independent task and keeps the link to its original',async()=>{
  await db.exec(`reset role;insert into producao_tarefas(id,user_id,data_producao,titulo,funcionario_id,recorrente_id,duplicada_de,cancelado_em) values('${id(60)}','${owner}','2026-11-11','Cópia','${employee}','${id(50)}','${task}',now());set role authenticated;`);
  expect(await cancel(id(60),true)).toMatchObject({cancelado_em:null,recorrente_id:null,duplicada_de:task});
});
it('does not create occurrences before the template creation day, respecting business timezone',async()=>{
  await db.exec(`reset role;insert into producao_tarefas_recorrentes(id,user_id,titulo,funcionario_id,dias_semana,created_at) values('${id(50)}','${owner}','Quarta','${employee}',array[3],'2026-11-12T01:00:00Z');set role authenticated;`);
  expect((await db.query<{n:number}>("select materializar_cronograma_producao('2026-11-04','America/Sao_Paulo') n")).rows[0].n).toBe(0);
  expect((await db.query<{n:number}>("select materializar_cronograma_producao('2026-11-11','America/Sao_Paulo') n")).rows[0].n).toBe(1);
});
it('prevents duplicate recurring executions at the database level',async()=>{
  await db.exec(`reset role;update producao_tarefas set recorrente_id='${id(50)}';set role authenticated;`);
  await expect(db.exec(`insert into producao_tarefas(user_id,data_producao,titulo,funcionario_id,recorrente_id) values('${owner}','2026-11-11','Cópia','${employee}','${id(50)}')`)).rejects.toMatchObject({code:'23505'});
});
it('edits the full task with concurrency checks and updates its planned yield',async()=>{
  const before=await current();const edited=(await db.query<{data:Task}>('select editar_tarefa_producao($1,$2,$3::jsonb) data',[task,before.updated_at,JSON.stringify({...input,quantidade:3})])).rows[0].data;
  expect(edited.rendimento_previsto).toBe(36);
  await expect(db.query('select editar_tarefa_producao($1,$2,$3::jsonb)',[task,before.updated_at,JSON.stringify(input)])).rejects.toMatchObject({code:'40001'});
  await move('em_producao');await expect(db.query('select editar_tarefa_producao($1,$2,$3::jsonb)',[task,(await current()).updated_at,JSON.stringify(input)])).rejects.toMatchObject({code:'23514'});
});
it('clears recipe snapshots when the recipe is unlinked before starting',async()=>{
  await db.query('select editar_tarefa_producao($1,$2,$3::jsonb)',[task,(await current()).updated_at,JSON.stringify({...input,receita_id:null,quantidade:null})]);
  expect(await current()).toMatchObject({receita_nome:null,rendimento_previsto:null,rendimento_unidade:null});
});
it('rejects creation linked to another account and malformed schedules',async()=>{
  await expect(create(id(70),{...input,receita_id:id(11)})).rejects.toMatchObject({code:'22023'});
  await expect(create(id(70),{...input,inicio_previsto:'2026-11-11T12:00:00Z',fim_previsto:'2026-11-11T11:00:00Z'})).rejects.toMatchObject({code:'22023'});
});
it('reorders the whole column and rejects stale or incomplete sets',async()=>{
  const second=await create();const first=await current();
  const reorder=(ids:string[],versions:Record<string,string>)=>db.query("select reordenar_tarefas_producao('2026-11-11','a_fazer',$1,$2::jsonb)",[ids,JSON.stringify(versions)]);
  await reorder([second.id,first.id],{[first.id]:first.updated_at,[second.id]:second.updated_at});
  expect((await db.query('select id from producao_tarefas order by ordem')).rows.map(r=>r.id)).toEqual([second.id,first.id]);
  await expect(reorder([first.id,second.id],{[first.id]:first.updated_at,[second.id]:second.updated_at})).rejects.toMatchObject({code:'40001'});
  await expect(reorder([first.id],{[first.id]:(await current()).updated_at,[second.id]:(await current(second.id)).updated_at})).rejects.toMatchObject({code:'40001'});
});
it('counts only active production segments across reopening, preserving earlier yield history',async()=>{
  await move('em_producao');
  await db.exec(`reset role;update producao_tarefas set etapa_iniciada_em=clock_timestamp()-interval '10 minutes' where id='${task}';set role authenticated;`);
  await move('feito',70);const completed=await current();expect(Number(completed.tempo_producao_segundos)).toBeGreaterThanOrEqual(600);
  await move('em_producao');
  await db.exec(`reset role;update producao_tarefas set etapa_iniciada_em=clock_timestamp()-interval '5 minutes',iniciado_em=clock_timestamp()-interval '1 day' where id='${task}';set role authenticated;`);
  await move('feito',72);expect(Number((await current()).tempo_producao_segundos)).toBeGreaterThanOrEqual(900);expect(Number((await current()).tempo_producao_segundos)).toBeLessThan(910);
  expect((await db.query("select rendimento_real::float real from producao_tarefas_historico where para_status='feito' order by movido_em")).rows).toEqual([{real:70},{real:72}]);
});
it('returning to A fazer discards the attempt and a new start uses a fresh timestamp, including shared start',async()=>{
  await move('em_producao');
  await db.exec(`reset role;update producao_tarefas set iniciado_em='2026-11-11T18:15:00Z',etapa_iniciada_em=clock_timestamp()-interval '10 minutes' where id='${task}';set role authenticated;`);
  const returned=await move('a_fazer');
  expect(returned).toMatchObject({iniciado_em:null,concluido_em:null,rendimento_real:null,etapa_iniciada_em:null,tempo_producao_segundos:null});
  expect((await db.query("select para_status from producao_tarefas_historico where tarefa_id=$1 order by movido_em",[task])).rows).toEqual([{para_status:'em_producao'},{para_status:'a_fazer'}]);
  const restartAt=Date.now();
  await db.exec('reset role;set role service_role;');
  await db.query('select avancar_producao_compartilhada($1,$2,$3,null)',[link,task,returned.updated_at]);
  const restarted=await current();expect(restarted.status).toBe('em_producao');
  expect(new Date(restarted.iniciado_em).getTime()).toBeGreaterThanOrEqual(restartAt-1000);
  await db.exec('reset role;set role authenticated;');
  const done=await move('feito',70);expect(Number(done.tempo_producao_segundos)).toBeLessThan(10);
});
it('returning a completed task to A fazer clears execution values but keeps its completed history',async()=>{
  await move('em_producao');await move('feito',70);
  const returned=await move('a_fazer');expect(returned).toMatchObject({iniciado_em:null,concluido_em:null,rendimento_real:null,etapa_iniciada_em:null,tempo_producao_segundos:null});
  expect(returned.rendimento_previsto).toBe(72);
  expect((await db.query("select rendimento_real::float real from producao_tarefas_historico where para_status='feito'")).rows).toEqual([{real:70}]);
});
it('rolls back the reset together with its history when the history write fails',async()=>{
  await move('em_producao');const before=await current();await db.query("select set_config('test.fail_history','true',false)");
  await expect(move('a_fazer')).rejects.toMatchObject({code:'23514'});expect(await current()).toEqual(before);
});

it('repairs older returned tasks while retaining the previous timestamps as audit evidence',()=>{
  expect(resetRepairProof.task).toMatchObject({status:'a_fazer',iniciado_em:null,concluido_em:null,tempo_producao_segundos:null});
  expect(resetRepairProof.history).toMatchObject({iniciado_em_anterior:'2026-11-11T18:15:00+00:00',concluido_em_anterior:'2026-11-11T18:20:00+00:00'});
});
