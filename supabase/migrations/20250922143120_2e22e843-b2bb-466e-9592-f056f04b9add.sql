-- Atualizar RLS policies para sugestões (apenas admins podem gerenciar)
DROP POLICY IF EXISTS "Usuários podem criar suas próprias sugestões" ON public.suggestions;
DROP POLICY IF EXISTS "Usuários podem ver suas próprias sugestões" ON public.suggestions;
DROP POLICY IF EXISTS "Admins podem atualizar sugestões" ON public.suggestions;

-- Novas policies: apenas admins podem fazer tudo com sugestões
CREATE POLICY "Apenas admins podem ver todas as sugestões" 
ON public.suggestions FOR SELECT 
USING ((SELECT is_admin FROM public.profiles WHERE user_id = auth.uid()) = true);

CREATE POLICY "Apenas admins podem criar sugestões" 
ON public.suggestions FOR INSERT 
WITH CHECK ((SELECT is_admin FROM public.profiles WHERE user_id = auth.uid()) = true);

CREATE POLICY "Apenas admins podem atualizar sugestões" 
ON public.suggestions FOR UPDATE 
USING ((SELECT is_admin FROM public.profiles WHERE user_id = auth.uid()) = true);

CREATE POLICY "Apenas admins podem deletar sugestões" 
ON public.suggestions FOR DELETE 
USING ((SELECT is_admin FROM public.profiles WHERE user_id = auth.uid()) = true);

-- Atualizar policies do roadmap para que apenas admins possam gerenciar
DROP POLICY IF EXISTS "Apenas admins podem gerenciar roadmap" ON public.roadmap_items;

CREATE POLICY "Todos podem ver itens do roadmap" 
ON public.roadmap_items FOR SELECT 
USING (true);

CREATE POLICY "Apenas admins podem criar itens do roadmap" 
ON public.roadmap_items FOR INSERT 
WITH CHECK ((SELECT is_admin FROM public.profiles WHERE user_id = auth.uid()) = true);

CREATE POLICY "Apenas admins podem atualizar itens do roadmap" 
ON public.roadmap_items FOR UPDATE 
USING ((SELECT is_admin FROM public.profiles WHERE user_id = auth.uid()) = true);

CREATE POLICY "Apenas admins podem deletar itens do roadmap" 
ON public.roadmap_items FOR DELETE 
USING ((SELECT is_admin FROM public.profiles WHERE user_id = auth.uid()) = true);

-- Função para criar conta admin (executar manualmente)
-- Esta função deve ser executada pelo administrador do Supabase
CREATE OR REPLACE FUNCTION public.create_admin_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    admin_user_id uuid;
BEGIN
    -- Esta função será executada manualmente no SQL Editor
    -- pois não podemos criar usuários auth via SQL automaticamente
    
    -- Inserir ou atualizar perfil admin se o usuário já existir
    -- (assumindo que o usuário foi criado manualmente no auth)
    
    -- Buscar o usuário admin pelo email
    SELECT id INTO admin_user_id 
    FROM auth.users 
    WHERE email = 'jgmsoftworks@gmail.com' 
    LIMIT 1;
    
    -- Se o usuário existir, configurar como admin
    IF admin_user_id IS NOT NULL THEN
        -- Inserir ou atualizar perfil
        INSERT INTO public.profiles (user_id, full_name, business_name, is_admin)
        VALUES (
            admin_user_id,
            'JGM Softworks',
            'JGM Softworks - Admin',
            true
        )
        ON CONFLICT (user_id) 
        DO UPDATE SET 
            is_admin = true,
            full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
            business_name = COALESCE(EXCLUDED.business_name, profiles.business_name),
            updated_at = now();
            
        -- Configurar role de owner no sistema de roles
        INSERT INTO public.user_roles (user_id, role, granted_by)
        VALUES (admin_user_id, 'owner', admin_user_id)
        ON CONFLICT (user_id, role) DO NOTHING;
        
        RAISE NOTICE 'Admin account configured successfully for user_id: %', admin_user_id;
    ELSE
        RAISE NOTICE 'User with email jgmsoftworks@gmail.com not found. Create the account first in Supabase Auth.';
    END IF;
END;
$$;

-- Comentário de instrução
-- Para completar a configuração:
-- 1. Vá para Auth > Users no Supabase Dashboard
-- 2. Clique em "Add user" 
-- 3. Email: jgmsoftworks@gmail.com
-- 4. Password: 35120542Jj@
-- 5. Depois execute: SELECT public.create_admin_account();