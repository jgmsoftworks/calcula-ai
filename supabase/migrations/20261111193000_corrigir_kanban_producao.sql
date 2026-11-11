-- Keep executions and history, including canceled and duplicate occurrences.
alter table public.producao_tarefas
  add column cancelado_em timestamptz,
  add column duplicada_de uuid references public.producao_tarefas(id) on delete restrict,
  add column criacao_chave uuid,
  add column tempo_producao_segundos numeric,
  add column etapa_iniciada_em timestamptz;
create unique index producao_criacao_idempotente on public.producao_tarefas(user_id,criacao_chave) where criacao_chave is not null;
alter table public.producao_tarefas_historico drop constraint if exists producao_tarefas_historico_evento_tipo_check;
alter table public.producao_tarefas_historico add constraint producao_tarefas_historico_evento_tipo_check check(evento_tipo in ('status','responsavel','cancelamento','restauracao','edicao'));
alter table public.producao_tarefas_historico add column detalhes jsonb;

-- Preserve all original rows. Pick the furthest progressed execution as the principal.
with ranked as (
  select id, first_value(id) over(partition by user_id,recorrente_id,data_producao order by
    case status when 'feito' then 0 when 'em_producao' then 1 else 2 end,
    (iniciado_em is not null) desc,created_at,id) principal
  from public.producao_tarefas where recorrente_id is not null
), archived as (
  update public.producao_tarefas t set duplicada_de=r.principal,cancelado_em=clock_timestamp()
  from ranked r where t.id=r.id and r.id<>r.principal returning t.*
)
insert into public.producao_tarefas_historico(user_id,tarefa_id,de_status,para_status,evento_tipo,detalhes)
select user_id,id,status,status,'cancelamento',jsonb_build_object('motivo','Cópia duplicada da mesma recorrência e dia','principal',duplicada_de) from archived;
create unique index producao_uma_ocorrencia on public.producao_tarefas(user_id,recorrente_id,data_producao) where recorrente_id is not null and duplicada_de is null;
-- New screens cancel through the RPC; older clients cannot erase production history.
revoke delete on public.producao_tarefas from authenticated;

-- Repair the current state of older returned tasks; retain the discarded attempt in history.
with previous as materialized (
  select id,user_id,iniciado_em,concluido_em,rendimento_real from public.producao_tarefas
  where status='a_fazer' and (iniciado_em is not null or concluido_em is not null or rendimento_real is not null)
), repaired as (
  update public.producao_tarefas t set iniciado_em=null,concluido_em=null,rendimento_real=null
  from previous p where t.id=p.id returning t.id
)
insert into public.producao_tarefas_historico(user_id,tarefa_id,de_status,para_status,evento_tipo,detalhes)
select p.user_id,p.id,'a_fazer','a_fazer','edicao',jsonb_build_object(
  'motivo','Limpeza do início de uma tentativa devolvida para A fazer',
  'iniciado_em_anterior',p.iniciado_em,'concluido_em_anterior',p.concluido_em,'rendimento_real_anterior',p.rendimento_real)
from previous p join repaired r on r.id=p.id;

update public.producao_tarefas set
  tempo_producao_segundos=case when status='feito' and iniciado_em is not null and concluido_em>=iniciado_em then extract(epoch from concluido_em-iniciado_em) else null end,
  etapa_iniciada_em=case when status='em_producao' and cancelado_em is null then iniciado_em else null end;
create function public.contabilizar_tempo_producao() returns trigger language plpgsql set search_path='' as $$
begin
  -- A fazer means not started, not paused. Discard elapsed time for that attempt.
  if new.status='a_fazer' then
    new.iniciado_em:=null;
    new.concluido_em:=null;
    new.rendimento_real:=null;
    new.tempo_producao_segundos:=null;
    new.etapa_iniciada_em:=null;
    return new;
  end if;
  if old.etapa_iniciada_em is not null and (new.status<>'em_producao' or new.cancelado_em is not null) then
    new.tempo_producao_segundos:=coalesce(old.tempo_producao_segundos,0)+greatest(0,extract(epoch from clock_timestamp()-old.etapa_iniciada_em));
    new.etapa_iniciada_em:=null;
  elsif new.status='em_producao' and new.cancelado_em is null and old.etapa_iniciada_em is null then
    new.etapa_iniciada_em:=clock_timestamp();
    if old.status='a_fazer' then new.iniciado_em:=new.etapa_iniciada_em; end if;
  end if;
  return new;
end;
$$;
create trigger contabilizar_tempo_producao before update of status,cancelado_em on public.producao_tarefas for each row execute function public.contabilizar_tempo_producao();

create function private.validar_edicao_producao(p_owner uuid,p_input jsonb) returns void language plpgsql security definer set search_path='' as $$
declare v_recipe uuid:=nullif(p_input->>'receita_id','')::uuid; v_area uuid:=nullif(p_input->>'area_id','')::uuid;
begin
  if nullif(btrim(p_input->>'titulo'),'') is null then raise exception 'Informe o título da tarefa.' using errcode='22023'; end if;
  if not exists(select 1 from public.folha_pagamento where id=(p_input->>'funcionario_id')::uuid and user_id=p_owner) then raise exception 'Responsável indisponível nesta conta.' using errcode='42501'; end if;
  if v_area is not null and not exists(select 1 from public.producao_areas where id=v_area and user_id=p_owner and ativo) then raise exception 'Área indisponível nesta conta.' using errcode='42501'; end if;
  if v_recipe is not null and not exists(select 1 from public.receitas where id=v_recipe and user_id=p_owner and rendimento_valor>0 and nullif(btrim(rendimento_unidade),'') is not null) then raise exception 'A receita precisa de rendimento e unidade cadastrados.' using errcode='22023'; end if;
  if v_recipe is not null and (coalesce((p_input->>'quantidade')::numeric,0)<=0 or (p_input->>'quantidade')::numeric>=1000000000000) then raise exception 'Informe quantas vezes a receita será produzida.' using errcode='22023'; end if;
  if (p_input->>'fim_previsto')::timestamptz < (p_input->>'inicio_previsto')::timestamptz then raise exception 'Fim previsto deve ser após o início.' using errcode='22023'; end if;
end;
$$;
revoke all on function private.validar_edicao_producao(uuid,jsonb) from public,anon,authenticated,service_role;

create function public.criar_tarefa_producao(p_data date,p_chave uuid,p_input jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid(); v_task public.producao_tarefas%rowtype;
begin
  if v_user is null or not coalesce(private.can_use_app(),false) then raise exception 'Sua conta não tem acesso ativo.' using errcode='42501'; end if;
  if p_data is null or p_chave is null then raise exception 'Data ou identificação inválida.' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended('production-create:'||v_user::text||p_chave::text,0));
  select * into v_task from public.producao_tarefas where user_id=v_user and criacao_chave=p_chave;
  if found then return to_jsonb(v_task); end if;
  perform pg_advisory_xact_lock(hashtextextended('production-day:'||v_user::text||p_data::text,0));
  perform private.validar_edicao_producao(v_user,p_input);
  insert into public.producao_tarefas(user_id,data_producao,criacao_chave,titulo,funcionario_id,receita_id,quantidade,area_id,observacoes,inicio_previsto,fim_previsto,ordem)
  values(v_user,p_data,p_chave,btrim(p_input->>'titulo'),(p_input->>'funcionario_id')::uuid,nullif(p_input->>'receita_id','')::uuid,(p_input->>'quantidade')::numeric,
    nullif(p_input->>'area_id','')::uuid,nullif(btrim(p_input->>'observacoes'),''),(p_input->>'inicio_previsto')::timestamptz,(p_input->>'fim_previsto')::timestamptz,
    (select coalesce(max(ordem),-1)+1 from public.producao_tarefas where user_id=v_user and data_producao=p_data)) returning * into v_task;
  insert into public.producao_tarefas_historico(user_id,tarefa_id,para_status,movido_por) values(v_user,v_task.id,'a_fazer',v_user);
  return to_jsonb(v_task);
end;
$$;

create function public.editar_tarefa_producao(p_tarefa_id uuid,p_expected_updated_at timestamptz,p_input jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid(); v_task public.producao_tarefas%rowtype; v_before jsonb;
begin
  if v_user is null or not coalesce(private.can_use_app(),false) then raise exception 'Sua conta não tem acesso ativo.' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended('production-day:'||v_user::text||data_producao::text,0)) from public.producao_tarefas where id=p_tarefa_id and user_id=v_user;
  select * into v_task from public.producao_tarefas where id=p_tarefa_id and user_id=v_user for update;
  if not found then raise exception 'Tarefa não encontrada.' using errcode='P0002'; end if;
  if v_task.updated_at is distinct from p_expected_updated_at then raise exception 'A tarefa mudou. Recarregue os dados antes de salvar.' using errcode='40001'; end if;
  if v_task.cancelado_em is not null or v_task.status='feito' then raise exception 'Reabra ou restaure a tarefa antes de editar.' using errcode='23514'; end if;
  if v_task.status<>'a_fazer' and (v_task.receita_id is distinct from nullif(p_input->>'receita_id','')::uuid or v_task.quantidade is distinct from (p_input->>'quantidade')::numeric) then raise exception 'Volte a tarefa para A fazer antes de alterar receita ou quantidade.' using errcode='23514'; end if;
  perform private.validar_edicao_producao(v_user,p_input);
  v_before:=to_jsonb(v_task);
  update public.producao_tarefas set titulo=btrim(p_input->>'titulo'),funcionario_id=(p_input->>'funcionario_id')::uuid,
    receita_id=nullif(p_input->>'receita_id','')::uuid,quantidade=(p_input->>'quantidade')::numeric,
    receita_nome=case when nullif(p_input->>'receita_id','') is null then null else receita_nome end,
    rendimento_previsto=case when nullif(p_input->>'receita_id','') is null then null else rendimento_previsto end,
    rendimento_unidade=case when nullif(p_input->>'receita_id','') is null then null else rendimento_unidade end,
    area_id=nullif(p_input->>'area_id','')::uuid,observacoes=nullif(btrim(p_input->>'observacoes'),''),
    inicio_previsto=(p_input->>'inicio_previsto')::timestamptz,fim_previsto=(p_input->>'fim_previsto')::timestamptz
    where id=p_tarefa_id returning * into v_task;
  insert into public.producao_tarefas_historico(user_id,tarefa_id,de_status,para_status,movido_por,evento_tipo,detalhes)
    values(v_user,v_task.id,v_task.status,v_task.status,v_user,'edicao',jsonb_build_object('antes',v_before,'depois',to_jsonb(v_task)));
  return to_jsonb(v_task);
end;
$$;

create function public.cancelar_tarefa_producao(p_tarefa_id uuid,p_expected_updated_at timestamptz,p_restaurar boolean default false) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid(); v_task public.producao_tarefas%rowtype;
begin
  if v_user is null or not coalesce(private.can_use_app(),false) then raise exception 'Sua conta não tem acesso ativo.' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended('production-day:'||v_user::text||data_producao::text,0)) from public.producao_tarefas where id=p_tarefa_id and user_id=v_user;
  select * into v_task from public.producao_tarefas where id=p_tarefa_id and user_id=v_user for update;
  if not found then raise exception 'Tarefa não encontrada.' using errcode='P0002'; end if;
  if v_task.updated_at is distinct from p_expected_updated_at then raise exception 'A tarefa mudou. Atualize antes de continuar.' using errcode='40001'; end if;
  if not p_restaurar and v_task.status='feito' then raise exception 'Reabra a produção concluída antes de cancelar.' using errcode='23514'; end if;
  if (p_restaurar and v_task.cancelado_em is null) or (not p_restaurar and v_task.cancelado_em is not null) then return to_jsonb(v_task); end if;
  update public.producao_tarefas set cancelado_em=case when p_restaurar then null else clock_timestamp() end,
    -- A restored duplicate is an independent execution, never a second occurrence of the same template.
    recorrente_id=case when p_restaurar and duplicada_de is not null then null else recorrente_id end
    where id=p_tarefa_id returning * into v_task;
  insert into public.producao_tarefas_historico(user_id,tarefa_id,de_status,para_status,movido_por,evento_tipo)
    values(v_user,v_task.id,v_task.status,v_task.status,v_user,case when p_restaurar then 'restauracao' else 'cancelamento' end);
  return to_jsonb(v_task);
end;
$$;

create function public.reordenar_tarefas_producao(p_data date,p_status public.producao_status,p_ids uuid[],p_versions jsonb) returns void language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid(); v_ids uuid[]; v_task public.producao_tarefas%rowtype;
begin
  if v_user is null or not coalesce(private.can_use_app(),false) then raise exception 'Sua conta não tem acesso ativo.' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended('production-day:'||v_user::text||p_data::text,0));
  for v_task in select * from public.producao_tarefas where user_id=v_user and data_producao=p_data and status=p_status and cancelado_em is null order by id for update loop
    if v_task.updated_at is distinct from (p_versions->>v_task.id::text)::timestamptz then raise exception 'O quadro mudou. Tente reorganizar novamente.' using errcode='40001'; end if;
  end loop;
  select array_agg(id order by id) into v_ids from public.producao_tarefas where user_id=v_user and data_producao=p_data and status=p_status and cancelado_em is null;
  if v_ids is distinct from (select array_agg(x order by x) from unnest(p_ids) x) then raise exception 'O quadro mudou. Atualize antes de reorganizar.' using errcode='40001'; end if;
  update public.producao_tarefas t set ordem=x.n::integer from unnest(p_ids) with ordinality x(id,n) where t.id=x.id and t.user_id=v_user;
end;
$$;

revoke all on function public.criar_tarefa_producao(date,uuid,jsonb) from public,anon;
revoke all on function public.editar_tarefa_producao(uuid,timestamptz,jsonb) from public,anon;
revoke all on function public.cancelar_tarefa_producao(uuid,timestamptz,boolean) from public,anon;
revoke all on function public.reordenar_tarefas_producao(date,public.producao_status,uuid[],jsonb) from public,anon;
grant execute on function public.criar_tarefa_producao(date,uuid,jsonb), public.editar_tarefa_producao(uuid,timestamptz,jsonb), public.cancelar_tarefa_producao(uuid,timestamptz,boolean), public.reordenar_tarefas_producao(date,public.producao_status,uuid[],jsonb) to authenticated;

create or replace function private.mover_producao_com_rendimento(p_owner uuid,p_tarefa uuid,p_status public.producao_status,
  p_expected_updated_at timestamptz,p_real numeric,p_origem text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_task public.producao_tarefas%rowtype; v_old public.producao_status; v_receita public.receitas%rowtype;
begin
  perform pg_advisory_xact_lock(hashtextextended('production-day:'||p_owner::text||data_producao::text,0)) from public.producao_tarefas where id=p_tarefa and user_id=p_owner;
  select * into v_task from public.producao_tarefas where id=p_tarefa and user_id=p_owner for update;
  if not found then raise exception 'Tarefa não encontrada.' using errcode='P0002'; end if;
  if v_task.cancelado_em is not null then raise exception 'Esta tarefa foi cancelada.' using errcode='23514'; end if;
  if v_task.status='a_fazer' and p_status='feito' then raise exception 'Inicie a produção antes de finalizar.' using errcode='23514'; end if;
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
    ordem=(select coalesce(max(t.ordem),-1)+1 from public.producao_tarefas t where t.user_id=p_owner and t.data_producao=v_task.data_producao and t.status=p_status and t.cancelado_em is null),
    receita_nome=v_task.receita_nome,rendimento_previsto=v_task.rendimento_previsto,rendimento_unidade=v_task.rendimento_unidade,
    rendimento_real=p_real,
    iniciado_em=case when p_status='a_fazer' then null when p_status='em_producao' and v_old='a_fazer' then clock_timestamp() else iniciado_em end,
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

create or replace function public.mover_tarefa_producao(p_tarefa_id uuid,p_status public.producao_status,p_expected_updated_at timestamptz,p_rendimento_real numeric default null)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null or not coalesce(private.can_use_app(),false) then raise exception 'Sua conta não tem acesso ativo.' using errcode='42501'; end if;
  return private.mover_producao_com_rendimento(auth.uid(),p_tarefa_id,p_status,p_expected_updated_at,p_rendimento_real,'app');
end;
$$;
revoke all on function public.mover_tarefa_producao(uuid,public.producao_status,timestamptz,numeric) from public,anon;
grant execute on function public.mover_tarefa_producao(uuid,public.producao_status,timestamptz,numeric) to authenticated;

create or replace function public.avancar_producao_compartilhada(p_link_id uuid,p_tarefa_id uuid,p_expected_updated_at timestamptz,p_rendimento_real numeric default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_link public.producao_links_compartilhados%rowtype; v_task public.producao_tarefas%rowtype; v_next public.producao_status;
begin
  select * into v_link from public.producao_links_compartilhados where id=p_link_id and revogado_em is null and expira_em>clock_timestamp() for share;
  if not found then raise exception 'Link inválido ou expirado.' using errcode='42501'; end if;
  if not coalesce((private.account_access(v_link.user_id)->>'can_access')::boolean,false) then raise exception 'Compartilhamento indisponível.' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended('production-day:'||v_link.user_id::text||v_link.data_producao::text,0));
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


create or replace function public.materializar_cronograma_producao(p_data date,p_timezone text default 'America/Sao_Paulo')
returns integer language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid(); v_rec public.producao_tarefas_recorrentes%rowtype; v_id uuid; v_total integer:=0;
begin
  if v_user is null or not coalesce(private.can_use_app(),false) then raise exception 'Sua conta não tem acesso ativo.' using errcode='42501'; end if;
  if p_data is null or not exists(select 1 from pg_timezone_names where name=p_timezone) then raise exception 'Data ou fuso inválido.' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended('production-day:' || v_user::text || p_data::text,0));
  for v_rec in select r.* from public.producao_tarefas_recorrentes r
    where r.user_id=v_user and r.ativo and extract(dow from p_data)::integer=any(r.dias_semana)
      and coalesce(r.data_inicio,(r.created_at at time zone p_timezone)::date)<=p_data and (r.data_fim is null or r.data_fim>=p_data)
      and (r.area_id is null or exists(select 1 from public.producao_areas a where a.id=r.area_id and a.user_id=v_user and a.ativo))
      and not exists(select 1 from public.producao_tarefas t where t.user_id=v_user and t.data_producao=p_data and t.recorrente_id=r.id)
    order by r.hora_inicio nulls last,r.created_at,r.id
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
