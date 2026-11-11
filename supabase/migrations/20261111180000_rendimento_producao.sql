-- Preserve the planning basis on each execution; historical completions stay unknown.
alter table public.producao_tarefas
  add column receita_nome text,
  add column rendimento_previsto numeric check(rendimento_previsto > 0 and rendimento_previsto < 1000000000000),
  add column rendimento_real numeric check(rendimento_real >= 0 and rendimento_real < 1000000000000 and rendimento_real=round(rendimento_real,3)),
  add column rendimento_unidade text;
alter table public.producao_tarefas_historico
  add column rendimento_previsto numeric,
  add column rendimento_real numeric,
  add column rendimento_unidade text;

create function public.registrar_previsao_producao() returns trigger
language plpgsql security definer set search_path='' as $$
declare v_receita public.receitas%rowtype;
begin
  -- Recipe deletion uses SET NULL: keep already captured names/units/yields.
  if new.receita_id is null then return new; end if;
  if tg_op='UPDATE' then
    if new.receita_id is not distinct from old.receita_id and new.quantidade is not distinct from old.quantidade then return new; end if;
    if old.status <> 'a_fazer' then raise exception 'Reabra a tarefa antes de alterar a receita ou a quantidade.' using errcode='23514'; end if;
  end if;
  select * into v_receita from public.receitas where id=new.receita_id and user_id=new.user_id;
  if not found then raise exception 'Receita indisponível nesta conta.' using errcode='42501'; end if;
  if coalesce(new.quantidade,1)<=0 or coalesce(new.quantidade,1)>=1000000000000 then
    raise exception 'Informe quantas vezes a receita será produzida.' using errcode='22023';
  end if;
  new.receita_nome := v_receita.nome;
  new.rendimento_unidade := nullif(btrim(v_receita.rendimento_unidade),'');
  new.rendimento_previsto := case when v_receita.rendimento_valor>0 and new.rendimento_unidade is not null
    then nullif(round(v_receita.rendimento_valor*coalesce(new.quantidade,1),3),0) else null end;
  new.rendimento_real := null;
  return new;
end;
$$;
revoke all on function public.registrar_previsao_producao() from public,anon,authenticated;
create trigger registrar_previsao_producao before insert or update of receita_id,quantidade on public.producao_tarefas
for each row execute function public.registrar_previsao_producao();

-- Private worker shared by the authenticated app and the validated shared link.
create function private.mover_producao_com_rendimento(p_owner uuid,p_tarefa uuid,p_status public.producao_status,
  p_expected_updated_at timestamptz,p_real numeric,p_origem text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_task public.producao_tarefas%rowtype; v_old public.producao_status; v_receita public.receitas%rowtype;
begin
  select * into v_task from public.producao_tarefas where id=p_tarefa and user_id=p_owner for update;
  if not found then raise exception 'Tarefa não encontrada.' using errcode='P0002'; end if;
  if p_status is null then raise exception 'Situação inválida.' using errcode='22023'; end if;
  -- Retrying the same completed transition must not record it twice.
  if v_task.status=p_status and (p_status<>'feito' or v_task.rendimento_real is not distinct from p_real) then return to_jsonb(v_task); end if;
  if p_expected_updated_at is null or v_task.updated_at is distinct from p_expected_updated_at then
    raise exception 'A tarefa mudou. Atualize a página e confira antes de continuar.' using errcode='40001';
  end if;
  if p_origem='link_compartilhado' and not ((v_task.status='a_fazer' and p_status='em_producao') or (v_task.status='em_producao' and p_status='feito')) then
    raise exception 'Este link permite apenas avançar a produção.' using errcode='42501';
  end if;
  v_old := v_task.status;
  -- Legacy, still-open tasks get a baseline once; never invent past actual yields.
  if v_task.rendimento_previsto is null and v_task.receita_id is not null and v_old<>'feito' then
    select * into v_receita from public.receitas where id=v_task.receita_id and user_id=p_owner;
    v_task.receita_nome := coalesce(v_task.receita_nome,v_receita.nome);
    v_task.rendimento_unidade := coalesce(v_task.rendimento_unidade,nullif(btrim(v_receita.rendimento_unidade),''));
    if v_receita.rendimento_valor>0 and coalesce(v_task.quantidade,1)>0 and v_task.rendimento_unidade is not null then
      v_task.rendimento_previsto := nullif(round(v_receita.rendimento_valor*coalesce(v_task.quantidade,1),3),0);
    end if;
  end if;
  if p_status='feito' and (v_task.receita_id is not null or v_task.receita_nome is not null) then
    if p_real is null or not (p_real>=0 and p_real<1000000000000) or p_real<>round(p_real,3) then
      raise exception 'Informe quanto a produção rendeu, com até três casas decimais.' using errcode='22023';
    end if;
    if nullif(btrim(v_task.rendimento_unidade),'') is null then
      raise exception 'Cadastre a unidade de rendimento na receita antes de finalizar.' using errcode='23514';
    end if;
  else p_real := null;
  end if;
  update public.producao_tarefas set status=p_status,
    receita_nome=v_task.receita_nome,rendimento_previsto=v_task.rendimento_previsto,rendimento_unidade=v_task.rendimento_unidade,
    rendimento_real=p_real,
    iniciado_em=case when p_status='em_producao' then coalesce(iniciado_em,clock_timestamp()) else iniciado_em end,
    concluido_em=case when p_status='feito' then clock_timestamp() else null end,
    updated_at=clock_timestamp()
    where id=p_tarefa and user_id=p_owner returning * into v_task;
  insert into public.producao_tarefas_historico(user_id,tarefa_id,de_status,para_status,movido_por,origem,
    rendimento_previsto,rendimento_real,rendimento_unidade)
  values(p_owner,p_tarefa,v_old,p_status,case when p_origem='app' then auth.uid() else null end,p_origem,
    v_task.rendimento_previsto,v_task.rendimento_real,v_task.rendimento_unidade);
  return to_jsonb(v_task);
end;
$$;
revoke all on function private.mover_producao_com_rendimento(uuid,uuid,public.producao_status,timestamptz,numeric,text) from public,anon,authenticated,service_role;

create function public.mover_tarefa_producao(p_tarefa_id uuid,p_status public.producao_status,p_expected_updated_at timestamptz,p_rendimento_real numeric default null)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null or not coalesce(private.can_use_app(),false) then raise exception 'Sua conta não tem acesso ativo.' using errcode='42501'; end if;
  return private.mover_producao_com_rendimento(auth.uid(),p_tarefa_id,p_status,p_expected_updated_at,p_rendimento_real,'app');
end;
$$;
revoke all on function public.mover_tarefa_producao(uuid,public.producao_status,timestamptz,numeric) from public,anon;
grant execute on function public.mover_tarefa_producao(uuid,public.producao_status,timestamptz,numeric) to authenticated;

create function public.avancar_producao_compartilhada(p_link_id uuid,p_tarefa_id uuid,p_expected_updated_at timestamptz,p_rendimento_real numeric default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_link public.producao_links_compartilhados%rowtype; v_task public.producao_tarefas%rowtype; v_next public.producao_status;
begin
  select * into v_link from public.producao_links_compartilhados where id=p_link_id and revogado_em is null and expira_em>clock_timestamp() for share;
  if not found then raise exception 'Link inválido ou expirado.' using errcode='42501'; end if;
  if not coalesce((private.account_access(v_link.user_id)->>'can_access')::boolean,false) then raise exception 'Compartilhamento indisponível.' using errcode='42501'; end if;
  select * into v_task from public.producao_tarefas where id=p_tarefa_id and user_id=v_link.user_id and data_producao=v_link.data_producao for update;
  if not found then raise exception 'Tarefa não encontrada.' using errcode='P0002'; end if;
  if v_task.updated_at is distinct from p_expected_updated_at then
    if v_task.status='feito' and v_task.rendimento_real is not distinct from p_rendimento_real then return to_jsonb(v_task); end if;
    raise exception 'A tarefa mudou. Atualize a página antes de continuar.' using errcode='40001';
  end if;
  v_next := case v_task.status when 'a_fazer' then 'em_producao'::public.producao_status when 'em_producao' then 'feito'::public.producao_status else null end;
  if v_next is null then raise exception 'Esta tarefa já foi concluída.' using errcode='23514'; end if;
  return private.mover_producao_com_rendimento(v_link.user_id,p_tarefa_id,v_next,p_expected_updated_at,p_rendimento_real,'link_compartilhado');
end;
$$;
revoke all on function public.avancar_producao_compartilhada(uuid,uuid,timestamptz,numeric) from public,anon,authenticated;
grant execute on function public.avancar_producao_compartilhada(uuid,uuid,timestamptz,numeric) to service_role;

-- Create daily executions once, together with their yield baseline and history.
create function public.materializar_cronograma_producao(p_data date,p_timezone text default 'America/Sao_Paulo')
returns integer language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid(); v_rec public.producao_tarefas_recorrentes%rowtype; v_id uuid; v_total integer:=0;
begin
  if v_user is null or not coalesce(private.can_use_app(),false) then raise exception 'Sua conta não tem acesso ativo.' using errcode='42501'; end if;
  if p_data is null or not exists(select 1 from pg_timezone_names where name=p_timezone) then raise exception 'Data ou fuso inválido.' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended('production-day:' || v_user::text || p_data::text,0));
  for v_rec in select r.* from public.producao_tarefas_recorrentes r
    where r.user_id=v_user and r.ativo and extract(dow from p_data)::integer=any(r.dias_semana)
      and (r.data_inicio is null or r.data_inicio<=p_data) and (r.data_fim is null or r.data_fim>=p_data)
      and (r.area_id is null or exists(select 1 from public.producao_areas a where a.id=r.area_id and a.user_id=v_user and a.ativo))
      and not exists(select 1 from public.producao_tarefas t where t.user_id=v_user and t.data_producao=p_data and t.recorrente_id=r.id)
    order by r.created_at,r.id
  loop
    if not exists(select 1 from public.folha_pagamento f where f.id=v_rec.funcionario_id and f.user_id=v_user) then
      raise exception 'Responsável indisponível nesta conta.' using errcode='42501';
    end if;
    insert into public.producao_tarefas(user_id,data_producao,titulo,funcionario_id,receita_id,quantidade,observacoes,area_id,recorrente_id,inicio_previsto,fim_previsto,ordem)
    values(v_user,p_data,v_rec.titulo,v_rec.funcionario_id,v_rec.receita_id,v_rec.quantidade,v_rec.observacoes,v_rec.area_id,v_rec.id,
      (p_data+v_rec.hora_inicio) at time zone p_timezone,
      (p_data+v_rec.hora_fim+case when v_rec.hora_fim<v_rec.hora_inicio then interval '1 day' else interval '0 day' end) at time zone p_timezone,
      (select coalesce(max(t.ordem),-1)+1 from public.producao_tarefas t where t.user_id=v_user and t.data_producao=p_data)) returning id into v_id;
    insert into public.producao_tarefas_historico(user_id,tarefa_id,para_status,movido_por) values(v_user,v_id,'a_fazer',v_user);
    v_total:=v_total+1;
  end loop;
  return v_total;
end;
$$;
revoke all on function public.materializar_cronograma_producao(date,text) from public,anon;
grant execute on function public.materializar_cronograma_producao(date,text) to authenticated;
