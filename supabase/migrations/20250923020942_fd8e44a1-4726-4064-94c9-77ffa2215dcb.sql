-- Fix security issue: Restrict access to roadmap_votes table
-- Remove the overly permissive policy that allows everyone to see all votes
DROP POLICY IF EXISTS "Todos podem ver votos" ON public.roadmap_votes;

-- Create more secure policies
-- Users can only see their own votes
CREATE POLICY "Users can view their own votes" 
ON public.roadmap_votes 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- Admins can view all votes for moderation purposes
CREATE POLICY "Admins can view all votes" 
ON public.roadmap_votes 
FOR SELECT 
TO authenticated
USING (has_role_or_higher('admin'::app_role));

-- Create a secure function to get vote counts without exposing user IDs
CREATE OR REPLACE FUNCTION public.get_roadmap_vote_counts()
RETURNS TABLE(roadmap_item_id uuid, vote_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    rv.roadmap_item_id,
    COUNT(*) as vote_count
  FROM public.roadmap_votes rv
  GROUP BY rv.roadmap_item_id;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_roadmap_vote_counts() TO authenticated;