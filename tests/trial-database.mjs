// Isolated PostgreSQL regression tests; never connect to production.
// npm install --prefix /tmp/calcula-trial-tests @electric-sql/pglite@0.5.11
// PGLITE_MODULE=/tmp/calcula-trial-tests/node_modules/@electric-sql/pglite/dist/index.js node tests/trial-database.mjs
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
const migration = await readFile(new URL('../supabase/migrations/20261022225604_lite_seven_day_trial.sql', import.meta.url), 'utf8');
const businessTables = migration.match(/foreach table_name in array array\[([\s\S]*?)\] loop/)[1].match(/'[^']+'/g).map(s => s.slice(1, -1));
const ids = { legacy: '00000000-0000-4000-8000-000000000001', trial: '00000000-0000-4000-8000-000000000002', other: '00000000-0000-4000-8000-000000000003', admin: '00000000-0000-4000-8000-000000000004' };
await db.exec(`
  create role anon; create role authenticated; create role service_role bypassrls;
  create schema auth;
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create function auth.role() returns text language sql stable as $$ select current_setting('request.jwt.claim.role', true) $$;
  grant usage on schema auth to authenticated, anon, service_role;
  create table auth.users (id uuid primary key, created_at timestamptz default now(), raw_user_meta_data jsonb default '{}');
  create type public.app_role as enum ('admin','owner','hr_manager','employee','viewer');
  create table public.user_roles(user_id uuid, role public.app_role, unique(user_id,role));
  create function public.has_role_or_higher(required_role public.app_role, check_user_id uuid default auth.uid()) returns boolean language sql stable security definer as $$
    select exists(select 1 from public.user_roles where user_id=check_user_id and (role='admin' or (role='owner' and required_role<>'admin')))
  $$;
  create table public.profiles (
    id uuid primary key default gen_random_uuid(), user_id uuid unique not null references auth.users(id),
    full_name text, business_name text, business_type text, created_at timestamptz default now(),
    phone text, celular text, whatsapp text, plan varchar default 'lite', plan_expires_at timestamptz,
    trial_ends_at timestamptz default now()+interval '7 days', subscription_status text not null default 'active',
    grace_period_ends_at timestamptz, access_blocked_at timestamptz, is_admin boolean not null default false,
    role text not null default 'user', pdf_exports_count integer default 0
  );
  create function public.prevent_is_admin_self_update() returns trigger language plpgsql as $$ begin return new; end; $$;
  create trigger prevent_is_admin_update before update on profiles for each row execute function public.prevent_is_admin_self_update();
  create function public.initialize_user_role() returns trigger language plpgsql security definer as $$ begin insert into public.user_roles values(new.user_id,'owner') on conflict do nothing; return new; end; $$;
  create trigger initialize_user_role_trigger after insert on profiles for each row execute function public.initialize_user_role();
  create table public.planos (slug text primary key, limites jsonb);
  insert into planos values ('lite','{"produtos":30,"receitas":5,"markups":1,"movimentacoes":-1,"pdf_exports":0}'), ('professional','{"produtos":-1,"receitas":60,"markups":3,"pdf_exports":80}');
  create function public.reset_monthly_pdf_counter() returns void language sql as $$ select $$;
  insert into auth.users(id) values('${ids.legacy}');
  insert into public.profiles(user_id,trial_ends_at) values('${ids.legacy}',null);
`);
for (const name of businessTables) {
  const extra = name === 'produtos' ? ', codigo_interno integer' : name === 'comprovantes' ? ', numero integer' : name === 'ordens_producao' ? ', numero_sequencial integer' : name === 'folha_pagamento' ? ', nome text, cargo text, tipo_mao_obra text, horas_por_dia numeric, dias_por_semana numeric' : name === 'user_configurations' ? ', type text, configuration jsonb' : '';
  await db.exec(`create table public.${name} (id uuid primary key default gen_random_uuid(), user_id uuid, ativo boolean default true, tipo text default 'normal' ${extra}); alter table public.${name} enable row level security; create policy own_rows on public.${name} for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());`);
}
await db.exec(`alter table profiles enable row level security; create policy own_profile on profiles for select to authenticated using(user_id=auth.uid()); create policy edit_profile on profiles for update to authenticated using(user_id=auth.uid()); create policy insert_profile on profiles for insert to authenticated with check(user_id=auth.uid()); grant all on all tables in schema public to authenticated, service_role;`);
await db.exec(migration);
let passed = 0;
const q = async sql => (await db.query(sql)).rows;
const admin = () => db.exec("reset role; select set_config('request.jwt.claim.sub','',false), set_config('request.jwt.claim.role','',false);");
const asUser = id => db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${id}',false), set_config('request.jwt.claim.role','authenticated',false);`);
const access = async () => (await q('select public.get_my_access() as access'))[0].access;
const test = async (name, fn) => { await fn(); passed++; console.log(`ok ${passed} - ${name}`); };
const denied = async sql => { await assert.rejects(() => db.exec(sql)); };
try {
  await test('existing accounts retain access without a trial', async () => {
    await asUser(ids.legacy); const a = await access(); assert.equal(a.access_mode,'legacy'); assert.equal(a.can_access,true);
  });
  await test('email/OAuth user insertion creates exactly seven days of Lite; ignores metadata entitlements', async () => {
    await admin(); await db.exec(`insert into auth.users(id, raw_user_meta_data) values('${ids.trial}','{"full_name":"Trial","plan":"enterprise","is_admin":true,"trial_ends_at":"2100-01-01"}'),('${ids.other}','{}'),('${ids.admin}','{}');`);
    const [p] = await q(`select plan, is_admin, extract(epoch from trial_ends_at-trial_started_at) as duration from profiles where user_id='${ids.trial}'`);
    assert.equal(p.plan,'lite'); assert.equal(p.is_admin,false); assert.equal(Number(p.duration),604800);
    await asUser(ids.trial); assert.equal((await access()).can_access,true);
  });
  await test('client cannot extend a trial, change its owner, or grant itself a paid plan', async () => {
    const original = await access();
    await db.exec(`update profiles set user_id='${ids.other}',plan='enterprise', access_mode='subscription',trial_ends_at='2100-01-01',trial_started_at='2099-01-01',subscription_status='canceled',is_admin=true,role='admin',access_blocked_at=now(),grace_period_ends_at='2100-01-01' where user_id='${ids.trial}';`);
    const after = await access(); assert.equal(after.access_mode,'trial'); assert.equal(after.plan,'lite'); assert.equal(after.trial_ends_at,original.trial_ends_at); assert.equal(after.can_access,true); assert.equal(after.is_admin,false);
  });
  await test('Lite allows 30 products and rejects the 31st through direct SQL', async () => {
    await db.exec(`insert into produtos(user_id) select '${ids.trial}' from generate_series(1,30);`);
    await denied(`insert into produtos(user_id) values('${ids.trial}');`);
    assert.equal((await q('select count(*)::int as n from produtos'))[0].n,30);
  });
  await test('Lite allows five recipes and one regular markup, preserving the technical subrecipe markup', async () => {
    await db.exec(`insert into receitas(user_id) select '${ids.trial}' from generate_series(1,5); insert into markups(user_id) values('${ids.trial}'); insert into markups(user_id,tipo) values('${ids.trial}','sub_receita');`);
    await denied(`insert into receitas(user_id) values('${ids.trial}');`);
    await denied(`insert into markups(user_id) values('${ids.trial}');`);
    assert.equal((await q('select count(*)::int as n from markups'))[0].n,2);
  });
  await test('limit RPC denies other accounts, invalid counts and Lite PDF export', async () => {
    for (const [id,feature,count,reason] of [[ids.other,'receitas',1,'forbidden'],[ids.trial,'receitas',-1,'invalid_count'],[ids.trial,'pdf_exports',1,'limit_exceeded']]) {
      const result=(await q(`select check_plan_limits('${id}','${feature}',${count}) as value`))[0].value;
      assert.equal(result.allowed,false); assert.equal(result.reason,reason);
    }
  });
  await test('expiry blocks reads, writes and definer RPCs while retaining profile and plans access', async () => {
    await admin(); await db.exec(`update profiles set trial_ends_at=now() where user_id='${ids.trial}';`); await asUser(ids.trial);
    assert.equal((await access()).reason,'trial_expired'); assert.equal((await access()).can_access,false);
    assert.equal((await q('select count(*)::int as n from produtos'))[0].n,0);
    await denied(`insert into movimentacoes(user_id) values('${ids.trial}');`);
    await denied(`select gerar_proximo_codigo_interno('${ids.trial}');`);
    assert.equal((await q('select count(*)::int as n from get_employee_summary()'))[0].n,0);
    assert.equal((await q('select count(*)::int as n from profiles'))[0].n,1);
    assert.equal((await q('select count(*)::int as n from planos'))[0].n,2);
    assert.equal((await q(`select check_plan_limits('${ids.trial}','movimentacoes',1) as value`))[0].value.reason,'access_expired');
  });
  await test('unrelated active trial is unaffected and account data stays isolated', async () => {
    await asUser(ids.other); assert.equal((await access()).can_access,true);
    await db.exec(`insert into produtos(user_id) values('${ids.other}');`);
    assert.equal((await q('select count(*)::int as n from produtos'))[0].n,1);
  });
  await test('confirmed payment updates the SAME account and reveals preserved data', async () => {
    await admin(); await db.exec(`set role service_role; select set_config('request.jwt.claim.role','service_role',false); update profiles set access_mode='subscription',plan='lite',trial_ends_at=null,subscription_status='active',plan_expires_at=now()+interval '1 month' where user_id='${ids.trial}';`);
    await asUser(ids.trial); assert.equal((await access()).has_subscription,true); assert.equal((await access()).can_access,true);
    assert.equal((await q('select count(*)::int as n from produtos'))[0].n,30);
    assert.equal((await q('select count(*)::int as n from receitas'))[0].n,5);
  });
  await test('payment cancellation blocks, and payment recovery unlocks, without deleting data', async () => {
    await admin(); await db.exec(`update profiles set subscription_status='canceled',access_blocked_at=now() where user_id='${ids.trial}';`); await asUser(ids.trial); assert.equal((await access()).can_access,false);
    await admin(); await db.exec(`update profiles set subscription_status='active',access_blocked_at=null where user_id='${ids.trial}';`); await asUser(ids.trial); assert.equal((await access()).can_access,true);
    assert.equal((await q('select count(*)::int as n from produtos'))[0].n,30);
  });
  await test('administrators remain accessible after trial expiry', async () => {
    await admin(); await db.exec(`insert into user_roles values('${ids.admin}','admin'); update profiles set trial_ends_at=now()-interval '1 day' where user_id='${ids.admin}';`); await asUser(ids.admin); assert.equal((await access()).can_access,true);
  });
  await test('service access RPC is inaccessible to clients; anonymous access is denied', async () => {
    await denied(`select get_account_access('${ids.other}');`); await admin(); await db.exec('set role anon;'); await denied('select get_my_access();');
  });
  await test('every operational table has the restrictive expiry policy', async () => {
    await admin(); const rows = await q("select count(*)::int as n from pg_policies where schemaname='public' and policyname='active_app_access' and permissive='RESTRICTIVE'"); assert.equal(rows[0].n,businessTables.length);
  });
  console.log(`${passed} database scenarios passed`);
} finally { await db.close(); }
