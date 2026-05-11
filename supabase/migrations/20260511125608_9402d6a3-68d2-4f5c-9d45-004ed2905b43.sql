-- 1) promotional_coupons: tighten admin manage policy to authenticated
DROP POLICY IF EXISTS "Admins podem gerenciar cupons promocionais" ON public.promotional_coupons;
CREATE POLICY "Admins podem gerenciar cupons promocionais"
ON public.promotional_coupons
AS PERMISSIVE
FOR ALL
TO authenticated
USING (public.has_role_or_higher('admin'))
WITH CHECK (public.has_role_or_higher('admin'));

-- 2) coupon_redemptions: tighten admin SELECT policy to authenticated
DROP POLICY IF EXISTS "Admins podem ver todos os resgates" ON public.coupon_redemptions;
CREATE POLICY "Admins podem ver todos os resgates"
ON public.coupon_redemptions
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (public.has_role_or_higher('admin'));

-- 3) profiles: restrict INSERT policy to authenticated
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND cmd = 'INSERT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Users can insert their own profile"
ON public.profiles
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 4) affiliates: allow each affiliate to read their own row
CREATE POLICY "Affiliates can view their own record"
ON public.affiliates
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
