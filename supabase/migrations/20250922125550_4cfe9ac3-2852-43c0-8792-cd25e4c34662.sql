-- Create role-based access control system to address employee data security

-- 1. Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('owner', 'admin', 'hr_manager', 'employee', 'viewer');

-- 2. Create user_roles table for role management
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    role app_role NOT NULL DEFAULT 'owner',
    granted_by UUID REFERENCES auth.users(id),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, role)
);

-- Enable RLS on user_roles table
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Create security definer function to check user roles
CREATE OR REPLACE FUNCTION public.get_user_role(check_user_id UUID DEFAULT auth.uid())
RETURNS app_role
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT role 
    FROM public.user_roles 
    WHERE user_id = check_user_id 
    AND (expires_at IS NULL OR expires_at > now())
    ORDER BY 
        CASE role
            WHEN 'owner' THEN 1
            WHEN 'admin' THEN 2
            WHEN 'hr_manager' THEN 3
            WHEN 'employee' THEN 4
            WHEN 'viewer' THEN 5
        END
    LIMIT 1;
$$;

-- 4. Create function to check if user has specific role or higher
CREATE OR REPLACE FUNCTION public.has_role_or_higher(required_role app_role, check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    WITH role_hierarchy AS (
        SELECT 'owner'::app_role as role, 1 as level
        UNION SELECT 'admin'::app_role, 2
        UNION SELECT 'hr_manager'::app_role, 3
        UNION SELECT 'employee'::app_role, 4
        UNION SELECT 'viewer'::app_role, 5
    ),
    user_role_level AS (
        SELECT rh.level
        FROM public.user_roles ur
        JOIN role_hierarchy rh ON ur.role = rh.role
        WHERE ur.user_id = check_user_id
        AND (ur.expires_at IS NULL OR ur.expires_at > now())
        ORDER BY rh.level
        LIMIT 1
    ),
    required_role_level AS (
        SELECT level FROM role_hierarchy WHERE role = required_role
    )
    SELECT COALESCE(url.level <= rrl.level, false)
    FROM user_role_level url, required_role_level rrl;
$$;

-- 5. Create audit table for sensitive data access
CREATE TABLE public.sensitive_data_access_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    table_name TEXT NOT NULL,
    record_id UUID,
    action TEXT NOT NULL, -- 'SELECT', 'INSERT', 'UPDATE', 'DELETE'
    sensitive_fields TEXT[], -- array of field names accessed
    ip_address INET,
    user_agent TEXT,
    accessed_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE public.sensitive_data_access_log ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies for user_roles table
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Owners and admins can manage user roles"
ON public.user_roles
FOR ALL
USING (public.has_role_or_higher('admin'::app_role));

-- 7. Create RLS policies for audit log
CREATE POLICY "Owners and admins can view audit logs"
ON public.sensitive_data_access_log
FOR SELECT
USING (public.has_role_or_higher('admin'::app_role));

CREATE POLICY "System can insert audit logs"
ON public.sensitive_data_access_log
FOR INSERT
WITH CHECK (true); -- Allow system to log access

-- 8. Update folha_pagamento RLS policies for enhanced security
DROP POLICY IF EXISTS "Usuários podem ver sua própria folha de pagamento" ON public.folha_pagamento;
DROP POLICY IF EXISTS "Usuários podem criar sua própria folha de pagamento" ON public.folha_pagamento;
DROP POLICY IF EXISTS "Usuários podem atualizar sua própria folha de pagamento" ON public.folha_pagamento;
DROP POLICY IF EXISTS "Usuários podem deletar sua própria folha de pagamento" ON public.folha_pagamento;

CREATE POLICY "Role-based access to payroll data"
ON public.folha_pagamento
FOR SELECT
USING (
    auth.uid() = user_id OR 
    public.has_role_or_higher('hr_manager'::app_role)
);

CREATE POLICY "Only owners and HR managers can create payroll data"
ON public.folha_pagamento
FOR INSERT
WITH CHECK (
    auth.uid() = user_id AND 
    public.has_role_or_higher('hr_manager'::app_role)
);

CREATE POLICY "Only owners and HR managers can update payroll data"
ON public.folha_pagamento
FOR UPDATE
USING (
    auth.uid() = user_id OR 
    public.has_role_or_higher('hr_manager'::app_role)
);

CREATE POLICY "Only owners and admins can delete payroll data"
ON public.folha_pagamento
FOR DELETE
USING (
    auth.uid() = user_id OR 
    public.has_role_or_higher('admin'::app_role)
);

-- 9. Add enhanced security to profiles table
DROP POLICY IF EXISTS "authenticated_users_select_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "authenticated_users_insert_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "authenticated_users_update_own_profile" ON public.profiles;

CREATE POLICY "Role-based profile access"
ON public.profiles
FOR SELECT
USING (
    auth.uid() = user_id OR 
    public.has_role_or_higher('hr_manager'::app_role)
);

CREATE POLICY "Users can create their own profile"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Role-based profile updates"
ON public.profiles
FOR UPDATE
USING (
    auth.uid() = user_id OR 
    public.has_role_or_higher('admin'::app_role)
);

-- 10. Create function to initialize user roles when profile is created
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

-- Create trigger to automatically assign owner role to new profiles
CREATE TRIGGER initialize_user_role_trigger
    AFTER INSERT ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.initialize_user_role();

-- 11. Create updated_at trigger for user_roles
CREATE TRIGGER update_user_roles_updated_at
    BEFORE UPDATE ON public.user_roles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();