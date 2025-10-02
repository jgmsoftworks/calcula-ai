-- ========================================
-- CRITICAL SECURITY FIX: Proper Role-Based Access Control
-- ========================================

-- 1. Ensure user_roles table exists with proper structure
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  granted_by uuid REFERENCES auth.users(id),
  granted_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone,
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 2. Migrate existing admin users from profiles to user_roles
INSERT INTO public.user_roles (user_id, role, granted_by)
SELECT user_id, 'admin'::app_role, user_id
FROM public.profiles 
WHERE is_admin = true
ON CONFLICT (user_id, role) DO NOTHING;

-- 3. Create RLS policies for user_roles table
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
CREATE POLICY "Admins can manage all roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.user_is_admin())
WITH CHECK (public.user_is_admin());

-- 4. Update profiles RLS policies to use security definer functions
DROP POLICY IF EXISTS "Users can view own profile and admins can view all" ON public.profiles;
CREATE POLICY "Users can view own profile and admins can view all"
ON public.profiles FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id OR public.user_is_admin()
);

DROP POLICY IF EXISTS "Role-based profile updates" ON public.profiles;
CREATE POLICY "Role-based profile updates"
ON public.profiles FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id OR public.user_is_admin()
)
WITH CHECK (
  auth.uid() = user_id OR public.user_is_admin()
);

-- 5. Update affiliate-related policies
DROP POLICY IF EXISTS "Apenas admins podem gerenciar afiliados" ON public.affiliates;
CREATE POLICY "Apenas admins podem gerenciar afiliados"
ON public.affiliates FOR ALL
TO authenticated
USING (public.user_is_admin())
WITH CHECK (public.user_is_admin());

DROP POLICY IF EXISTS "Apenas admins podem ver vendas de afiliados" ON public.affiliate_sales;
CREATE POLICY "Apenas admins podem ver vendas de afiliados"
ON public.affiliate_sales FOR ALL
TO authenticated
USING (public.user_is_admin())
WITH CHECK (public.user_is_admin());

DROP POLICY IF EXISTS "Apenas admins podem gerenciar comissões" ON public.affiliate_commissions;
CREATE POLICY "Apenas admins podem gerenciar comissões"
ON public.affiliate_commissions FOR ALL
TO authenticated
USING (public.user_is_admin())
WITH CHECK (public.user_is_admin());

DROP POLICY IF EXISTS "Apenas admins podem gerenciar links de afiliados" ON public.affiliate_links;
CREATE POLICY "Apenas admins podem gerenciar links de afiliados"
ON public.affiliate_links FOR ALL
TO authenticated
USING (public.user_is_admin())
WITH CHECK (public.user_is_admin());

DROP POLICY IF EXISTS "Apenas admins podem gerenciar cupons de afiliados" ON public.affiliate_coupons;
CREATE POLICY "Apenas admins podem gerenciar cupons de afiliados"
ON public.affiliate_coupons FOR ALL
TO authenticated
USING (public.user_is_admin())
WITH CHECK (public.user_is_admin());

DROP POLICY IF EXISTS "Apenas admins podem gerenciar produtos de afiliados" ON public.affiliate_stripe_products;
CREATE POLICY "Apenas admins podem gerenciar produtos de afiliados"
ON public.affiliate_stripe_products FOR ALL
TO authenticated
USING (public.user_is_admin())
WITH CHECK (public.user_is_admin());

-- 6. Update backup_history policy
DROP POLICY IF EXISTS "Apenas admins podem gerenciar backups" ON public.backup_history;
CREATE POLICY "Apenas admins podem gerenciar backups"
ON public.backup_history FOR ALL
TO authenticated
USING (public.user_is_admin())
WITH CHECK (public.user_is_admin());

-- 7. Create trigger to initialize roles for new users
CREATE OR REPLACE FUNCTION public.initialize_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Give new users the 'owner' role by default
  INSERT INTO public.user_roles (user_id, role, granted_by)
  VALUES (NEW.user_id, 'owner', NEW.user_id)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;
CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.initialize_user_role();

-- 8. Add comment explaining the security model
COMMENT ON TABLE public.user_roles IS 
'Stores user roles separately from profiles to prevent privilege escalation. 
Always use user_is_admin() or has_role() functions in RLS policies.';

COMMENT ON COLUMN public.profiles.is_admin IS 
'DEPRECATED: Use user_roles table and user_is_admin() function instead. 
This field is kept for backward compatibility only.';