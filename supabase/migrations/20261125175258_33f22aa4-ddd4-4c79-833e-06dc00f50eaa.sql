REVOKE EXECUTE ON FUNCTION public.create_system_backup(text) FROM PUBLIC, anon, authenticated;
DROP POLICY IF EXISTS "Historico de precos visivel para autenticados" ON public.planos_precos_historico;
CREATE POLICY "Historico de precos visivel para admins" ON public.planos_precos_historico FOR SELECT TO authenticated USING (public.has_role_or_higher('admin'::app_role, auth.uid()));
DROP POLICY IF EXISTS "Autenticados podem ver avaliações" ON public.avaliacoes_fornecedores;
CREATE POLICY "Usuarios veem suas avaliacoes" ON public.avaliacoes_fornecedores FOR SELECT TO authenticated USING (auth.uid() = cliente_user_id OR public.has_role_or_higher('admin'::app_role, auth.uid()));