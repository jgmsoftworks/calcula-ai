-- Use the stock workflows for prepared inventory while keeping ingredient balances independent.
alter table public.geladeira_movimentacoes
  add column comprovante_id uuid references public.comprovantes(id) on delete set null,
  add column responsavel text,
  add column motivo text;
create index geladeira_movimentacoes_comprovante_idx on public.geladeira_movimentacoes(comprovante_id);
alter table public.comprovantes add column geladeira_solicitacao jsonb;
alter table public.perdas
  add column origem_estoque text,
  add column unidade text,
  add column geladeira_item_id uuid references public.geladeira_itens(id) on delete set null;
create index perdas_geladeira_item_idx on public.perdas(geladeira_item_id);
create table private.geladeira_perdas_solicitacoes (
  user_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null,
  solicitacao jsonb not null,
  quantidade_itens integer not null,
  primary key(user_id,request_id)
);
alter table private.geladeira_perdas_solicitacoes enable row level security;
revoke all on private.geladeira_perdas_solicitacoes from public,anon,authenticated;

create function public.cadastrar_item_geladeira(p_receita_id uuid, p_estoque_minimo numeric default 0)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid(); v_receita public.receitas%rowtype; v_id uuid;
begin
  if v_user is null or not private.can_use_app() then raise exception 'Sua conta não tem acesso ativo.' using errcode='42501'; end if;
  if p_estoque_minimo is null or not (p_estoque_minimo >= 0 and p_estoque_minimo < 1000000000000)
    or p_estoque_minimo <> round(p_estoque_minimo,3) then raise exception 'Estoque mínimo inválido.' using errcode='22023'; end if;
  select * into v_receita from public.receitas where id=p_receita_id and user_id=v_user for update;
  if not found then raise exception 'Receita não encontrada.' using errcode='42501'; end if;
  if v_receita.status is distinct from 'finalizada' or not (coalesce(v_receita.rendimento_valor,0)>0 and v_receita.rendimento_valor<1000000000000)
    or nullif(btrim(v_receita.rendimento_unidade),'') is null then
    raise exception 'Finalize a receita e informe seu rendimento e unidade.' using errcode='23514'; end if;
  insert into public.geladeira_itens(user_id,receita_id,unidade,estoque_minimo)
  values(v_user,p_receita_id,lower(btrim(v_receita.rendimento_unidade)),p_estoque_minimo)
  on conflict(receita_id) do nothing returning id into v_id;
  if v_id is null then select id into v_id from public.geladeira_itens where receita_id=p_receita_id and user_id=v_user; end if;
  return v_id;
end;
$$;
revoke all on function public.cadastrar_item_geladeira(uuid,numeric) from public,anon;
grant execute on function public.cadastrar_item_geladeira(uuid,numeric) to authenticated;

create function public.finalizar_movimentacao_integrada(p_itens jsonb,p_responsavel text,p_observacao text,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_user uuid:=auth.uid(); v_item jsonb; v_geladeira record; v_evento_id uuid;
  v_produtos jsonb; v_comprovante public.comprovantes%rowtype; v_numero integer; v_saidas numeric;
  v_solicitacao jsonb:=jsonb_build_object('itens',p_itens,'responsavel',p_responsavel,'observacao',p_observacao);
begin
  if v_user is null or not private.can_use_app() then raise exception 'Sua conta não tem acesso ativo.' using errcode='42501'; end if;
  if p_request_id is null or p_itens is null or jsonb_typeof(p_itens) is distinct from 'array'
    or jsonb_array_length(p_itens) not between 1 and 200 then raise exception 'Confira os itens da movimentação.' using errcode='22023'; end if;
  if p_responsavel is null or length(btrim(p_responsavel)) not between 1 and 120 or length(coalesce(p_observacao,''))>2000 then
    raise exception 'Confira o responsável e a observação.' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_user::text,20261015));
  select * into v_comprovante from public.comprovantes where id=p_request_id and user_id=v_user;
  if found then
    if v_comprovante.geladeira_solicitacao is distinct from v_solicitacao then raise exception 'Identificador já utilizado em outra movimentação.' using errcode='22023'; end if;
    return to_jsonb(v_comprovante);
  end if;
  for v_item in select value from jsonb_array_elements(p_itens) loop
    if jsonb_typeof(v_item) is distinct from 'object' or coalesce(v_item->>'origem_estoque','produto') not in ('produto','geladeira')
      or coalesce(v_item->>'produto_id','') !~* '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$'
      or coalesce(v_item->>'tipo','') not in ('entrada','saida') or jsonb_typeof(v_item->'quantidade') is distinct from 'number'
      or not ((v_item->>'quantidade')::numeric>0 and (v_item->>'quantidade')::numeric<=999999999)
      or length(btrim(coalesce(v_item->>'motivo',''))) not between 1 and 200 then
      raise exception 'Confira os itens, quantidades e motivos.' using errcode='22023'; end if;
  end loop;
  -- Consistent recipe/item locks, including cumulative withdrawals of repeated cart lines.
  for v_item in select distinct jsonb_build_object('id',value->>'produto_id') from jsonb_array_elements(p_itens)
      where value->>'origem_estoque'='geladeira' order by 1 loop
    select g.*,r.nome into v_geladeira from public.geladeira_itens g join public.receitas r on r.id=g.receita_id
      where g.id=(v_item->>'id')::uuid and g.user_id=v_user and r.user_id=v_user for update of r,g;
    if not found then raise exception 'Item indisponível na Geladeira.' using errcode='P0002'; end if;
    select coalesce(sum((value->>'quantidade')::numeric),0) into v_saidas from jsonb_array_elements(p_itens)
      where value->>'origem_estoque'='geladeira' and (value->>'produto_id')::uuid=v_geladeira.id and value->>'tipo'='saida';
    if v_saidas>v_geladeira.estoque_atual then
      raise exception 'Estoque insuficiente para %. Disponível: %, saída total: %.',v_geladeira.nome,v_geladeira.estoque_atual,v_saidas using errcode='P0001'; end if;
  end loop;
  select coalesce(jsonb_agg(value),'[]'::jsonb) into v_produtos from jsonb_array_elements(p_itens) where coalesce(value->>'origem_estoque','produto')='produto';
  if jsonb_array_length(v_produtos)>0 then
    perform public.finalizar_movimentacao_estoque(v_produtos,p_responsavel,p_observacao,p_request_id);
  else
    select coalesce(max(numero),0)+1 into v_numero from public.comprovantes where user_id=v_user;
    insert into public.comprovantes(id,user_id,numero,tipo,responsavel,observacao,data_hora)
    values(p_request_id,v_user,v_numero,p_itens->0->>'tipo',btrim(p_responsavel),nullif(btrim(p_observacao),''),now());
  end if;
  for v_item in select value from jsonb_array_elements(p_itens) where value->>'origem_estoque'='geladeira' loop
    select * into v_geladeira from public.geladeira_itens where id=(v_item->>'produto_id')::uuid and user_id=v_user;
    v_evento_id:=public.movimentar_geladeira(v_geladeira.receita_id,v_item->>'tipo',(v_item->>'quantidade')::numeric,gen_random_uuid());
    update public.geladeira_movimentacoes set comprovante_id=p_request_id,responsavel=btrim(p_responsavel),motivo=btrim(v_item->>'motivo'),
      observacao=nullif(btrim(p_observacao),'') where id=v_evento_id and user_id=v_user;
  end loop;
  update public.comprovantes set geladeira_solicitacao=v_solicitacao where id=p_request_id and user_id=v_user returning * into v_comprovante;
  return to_jsonb(v_comprovante);
end;
$$;
revoke all on function public.finalizar_movimentacao_integrada(jsonb,text,text,uuid) from public,anon;
grant execute on function public.finalizar_movimentacao_integrada(jsonb,text,text,uuid) to authenticated;


create function private.custo_unitario_geladeira(p_receita_id uuid) returns numeric
language sql stable set search_path='' as $$
    select (
      coalesce((select sum(i.quantidade * p.custo_unitario / case when p.unidade_uso is not null and p.unidade_uso <> '' then coalesce(nullif(p.fator_conversao,0),1) else 1 end)
        from public.receita_ingredientes i join public.produtos p on p.id=i.produto_id and p.user_id=auth.uid() where i.receita_id=p_receita_id),0)
      + coalesce((select sum(i.quantidade * p.custo_unitario / case when p.unidade_uso is not null and p.unidade_uso <> '' then coalesce(nullif(p.fator_conversao,0),1) else 1 end)
        from public.receita_embalagens i join public.produtos p on p.id=i.produto_id and p.user_id=auth.uid() where i.receita_id=p_receita_id),0)
      + coalesce((select sum(valor_total) from public.receita_mao_obra where receita_id=p_receita_id),0)
      + coalesce((select sum(s.quantidade * r.preco_venda / case when r.rendimento_valor > 0 then r.rendimento_valor else 1 end)
        from public.receita_sub_receitas s join public.receitas r on r.id=s.sub_receita_id and r.user_id=auth.uid() where s.receita_id=p_receita_id),0)
    ) / r.rendimento_valor from public.receitas r where r.id=p_receita_id and r.user_id=auth.uid() and r.rendimento_valor>0;
$$;
revoke all on function private.custo_unitario_geladeira(uuid) from public,anon,authenticated;

create function public.registrar_perdas_geladeira(p_itens jsonb,p_motivo text,p_motivo_outro text,p_observacao text,p_responsavel text,p_baixar_estoque boolean,p_request_id uuid)
returns integer language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid(); v_item jsonb; v_geladeira record; v_evento_id uuid; v_custo numeric; v_qtd numeric;
  v_request private.geladeira_perdas_solicitacoes%rowtype;
  v_solicitacao jsonb:=jsonb_build_object('itens',p_itens,'motivo',p_motivo,'outro',p_motivo_outro,'obs',p_observacao,'responsavel',p_responsavel,'baixar',p_baixar_estoque);
begin
  if v_user is null or not private.can_use_app() then raise exception 'Sua conta não tem acesso ativo.' using errcode='42501'; end if;
  if p_request_id is null or p_itens is null or jsonb_typeof(p_itens) is distinct from 'array' or jsonb_array_length(p_itens) not between 1 and 200
    or nullif(btrim(p_motivo),'') is null or (p_motivo='Outro' and nullif(btrim(p_motivo_outro),'') is null) or p_baixar_estoque is null then
    raise exception 'Confira os itens e o motivo da perda.' using errcode='22023'; end if;
  if length(p_motivo)>200 or length(coalesce(p_motivo_outro,''))>500 or length(coalesce(p_responsavel,''))>120 or length(coalesce(p_observacao,''))>2000 then
    raise exception 'Os dados da perda são muito longos.' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_user::text,20261015));
  select * into v_request from private.geladeira_perdas_solicitacoes where user_id=v_user and request_id=p_request_id;
  if found then
    if v_request.solicitacao is distinct from v_solicitacao then raise exception 'Identificador já utilizado em outra perda.' using errcode='22023'; end if;
    return v_request.quantidade_itens;
  end if;
  for v_item in select value from jsonb_array_elements(p_itens) order by value->>'item_id' loop
    if coalesce(v_item->>'tipo','')<>'geladeira' or coalesce(v_item->>'item_id','') !~* '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$'
      or jsonb_typeof(v_item->'quantidade') is distinct from 'number' then raise exception 'Item de perda inválido.' using errcode='22023'; end if;
    v_qtd:=(v_item->>'quantidade')::numeric;
    if not(v_qtd>0 and v_qtd<=999999999) or v_qtd<>round(v_qtd,3) then raise exception 'Quantidade de perda inválida.' using errcode='22023'; end if;
    select g.*,r.nome,r.rendimento_valor into v_geladeira from public.geladeira_itens g join public.receitas r on r.id=g.receita_id
      where g.id=(v_item->>'item_id')::uuid and g.user_id=v_user and r.user_id=v_user for update of r,g;
    if not found then raise exception 'Item não encontrado na Geladeira.' using errcode='42501'; end if;
    if not(coalesce(v_geladeira.rendimento_valor,0)>0 and v_geladeira.rendimento_valor<1000000000000) then
      raise exception 'Corrija o rendimento da receita para calcular o custo da perda.' using errcode='23514'; end if;
    if p_baixar_estoque then
      v_evento_id:=public.movimentar_geladeira(v_geladeira.receita_id,'saida',v_qtd,gen_random_uuid());
      select custo_unitario into v_custo from public.geladeira_movimentacoes where id=v_evento_id;
      update public.geladeira_movimentacoes set motivo='Perda - '||p_motivo,responsavel=coalesce(nullif(btrim(p_responsavel),''),'Sistema'),
        observacao=nullif(btrim(p_observacao),'') where id=v_evento_id;
    else
      v_custo:=private.custo_unitario_geladeira(v_geladeira.receita_id);
    end if;
    if v_custo is null then raise exception 'Não foi possível calcular o custo da perda.' using errcode='23514'; end if;
    insert into public.perdas(user_id,tipo,receita_id,nome_item,quantidade,custo_unitario,custo_total,motivo,motivo_outro,observacao,responsavel,data_perda,origem_estoque,unidade,geladeira_item_id)
    values(v_user,'receita',v_geladeira.receita_id,v_geladeira.nome,v_qtd,v_custo,round(v_qtd*v_custo,2),p_motivo,
      case when p_motivo='Outro' then nullif(btrim(p_motivo_outro),'') end,nullif(btrim(p_observacao),''),nullif(btrim(p_responsavel),''),now(),
      'geladeira',v_geladeira.unidade,v_geladeira.id);
  end loop;
  insert into private.geladeira_perdas_solicitacoes values(v_user,p_request_id,v_solicitacao,jsonb_array_length(p_itens));
  return jsonb_array_length(p_itens);
end;
$$;
revoke all on function public.registrar_perdas_geladeira(jsonb,text,text,text,text,boolean,uuid) from public,anon;
grant execute on function public.registrar_perdas_geladeira(jsonb,text,text,text,text,boolean,uuid) to authenticated;
