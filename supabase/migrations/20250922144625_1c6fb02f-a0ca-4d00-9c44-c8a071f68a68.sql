-- Fix security issue: Restrict roadmap access to authenticated users only
-- Remove the current public read policy and create an authenticated-only policy

-- Drop the existing policy that allows public access
DROP POLICY IF EXISTS "Todos podem visualizar roadmap" ON public.roadmap_items;

-- Create new policy that requires authentication
CREATE POLICY "Authenticated users can view roadmap" 
ON public.roadmap_items 
FOR SELECT 
TO authenticated
USING (true);