-- Corrigir trigger handle_fornecedor_role para adicionar/remover role corretamente
CREATE OR REPLACE FUNCTION public.handle_fornecedor_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.eh_fornecedor = true THEN
    -- Inserir role de fornecedor se não existir
    INSERT INTO public.user_roles (user_id, role, granted_by)
    VALUES (NEW.user_id, 'fornecedor'::app_role, NEW.user_id)
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    -- Se eh_fornecedor = false, verificar se ainda existem outros registros com eh_fornecedor = true
    -- Se NÃO houver nenhum, remover a role
    IF NOT EXISTS (
      SELECT 1 FROM public.fornecedores 
      WHERE user_id = NEW.user_id 
        AND eh_fornecedor = true 
        AND id != NEW.id
    ) THEN
      DELETE FROM public.user_roles
      WHERE user_id = NEW.user_id 
        AND role = 'fornecedor'::app_role;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Limpar roles incorretas: remover role de fornecedor onde usuário NÃO tem eh_fornecedor = true
DELETE FROM public.user_roles
WHERE role = 'fornecedor'::app_role
  AND user_id NOT IN (
    SELECT DISTINCT user_id 
    FROM public.fornecedores 
    WHERE eh_fornecedor = true
  );

-- Adicionar roles faltantes: usuários com eh_fornecedor = true mas sem a role
INSERT INTO public.user_roles (user_id, role, granted_by)
SELECT DISTINCT f.user_id, 'fornecedor'::app_role, f.user_id
FROM public.fornecedores f
WHERE f.eh_fornecedor = true
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = f.user_id 
      AND ur.role = 'fornecedor'::app_role
  )
ON CONFLICT (user_id, role) DO NOTHING;