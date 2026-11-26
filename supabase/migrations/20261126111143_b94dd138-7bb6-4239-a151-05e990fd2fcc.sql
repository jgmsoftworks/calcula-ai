DROP POLICY IF EXISTS "Planos ativos visiveis para todos" ON public.planos;
DROP POLICY IF EXISTS "Somente admin altera planos" ON public.planos;
GRANT SELECT ON public.planos TO anon, authenticated;
CREATE POLICY "Planos ativos visiveis para todos" ON public.planos FOR SELECT TO anon, authenticated USING (ativo = true);
CREATE POLICY "Admins veem todos os planos" ON public.planos FOR SELECT TO authenticated USING (public.has_role_or_higher('admin'::public.app_role, auth.uid()));
CREATE POLICY "Somente admin altera planos" ON public.planos FOR ALL TO authenticated USING (public.has_role_or_higher('admin'::public.app_role, auth.uid())) WITH CHECK (public.has_role_or_higher('admin'::public.app_role, auth.uid()));