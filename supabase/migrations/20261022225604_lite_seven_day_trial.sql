-- Existing accounts keep their current access. Only new accounts start a trial.
alter table public.profiles add column access_mode text not null default 'legacy'
  check (access_mode in ('legacy', 'trial', 'subscription'));
alter table public.profiles alter column access_mode set default 'trial';
alter table public.profiles add column trial_started_at timestamptz;

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

-- Never trust signup metadata or browser writes for entitlements.
create or replace function public.prevent_is_admin_self_update()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if auth.role() = 'authenticated'
    and not coalesce(public.has_role_or_higher('admin', auth.uid()), false) then
    new.user_id := old.user_id;
    new.is_admin := old.is_admin;
    new.role := old.role;
    new.plan := old.plan;
    new.plan_expires_at := old.plan_expires_at;
    new.access_mode := old.access_mode;
    new.trial_started_at := old.trial_started_at;
    new.trial_ends_at := old.trial_ends_at;
    new.subscription_status := old.subscription_status;
    new.grace_period_ends_at := old.grace_period_ends_at;
    new.access_blocked_at := old.access_blocked_at;
  end if;
  return new;
end;
$$;

create function private.initialize_trial_profile()
returns trigger language plpgsql security definer set search_path = '' as $$
declare account_created_at timestamptz;
begin
  if auth.role() = 'authenticated' then
    new.is_admin := false;
    new.role := 'user';
    new.access_mode := 'trial';
    new.plan := 'lite';
    new.plan_expires_at := null;
    new.subscription_status := 'active';
    new.access_blocked_at := null;
    new.grace_period_ends_at := null;
  end if;
  if new.access_mode = 'trial' then
    select created_at into account_created_at from auth.users where id = new.user_id;
    new.trial_started_at := coalesce(account_created_at, now());
    new.trial_ends_at := new.trial_started_at + interval '7 days';
    new.plan := 'lite';
  end if;
  return new;
end;
$$;
revoke all on function private.initialize_trial_profile() from public, anon, authenticated;
create trigger initialize_trial_profile before insert on public.profiles
for each row execute function private.initialize_trial_profile();

-- The profile and trial exist before signup returns (email and OAuth signups).
create function private.create_signup_profile()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (user_id, full_name, business_name, phone, celular, whatsapp,
    plan, access_mode, trial_started_at, trial_ends_at)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'business_name',
    new.raw_user_meta_data->>'phone', new.raw_user_meta_data->>'phone', new.raw_user_meta_data->>'phone',
    'lite', 'trial', new.created_at, new.created_at + interval '7 days')
  on conflict (user_id) do nothing;
  return new;
end;
$$;
revoke all on function private.create_signup_profile() from public, anon, authenticated;
create trigger create_signup_profile after insert on auth.users
for each row execute function private.create_signup_profile();

-- One server-clock decision shared by the UI, RLS, RPCs and service-role functions.
create function private.account_access(account_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare p public.profiles%rowtype; allowed boolean; reason text; admin_access boolean;
begin
  select * into p from public.profiles where user_id = account_id;
  admin_access := coalesce(public.has_role_or_higher('admin', account_id), false);
  if p.user_id is null then
    return jsonb_build_object('can_access', false, 'reason', 'profile_missing', 'server_now', now());
  end if;
  if admin_access then allowed := true; reason := 'admin';
  elsif p.access_mode = 'trial' then
    allowed := p.trial_ends_at is not null and p.trial_ends_at > now();
    reason := case when allowed then 'trial_active' else 'trial_expired' end;
  else
    allowed := p.access_blocked_at is null and (
      p.subscription_status = 'active' or
      (p.subscription_status = 'past_due' and p.grace_period_ends_at > now()));
    allowed := coalesce(allowed, false);
    reason := case when allowed then 'active' else 'payment_required' end;
  end if;
  return jsonb_build_object('can_access', allowed, 'reason', reason, 'server_now', now(),
    'access_mode', p.access_mode, 'plan', case when p.access_mode = 'trial' then 'lite' else p.plan end,
    'trial_ends_at', p.trial_ends_at, 'subscription_status', p.subscription_status,
    'grace_period_ends_at', p.grace_period_ends_at, 'access_blocked_at', p.access_blocked_at,
    'is_admin', admin_access,
    'has_subscription', p.access_mode = 'subscription' or
      (p.access_mode = 'legacy' and p.plan_expires_at is not null));
end;
$$;
revoke all on function private.account_access(uuid) from public, anon, authenticated;

create function public.get_my_access()
returns jsonb language sql stable security definer set search_path = '' as $$
  select private.account_access(auth.uid());
$$;
revoke all on function public.get_my_access() from public, anon;
grant execute on function public.get_my_access() to authenticated;

create function public.get_account_access(account_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select private.account_access(account_id);
$$;
revoke all on function public.get_account_access(uuid) from public, anon, authenticated;
grant execute on function public.get_account_access(uuid) to service_role;

create function private.can_use_app()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((private.account_access(auth.uid())->>'can_access')::boolean, false);
$$;
revoke all on function private.can_use_app() from public, anon;
grant execute on function private.can_use_app() to authenticated;

-- Restrictive policies add expiry checks without replacing existing ownership rules.
-- Profile, plans, billing and privacy requests remain available after expiry.
do $$
declare table_name text;
begin
  foreach table_name in array array[
    'produtos','receitas','markups','movimentacoes','perdas','comprovantes',
    'categorias','marcas','tipos_produto','categorias_despesas_fixas','despesas_fixas',
    'encargos_venda','folha_pagamento','receita_ingredientes','receita_embalagens',
    'receita_sub_receitas','receita_mao_obra','receita_passos_preparo','user_configurations',
    'tarefas_avulsas','ordens_producao','ordens_producao_itens','producao_tarefas',
    'producao_tarefas_historico','producao_areas','producao_tarefas_recorrentes',
    'producao_links_compartilhados','estoque_fechamentos_mensais','nf_settings','nf_invoices',
    'fornecedores','orcamentos_fornecedores','avaliacoes_fornecedores','promocoes_fornecedores'
  ] loop
    execute format('create policy active_app_access on public.%I as restrictive for all to authenticated using ((select private.can_use_app())) with check ((select private.can_use_app()))', table_name);
  end loop;
end;
$$;

-- Enforce Lite creation limits during the trial even for direct API/bulk imports.
create function private.enforce_trial_limits()
returns trigger language plpgsql security definer set search_path = '' as $$
declare mode text; used integer; maximum integer; active_item boolean;
begin
  if coalesce(public.has_role_or_higher('admin', auth.uid()), false) then return new; end if;
  select access_mode into mode from public.profiles where user_id = new.user_id for update;
  if mode is distinct from 'trial' then return new; end if;
  if not coalesce((private.account_access(new.user_id)->>'can_access')::boolean, false) then
    raise exception 'Seu teste terminou. Escolha um plano para continuar.' using errcode = '42501';
  end if;
  select (limites->>tg_table_name)::integer into maximum from public.planos where slug = 'lite';
  if maximum is null then raise exception 'Limite do plano indisponível'; end if;
  if tg_table_name = 'receitas' then
    select count(*) into used from public.receitas where user_id = new.user_id and id <> new.id;
    active_item := true;
  elsif tg_table_name = 'produtos' then
    select count(*) into used from public.produtos where user_id = new.user_id and ativo and id <> new.id;
    active_item := new.ativo;
  else
    select count(*) into used from public.markups where user_id = new.user_id and ativo
      and coalesce(tipo, 'normal') <> 'sub_receita' and id <> new.id;
    active_item := new.ativo and coalesce(new.tipo, 'normal') <> 'sub_receita';
  end if;
  if active_item and maximum <> -1 and used + 1 > maximum then
    raise exception 'Limite do Lite atingido. Faça upgrade do seu plano para continuar.' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function private.enforce_trial_limits() from public, anon, authenticated;
create trigger enforce_trial_limits before insert or update on public.produtos for each row execute function private.enforce_trial_limits();
create trigger enforce_trial_limits before insert or update on public.receitas for each row execute function private.enforce_trial_limits();
create trigger enforce_trial_limits before insert or update on public.markups for each row execute function private.enforce_trial_limits();

CREATE OR REPLACE FUNCTION public.check_plan_limits(user_uuid uuid, feature_type text, feature_count integer DEFAULT 1)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  user_plan text;
  plan_slug text;
  current_count integer;
  max_allowed integer;
  limites jsonb;
  result jsonb;
BEGIN
  IF auth.role() = 'authenticated' AND user_uuid IS DISTINCT FROM auth.uid()
     AND NOT coalesce(public.has_role_or_higher('admin', auth.uid()), false) THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'forbidden');
  END IF;
  IF feature_count < 1 THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'invalid_count');
  END IF;
  IF NOT coalesce((private.account_access(user_uuid)->>'can_access')::boolean, false) THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'access_expired');
  END IF;
  SELECT CASE WHEN access_mode = 'trial' THEN 'lite' ELSE plan END INTO user_plan FROM profiles WHERE user_id = user_uuid;

  IF user_plan IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'user_not_found');
  END IF;

  plan_slug := CASE WHEN user_plan = 'free' THEN 'lite' ELSE user_plan END;

  SELECT p.limites INTO limites FROM planos p WHERE p.slug = plan_slug;
  IF limites IS NULL THEN
    SELECT p.limites INTO limites FROM planos p WHERE p.slug = 'lite';
  END IF;

  max_allowed := COALESCE((limites ->> feature_type)::integer, 0);

  CASE feature_type
    WHEN 'produtos' THEN
      SELECT COUNT(*) INTO current_count FROM produtos
        WHERE user_id = user_uuid AND ativo = true;
    WHEN 'receitas' THEN
      SELECT COUNT(*) INTO current_count FROM receitas
        WHERE user_id = user_uuid;
    WHEN 'markups' THEN
      SELECT COUNT(*) INTO current_count FROM markups
        WHERE user_id = user_uuid
          AND ativo = true
          AND COALESCE(tipo, 'normal') IS DISTINCT FROM 'sub_receita';
    WHEN 'movimentacoes' THEN
      current_count := 0;
    WHEN 'pdf_exports' THEN
      PERFORM reset_monthly_pdf_counter();
      SELECT pdf_exports_count INTO current_count FROM profiles
        WHERE user_id = user_uuid;
    ELSE
      RETURN jsonb_build_object('allowed', false, 'reason', 'invalid_feature_type');
  END CASE;

  IF max_allowed = -1 OR (COALESCE(current_count, 0) + feature_count) <= max_allowed THEN
    result := jsonb_build_object(
      'allowed', true,
      'current_count', COALESCE(current_count, 0),
      'max_allowed', max_allowed,
      'plan', plan_slug
    );
  ELSE
    result := jsonb_build_object(
      'allowed', false,
      'reason', 'limit_exceeded',
      'current_count', COALESCE(current_count, 0),
      'max_allowed', max_allowed,
      'plan', plan_slug
    );
  END IF;

  RETURN result;
END;
$function$;

revoke all on function public.check_plan_limits(uuid,text,integer) from public, anon;
grant execute on function public.check_plan_limits(uuid,text,integer) to authenticated, service_role;

-- SECURITY DEFINER business RPCs must obey the same account boundary and expiry.
create function private.assert_account_access(account_id uuid)
returns void language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.role() = 'authenticated' and not coalesce(public.has_role_or_higher('admin', auth.uid()), false) then
    if account_id is distinct from auth.uid() or
       not coalesce((private.account_access(account_id)->>'can_access')::boolean, false) then
      raise exception 'Acesso indisponível. Escolha um plano para continuar.' using errcode = '42501';
    end if;
  end if;
end;
$$;
revoke all on function private.assert_account_access(uuid) from public, anon, authenticated;
CREATE OR REPLACE FUNCTION public.gerar_numero_comanda(p_user_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_numero INTEGER;
  v_comanda TEXT;
BEGIN
  PERFORM private.assert_account_access(p_user_id);
  -- Buscar o último número de comanda do usuário
  SELECT COALESCE(MAX(CAST(SUBSTRING(numero_comanda FROM '[0-9]+') AS INTEGER)), 0) + 1
  INTO v_numero
  FROM movimentacoes_pdv
  WHERE user_id = p_user_id
    AND numero_comanda ~ '^#[0-9]+$';
  
  -- Formatar como #0001, #0002, etc.
  v_comanda := '#' || LPAD(v_numero::TEXT, 4, '0');
  
  RETURN v_comanda;
END;
$function$;

revoke all on function public.gerar_numero_comanda(uuid) from public, anon;
grant execute on function public.gerar_numero_comanda(uuid) to authenticated, service_role;

CREATE OR REPLACE FUNCTION public.gerar_proximo_codigo_interno(p_user_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  proximo_codigo INTEGER;
BEGIN
  PERFORM private.assert_account_access(p_user_id);
  SELECT COALESCE(MAX(codigo_interno), 0) + 1 
  INTO proximo_codigo
  FROM public.produtos 
  WHERE user_id = p_user_id
    AND ativo = true;
  
  RETURN proximo_codigo;
END;
$function$;

revoke all on function public.gerar_proximo_codigo_interno(uuid) from public, anon;
grant execute on function public.gerar_proximo_codigo_interno(uuid) to authenticated, service_role;

CREATE OR REPLACE FUNCTION public.gerar_proximo_numero_comprovante(p_user_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  proximo_numero INTEGER;
BEGIN
  PERFORM private.assert_account_access(p_user_id);
  SELECT COALESCE(MAX(numero), 0) + 1 
  INTO proximo_numero
  FROM public.comprovantes 
  WHERE user_id = p_user_id;
  
  RETURN proximo_numero;
END;
$function$;

revoke all on function public.gerar_proximo_numero_comprovante(uuid) from public, anon;
grant execute on function public.gerar_proximo_numero_comprovante(uuid) to authenticated, service_role;

CREATE OR REPLACE FUNCTION public.gerar_proximo_numero_op(p_user_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  proximo INTEGER;
BEGIN
  PERFORM private.assert_account_access(p_user_id);
  SELECT COALESCE(MAX(numero_sequencial), 0) + 1 INTO proximo
  FROM public.ordens_producao WHERE user_id = p_user_id;
  RETURN proximo;
END;
$function$;

revoke all on function public.gerar_proximo_numero_op(uuid) from public, anon;
grant execute on function public.gerar_proximo_numero_op(uuid) to authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_employee_basic_info()
 RETURNS TABLE(user_id uuid, full_name text, business_name text, business_type text, created_at timestamp with time zone, plan character varying)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  -- HR managers podem ver apenas informações básicas não sensíveis
  SELECT 
    p.user_id,
    p.full_name,
    p.business_name,
    p.business_type,
    p.created_at,
    p.plan
  FROM public.profiles p
  WHERE private.can_use_app()
    AND (p.user_id = auth.uid() OR coalesce(public.has_role_or_higher('admin', auth.uid()), false))
    AND has_role_or_higher('hr_manager'::app_role);
$function$;

revoke all on function public.get_employee_basic_info() from public, anon;
grant execute on function public.get_employee_basic_info() to authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_employee_summary()
 RETURNS TABLE(employee_name text, cargo text, tipo_mao_obra text, ativo boolean, horas_por_dia numeric, dias_por_semana numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  -- HR managers podem ver apenas informações básicas dos funcionários, sem dados salariais
  SELECT 
    fp.nome as employee_name,
    fp.cargo,
    fp.tipo_mao_obra,
    fp.ativo,
    fp.horas_por_dia,
    fp.dias_por_semana
  FROM public.folha_pagamento fp
  INNER JOIN public.profiles p ON fp.user_id = p.user_id
  WHERE private.can_use_app()
    AND (p.user_id = auth.uid() OR coalesce(public.has_role_or_higher('admin', auth.uid()), false))
    AND has_role_or_higher('hr_manager'::app_role)
    AND fp.ativo = true;
$function$;

revoke all on function public.get_employee_summary() from public, anon;
grant execute on function public.get_employee_summary() to authenticated, service_role;

CREATE OR REPLACE FUNCTION public.increment_pdf_count(user_uuid uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM private.assert_account_access(user_uuid);
  UPDATE profiles 
  SET pdf_exports_count = pdf_exports_count + 1
  WHERE user_id = user_uuid;
END;
$function$;

revoke all on function public.increment_pdf_count(uuid) from public, anon;
grant execute on function public.increment_pdf_count(uuid) to authenticated, service_role;

CREATE OR REPLACE FUNCTION public.initialize_user_filters(user_uuid uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM private.assert_account_access(user_uuid);
    -- Inserir configuração de filtro para markup se não existir
    INSERT INTO public.user_configurations (user_id, type, configuration)
    SELECT user_uuid, 'markup_filter', '{"period": "last_month", "initialized_at": "' || now()::text || '"}'::jsonb
    WHERE NOT EXISTS (
        SELECT 1 FROM public.user_configurations 
        WHERE user_id = user_uuid AND type = 'markup_filter'
    );
    
    -- Inserir configuração de filtro para custos se não existir
    INSERT INTO public.user_configurations (user_id, type, configuration)
    SELECT user_uuid, 'custos_filter', '{"period": "last_month", "initialized_at": "' || now()::text || '"}'::jsonb
    WHERE NOT EXISTS (
        SELECT 1 FROM public.user_configurations 
        WHERE user_id = user_uuid AND type = 'custos_filter'
    );
END;
$function$;

revoke all on function public.initialize_user_filters(uuid) from public, anon;
grant execute on function public.initialize_user_filters(uuid) to authenticated, service_role;

