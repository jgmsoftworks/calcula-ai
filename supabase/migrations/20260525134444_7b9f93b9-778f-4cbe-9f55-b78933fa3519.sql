
-- Add subscription status fields to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS access_blocked_at timestamp with time zone;

-- Create subscription_issues table
CREATE TABLE IF NOT EXISTS public.subscription_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  email text NOT NULL,
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_invoice_id text,
  issue_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  amount_due numeric DEFAULT 0,
  currency text DEFAULT 'brl',
  attempt_count integer DEFAULT 0,
  next_retry_at timestamp with time zone,
  grace_period_ends_at timestamp with time zone,
  failure_reason text,
  failure_code text,
  admin_notes text,
  contacted_by uuid,
  contacted_at timestamp with time zone,
  resolved_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscription_issues_user_id ON public.subscription_issues(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_issues_status ON public.subscription_issues(status);
CREATE INDEX IF NOT EXISTS idx_subscription_issues_email ON public.subscription_issues(email);

ALTER TABLE public.subscription_issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all subscription issues"
ON public.subscription_issues
FOR ALL
TO authenticated
USING (has_role_or_higher('admin'::app_role))
WITH CHECK (has_role_or_higher('admin'::app_role));

CREATE POLICY "Users view own subscription issues"
ON public.subscription_issues
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Service role manages subscription issues"
ON public.subscription_issues
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE TRIGGER update_subscription_issues_updated_at
BEFORE UPDATE ON public.subscription_issues
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
