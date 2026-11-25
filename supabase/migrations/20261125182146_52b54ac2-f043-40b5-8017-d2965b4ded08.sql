-- Só o próprio usuário, administradores ou o servidor podem consultar dados de outro usuário.
CREATE OR REPLACE FUNCTION public.has_role_or_higher(required_role app_role, check_user_id uuid DEFAULT auth.uid())
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
    WITH role_hierarchy AS (
        SELECT 'admin'::app_role as role, 1 as level
        UNION SELECT 'owner'::app_role, 2
        UNION SELECT 'hr_manager'::app_role, 3
        UNION SELECT 'employee'::app_role, 4
        UNION SELECT 'viewer'::app_role, 5
    ),
    caller_allowed AS (
        SELECT (check_user_id = auth.uid() OR auth.uid() IS NULL OR EXISTS (
            SELECT 1 FROM public.user_roles a
            WHERE a.user_id = auth.uid() AND a.role = 'admin'::app_role
              AND (a.expires_at IS NULL OR a.expires_at > now())
        )) AS ok
    ),
    user_role_level AS (
        SELECT rh.level
        FROM public.user_roles ur
        JOIN role_hierarchy rh ON ur.role = rh.role
        WHERE ur.user_id = check_user_id
          AND (ur.expires_at IS NULL OR ur.expires_at > now())
          AND (SELECT ok FROM caller_allowed)
        ORDER BY rh.level
        LIMIT 1
    ),
    required_role_level AS (
        SELECT level FROM role_hierarchy WHERE role = required_role
    )
    SELECT COALESCE((SELECT url.level <= rrl.level FROM user_role_level url, required_role_level rrl), false);
$function$;

CREATE OR REPLACE FUNCTION public.get_user_role(check_user_id uuid DEFAULT auth.uid())
 RETURNS app_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
    SELECT role FROM public.user_roles
    WHERE user_id = check_user_id
      AND (expires_at IS NULL OR expires_at > now())
      AND (check_user_id = auth.uid() OR auth.uid() IS NULL OR public.has_role_or_higher('admin'::app_role, auth.uid()))
    ORDER BY CASE role WHEN 'owner' THEN 1 WHEN 'admin' THEN 2 WHEN 'hr_manager' THEN 3 WHEN 'employee' THEN 4 WHEN 'viewer' THEN 5 END
    LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION public.is_account_deletion_pending(_user_id uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = _user_id
      AND deletion_requested_at IS NOT NULL
      AND deletion_scheduled_for > now()
      AND (_user_id = auth.uid() OR auth.uid() IS NULL OR public.has_role_or_higher('admin'::app_role, auth.uid()))
  );
$function$;

CREATE OR REPLACE FUNCTION public.count_user_suggestions_24h(check_user_id uuid)
 RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT COUNT(*)::integer FROM public.suggestions
  WHERE user_id = check_user_id
    AND created_at >= (now() - interval '24 hours')
    AND (check_user_id = auth.uid() OR auth.uid() IS NULL OR public.has_role_or_higher('admin'::app_role, auth.uid()));
$function$;

REVOKE EXECUTE ON FUNCTION public.has_role_or_higher(app_role, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_account_deletion_pending(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.count_user_suggestions_24h(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role_or_higher(app_role, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_account_deletion_pending(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.count_user_suggestions_24h(uuid) TO authenticated, service_role;

-- Avaliação de fornecedores (módulo removido): só o servidor consulta.
REVOKE EXECUTE ON FUNCTION public.get_fornecedor_rating(uuid) FROM PUBLIC, anon, authenticated;

-- Quem cadastra um afiliado não pode se tornar o próprio afiliado.
CREATE OR REPLACE FUNCTION public.impedir_autoafiliacao()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NOT NULL AND NEW.user_id = auth.uid()
     AND (TG_OP = 'INSERT' OR NEW.commission_percentage IS DISTINCT FROM OLD.commission_percentage
          OR NEW.commission_fixed_amount IS DISTINCT FROM OLD.commission_fixed_amount
          OR NEW.user_id IS DISTINCT FROM OLD.user_id) THEN
    RAISE EXCEPTION 'Você não pode cadastrar a si mesmo como afiliado nem alterar sua própria comissão.';
  END IF;
  RETURN NEW;
END;
$function$;
DROP TRIGGER IF EXISTS impedir_autoafiliacao ON public.affiliates;
CREATE TRIGGER impedir_autoafiliacao BEFORE INSERT OR UPDATE ON public.affiliates
FOR EACH ROW EXECUTE FUNCTION public.impedir_autoafiliacao();