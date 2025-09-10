-- Strengthen RLS policies for the profiles table to address security concerns
-- Current policies are correct but we'll make them more explicit and robust

-- Drop existing policies to recreate them with stronger security
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can create their own profile" ON public.profiles;

-- Create more robust SELECT policy
CREATE POLICY "users_can_select_own_profile_only" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- Create more robust INSERT policy with additional validation
CREATE POLICY "users_can_insert_own_profile_only" 
ON public.profiles 
FOR INSERT 
TO authenticated
WITH CHECK (
  auth.uid() = user_id 
  AND auth.uid() IS NOT NULL
);

-- Create more robust UPDATE policy
CREATE POLICY "users_can_update_own_profile_only" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id AND auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() = user_id AND auth.uid() IS NOT NULL);

-- Ensure no DELETE policy exists (profiles should not be deletable)
-- This prevents accidental data loss of sensitive business information

-- Add comment to document the security measures
COMMENT ON TABLE public.profiles IS 'Contains sensitive business and personal information. Access restricted to profile owner only via RLS policies. DELETE operations are prohibited to prevent data loss.';