-- Rename the public offer without changing billing identifiers, prices or entitlements.
update public.planos set nome_publico = 'Iniciante' where slug = 'lite';

CREATE OR REPLACE FUNCTION private.enforce_trial_limits()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
    raise exception 'Limite do Iniciante atingido. Faça upgrade do seu plano para continuar.' using errcode = '23514';
  end if;
  return new;
end;
$function$
