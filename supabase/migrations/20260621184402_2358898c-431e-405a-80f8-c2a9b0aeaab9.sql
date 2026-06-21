DROP POLICY IF EXISTS "Owners and admins can manage user roles" ON public.user_roles;
CREATE POLICY "Owners and admins can manage user roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role_or_higher('admin'::app_role))
WITH CHECK (public.has_role_or_higher('admin'::app_role));