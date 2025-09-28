-- Security Fix: Implement proper RLS policies for affiliate_customers table
-- This addresses the security issue where customer emails could be harvested

-- First, drop the overly broad existing policy
DROP POLICY IF EXISTS "Apenas admins podem ver clientes de afiliados" ON public.affiliate_customers;

-- Create a security definer function to check if a user is an affiliate for a given affiliate_id
CREATE OR REPLACE FUNCTION public.user_is_affiliate_owner(affiliate_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.affiliates
    WHERE id = affiliate_id
    AND user_id = auth.uid()
  );
$$;

-- Create a security definer function to check admin status (safer than direct profile access)
CREATE OR REPLACE FUNCTION public.user_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = auth.uid()
    AND is_admin = true
  );
$$;

-- Policy 1: Affiliates can view their own customers only
CREATE POLICY "Affiliates can view their own customers" 
ON public.affiliate_customers
FOR SELECT
TO authenticated
USING (user_is_affiliate_owner(affiliate_id));

-- Policy 2: Affiliates can insert customers for their own affiliate account
CREATE POLICY "Affiliates can create customers for their account" 
ON public.affiliate_customers
FOR INSERT
TO authenticated
WITH CHECK (user_is_affiliate_owner(affiliate_id));

-- Policy 3: Affiliates can update their own customers only
CREATE POLICY "Affiliates can update their own customers" 
ON public.affiliate_customers
FOR UPDATE
TO authenticated
USING (user_is_affiliate_owner(affiliate_id))
WITH CHECK (user_is_affiliate_owner(affiliate_id));

-- Policy 4: Only system can delete customer records (prevent accidental data loss)
CREATE POLICY "System only customer deletion" 
ON public.affiliate_customers
FOR DELETE
TO service_role
USING (true);

-- Policy 5: Admins can view all customers (for administrative purposes)
CREATE POLICY "Admins can view all customers" 
ON public.affiliate_customers
FOR SELECT
TO authenticated
USING (user_is_admin());

-- Policy 6: Admins can manage all customer records (for support/administrative purposes)
CREATE POLICY "Admins can manage all customers" 
ON public.affiliate_customers
FOR ALL
TO authenticated
USING (user_is_admin())
WITH CHECK (user_is_admin());

-- Add helpful comments for future reference
COMMENT ON FUNCTION public.user_is_affiliate_owner(uuid) IS 'Security function to check if authenticated user owns the specified affiliate account';
COMMENT ON FUNCTION public.user_is_admin() IS 'Security function to safely check admin status without RLS recursion';
COMMENT ON TABLE public.affiliate_customers IS 'Customer data with restricted access: affiliates see only their customers, admins see all';

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.user_is_affiliate_owner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_is_admin() TO authenticated;