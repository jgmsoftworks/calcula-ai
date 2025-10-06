-- ============================================
-- SECURITY FIX: Critical Vulnerabilities (Safe Migration)
-- ============================================

-- 1. FIX: Roadmap Items - Replace insecure admin checks
-- ============================================
DO $$
BEGIN
  -- Drop all existing roadmap policies
  DROP POLICY IF EXISTS "Somente admins criam roadmap" ON public.roadmap_items;
  DROP POLICY IF EXISTS "Somente admins editam roadmap" ON public.roadmap_items;
  DROP POLICY IF EXISTS "Somente admins removem roadmap" ON public.roadmap_items;
  DROP POLICY IF EXISTS "Admins podem criar itens do roadmap" ON public.roadmap_items;
  DROP POLICY IF EXISTS "Admins podem atualizar itens do roadmap" ON public.roadmap_items;
  DROP POLICY IF EXISTS "Admins podem deletar itens do roadmap" ON public.roadmap_items;
  
  -- Create secure policies
  CREATE POLICY "Admins podem criar itens do roadmap"
  ON public.roadmap_items FOR INSERT TO authenticated
  WITH CHECK (has_role_or_higher('admin'::app_role));

  CREATE POLICY "Admins podem atualizar itens do roadmap"
  ON public.roadmap_items FOR UPDATE TO authenticated
  USING (has_role_or_higher('admin'::app_role))
  WITH CHECK (has_role_or_higher('admin'::app_role));

  CREATE POLICY "Admins podem deletar itens do roadmap"
  ON public.roadmap_items FOR DELETE TO authenticated
  USING (has_role_or_higher('admin'::app_role));
END $$;

-- 2. FIX: Suggestions - Replace insecure admin checks
-- ============================================
DO $$
BEGIN
  DROP POLICY IF EXISTS "Admins podem atualizar sugestões" ON public.suggestions;
  DROP POLICY IF EXISTS "Usuários podem ver suas próprias sugestões" ON public.suggestions;

  CREATE POLICY "Admins podem atualizar sugestões"
  ON public.suggestions FOR UPDATE TO authenticated
  USING (has_role_or_higher('admin'::app_role))
  WITH CHECK (has_role_or_higher('admin'::app_role));

  CREATE POLICY "Usuários podem ver suas próprias sugestões"
  ON public.suggestions FOR SELECT TO authenticated
  USING ((auth.uid() = user_id) OR has_role_or_higher('admin'::app_role));
END $$;

-- 3. FIX: Profiles - Update to use role-based function
-- ============================================
DO $$
BEGIN
  DROP POLICY IF EXISTS "Administradores podem ver todos os perfis" ON public.profiles;
  DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
  DROP POLICY IF EXISTS "Usuários podem ver seu próprio perfil" ON public.profiles;
  DROP POLICY IF EXISTS "Usuários podem atualizar seu próprio perfil" ON public.profiles;

  CREATE POLICY "Usuários podem ver seu próprio perfil"
  ON public.profiles FOR SELECT TO authenticated
  USING ((auth.uid() = user_id) OR has_role_or_higher('admin'::app_role));

  CREATE POLICY "Usuários podem atualizar seu próprio perfil"
  ON public.profiles FOR UPDATE TO authenticated
  USING ((auth.uid() = user_id) OR has_role_or_higher('admin'::app_role))
  WITH CHECK ((auth.uid() = user_id) OR has_role_or_higher('admin'::app_role));
END $$;

-- 4. FIX: Promotional Coupons - Restrict public access
-- ============================================
DROP POLICY IF EXISTS "Usuários podem ver cupons ativos" ON public.promotional_coupons;

-- 5. FIX: Stripe Events - Ensure service-role-only access
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables 
             WHERE table_schema = 'public' AND table_name = 'stripe_events') THEN
    DROP POLICY IF EXISTS "Service role can manage stripe events" ON public.stripe_events;
    DROP POLICY IF EXISTS "Enable insert for service role only" ON public.stripe_events;
    DROP POLICY IF EXISTS "Enable update for service role only" ON public.stripe_events;
  END IF;
END $$;

-- 6. ADD: Coupon code validation
-- ============================================
ALTER TABLE public.promotional_coupons
DROP CONSTRAINT IF EXISTS check_coupon_code_format;

ALTER TABLE public.promotional_coupons
ADD CONSTRAINT check_coupon_code_format 
CHECK (code ~ '^[A-Z0-9_-]{3,20}$');

-- 7. ADD: Admin action reason validation
-- ============================================
ALTER TABLE public.admin_actions
DROP CONSTRAINT IF EXISTS check_reason_length;

ALTER TABLE public.admin_actions
ADD CONSTRAINT check_reason_length
CHECK (char_length(reason) >= 10 AND char_length(reason) <= 500);