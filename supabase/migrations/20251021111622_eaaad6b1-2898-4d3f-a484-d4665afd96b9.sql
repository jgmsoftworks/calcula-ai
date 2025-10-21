-- Função para retornar informações de autenticação dos usuários (apenas para admins)
CREATE OR REPLACE FUNCTION public.get_users_auth_info()
RETURNS TABLE (
  user_id uuid,
  email text,
  last_sign_in_at timestamptz
) 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Apenas admins podem executar
  IF NOT user_is_admin() THEN
    RAISE EXCEPTION 'Acesso negado. Apenas administradores podem acessar essas informações.';
  END IF;
  
  RETURN QUERY
  SELECT 
    au.id as user_id,
    au.email,
    au.last_sign_in_at
  FROM auth.users au
  ORDER BY au.created_at DESC;
END;
$$ LANGUAGE plpgsql;