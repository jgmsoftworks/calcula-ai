-- Corrigir política de acesso aos perfis para restringir dados sensíveis
-- Remover acesso amplo de HR managers e permitir apenas ao próprio usuário e admins

-- Primeiro, remover a política atual que permite HR managers verem todos os perfis
DROP POLICY IF EXISTS "Role-based profile access" ON public.profiles;

-- Criar nova política mais restritiva para visualização de perfis
-- Apenas o próprio usuário e administradores podem ver dados completos do perfil
CREATE POLICY "Users can view own profile and admins can view all"
ON public.profiles 
FOR SELECT 
USING (
  (auth.uid() = user_id) OR 
  has_role_or_higher('admin'::app_role)
);

-- Criar uma função para HR managers acessarem apenas dados não sensíveis necessários
CREATE OR REPLACE FUNCTION public.get_employee_basic_info()
RETURNS TABLE (
  user_id uuid,
  full_name text,
  business_name text,
  business_type text,
  created_at timestamp with time zone,
  plan varchar
) 
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  -- HR managers podem ver apenas informações básicas não sensíveis
  SELECT 
    p.user_id,
    p.full_name,
    p.business_name,
    p.business_type,
    p.created_at,
    p.plan
  FROM public.profiles p
  WHERE has_role_or_higher('hr_manager'::app_role);
$$;

-- Comentário sobre a correção de segurança
COMMENT ON POLICY "Users can view own profile and admins can view all" ON public.profiles IS 
'Política de segurança: Restringe acesso aos dados sensíveis do perfil apenas ao próprio usuário e administradores. HR managers devem usar a função get_employee_basic_info() para dados básicos.';

COMMENT ON FUNCTION public.get_employee_basic_info() IS 
'Função para HR managers acessarem apenas informações básicas não sensíveis dos funcionários, sem expor dados pessoais como CPF, endereços e telefones.';