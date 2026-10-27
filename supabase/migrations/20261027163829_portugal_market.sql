-- Existing accounts retain BRL and all balances, trials and subscriptions.
alter table public.profiles
  add column business_country text not null default 'BR' check (business_country in ('BR', 'PT')),
  add column business_currency text generated always as (case business_country when 'PT' then 'EUR' else 'BRL' end) stored,
  add column preferred_locale text not null default 'pt-BR' check (preferred_locale in ('pt-BR', 'pt-PT', 'en')),
  add column region_confirmed boolean not null default true;
alter table public.profiles alter column estado type varchar(100);

create or replace function private.initialize_business_region()
returns trigger language plpgsql security definer set search_path = '' as $$
declare metadata jsonb;
begin
  select raw_user_meta_data into metadata from auth.users where id = new.user_id;
  -- User input is only a business preference. It never grants permissions.
  new.business_country := case when metadata->>'business_country' = 'PT' then 'PT' else 'BR' end;
  new.region_confirmed := coalesce(metadata->>'business_country' in ('BR','PT'), false);
  new.preferred_locale := case
    when metadata->>'preferred_locale' in ('pt-BR','pt-PT','en') then metadata->>'preferred_locale'
    when new.business_country = 'PT' then 'pt-PT' else 'pt-BR' end;
  if new.business_country = 'PT' then new.pais := 'Portugal'; end if;
  return new;
end;
$$;
revoke all on function private.initialize_business_region() from public, anon, authenticated;
create trigger initialize_business_region before insert on public.profiles
for each row execute function private.initialize_business_region();

create or replace function private.protect_business_region()
returns trigger language plpgsql set search_path = '' as $$
begin
  if old.region_confirmed and (new.business_country <> old.business_country or not new.region_confirmed) then
    raise exception 'A moeda da conta não pode ser alterada. Os valores existentes não são convertidos.' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function private.protect_business_region() from public, anon, authenticated;
create trigger protect_business_region before update on public.profiles
for each row execute function private.protect_business_region();

-- No financial records may be created before the currency is confirmed.
-- Lock the profile to serialize region selection with concurrent financial writes.
create or replace function private.require_business_region()
returns trigger language plpgsql security definer set search_path = '' as $$
declare confirmed boolean;
begin
  select region_confirmed into confirmed from public.profiles where user_id = new.user_id for share;
  if confirmed is distinct from true then
    raise exception 'Confirme o país e a moeda da conta antes de continuar.' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function private.require_business_region() from public, anon, authenticated;
do $$
declare table_name text;
begin
  foreach table_name in array array['produtos','receitas','movimentacoes','despesas_fixas','folha_pagamento','markups','encargos_venda','perdas','user_configurations','estoque_fechamentos_mensais','comprovantes','ordens_producao'] loop
    execute format('create trigger require_business_region before insert or update of user_id on public.%I for each row execute function private.require_business_region()', table_name);
  end loop;
end;
$$;

-- Independent, versioned market prices: never convert or replace the BRL catalog.
create table public.plan_market_prices (
  id uuid primary key default gen_random_uuid(),
  plan_slug text not null references public.planos(slug),
  country_code text not null check (country_code = 'PT'),
  currency text not null default 'eur' check (currency = 'eur'),
  billing text not null check (billing in ('monthly','yearly')),
  amount_cents integer not null check (amount_cents > 0),
  stripe_price_id text not null unique,
  active boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index one_active_market_price on public.plan_market_prices (plan_slug,country_code,billing) where active;
alter table public.plan_market_prices enable row level security;
revoke all on public.plan_market_prices from anon, authenticated;
grant select on public.plan_market_prices to anon, authenticated;
grant all on public.plan_market_prices to service_role;
create policy "Read active market prices" on public.plan_market_prices for select to anon, authenticated using (active);
comment on table public.plan_market_prices is 'Validated Stripe prices for Portugal. No EUR prices are inferred from BRL. Old rows are retained to recognize existing subscriptions.';

-- Called only by the authenticated admin Edge Function after Stripe validation.
create function public.activate_portugal_price(p_slug text, p_billing text, p_amount integer, p_price_id text)
returns void language plpgsql set search_path = '' as $$
begin
  perform 1 from public.planos where slug = p_slug for update;
  if not found then raise exception 'Plano não encontrado'; end if;
  update public.plan_market_prices set active = false where plan_slug = p_slug and country_code = 'PT' and billing = p_billing;
  insert into public.plan_market_prices (plan_slug, country_code, currency, billing, amount_cents, stripe_price_id, active)
    values (p_slug, 'PT', 'eur', p_billing, p_amount, p_price_id, true)
    on conflict (stripe_price_id) do update set active = true
      where public.plan_market_prices.plan_slug = excluded.plan_slug
        and public.plan_market_prices.billing = excluded.billing
        and public.plan_market_prices.amount_cents = excluded.amount_cents;
  if not found then raise exception 'O preço pertence a outro plano ou período'; end if;
end;
$$;
revoke all on function public.activate_portugal_price(text,text,integer,text) from public, anon, authenticated;
grant execute on function public.activate_portugal_price(text,text,integer,text) to service_role;

-- One hourly scheduler covers both regional midnights, including Lisbon DST.
-- The function filters by local midnight and never overwrites an existing snapshot.
do $$
declare closing_job bigint;
begin
  if exists (select 1 from pg_namespace where nspname = 'cron') then
    execute 'select jobid from cron.job where jobname = ''auto-fechamento-mensal''' into closing_job;
    if closing_job is not null then
      execute 'select cron.alter_job($1, schedule := ''0 * * * *'')' using closing_job;
    end if;
  end if;
end;
$$;
