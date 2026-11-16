-- Primeira etapa da conexão com sistemas de venda. Dados de clientes/pedidos
-- não são armazenados nesta etapa. Chaves de integração não são persistidas.
create table public.integracoes_pdv (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('anota_ai')),
  external_store_id text not null check (external_store_id ~ '^[a-fA-F0-9]{24}$'),
  active boolean not null default true,
  connected_at timestamptz not null default now(),
  last_checked_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint integracoes_pdv_loja_unica unique(provider, external_store_id)
);
create index integracoes_pdv_owner_idx on public.integracoes_pdv(user_id, provider);
alter table public.integracoes_pdv enable row level security;
create policy integracoes_pdv_owner_read on public.integracoes_pdv
  for select to authenticated
  using (user_id = (select auth.uid()) and (select private.can_use_app()));
revoke all on public.integracoes_pdv from public, anon, authenticated;
grant select on public.integracoes_pdv to authenticated;
grant all on public.integracoes_pdv to service_role;
comment on table public.integracoes_pdv is 'Vínculos de lojas externas; sem segredos de API, pedidos ou dados de consumidores.';
