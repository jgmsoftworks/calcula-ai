-- Fix RLS policies on roadmap_items to use secure function
DROP POLICY IF EXISTS "Apenas admins podem gerenciar roadmap" ON public.roadmap_items;

CREATE POLICY "Apenas admins podem gerenciar roadmap"
ON public.roadmap_items
FOR ALL
USING (has_role_or_higher('admin'::app_role))
WITH CHECK (has_role_or_higher('admin'::app_role));

-- Fix RLS policies on stripe_events to use secure function
DROP POLICY IF EXISTS "Apenas admins podem ver eventos" ON public.stripe_events;
DROP POLICY IF EXISTS "Apenas admins podem deletar eventos" ON public.stripe_events;

CREATE POLICY "Apenas admins podem ver eventos"
ON public.stripe_events
FOR SELECT
USING (has_role_or_higher('admin'::app_role));

CREATE POLICY "Apenas admins podem deletar eventos"
ON public.stripe_events
FOR DELETE
USING (has_role_or_higher('admin'::app_role));