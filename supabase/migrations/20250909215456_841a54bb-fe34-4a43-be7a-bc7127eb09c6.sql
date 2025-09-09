-- Inserir configurações de filtros padrão para novos usuários
-- Não precisa criar nova tabela, vamos usar a user_configurations existente

-- A tabela user_configurations já existe e tem a estrutura ideal:
-- - user_id (UUID)
-- - type (varchar) - usaremos "markup_filter", "custos_filter", etc
-- - configuration (jsonb) - armazenará { "period": "last_month", "timestamp": "2024-01-01" }

-- Criar função para inicializar filtros padrão quando usuário fizer primeira ação
CREATE OR REPLACE FUNCTION public.initialize_user_filters(user_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    -- Inserir configuração de filtro para markup se não existir
    INSERT INTO public.user_configurations (user_id, type, configuration)
    SELECT user_uuid, 'markup_filter', '{"period": "last_month", "initialized_at": "' || now()::text || '"}'::jsonb
    WHERE NOT EXISTS (
        SELECT 1 FROM public.user_configurations 
        WHERE user_id = user_uuid AND type = 'markup_filter'
    );
    
    -- Inserir configuração de filtro para custos se não existir
    INSERT INTO public.user_configurations (user_id, type, configuration)
    SELECT user_uuid, 'custos_filter', '{"period": "last_month", "initialized_at": "' || now()::text || '"}'::jsonb
    WHERE NOT EXISTS (
        SELECT 1 FROM public.user_configurations 
        WHERE user_id = user_uuid AND type = 'custos_filter'
    );
END;
$$;