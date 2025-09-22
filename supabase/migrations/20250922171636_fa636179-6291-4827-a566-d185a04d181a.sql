-- PHASE 1: Critical Database Security Fixes (Corrected)

-- 1. Fix roadmap_votes public access - require authentication
DROP POLICY IF EXISTS "Todos podem ver votos" ON roadmap_votes;
CREATE POLICY "Authenticated users can view votes" ON roadmap_votes
FOR SELECT TO authenticated
USING (true);

-- 2. Add audit logging table for sensitive data access
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
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

-- System can insert audit logs
CREATE POLICY "System can insert audit logs" ON public.audit_log
FOR INSERT TO authenticated
WITH CHECK (true);

-- 3. Create corrected audit trigger function
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
      CASE 
        WHEN TG_OP = 'DELETE' THEN OLD.id
        ELSE NEW.id
      END,
      TG_OP,
      CASE 
        WHEN TG_OP IN ('DELETE', 'UPDATE') THEN to_jsonb(OLD) 
        ELSE NULL 
      END,
      CASE 
        WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) 
        ELSE NULL 
      END
    );
  END IF;
  
  -- Return appropriate record
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Add audit triggers to sensitive tables
CREATE TRIGGER profiles_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

CREATE TRIGGER folha_pagamento_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON folha_pagamento
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

CREATE TRIGGER fornecedores_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON fornecedores
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

CREATE TRIGGER user_roles_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON user_roles
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

-- 5. Strengthen profiles table security to prevent privilege escalation
DROP POLICY IF EXISTS "Role-based profile updates" ON profiles;
CREATE POLICY "Secure profile updates" ON profiles
FOR UPDATE TO authenticated
USING (
  -- Users can update their own profile, but cannot make themselves admin
  (auth.uid() = user_id)
  OR 
  -- Only existing admins can update any profile including admin status
  (EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.is_admin = true
  ))
)
WITH CHECK (
  -- Prevent self-privilege escalation
  (auth.uid() = user_id AND (OLD.is_admin = NEW.is_admin OR NEW.is_admin = false))
  OR 
  -- Allow admins to modify admin status
  (EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.is_admin = true
  ))
);

-- 6. Add function for data cleanup/retention
CREATE OR REPLACE FUNCTION public.cleanup_old_audit_logs()
RETURNS void AS $$
BEGIN
  -- Keep audit logs for 1 year only
  DELETE FROM public.audit_log 
  WHERE created_at < now() - interval '1 year';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create security monitoring function
CREATE OR REPLACE FUNCTION public.log_sensitive_access(
  p_table_name TEXT,
  p_record_id UUID,
  p_action TEXT
)
RETURNS void AS $$
BEGIN
  INSERT INTO public.audit_log (
    user_id,
    table_name,
    record_id,
    action,
    created_at
  ) VALUES (
    auth.uid(),
    p_table_name,
    p_record_id,
    p_action,
    now()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;