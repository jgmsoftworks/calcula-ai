// Local embedded Postgres only; never connects to production.
// npm install --no-save --ignore-scripts @electric-sql/pglite
// node scripts/test-legal-database.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
const a = '11111111-1111-4111-8111-111111111111';
const b = '22222222-2222-4222-8222-222222222222';
const hash = 'a'.repeat(64);
let checks = 0;
try {
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to anon, authenticated, service_role;
    create table public.user_consents(user_id uuid, consent_type text);
    alter table public.user_consents enable row level security;
    create policy "Usuarios podem registrar seus proprios consentimentos" on public.user_consents for insert to authenticated with check(auth.uid() = user_id);
    insert into auth.users values('${a}'), ('${b}');
  `);
  await db.exec(readFileSync(new URL('../supabase/migrations/20261028164202_legal_acceptance_receipts.sql', import.meta.url), 'utf8'));
  await db.query(`insert into public.legal_document_releases(version,content_sha256,content,active) values ($1,$2,$3,true)`, ['v1', hash, { status: 'published', version: 'v1', text: 'local test only' }]);
  async function asUser(user = a, role = 'authenticated') {
    await db.exec('reset role');
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user]);
    await db.exec(`set role ${role}`);
  }
  async function fails(sql, params = []) { await assert.rejects(db.query(sql, params)); checks++; }
  await asUser();
  assert.equal((await db.query('select * from public.legal_acceptance_status()')).rows[0].accepted, false); checks++;
  await fails('select public.accept_legal_documents($1,$2,false,true)', ['v1',hash]);
  await fails('select public.accept_legal_documents($1,$2,true,null)', ['v1',hash]);
  await fails('select public.accept_legal_documents($1,$2,true,true)', ['v1','b'.repeat(64)]);
  await db.query('select public.accept_legal_documents($1,$2,true,true)', ['v1',hash]);
  const first = (await db.query('select * from public.legal_acceptance_receipts')).rows;
  assert.equal(first.length, 1); assert.equal(first[0].user_id,a); checks++;
  await db.query('select public.accept_legal_documents($1,$2,true,true)', ['v1',hash]);
  assert.deepEqual((await db.query('select * from public.legal_acceptance_receipts')).rows, first); checks++;
  await fails(`insert into public.legal_acceptance_receipts values ('${b}', 'v1',now(),true,true)`);
  await fails(`update public.legal_acceptance_receipts set accepted_at = '2000-01-01'`);
  await fails('delete from public.legal_acceptance_receipts');
  await asUser(b);
  assert.equal((await db.query('select * from public.legal_acceptance_receipts')).rows.length, 0); checks++;
  assert.equal((await db.query('select * from public.legal_acceptance_status()')).rows[0].accepted, false); checks++;
  await asUser('', 'anon');
  await fails('select public.accept_legal_documents($1,$2,true,true)', ['v1',hash]);
  await fails('select private.accept_legal_documents($1,$2,true,true)', ['v1',hash]);
  await db.exec('reset role');
  await fails("update public.legal_document_releases set content = '{\"status\":\"published\",\"version\":\"v1\",\"text\":\"changed\"}'");
  await fails("insert into public.legal_document_releases(version,content_sha256,content) values ('bad',$1,'{}')", [hash]);
  await db.exec("update public.legal_document_releases set active = false");
  await db.query(`insert into public.legal_document_releases(version,content_sha256,content,active) values ('v2',$1,'{"status":"published","version":"v2"}',true)`, [hash]);
  await asUser();
  await fails('select public.accept_legal_documents($1,$2,true,true)', ['v1',hash]);
  assert.equal((await db.query('select * from public.legal_acceptance_status()')).rows[0].accepted,false); checks++;
  console.log(`${checks} database permission, identity, immutability and version checks passed.`);
} finally { await db.close(); }
