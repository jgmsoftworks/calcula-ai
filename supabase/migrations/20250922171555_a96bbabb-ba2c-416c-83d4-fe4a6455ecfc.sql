-- PHASE 1: Critical Database Security Fixes

-- 1. Fix roadmap_votes public access - require authentication
DROP POLICY IF EXISTS "Todos podem ver votos" ON roadmap_votes;
CREATE POLICY "Authenticated users can view votes" ON roadmap_votes
FOR SELECT TO authenticated
USING (true);

-- 2. Add audit logging for sensitive data access
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  table_name TEXT NOT NULL,
  record_id UUID,
  action TEXT NOT NULL, -- 'SELECT', 'INSERT', 'UPDATE', 'DELETE'
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on audit_log
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs" ON public.audit_log
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.is_admin = true
  )
);

-- System can insert audit logs (for triggers)
CREATE POLICY "System can insert audit logs" ON public.audit_log
FOR INSERT TO authenticated
WITH CHECK (true);

-- 3. Create audit trigger function
CREATE OR REPLACE FUNCTION public.audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- Only audit sensitive tables
  IF TG_TABLE_NAME IN ('profiles', 'folha_pagamento', 'fornecedores', 'user_roles') THEN
    INSERT INTO public.audit_log (
      user_id,
      table_name,
      record_id,
      action,
      old_values,
      new_values
    ) VALUES (
      auth.uid(),
      TG_TABLE_NAME,
      COALESCE(NEW.id, OLD.id),
      TG_OP,
      CASE WHEN TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END,
      CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN to_jsonb(NEW) ELSE NULL END
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Add audit triggers to sensitive tables
DROP TRIGGER IF EXISTS profiles_audit_trigger ON profiles;
CREATE TRIGGER profiles_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

DROP TRIGGER IF EXISTS folha_pagamento_audit_trigger ON folha_pagamento;
CREATE TRIGGER folha_pagamento_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON folha_pagamento
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

DROP TRIGGER IF EXISTS fornecedores_audit_trigger ON fornecedores;
CREATE TRIGGER fornecedores_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON fornecedores
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

DROP TRIGGER IF EXISTS user_roles_audit_trigger ON user_roles;
CREATE TRIGGER user_roles_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON user_roles
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

-- 5. Strengthen profiles table security
-- Add policy to prevent users from seeing other users' sensitive data
DROP POLICY IF EXISTS "Role-based profile access" ON profiles;
CREATE POLICY "Users can view own profile, HR+ can view all" ON profiles
FOR SELECT TO authenticated
USING (
  auth.uid() = user_id 
  OR has_role_or_higher('hr_manager'::app_role)
);

-- Prevent elevation of admin privileges
DROP POLICY IF EXISTS "Role-based profile updates" ON profiles;
CREATE POLICY "Users can update own profile, admins can update all" ON profiles
FOR UPDATE TO authenticated
USING (
  (auth.uid() = user_id AND NOT (OLD.is_admin = false AND NEW.is_admin = true))
  OR has_role_or_higher('admin'::app_role)
)
WITH CHECK (
  (auth.uid() = user_id AND NOT (OLD.is_admin = false AND NEW.is_admin = true))
  OR has_role_or_higher('admin'::app_role)
);

-- 6. Add data retention policy function
CREATE OR REPLACE FUNCTION public.cleanup_old_audit_logs()
RETURNS void AS $$
BEGIN
  -- Keep audit logs for 1 year only
  DELETE FROM public.audit_log 
  WHERE created_at < now() - interval '1 year';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create function to mask sensitive data for non-admin users
CREATE OR REPLACE FUNCTION public.mask_sensitive_data(data TEXT, user_role TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Only show full data to admins
  IF user_role = 'admin' THEN
    RETURN data;
  END IF;
  
  -- Mask data for other users
  IF data IS NULL OR length(data) < 4 THEN
    RETURN '***';
  END IF;
  
  RETURN left(data, 2) || repeat('*', length(data) - 4) || right(data, 2);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;