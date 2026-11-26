import { PGlite } from '@electric-sql/pglite';
import { readdirSync, readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';

const file = readdirSync('supabase/migrations').filter(f => readFileSync(`supabase/migrations/${f}`, 'utf8').includes('Admins veem todos os planos')).sort().at(-1)!;
const migration = readFileSync(`supabase/migrations/${file}`, 'utf8');
const admin = '00000000-0000-4000-8000-000000000001', user = '00000000-0000-4000-8000-000000000002';
let db: PGlite;

async function as(role: 'anon' | 'authenticated', uid: string | null, sql: string) {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${uid ?? ''}', false); set role ${role}`);
  try { return await db.query<{ slug: string }>(sql); } finally { await db.exec('reset role'); }
}

beforeEach(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to anon, authenticated; grant execute on function auth.uid() to anon, authenticated;
    create type public.app_role as enum ('owner','admin','viewer');
    create table public.user_roles(user_id uuid, role public.app_role);
    insert into public.user_roles values ('${admin}','admin');
    create function public.has_role_or_higher(required_role public.app_role, check_user_id uuid default auth.uid()) returns boolean
      language sql stable security definer set search_path = public as $$ select exists(select 1 from user_roles where user_id = check_user_id and role <= required_role) $$;
    revoke execute on function public.has_role_or_higher(public.app_role, uuid) from public, anon;
    grant execute on function public.has_role_or_higher(public.app_role, uuid) to authenticated;
    create table public.planos(slug text primary key, ativo boolean not null default true, nome text);
    alter table public.planos enable row level security;
    grant insert, update, delete on public.planos to authenticated;
    insert into public.planos values ('lite', true, 'Lite'), ('legacy', false, 'Antigo');
    create policy "Planos ativos visiveis para todos" on public.planos for select using ((ativo = true) or public.has_role_or_higher('admin', auth.uid()));
    create policy "Somente admin altera planos" on public.planos for all using (public.has_role_or_higher('admin', auth.uid())) with check (public.has_role_or_higher('admin', auth.uid()));
  `);
  await db.exec(migration);
});

describe('catálogo de planos', () => {
  it('visitante lê só planos ativos sem erro de permissão', async () => {
    expect((await as('anon', null, 'select slug from public.planos order by slug')).rows.map(r => r.slug)).toEqual(['lite']);
  });
  it('usuário comum lê só ativos e não altera o catálogo', async () => {
    expect((await as('authenticated', user, 'select slug from public.planos order by slug')).rows.map(r => r.slug)).toEqual(['lite']);
    await expect(as('authenticated', user, "insert into public.planos values ('x', true, 'X')")).rejects.toThrow();
    await as('authenticated', user, "update public.planos set nome = 'hack'");
    expect((await db.query<{ nome: string }>("select nome from public.planos where slug = 'lite'")).rows[0].nome).toBe('Lite');
  });
  it('admin vê inativos e edita o catálogo', async () => {
    expect((await as('authenticated', admin, 'select slug from public.planos order by slug')).rows.map(r => r.slug)).toEqual(['legacy', 'lite']);
    await as('authenticated', admin, "update public.planos set nome = 'Lite 2' where slug = 'lite'");
    expect((await db.query<{ nome: string }>("select nome from public.planos where slug = 'lite'")).rows[0].nome).toBe('Lite 2');
  });
  it('visitante continua sem executar has_role_or_higher', async () => {
    await expect(as('anon', null, "select public.has_role_or_higher('admin', null) as slug")).rejects.toThrow(/permission denied/);
  });
});
