-- Additive: observes the existing cost formula; does not change pricing or the UI.
-- Apply this file alone. Older local/remote migration IDs are not equivalent.
-- The migration runner must execute this file in one transaction.
set local lock_timeout = '5s';
set local statement_timeout = '90s';

-- Keep the baseline and trigger installation atomic with respect to source writes.
lock table public.profiles, public.produtos, public.receitas,
  public.receita_ingredientes, public.receita_embalagens,
  public.receita_sub_receitas, public.receita_mao_obra in share row exclusive mode;

create table public.receita_custos_historico (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  -- Deliberately no FK to receitas: deleting a recipe must preserve its history.
  receita_id uuid not null,
  registrado_em timestamptz not null,
  transacao_id bigint not null,
  motivo text not null check (motivo in ('inicio_acompanhamento','criacao','alteracao','exclusao')),
  receita_nome text not null,
  estado_receita text,
  custo_total numeric not null,
  custo_unitario numeric,
  rendimento_valor numeric,
  rendimento_unidade text,
  moeda text,
  excluida boolean not null default false,
  formula_versao integer not null default 1,
  base_calculo jsonb not null,
  unique (user_id, receita_id, transacao_id)
);
create index receita_custos_historico_consulta_idx
  on public.receita_custos_historico(user_id, receita_id, registrado_em desc, id desc);
comment on table public.receita_custos_historico is
  'Custos observados desde a ativacao, com vigencia ate o proximo registro. Sem reconstrucao retroativa. Escrita somente por gatilhos internos.';
comment on column public.receita_custos_historico.custo_unitario is
  'Custo total dividido pelo rendimento positivo; NULL quando o rendimento nao permite calcular a unidade.';

alter table public.receita_custos_historico enable row level security;
revoke all on public.receita_custos_historico from public, anon, authenticated, service_role;
grant select on public.receita_custos_historico to authenticated, service_role;
revoke all on sequence public.receita_custos_historico_id_seq from public, anon, authenticated, service_role;
create policy receita_custos_leitura_propria on public.receita_custos_historico
  for select to authenticated
  using (user_id = (select auth.uid()) and (select private.can_use_app()));

-- Snapshot the exact inputs used by calcular_custo_receita, including the current
-- stored price/yield of sub-recipes. Do not silently introduce a new cost formula.
create function private.capturar_base_custo_receita(p_receita_id uuid, p_user_id uuid)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'nome', r.nome, 'status', r.status,
    'rendimento_valor', r.rendimento_valor, 'rendimento_unidade', r.rendimento_unidade,
    'moeda', (select p.business_currency from public.profiles p where p.user_id = r.user_id),
    'custo_total', public.calcular_custo_receita(r.id),
    'ingredientes', coalesce((select jsonb_agg(jsonb_build_object(
      'id', i.id, 'produto_id', i.produto_id, 'quantidade', i.quantidade,
      'custo_unitario', p.custo_unitario, 'unidade_uso', p.unidade_uso,
      'fator_conversao', p.fator_conversao) order by i.id)
      from public.receita_ingredientes i join public.produtos p on p.id = i.produto_id
      where i.receita_id = r.id), '[]'::jsonb),
    'embalagens', coalesce((select jsonb_agg(jsonb_build_object(
      'id', i.id, 'produto_id', i.produto_id, 'quantidade', i.quantidade,
      'custo_unitario', p.custo_unitario, 'unidade_uso', p.unidade_uso,
      'fator_conversao', p.fator_conversao) order by i.id)
      from public.receita_embalagens i join public.produtos p on p.id = i.produto_id
      where i.receita_id = r.id), '[]'::jsonb),
    'sub_receitas', coalesce((select jsonb_agg(jsonb_build_object(
      'id', i.id, 'sub_receita_id', i.sub_receita_id, 'quantidade', i.quantidade,
      'preco_base', s.preco_venda, 'rendimento_valor', s.rendimento_valor) order by i.id)
      from public.receita_sub_receitas i join public.receitas s on s.id = i.sub_receita_id
      where i.receita_id = r.id), '[]'::jsonb),
    'mao_obra', coalesce((select jsonb_agg(jsonb_build_object(
      'id', m.id, 'valor_total', m.valor_total) order by m.id)
      from public.receita_mao_obra m where m.receita_id = r.id), '[]'::jsonb)
  ) from public.receitas r where r.id = p_receita_id and r.user_id = p_user_id;
$$;

-- The only privileged writer is private and cannot be called by an API role.
-- The owner lock serializes snapshots of concurrent changes in one account.
create function private.registrar_custo_receita(
  p_receita_id uuid, p_user_id uuid, p_inicial boolean default false
) returns void language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_tx bigint := txid_current();
  v_base jsonb;
  v_anterior public.receita_custos_historico%rowtype;
  v_excluida boolean;
  v_total numeric;
  v_rendimento numeric;
begin
  if (v_uid is not null and v_uid <> p_user_id)
     or (v_uid is null and current_setting('role', true) in ('anon','authenticated')) then
    raise exception 'Conta indisponivel para registrar custo.' using errcode = '42501';
  end if;
  -- Account deletion must not recreate rows removed by the auth.users cascade.
  if not exists (select 1 from auth.users where id = p_user_id) then return; end if;
  perform pg_advisory_xact_lock(hashtextextended('receita-custos:' || p_user_id::text, 0));
  select * into v_anterior from public.receita_custos_historico
    where user_id = p_user_id and receita_id = p_receita_id and transacao_id <> v_tx
    order by registrado_em desc, id desc limit 1;
  v_base := private.capturar_base_custo_receita(p_receita_id, p_user_id);
  v_excluida := v_base is null;
  if v_excluida then
    -- Created and removed in one transaction never became an observable recipe.
    if v_anterior.id is null then
      delete from public.receita_custos_historico where user_id = p_user_id
        and receita_id = p_receita_id and transacao_id = v_tx;
      return;
    end if;
    v_base := v_anterior.base_calculo;
  end if;
  if v_anterior.id is not null and v_anterior.base_calculo = v_base
     and v_anterior.excluida = v_excluida then
    -- Also handles SET CONSTRAINTS IMMEDIATE followed by a change reverted in
    -- the same transaction. Only uncommitted snapshots may be replaced/removed.
    delete from public.receita_custos_historico where user_id = p_user_id
      and receita_id = p_receita_id and transacao_id = v_tx;
    return;
  end if;
  v_total := (v_base->>'custo_total')::numeric;
  v_rendimento := (v_base->>'rendimento_valor')::numeric;
  insert into public.receita_custos_historico (
    user_id, receita_id, registrado_em, transacao_id, motivo, receita_nome,
    estado_receita, custo_total, custo_unitario, rendimento_valor,
    rendimento_unidade, moeda, excluida, base_calculo
  ) values (
    p_user_id, p_receita_id, greatest(clock_timestamp(), v_anterior.registrado_em + interval '1 microsecond'),
    v_tx, case when v_excluida then 'exclusao' when p_inicial then 'inicio_acompanhamento'
      when v_anterior.id is null then 'criacao' else 'alteracao' end,
    v_base->>'nome', v_base->>'status', v_total,
    case when v_rendimento > 0 then v_total / v_rendimento end,
    v_rendimento, v_base->>'rendimento_unidade', v_base->>'moeda', v_excluida, v_base
  ) on conflict (user_id, receita_id, transacao_id) do update set
    registrado_em = excluded.registrado_em, motivo = excluded.motivo,
    receita_nome = excluded.receita_nome, estado_receita = excluded.estado_receita,
    custo_total = excluded.custo_total, custo_unitario = excluded.custo_unitario,
    rendimento_valor = excluded.rendimento_valor, rendimento_unidade = excluded.rendimento_unidade,
    moeda = excluded.moeda, excluida = excluded.excluida, base_calculo = excluded.base_calculo;
end;
$$;

create function private.registrar_custos_dependentes(p_receitas uuid[])
returns void language plpgsql security definer set search_path = '' as $$
declare v_receita record;
begin
  -- UNION (not UNION ALL) makes traversal finite even for legacy dependency cycles.
  for v_receita in
    with recursive afetadas(id) as (
      select unnest(p_receitas)
      union
      select s.receita_id from public.receita_sub_receitas s join afetadas a on a.id = s.sub_receita_id
    ) select r.id, r.user_id from afetadas a join public.receitas r on r.id = a.id
      order by r.user_id, r.id
  loop
    perform private.registrar_custo_receita(v_receita.id, v_receita.user_id);
  end loop;
end;
$$;

create function private.observar_custos_receitas()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_ids uuid[] := '{}';
begin
  if tg_table_name = 'produtos' then
    select array_agg(distinct receita_id) into v_ids from (
      select receita_id from public.receita_ingredientes where produto_id = new.id
      union select receita_id from public.receita_embalagens where produto_id = new.id
    ) afetadas;
  elsif tg_table_name = 'profiles' then
    select array_agg(id) into v_ids from public.receitas where user_id = new.user_id;
  elsif tg_table_name = 'receitas' then
    if tg_op <> 'INSERT' then
      -- Retain a deletion/ownership-transfer marker even after the source vanished.
      if tg_op = 'DELETE' then
        perform private.registrar_custo_receita(old.id, old.user_id);
      elsif old.user_id is distinct from new.user_id then
        perform private.registrar_custo_receita(old.id, old.user_id);
      end if;
      v_ids := array_append(v_ids, old.id);
    end if;
    if tg_op <> 'DELETE' then v_ids := array_append(v_ids, new.id); end if;
  else
    if tg_op <> 'INSERT' then v_ids := array_append(v_ids, old.receita_id); end if;
    if tg_op <> 'DELETE' then v_ids := array_append(v_ids, new.receita_id); end if;
  end if;
  perform private.registrar_custos_dependentes(v_ids);
  return null;
end;
$$;

revoke all on function private.capturar_base_custo_receita(uuid,uuid) from public, anon, authenticated, service_role;
revoke all on function private.registrar_custo_receita(uuid,uuid,boolean) from public, anon, authenticated, service_role;
revoke all on function private.registrar_custos_dependentes(uuid[]) from public, anon, authenticated, service_role;
revoke all on function private.observar_custos_receitas() from public, anon, authenticated, service_role;

-- Deferred triggers see the completed recipe save/stock transaction, never
-- intermediate empty ingredient lists or partially edited recipes.
create constraint trigger historico_custos_produto
after update on public.produtos deferrable initially deferred for each row
when (old.custo_unitario is distinct from new.custo_unitario
   or old.unidade_uso is distinct from new.unidade_uso
   or old.fator_conversao is distinct from new.fator_conversao)
execute function private.observar_custos_receitas();
create constraint trigger historico_custos_receita
after insert or update or delete on public.receitas
deferrable initially deferred for each row execute function private.observar_custos_receitas();
create constraint trigger historico_custos_ingrediente
after insert or update or delete on public.receita_ingredientes
deferrable initially deferred for each row execute function private.observar_custos_receitas();
create constraint trigger historico_custos_embalagem
after insert or update or delete on public.receita_embalagens
deferrable initially deferred for each row execute function private.observar_custos_receitas();
create constraint trigger historico_custos_sub_receita
after insert or update or delete on public.receita_sub_receitas
deferrable initially deferred for each row execute function private.observar_custos_receitas();
create constraint trigger historico_custos_mao_obra
after insert or update or delete on public.receita_mao_obra
deferrable initially deferred for each row execute function private.observar_custos_receitas();
create constraint trigger historico_custos_moeda
after update on public.profiles deferrable initially deferred for each row
when (old.business_currency is distinct from new.business_currency)
execute function private.observar_custos_receitas();

-- Read contracts for the future panel. RLS remains active (SECURITY INVOKER).
create function public.custo_receita_em(p_receita_id uuid, p_instante timestamptz default now())
returns setof public.receita_custos_historico language sql stable security invoker
set search_path = '' as $$
  select h.* from (
    select * from public.receita_custos_historico
    where receita_id = p_receita_id and registrado_em <= p_instante
    order by registrado_em desc, id desc limit 1
  ) h where not h.excluida;
$$;

create function public.custos_receita_por_dia(
  p_receita_id uuid, p_inicio date, p_fim date, p_fuso text default 'America/Sao_Paulo'
) returns table (
  dia date, custo_total numeric, custo_unitario numeric, rendimento_valor numeric,
  rendimento_unidade text, moeda text, registro_id bigint, registrado_em timestamptz,
  cobertura_desde timestamptz, disponivel boolean, dia_parcial boolean
) language plpgsql stable security invoker set search_path = '' as $$
begin
  if p_inicio is null or p_fim is null or p_fim < p_inicio or p_fim - p_inicio > 365 then
    raise exception 'Informe um intervalo de ate 366 dias.' using errcode = '22023';
  end if;
  if p_fuso is null or not exists (select 1 from pg_timezone_names where name = p_fuso) then
    raise exception 'Fuso horario invalido.' using errcode = '22023';
  end if;
  if p_fim > (statement_timestamp() at time zone p_fuso)::date then
    raise exception 'Custos futuros ainda nao foram observados.' using errcode = '22023';
  end if;
  return query
  with inicio as (
    select min(h.registrado_em) as desde from public.receita_custos_historico h
      where h.receita_id = p_receita_id
  ), dias as (
    select p_inicio + s.n as d from generate_series(0, p_fim - p_inicio) s(n)
  ) select d.d,
    case when not h.excluida then h.custo_total end,
    case when not h.excluida then h.custo_unitario end,
    h.rendimento_valor, h.rendimento_unidade, h.moeda, h.id, h.registrado_em,
    i.desde, coalesce(not h.excluida, false),
    i.desde > (d.d::timestamp at time zone p_fuso)
      or d.d = (statement_timestamp() at time zone p_fuso)::date
  from dias d cross join inicio i
  left join lateral (
    select c.* from public.receita_custos_historico c
    where c.receita_id = p_receita_id
      and c.registrado_em < least((d.d + 1)::timestamp at time zone p_fuso, statement_timestamp())
    order by c.registrado_em desc, c.id desc limit 1
  ) h on true
  where i.desde is not null order by d.d;
end;
$$;
revoke all on function public.custo_receita_em(uuid,timestamptz) from public, anon;
revoke all on function public.custos_receita_por_dia(uuid,date,date,text) from public, anon;
grant execute on function public.custo_receita_em(uuid,timestamptz) to authenticated, service_role;
grant execute on function public.custos_receita_por_dia(uuid,date,date,text) to authenticated, service_role;

-- Start now, not midnight or the recipe creation date. No invented past values.
do $$
declare r record;
begin
  for r in select id,user_id from public.receitas order by user_id,id loop
    perform private.registrar_custo_receita(r.id,r.user_id,true);
  end loop;
end;
$$;
notify pgrst, 'reload schema';
