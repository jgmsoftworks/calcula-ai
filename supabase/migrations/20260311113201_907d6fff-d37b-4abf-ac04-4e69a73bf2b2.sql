
-- Fix SECURITY DEFINER view - make it SECURITY INVOKER
ALTER VIEW public.fornecedores_marketplace SET (security_invoker = on);

-- The remaining WITH CHECK (true) policies are likely on:
-- affiliate_customers (System only customer deletion - service_role with true)
-- That one is OK since it's for service_role only

-- Let's check if there are other WITH CHECK (true) policies we missed
-- by looking at the remaining ones. The 2 remaining WARN are likely:
-- 1. affiliate_customers "System only customer deletion" (service_role, USING true) - acceptable
-- 2. Something else

-- Actually the service_role policy is fine. Let me also check if the 
-- coupon_redemptions or notifications INSERT were the ones causing it.
-- Since we already fixed those, the remaining 2 might be from other tables.

-- Let me also handle the edge function functions that reference user_is_admin
-- by checking if admin_actions INSERT policy needs service_role for edge functions
-- Edge functions use service_role key, so admin_actions needs to allow service_role inserts too
DROP POLICY IF EXISTS "Sistema pode inserir logs de auditoria" ON public.admin_actions;
CREATE POLICY "Admins e sistema podem inserir logs" ON public.admin_actions
  FOR INSERT TO authenticated
  WITH CHECK (has_role_or_higher('admin'::app_role));

-- Also allow service_role to insert (for edge functions)
CREATE POLICY "Service role pode inserir logs" ON public.admin_actions
  FOR INSERT TO service_role
  WITH CHECK (true);
