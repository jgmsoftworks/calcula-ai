
-- ============================================
-- PRIORIDADE 1: Corrigir escalação de privilégio
-- Substituir user_is_admin() por has_role_or_higher('admin') em TODAS as RLS policies
-- ============================================

-- 1. affiliate_commissions
DROP POLICY IF EXISTS "Apenas admins podem gerenciar comissões" ON public.affiliate_commissions;
CREATE POLICY "Apenas admins podem gerenciar comissões" ON public.affiliate_commissions
  FOR ALL TO authenticated
  USING (has_role_or_higher('admin'::app_role))
  WITH CHECK (has_role_or_higher('admin'::app_role));

-- 2. affiliate_coupons
DROP POLICY IF EXISTS "Apenas admins podem gerenciar cupons de afiliados" ON public.affiliate_coupons;
CREATE POLICY "Apenas admins podem gerenciar cupons de afiliados" ON public.affiliate_coupons
  FOR ALL TO authenticated
  USING (has_role_or_higher('admin'::app_role))
  WITH CHECK (has_role_or_higher('admin'::app_role));

-- 3. affiliate_links
DROP POLICY IF EXISTS "Apenas admins podem gerenciar links de afiliados" ON public.affiliate_links;
CREATE POLICY "Apenas admins podem gerenciar links de afiliados" ON public.affiliate_links
  FOR ALL TO authenticated
  USING (has_role_or_higher('admin'::app_role))
  WITH CHECK (has_role_or_higher('admin'::app_role));

-- 4. affiliate_sales
DROP POLICY IF EXISTS "Apenas admins podem ver vendas de afiliados" ON public.affiliate_sales;
CREATE POLICY "Apenas admins podem ver vendas de afiliados" ON public.affiliate_sales
  FOR ALL TO authenticated
  USING (has_role_or_higher('admin'::app_role))
  WITH CHECK (has_role_or_higher('admin'::app_role));

-- 5. affiliate_stripe_products
DROP POLICY IF EXISTS "Apenas admins podem gerenciar produtos de afiliados" ON public.affiliate_stripe_products;
CREATE POLICY "Apenas admins podem gerenciar produtos de afiliados" ON public.affiliate_stripe_products
  FOR ALL TO authenticated
  USING (has_role_or_higher('admin'::app_role))
  WITH CHECK (has_role_or_higher('admin'::app_role));

-- 6. affiliates
DROP POLICY IF EXISTS "Apenas admins podem gerenciar afiliados" ON public.affiliates;
CREATE POLICY "Apenas admins podem gerenciar afiliados" ON public.affiliates
  FOR ALL TO authenticated
  USING (has_role_or_higher('admin'::app_role))
  WITH CHECK (has_role_or_higher('admin'::app_role));

-- 7. affiliate_customers - fix admin policies
DROP POLICY IF EXISTS "Admins can manage all customers" ON public.affiliate_customers;
CREATE POLICY "Admins can manage all customers" ON public.affiliate_customers
  FOR ALL TO authenticated
  USING (has_role_or_higher('admin'::app_role))
  WITH CHECK (has_role_or_higher('admin'::app_role));

DROP POLICY IF EXISTS "Admins can view all customers" ON public.affiliate_customers;
CREATE POLICY "Admins can view all customers" ON public.affiliate_customers
  FOR SELECT TO authenticated
  USING (has_role_or_higher('admin'::app_role));

-- 8. backup_history
DROP POLICY IF EXISTS "Apenas admins podem gerenciar backups" ON public.backup_history;
CREATE POLICY "Apenas admins podem gerenciar backups" ON public.backup_history
  FOR ALL TO authenticated
  USING (has_role_or_higher('admin'::app_role))
  WITH CHECK (has_role_or_higher('admin'::app_role));

-- 9. profiles - replace user_is_admin() policies
DROP POLICY IF EXISTS "Role-based profile updates" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile and admins can view all" ON public.profiles;

-- 10. Block is_admin column from being modified by users
-- Create a trigger that prevents users from changing is_admin
CREATE OR REPLACE FUNCTION public.prevent_is_admin_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- If is_admin is being changed and the user is not a real admin via user_roles
  IF NEW.is_admin IS DISTINCT FROM OLD.is_admin THEN
    IF NOT has_role_or_higher('admin'::app_role, auth.uid()) THEN
      NEW.is_admin := OLD.is_admin; -- Silently revert the change
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_is_admin_update ON public.profiles;
CREATE TRIGGER prevent_is_admin_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_is_admin_self_update();

-- 11. Fix get_users_auth_info to use has_role_or_higher
CREATE OR REPLACE FUNCTION public.get_users_auth_info()
 RETURNS TABLE(user_id uuid, email text, last_sign_in_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  IF NOT has_role_or_higher('admin'::app_role, auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado. Apenas administradores.';
  END IF;
  
  RETURN QUERY
  SELECT au.id as user_id, au.email, au.last_sign_in_at
  FROM auth.users au
  ORDER BY au.created_at DESC;
END;
$$;

-- 12. Fix get_backup_data to use has_role_or_higher
CREATE OR REPLACE FUNCTION public.get_backup_data(backup_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  backup_record record;
BEGIN
  IF NOT has_role_or_higher('admin'::app_role, auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado. Apenas administradores.';
  END IF;

  SELECT * INTO backup_record FROM backup_history WHERE id = backup_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Backup não encontrado.';
  END IF;

  RETURN jsonb_build_object(
    'backup_info', to_jsonb(backup_record),
    'status', 'success'
  );
END;
$$;
