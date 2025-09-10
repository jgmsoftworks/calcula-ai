-- Check existing policies and strengthen them
-- Since the original policies were correctly configured, we'll add additional security measures

-- Add explicit NULL checks and ensure only authenticated users can access profiles
-- Drop and recreate with more specific names to avoid conflicts

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles; 
DROP POLICY IF EXISTS "Users can create their own profile" ON public.profiles;

-- More secure SELECT policy - only authenticated users can see their own profiles
CREATE POLICY "authenticated_users_select_own_profile" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
);

-- More secure INSERT policy
CREATE POLICY "authenticated_users_insert_own_profile" 
ON public.profiles 
FOR INSERT 
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
);

-- More secure UPDATE policy
CREATE POLICY "authenticated_users_update_own_profile" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
);

-- Add table comment for security documentation
COMMENT ON TABLE public.profiles IS 'Sensitive business/personal data. RLS enforced. Only profile owners can access their data.';