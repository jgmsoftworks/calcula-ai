CREATE TABLE IF NOT EXISTS public.csp_violations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  document_uri text,
  referrer text,
  violated_directive text,
  effective_directive text,
  original_policy text,
  blocked_uri text,
  source_file text,
  line_number integer,
  column_number integer,
  status_code integer,
  user_agent text,
  user_id uuid,
  raw jsonb
);

CREATE INDEX IF NOT EXISTS idx_csp_violations_created_at ON public.csp_violations (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_csp_violations_directive ON public.csp_violations (effective_directive);

ALTER TABLE public.csp_violations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view CSP violations"
  ON public.csp_violations FOR SELECT
  USING (has_role_or_higher('admin'::app_role, auth.uid()));

CREATE POLICY "Service role can insert CSP violations"
  ON public.csp_violations FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can delete CSP violations"
  ON public.csp_violations FOR DELETE
  USING (has_role_or_higher('admin'::app_role, auth.uid()));