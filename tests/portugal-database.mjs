// Isolated PostgreSQL tests; no production credentials or customer records.
// PGLITE_MODULE=/tmp/calcula-region-tests/node_modules/@electric-sql/pglite/dist/index.js node tests/portugal-database.mjs
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
const sql = await readFile(new URL('../supabase/migrations/20261027160044_portugal_market.sql', import.meta.url), 'utf8');
const legacy='00000000-0000-4000-8000-000000000001', pt='00000000-0000-4000-8000-000000000002', google='00000000-0000-4000-8000-000000000003';
await db.exec(`create schema auth; create schema private; create role anon; create role authenticated; create role service_role bypassrls;
create table auth.users(id uuid primary key, raw_user_meta_data jsonb default '{}');
create table public.profiles(user_id uuid primary key references auth.users, pais text default 'Brasil', estado varchar(2), plan text default 'lite', trial_ends_at timestamptz default now()+interval '7 days');
create table public.planos(slug text primary key); insert into planos values ('lite'),('professional');
insert into auth.users(id) values('${legacy}'); insert into profiles(user_id) values('${legacy}');
grant usage on schema public to authenticated, anon, service_role; grant all on public.profiles, public.planos to service_role;`);
const tables=['produtos','receitas','movimentacoes','despesas_fixas','folha_pagamento','markups','encargos_venda','perdas','user_configurations','estoque_fechamentos_mensais','comprovantes','ordens_producao'];
for(const name of tables) await db.exec(`create table public.${name}(id uuid default gen_random_uuid(), user_id uuid, value numeric);`);
await db.exec(`insert into produtos(user_id,value) values('${legacy}',1234.56);`);
await db.exec(sql);
const q = async s => (await db.query(s)).rows;
let passed=0;
async function test(name,fn){await fn();passed++;console.log('PASS',name);}
try {
 await test('migration preserves existing BRL accounts, data and trial dates', async()=>{
  assert.deepEqual(await q('select business_country, business_currency, region_confirmed from profiles'),[{business_country:'BR',business_currency:'BRL',region_confirmed:true}]);
  assert.equal(Number((await q('select value from produtos'))[0].value),1234.56);
  assert.equal((await q('select plan from profiles'))[0].plan,'lite');
 });
 await test('new Portuguese signup sets EUR and accepts a district name',async()=>{
  await db.exec(`insert into auth.users values('${pt}','{"business_country":"PT","preferred_locale":"pt-PT"}'); insert into profiles(user_id,estado) values('${pt}','Lisboa');`);
  assert.deepEqual(await q(`select business_currency,pais,preferred_locale,region_confirmed from profiles where user_id='${pt}'`),[{business_currency:'EUR',pais:'Portugal',preferred_locale:'pt-PT',region_confirmed:true}]);
  await db.exec(`insert into produtos(user_id,value) values('${pt}',12.50);`);
 });
 await test('Google signup cannot create monetary records before confirming the country',async()=>{
  await db.exec(`insert into auth.users(id) values('${google}'); insert into profiles(user_id) values('${google}');`);
  await assert.rejects(db.exec(`insert into produtos(user_id,value) values('${google}',1);`),/Confirme o país/);
  await db.exec(`update profiles set business_country='PT',region_confirmed=true where user_id='${google}'; insert into produtos(user_id,value) values('${google}',1);`);
 });
 await test('language is editable while currency is immutable, including for service clients',async()=>{
  await db.exec(`update profiles set preferred_locale='en' where user_id='${pt}';`);
  await assert.rejects(db.exec(`update profiles set business_country='BR' where user_id='${pt}';`),/moeda da conta/);
  await assert.rejects(db.exec(`update profiles set region_confirmed=false where user_id='${legacy}';`),/moeda da conta/);
  await assert.rejects(db.exec(`update profiles set business_currency='BRL' where user_id='${pt}';`));
 });
 await test('EUR prices default to unavailable; clients cannot activate prices',async()=>{
  assert.equal((await q('select count(*)::int n from plan_market_prices'))[0].n,0);
  await db.exec('set role authenticated;');
  assert.equal((await q('select count(*)::int n from plan_market_prices'))[0].n,0);
  await assert.rejects(db.exec("select activate_portugal_price('lite','monthly',500,'price_eur');"),/permission denied/);
  await db.exec('reset role;');
 });
 await test('price activation is versioned, atomic and recognizes old subscription prices',async()=>{
  await db.exec("set role service_role; select activate_portugal_price('lite','monthly',500,'price_one'); select activate_portugal_price('lite','monthly',600,'price_two'); reset role;");
  assert.equal((await q('select count(*)::int n from plan_market_prices'))[0].n,2);
  await db.exec('set role anon;');
  assert.deepEqual(await q('select stripe_price_id from plan_market_prices'),[{stripe_price_id:'price_two'}]);
  await db.exec('reset role;');
  await assert.rejects(db.exec("select activate_portugal_price('professional','monthly',600,'price_two');"),/outro plano/);
  assert.deepEqual(await q('select stripe_price_id from plan_market_prices where active'),[{stripe_price_id:'price_two'}]);
 });
 console.log(`${passed} database scenarios passed`);
} finally { await db.close(); }
