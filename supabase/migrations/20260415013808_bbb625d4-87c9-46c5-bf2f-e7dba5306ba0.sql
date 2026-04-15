-- 1. Expand trigger to protect role, plan, plan_expires_at
CREATE OR REPLACE FUNCTION public.prevent_is_admin_self_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT has_role_or_higher('admin'::app_role, auth.uid()) THEN
    NEW.is_admin := OLD.is_admin;
    NEW.role := OLD.role;
    NEW.plan := OLD.plan;
    NEW.plan_expires_at := OLD.plan_expires_at;
  END IF;
  RETURN NEW;
END;
$$;

-- 2. Fix stripe_events policies
DROP POLICY IF EXISTS "Sistema pode gerenciar eventos Stripe" ON public.stripe_events;
CREATE POLICY "Service role can manage Stripe events" ON public.stripe_events
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Admins can read Stripe events" ON public.stripe_events
  FOR SELECT TO authenticated USING (has_role_or_higher('admin'::app_role));

-- 3. Fix sensitive_data_access_log policies
DROP POLICY IF EXISTS "allow" ON public.sensitive_data_access_log;
CREATE POLICY "Service role can insert audit logs" ON public.sensitive_data_access_log
  FOR INSERT TO service_role WITH CHECK (true);