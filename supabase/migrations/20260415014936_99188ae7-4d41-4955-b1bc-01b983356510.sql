-- Fix: Drop the ACTUAL old policy on sensitive_data_access_log
DROP POLICY IF EXISTS "System can insert audit logs" ON public.sensitive_data_access_log;
DROP POLICY IF EXISTS "Service role can insert audit logs" ON public.sensitive_data_access_log;
CREATE POLICY "Service role inserts audit logs" ON public.sensitive_data_access_log
  FOR INSERT TO service_role WITH CHECK (true);

-- Fix: Replace user_is_admin() to delegate to has_role_or_higher
CREATE OR REPLACE FUNCTION public.user_is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT has_role_or_higher('admin'::app_role, auth.uid());
$$;