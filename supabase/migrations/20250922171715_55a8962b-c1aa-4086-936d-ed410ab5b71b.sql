-- PHASE 1: Critical Database Security Fixes (Simplified)

-- 1. Fix roadmap_votes public access - require authentication
DROP POLICY IF EXISTS "Todos podem ver votos" ON roadmap_votes;
CREATE POLICY "Authenticated users can view votes" ON roadmap_votes
FOR SELECT TO authenticated
USING (true);

-- 2. Strengthen profiles table security to prevent privilege escalation
-- First, let's check current policies and drop them safely
DO $$
BEGIN
    -- Drop existing policies if they exist
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' 
        AND policyname = 'Role-based profile updates'
    ) THEN
        DROP POLICY "Role-based profile updates" ON profiles;
    END IF;
END $$;

-- Create new secure policy for profile updates
CREATE POLICY "Secure profile updates" ON profiles
FOR UPDATE TO authenticated
USING (
  -- Users can update their own profile OR admins can update any profile
  auth.uid() = user_id 
  OR 
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.is_admin = true
  )
)
WITH CHECK (
  -- Users cannot elevate their own admin status
  (auth.uid() = user_id AND 
   (SELECT is_admin FROM profiles WHERE user_id = auth.uid()) = false AND 
   NEW.is_admin = false)
  OR
  -- Existing admins can modify any profile
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.is_admin = true
  )
);

-- 3. Add basic audit logging table (without triggers for now)
CREATE TABLE IF NOT EXISTS public.security_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  action TEXT NOT NULL,
  table_name TEXT,
  record_id UUID,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on security_log
ALTER TABLE public.security_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view security logs
CREATE POLICY "Admins can view security logs" ON public.security_log
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.is_admin = true
  )
);

-- System can insert security logs
CREATE POLICY "System can insert security logs" ON public.security_log
FOR INSERT TO authenticated
WITH CHECK (true);

-- 4. Create function to log security events
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_action TEXT,
  p_table_name TEXT DEFAULT NULL,
  p_record_id UUID DEFAULT NULL,
  p_details JSONB DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO public.security_log (
    user_id,
    action,
    table_name,
    record_id,
    details,
    created_at
  ) VALUES (
    auth.uid(),
    p_action,
    p_table_name,
    p_record_id,
    p_details,
    now()
  );
EXCEPTION
  WHEN OTHERS THEN
    -- If logging fails, don't break the main operation
    NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Strengthen fornecedores table - add phone/email masking view
CREATE OR REPLACE VIEW public.fornecedores_secure AS
SELECT 
  id,
  user_id,
  nome,
  -- Mask sensitive data for non-admin users
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.is_admin = true
    ) THEN cnpj_cpf
    ELSE 
      CASE 
        WHEN cnpj_cpf IS NOT NULL AND length(cnpj_cpf) > 4 
        THEN left(cnpj_cpf, 3) || '***' || right(cnpj_cpf, 2)
        ELSE '***'
      END
  END AS cnpj_cpf,
  contato,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.is_admin = true
    ) THEN telefone
    ELSE 
      CASE 
        WHEN telefone IS NOT NULL AND length(telefone) > 4 
        THEN left(telefone, 2) || '***' || right(telefone, 2)
        ELSE '***'
      END
  END AS telefone,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.is_admin = true
    ) THEN email
    ELSE 
      CASE 
        WHEN email IS NOT NULL AND position('@' in email) > 0
        THEN left(email, 2) || '***@' || split_part(email, '@', 2)
        ELSE '***@***.com'
      END
  END AS email,
  endereco,
  representante,
  telefone_representante,
  ativo,
  created_at,
  updated_at
FROM fornecedores
WHERE auth.uid() = user_id;

-- 6. Add security monitoring for admin actions
CREATE OR REPLACE FUNCTION public.monitor_admin_actions()
RETURNS TRIGGER AS $$
BEGIN
  -- Log when someone becomes admin
  IF TG_OP = 'UPDATE' AND OLD.is_admin = false AND NEW.is_admin = true THEN
    PERFORM public.log_security_event(
      'ADMIN_PRIVILEGE_GRANTED',
      'profiles',
      NEW.id,
      jsonb_build_object('granted_to_user', NEW.user_id, 'granted_by_user', auth.uid())
    );
  END IF;
  
  -- Log when admin privileges are revoked
  IF TG_OP = 'UPDATE' AND OLD.is_admin = true AND NEW.is_admin = false THEN
    PERFORM public.log_security_event(
      'ADMIN_PRIVILEGE_REVOKED',
      'profiles',
      NEW.id,
      jsonb_build_object('revoked_from_user', NEW.user_id, 'revoked_by_user', auth.uid())
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add trigger for admin monitoring
CREATE TRIGGER monitor_admin_changes
  AFTER UPDATE ON profiles
  FOR EACH ROW 
  WHEN (OLD.is_admin IS DISTINCT FROM NEW.is_admin)
  EXECUTE FUNCTION public.monitor_admin_actions();