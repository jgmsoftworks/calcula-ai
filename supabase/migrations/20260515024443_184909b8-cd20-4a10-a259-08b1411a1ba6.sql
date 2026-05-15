
-- Add soft-delete fields to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deletion_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS deletion_scheduled_for timestamptz,
  ADD COLUMN IF NOT EXISTS deletion_reason text;

-- Data export requests table
CREATE TABLE IF NOT EXISTS public.data_export_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'completed',
  requested_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  ip_address text,
  user_agent text,
  records_count jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.data_export_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own export requests"
  ON public.data_export_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own export requests"
  ON public.data_export_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view all export requests"
  ON public.data_export_requests FOR SELECT TO authenticated
  USING (has_role_or_higher('admin'::app_role));

-- Account deletion requests table
CREATE TABLE IF NOT EXISTS public.account_deletion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  requested_at timestamptz NOT NULL DEFAULT now(),
  scheduled_for timestamptz NOT NULL,
  cancelled_at timestamptz,
  purged_at timestamptz,
  reason text,
  ip_address text,
  user_agent text,
  email_snapshot text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own deletion requests"
  ON public.account_deletion_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own deletion requests"
  ON public.account_deletion_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users cancel own deletion requests"
  ON public.account_deletion_requests FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view all deletion requests"
  ON public.account_deletion_requests FOR SELECT TO authenticated
  USING (has_role_or_higher('admin'::app_role));

CREATE POLICY "Service role manages deletion requests"
  ON public.account_deletion_requests FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Helper function
CREATE OR REPLACE FUNCTION public.is_account_deletion_pending(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = _user_id
      AND deletion_requested_at IS NOT NULL
      AND deletion_scheduled_for > now()
  );
$$;

CREATE INDEX IF NOT EXISTS idx_account_deletion_scheduled
  ON public.account_deletion_requests (scheduled_for)
  WHERE status = 'pending';
