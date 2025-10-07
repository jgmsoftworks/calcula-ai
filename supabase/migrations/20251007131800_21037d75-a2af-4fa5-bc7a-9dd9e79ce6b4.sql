-- ============================================
-- FIX CRÍTICO: Corrigir hierarquia de roles
-- ============================================
-- PROBLEMA: Usuários 'owner' estão recebendo permissões de 'admin'
-- CAUSA: Hierarquia invertida (owner=1, admin=2) com comparação <=
-- SOLUÇÃO: Inverter níveis para admin=1 (maior poder), owner=2 (menor poder)

-- Recriar função has_role_or_higher com hierarquia correta
CREATE OR REPLACE FUNCTION public.has_role_or_higher(required_role app_role, check_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
    WITH role_hierarchy AS (
        -- Hierarquia CORRIGIDA: menor número = maior poder
        SELECT 'admin'::app_role as role, 1 as level      -- ADMIN tem maior poder
        UNION SELECT 'owner'::app_role, 2                  -- OWNER tem menos poder que admin
        UNION SELECT 'hr_manager'::app_role, 3
        UNION SELECT 'employee'::app_role, 4
        UNION SELECT 'viewer'::app_role, 5                 -- VIEWER tem menor poder
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
    -- Comparação: user_level <= required_level
    -- Ex: admin(1) verificando admin(1) → 1 <= 1 = TRUE ✓
    -- Ex: owner(2) verificando admin(1) → 2 <= 1 = FALSE ✓
    SELECT COALESCE(url.level <= rrl.level, false)
    FROM user_role_level url, required_role_level rrl;
$$;

-- Adicionar comentário explicativo
COMMENT ON FUNCTION public.has_role_or_higher IS 
'Verifica se usuário tem role igual ou superior ao requerido.
Hierarquia (menor = maior poder): admin(1) > owner(2) > hr_manager(3) > employee(4) > viewer(5)';

-- Validar correção com testes
DO $$
DECLARE
    test_result boolean;
BEGIN
    -- Teste 1: Admin deve ter acesso admin
    SELECT has_role_or_higher('admin'::app_role, (SELECT user_id FROM user_roles WHERE role = 'admin' LIMIT 1))
    INTO test_result;
    RAISE NOTICE 'Teste 1 - Admin tem acesso admin: %', COALESCE(test_result::text, 'N/A');
    
    -- Teste 2: Owner NÃO deve ter acesso admin
    SELECT has_role_or_higher('admin'::app_role, (SELECT user_id FROM user_roles WHERE role = 'owner' AND user_id NOT IN (SELECT user_id FROM user_roles WHERE role = 'admin') LIMIT 1))
    INTO test_result;
    
    IF test_result = true THEN
        RAISE EXCEPTION 'FALHA: Owner ainda tem acesso admin após correção!';
    END IF;
    
    RAISE NOTICE 'Teste 2 - Owner bloqueado de admin: % (esperado: false)', COALESCE(test_result::text, 'false');
END $$;