-- Keep PDF usage server-controlled and preserve the previously recorded counts.
create table if not exists private.pdf_export_usage (
  user_id uuid primary key references public.profiles(user_id) on delete cascade,
  period_start date not null,
  exports integer not null default 0 check (exports >= 0)
);
alter table private.pdf_export_usage enable row level security;
revoke all on private.pdf_export_usage from public, anon, authenticated;
insert into private.pdf_export_usage(user_id, period_start, exports)
select user_id, date_trunc('month', coalesce(pdf_exports_reset_at, now()) at time zone 'UTC')::date,
  greatest(coalesce(pdf_exports_count, 0), 0) from public.profiles
on conflict(user_id) do nothing;

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
  IF feature_count IS NULL OR feature_count < 1 THEN
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
      SELECT exports INTO current_count FROM private.pdf_export_usage
        WHERE user_id = user_uuid AND period_start = date_trunc('month', now() AT TIME ZONE 'UTC')::date;
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

create or replace function public.consume_pdf_export()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare account_id uuid := auth.uid(); result jsonb; month_start date := date_trunc('month', now() at time zone 'UTC')::date;
begin
  if account_id is null then return jsonb_build_object('allowed',false,'reason','user_not_authenticated'); end if;
  -- One lock per account serializes simultaneous downloads, including other tabs.
  perform 1 from public.profiles where user_id = account_id for update;
  if not found then return jsonb_build_object('allowed',false,'reason','user_not_found'); end if;
  if coalesce(public.has_role_or_higher('admin', account_id),false) then
    return jsonb_build_object('allowed',true,'reason','admin_access','plan','enterprise','max_allowed',-1);
  end if;
  result := public.check_plan_limits(account_id,'pdf_exports',1);
  if not coalesce((result->>'allowed')::boolean,false) then return result; end if;
  insert into private.pdf_export_usage as usage(user_id, period_start, exports) values(account_id,month_start,1)
  on conflict(user_id) do update set
    exports = case when usage.period_start = excluded.period_start then usage.exports + 1 else 1 end,
    period_start = excluded.period_start;
  return result || jsonb_build_object('current_count',coalesce((result->>'current_count')::integer,0)+1);
end;
$$;
revoke all on function public.consume_pdf_export() from public, anon;
grant execute on function public.consume_pdf_export() to authenticated;

-- Legacy callers must pass the same quota check.
create or replace function public.increment_pdf_count(user_uuid uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare result jsonb;
begin
  if auth.uid() is null or user_uuid is distinct from auth.uid() then
    raise exception 'Acesso não autorizado.' using errcode = '42501';
  end if;
  result := public.consume_pdf_export();
  if not coalesce((result->>'allowed')::boolean,false) then
    raise exception 'Limite do plano atingido para fichas técnicas. Conheça os planos para continuar.' using errcode = '23514';
  end if;
end;
$$;
revoke all on function public.increment_pdf_count(uuid) from public, anon;
grant execute on function public.increment_pdf_count(uuid) to authenticated;

-- The existing trigger now enforces every plan; edits do not consume a new slot.
create or replace function private.enforce_trial_limits()
returns trigger language plpgsql security definer set search_path = '' as $$
declare plan_slug text; used integer; maximum integer; active_item boolean; old_active boolean;
begin
  if coalesce(public.has_role_or_higher('admin', auth.uid()),false) then return new; end if;
  select case when access_mode = 'trial' then 'lite' when plan = 'free' then 'lite' else plan end
    into plan_slug from public.profiles where user_id = new.user_id for update;
  if not coalesce((private.account_access(new.user_id)->>'can_access')::boolean,false) then
    raise exception 'Seu acesso terminou. Escolha um plano para continuar.' using errcode = '42501';
  end if;
  -- Branch explicitly: the real receitas table has neither ativo nor tipo.
  if tg_table_name = 'receitas' then active_item := true;
  elsif tg_table_name = 'markups' then active_item := new.ativo and coalesce(new.tipo,'normal') <> 'sub_receita';
  else active_item := new.ativo; end if;
  if not active_item then return new; end if;
  if tg_op = 'UPDATE' then
    if tg_table_name = 'receitas' then old_active := true;
    elsif tg_table_name = 'markups' then old_active := old.ativo and coalesce(old.tipo,'normal') <> 'sub_receita';
    else old_active := old.ativo; end if;
    if old.user_id = new.user_id and old_active then return new; end if;
  end if;
  select (limites->>tg_table_name)::integer into maximum from public.planos where slug = plan_slug;
  if maximum is null then
    select (limites->>tg_table_name)::integer into maximum from public.planos where slug = 'lite';
  end if;
  if maximum is null then raise exception 'Limite do plano indisponível'; end if;
  if maximum = -1 then return new; end if;
  if tg_table_name = 'receitas' then
    select count(*) into used from public.receitas where user_id = new.user_id and id <> new.id;
  elsif tg_table_name = 'produtos' then
    select count(*) into used from public.produtos where user_id = new.user_id and ativo and id <> new.id;
  else
    select count(*) into used from public.markups where user_id = new.user_id and ativo
      and coalesce(tipo,'normal') <> 'sub_receita' and id <> new.id;
  end if;
  if used + 1 > maximum then
    raise exception 'Você atingiu o limite do seu plano. Conheça os planos para continuar.'
      using errcode = '23514', detail = 'plan_limit_exceeded';
  end if;
  return new;
end;
$$;

