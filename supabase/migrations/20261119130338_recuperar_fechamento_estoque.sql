-- Apply in a single transaction. Hold writes while the opening basis and its
-- change triggers are installed, so that each stock change is counted once.
lock table public.profiles, public.produtos in share row exclusive mode;

create table private.estoque_variacao_mensal (
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  mes date not null,
  valor numeric not null,
  qtd integer not null,
  primary key (user_id, mes)
);
alter table private.estoque_variacao_mensal enable row level security;
revoke all on private.estoque_variacao_mensal from public, anon, authenticated, service_role;

create function private.mes_estoque(instante timestamptz, pais text)
returns date language sql stable strict set search_path = '' as $$
  select date_trunc('month', instante at time zone
    case pais when 'BR' then 'America/Sao_Paulo' when 'PT' then 'Europe/Lisbon' end)::date
$$;

-- The first month's row starts with the actual stock at activation. Later rows
-- contain only changes. A confirmed account with no products starts at zero.
with relogio as materialized (select clock_timestamp() as instante)
insert into private.estoque_variacao_mensal (user_id, mes, valor, qtd)
select p.user_id, private.mes_estoque(relogio.instante, p.business_country),
       coalesce(sum(s.estoque_atual * s.custo_unitario), 0), count(s.id)::integer
from public.profiles p cross join relogio
left join public.produtos s on s.user_id = p.user_id and s.ativo
where p.region_confirmed
group by p.user_id, p.business_country, relogio.instante;

create function private.iniciar_historico_estoque()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and old.region_confirmed then return null; end if;
  lock table private.estoque_variacao_mensal in row exclusive mode;
  insert into private.estoque_variacao_mensal (user_id, mes, valor, qtd)
  select new.user_id, private.mes_estoque(clock_timestamp(), new.business_country),
         coalesce(sum(s.estoque_atual * s.custo_unitario), 0), count(*)::integer
  from public.produtos s where s.user_id = new.user_id and s.ativo;
  return null;
end;
$$;
create trigger iniciar_historico_estoque after insert or update of region_confirmed on public.profiles
for each row when (new.region_confirmed) execute function private.iniciar_historico_estoque();

create function private.registrar_variacao_estoque()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  -- Transition tables contain all rows of one stock operation, including bulk imports.
  entradas constant text := 'select user_id, coalesce(estoque_atual * custo_unitario, 0) as valor, 1 as qtd from novos where ativo';
  saidas constant text := 'select user_id, -coalesce(estoque_atual * custo_unitario, 0) as valor, -1 as qtd from antigos where ativo';
  origem text;
begin
  case tg_op
    when 'INSERT' then origem := entradas;
    when 'DELETE' then origem := saidas;
    when 'UPDATE' then origem := saidas || ' union all ' || entradas;
    when 'TRUNCATE' then origem := 'select user_id, -coalesce(estoque_atual * custo_unitario, 0) as valor, -1 as qtd from public.produtos where ativo';
  end case;
  -- Acquire the writer lock BEFORE sampling the month. A writer queued behind a
  -- closing cannot post into a period the closer has already sealed.
  lock table private.estoque_variacao_mensal in row exclusive mode;
  execute format($changes$
    insert into private.estoque_variacao_mensal as historico (user_id, mes, valor, qtd)
    select p.user_id, private.mes_estoque($1, p.business_country), sum(v.valor), sum(v.qtd)::integer
    from (%s) v join public.profiles p on p.user_id = v.user_id and p.region_confirmed
    group by p.user_id, p.business_country
    having sum(v.valor) <> 0 or sum(v.qtd) <> 0
    order by p.user_id
    on conflict (user_id, mes) do update
      set valor = historico.valor + excluded.valor, qtd = historico.qtd + excluded.qtd
  $changes$, origem) using clock_timestamp();
  return null;
end;
$$;

create trigger historico_estoque_insercao after insert on public.produtos
referencing new table as novos for each statement execute function private.registrar_variacao_estoque();
create trigger historico_estoque_alteracao after update on public.produtos
referencing old table as antigos new table as novos for each statement execute function private.registrar_variacao_estoque();
create trigger historico_estoque_exclusao after delete on public.produtos
referencing old table as antigos for each statement execute function private.registrar_variacao_estoque();
create trigger historico_estoque_truncate before truncate on public.produtos
for each statement execute function private.registrar_variacao_estoque();

create function private.recuperar_fechamentos_estoque()
returns void language plpgsql set search_path = '' set lock_timeout = '3s' as $$
declare
  agora timestamptz;
begin
  -- Drain earlier stock transactions before reading totals. On contention the
  -- scheduled job can retry later. New writes stay in their own local month.
  lock table private.estoque_variacao_mensal in share mode;
  agora := clock_timestamp();
  with cobertura as (
    select h.user_id, min(h.mes) as primeiro, private.mes_estoque(agora, p.business_country) as atual
    from private.estoque_variacao_mensal h join public.profiles p on p.user_id = h.user_id
    where p.region_confirmed group by h.user_id, p.business_country
  ), saldos as (
    select c.user_id, calendario.mes,
           sum(coalesce(h.valor, 0)) over meses as valor,
           sum(coalesce(h.qtd, 0)) over meses as qtd
    from cobertura c
    cross join lateral generate_series(c.primeiro::timestamp, c.atual - interval '1 month', interval '1 month') calendario(mes)
    left join private.estoque_variacao_mensal h on h.user_id = c.user_id and h.mes = calendario.mes::date
    window meses as (partition by c.user_id order by calendario.mes rows unbounded preceding)
  )
  insert into public.estoque_fechamentos_mensais (user_id, competencia, valor_estoque_fechamento, qtd_produtos_ativos)
  select s.user_id, to_char(s.mes, 'YYYY-MM'), s.valor, s.qtd::integer
  from saldos s where not exists (
    select 1 from public.estoque_fechamentos_mensais f
    where f.user_id = s.user_id and f.competencia = to_char(s.mes, 'YYYY-MM')
  )
  on conflict (user_id, competencia) do nothing;
end;
$$;

revoke all on function private.mes_estoque(timestamptz, text), private.iniciar_historico_estoque(),
  private.registrar_variacao_estoque(), private.recuperar_fechamentos_estoque() from public, anon, authenticated, service_role;

-- Replace the same job. Installation seeds only the current month and does
-- not publish an opening balance for any month before coverage began.
do $$
declare
  fechamento_id bigint;
begin
  select jobid into strict fechamento_id from cron.job
  where jobname = 'auto-fechamento-mensal' and database = current_database() and username = 'postgres';
  perform cron.alter_job(fechamento_id, schedule := '0 * * * *',
    command := 'select private.recuperar_fechamentos_estoque();', active := true);
end;
$$;
