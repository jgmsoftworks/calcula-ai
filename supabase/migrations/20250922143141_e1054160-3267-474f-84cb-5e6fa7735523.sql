-- Remover policies existentes do roadmap primeiro
DROP POLICY IF EXISTS "Todos podem ver itens do roadmap" ON public.roadmap_items;
DROP POLICY IF EXISTS "Apenas admins podem criar itens do roadmap" ON public.roadmap_items;
DROP POLICY IF EXISTS "Apenas admins podem atualizar itens do roadmap" ON public.roadmap_items;
DROP POLICY IF EXISTS "Apenas admins podem deletar itens do roadmap" ON public.roadmap_items;

-- Recriar policies do roadmap
CREATE POLICY "Todos podem visualizar roadmap" 
ON public.roadmap_items FOR SELECT 
USING (true);

CREATE POLICY "Somente admins criam roadmap" 
ON public.roadmap_items FOR INSERT 
WITH CHECK ((SELECT is_admin FROM public.profiles WHERE user_id = auth.uid()) = true);

CREATE POLICY "Somente admins editam roadmap" 
ON public.roadmap_items FOR UPDATE 
USING ((SELECT is_admin FROM public.profiles WHERE user_id = auth.uid()) = true);

CREATE POLICY "Somente admins removem roadmap" 
ON public.roadmap_items FOR DELETE 
USING ((SELECT is_admin FROM public.profiles WHERE user_id = auth.uid()) = true);