-- Prepared inventory is independent of purchased ingredients. Only the RPC writes
-- balances/history; recipe costs remain live and follow the recipe editor rules.
create table public.geladeira_itens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  receita_id uuid not null unique references public.receitas(id) on delete no action,
  unidade text not null,
  estoque_atual numeric not null default 0 check (estoque_atual >= 0 and estoque_atual < 1000000000000),
  estoque_minimo numeric not null default 0 check (estoque_minimo >= 0 and estoque_minimo < 1000000000000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index geladeira_itens_user_idx on public.geladeira_itens(user_id);
create table public.geladeira_movimentacoes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id uuid references public.geladeira_itens(id) on delete set null,
  receita_id uuid references public.receitas(id) on delete set null,
  receita_nome text not null,
  unidade text not null,
  tipo text not null check (tipo in ('entrada','saida','ajuste','minimo','remocao')),
  quantidade numeric not null,
  saldo_anterior numeric not null,
  saldo_atual numeric not null,
  custo_unitario numeric,
  observacao text,
  request_id uuid not null,
  solicitacao jsonb not null,
  created_at timestamptz not null default now(),
  unique(user_id, request_id)
);
create index geladeira_movimentacoes_user_data_idx on public.geladeira_movimentacoes(user_id, created_at desc, id desc);
create index geladeira_movimentacoes_item_idx on public.geladeira_movimentacoes(item_id);
create index geladeira_movimentacoes_receita_idx on public.geladeira_movimentacoes(receita_id);
alter table public.geladeira_itens enable row level security;
alter table public.geladeira_movimentacoes enable row level security;
create policy geladeira_itens_read on public.geladeira_itens for select to authenticated
  using (user_id = (select auth.uid()) and (select private.can_use_app()));
create policy geladeira_movimentacoes_read on public.geladeira_movimentacoes for select to authenticated
  using (user_id = (select auth.uid()) and (select private.can_use_app()));
revoke all on public.geladeira_itens, public.geladeira_movimentacoes from anon, authenticated;
grant select on public.geladeira_itens, public.geladeira_movimentacoes to authenticated;
grant all on public.geladeira_itens, public.geladeira_movimentacoes to service_role;

-- A kilogram balance must never silently become a gram/unit balance after editing.
create function public.proteger_unidade_geladeira() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if lower(btrim(coalesce(new.rendimento_unidade,''))) is distinct from lower(btrim(coalesce(old.rendimento_unidade,'')))
     and exists(select 1 from public.geladeira_itens where receita_id = old.id) then
    raise exception 'Remova esta receita da Geladeira antes de alterar a unidade de rendimento.' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function public.proteger_unidade_geladeira() from public, anon, authenticated;
create trigger proteger_unidade_geladeira before update of rendimento_unidade on public.receitas
for each row execute function public.proteger_unidade_geladeira();

create function public.movimentar_geladeira(
  p_receita_id uuid, p_tipo text, p_quantidade numeric, p_request_id uuid,
  p_estoque_minimo numeric default null, p_observacao text default null,
  p_saldo_esperado numeric default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_receita public.receitas%rowtype;
  v_item public.geladeira_itens%rowtype;
  v_evento public.geladeira_movimentacoes%rowtype;
  v_solicitacao jsonb := jsonb_build_object('receita',p_receita_id,'tipo',p_tipo,'quantidade',p_quantidade,
    'minimo',p_estoque_minimo,'observacao',p_observacao,'saldo_esperado',p_saldo_esperado);
  v_saldo numeric;
  v_custo numeric;
  v_id uuid;
begin
  if v_user is null or not private.can_use_app() then
    raise exception 'Sua conta não tem acesso ativo.' using errcode = '42501';
  end if;
  if p_request_id is null or p_receita_id is null or p_tipo is null or p_tipo not in ('entrada','saida','ajuste','minimo','remocao') then
    raise exception 'Movimentação inválida.' using errcode = '22023';
  end if;
  -- Serialize retries and simultaneous operations for the same account/recipe.
  perform pg_advisory_xact_lock(hashtextextended(v_user::text || p_request_id::text,0));
  select * into v_evento from public.geladeira_movimentacoes where user_id=v_user and request_id=p_request_id;
  if found then
    if v_evento.solicitacao is distinct from v_solicitacao then
      raise exception 'Identificador já utilizado em outra movimentação.' using errcode = '22023';
    end if;
    return v_evento.id;
  end if;
  select * into v_receita from public.receitas where id=p_receita_id and user_id=v_user for update;
  if not found then raise exception 'Receita não encontrada.' using errcode = '42501'; end if;
  if p_quantidade is null or not (p_quantidade >= 0 and p_quantidade < 1000000000000)
     or p_quantidade <> round(p_quantidade,3)
     or (p_tipo in ('entrada','saida') and p_quantidade = 0) then
    raise exception 'Informe uma quantidade válida, com até 3 casas decimais.' using errcode = '22023';
  end if;
  if p_estoque_minimo is not null and (not (p_estoque_minimo >= 0 and p_estoque_minimo < 1000000000000) or p_estoque_minimo <> round(p_estoque_minimo,3)) then
    raise exception 'Estoque mínimo inválido.' using errcode = '22023';
  end if;
  if length(coalesce(p_observacao,'')) > 500 then raise exception 'Observação muito longa.' using errcode = '22023'; end if;
  select * into v_item from public.geladeira_itens where receita_id=p_receita_id and user_id=v_user for update;
  if not found then
    if p_tipo <> 'entrada' then raise exception 'Adicione a receita à Geladeira primeiro.' using errcode = '22023'; end if;
    if v_receita.status is distinct from 'finalizada' or v_receita.rendimento_valor is null
      or not (v_receita.rendimento_valor > 0 and v_receita.rendimento_valor < 1000000000000)
      or nullif(btrim(v_receita.rendimento_unidade),'') is null then
      raise exception 'Finalize a receita e informe seu rendimento e unidade antes de adicioná-la.' using errcode = '23514';
    end if;
    insert into public.geladeira_itens(user_id,receita_id,unidade,estoque_minimo)
    values(v_user,p_receita_id,lower(btrim(v_receita.rendimento_unidade)),coalesce(p_estoque_minimo,0)) returning * into v_item;
  end if;
  if p_tipo = 'entrada' or (p_tipo = 'ajuste' and p_quantidade > v_item.estoque_atual) then
    if v_receita.status is distinct from 'finalizada' or not (coalesce(v_receita.rendimento_valor,0) > 0 and v_receita.rendimento_valor < 1000000000000)
      or nullif(btrim(v_receita.rendimento_unidade),'') is null then
      raise exception 'Finalize a receita e informe seu rendimento e unidade.' using errcode = '23514';
    end if;
    if v_item.estoque_atual = 0 then v_item.unidade := lower(btrim(v_receita.rendimento_unidade)); end if;
  end if;
  if p_tipo = 'ajuste' and (p_saldo_esperado is null or p_saldo_esperado <> v_item.estoque_atual) then
    raise exception 'O saldo mudou. Recarregue a Geladeira e confira a quantidade antes de ajustar.' using errcode = '40001';
  end if;
  if p_tipo = 'remocao' and v_item.estoque_atual <> 0 then
    raise exception 'Zere o saldo antes de remover a receita da Geladeira.' using errcode = '23514';
  end if;
  v_saldo := case p_tipo when 'entrada' then v_item.estoque_atual+p_quantidade
    when 'saida' then v_item.estoque_atual-p_quantidade when 'ajuste' then p_quantidade else v_item.estoque_atual end;
  if not (v_saldo >= 0 and v_saldo < 1000000000000) then raise exception 'Quantidade superior ao saldo disponível ou fora do limite.' using errcode = '23514'; end if;
  -- Same components as calcularDadosReceita: ingredients, packaging, labor and
  -- the stored sub-recipe basis used by the existing recipe editor. No final markup.
  if v_receita.rendimento_valor > 0 then
    select (
      coalesce((select sum(i.quantidade * p.custo_unitario / case when p.unidade_uso is not null and p.unidade_uso <> '' then coalesce(nullif(p.fator_conversao,0),1) else 1 end)
        from public.receita_ingredientes i join public.produtos p on p.id=i.produto_id and p.user_id=v_user where i.receita_id=p_receita_id),0)
      + coalesce((select sum(i.quantidade * p.custo_unitario / case when p.unidade_uso is not null and p.unidade_uso <> '' then coalesce(nullif(p.fator_conversao,0),1) else 1 end)
        from public.receita_embalagens i join public.produtos p on p.id=i.produto_id and p.user_id=v_user where i.receita_id=p_receita_id),0)
      + coalesce((select sum(valor_total) from public.receita_mao_obra where receita_id=p_receita_id),0)
      + coalesce((select sum(s.quantidade * r.preco_venda / case when r.rendimento_valor > 0 then r.rendimento_valor else 1 end)
        from public.receita_sub_receitas s join public.receitas r on r.id=s.sub_receita_id and r.user_id=v_user where s.receita_id=p_receita_id),0)
    ) / v_receita.rendimento_valor into v_custo;
  end if;
  update public.geladeira_itens set estoque_atual=v_saldo, unidade=v_item.unidade,
    estoque_minimo=coalesce(p_estoque_minimo,estoque_minimo), updated_at=clock_timestamp() where id=v_item.id;
  insert into public.geladeira_movimentacoes(user_id,item_id,receita_id,receita_nome,unidade,tipo,quantidade,
    saldo_anterior,saldo_atual,custo_unitario,observacao,request_id,solicitacao)
  values(v_user,v_item.id,p_receita_id,v_receita.nome,v_item.unidade,p_tipo,v_saldo-v_item.estoque_atual,
    v_item.estoque_atual,v_saldo,v_custo,nullif(btrim(p_observacao),''),p_request_id,v_solicitacao) returning id into v_id;
  if p_tipo='remocao' then delete from public.geladeira_itens where id=v_item.id; end if;
  return v_id;
end;
$$;
revoke all on function public.movimentar_geladeira(uuid,text,numeric,uuid,numeric,text,numeric) from public, anon;
grant execute on function public.movimentar_geladeira(uuid,text,numeric,uuid,numeric,text,numeric) to authenticated;
