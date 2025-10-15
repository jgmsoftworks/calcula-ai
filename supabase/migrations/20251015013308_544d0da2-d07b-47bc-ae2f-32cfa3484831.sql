-- Migration 2: Criar funções e triggers para fornecedores

-- Criar função para verificar se usuário é fornecedor
CREATE OR REPLACE FUNCTION public.user_is_fornecedor(check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = check_user_id
      AND role = 'fornecedor'::app_role
      AND (expires_at IS NULL OR expires_at > now())
  );
$$;

-- Trigger para criar role de fornecedor automaticamente
CREATE OR REPLACE FUNCTION public.handle_fornecedor_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.eh_fornecedor = true THEN
    -- Inserir ou atualizar role de fornecedor
    INSERT INTO public.user_roles (user_id, role, granted_by)
    VALUES (NEW.user_id, 'fornecedor'::app_role, NEW.user_id)
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    -- Remover role de fornecedor se eh_fornecedor = false
    DELETE FROM public.user_roles
    WHERE user_id = NEW.user_id
      AND role = 'fornecedor'::app_role;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger na tabela fornecedores
DROP TRIGGER IF EXISTS sync_fornecedor_role_trigger ON public.fornecedores;
CREATE TRIGGER sync_fornecedor_role_trigger
  AFTER INSERT OR UPDATE OF eh_fornecedor ON public.fornecedores
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_fornecedor_role();

-- Migrar fornecedores existentes para user_roles
INSERT INTO public.user_roles (user_id, role, granted_by)
SELECT user_id, 'fornecedor'::app_role, user_id
FROM public.fornecedores
WHERE eh_fornecedor = true
ON CONFLICT (user_id, role) DO NOTHING;