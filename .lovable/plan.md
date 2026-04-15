

## Plan: Fix All Error-Level Security Findings

### 1. Realtime Messages No RLS
**Action**: Ignore — the `realtime.messages` table is in a Supabase-reserved schema (`realtime`). We cannot create RLS policies on reserved schemas. The app does not use Realtime subscriptions for sensitive cross-user data; all sensitive tables use per-user RLS already.

### 2. Profiles Self-Escalation (profiles_role_plan_self_update)
**Action**: Fix via SQL migration — replace the current UPDATE policy with two separate policies:
- **Regular users**: can update their own profile but a trigger silently reverts `is_admin`, `role`, `plan`, and `plan_expires_at` changes
- The existing `prevent_is_admin_self_update` trigger only covers `is_admin`. We need to expand it to also protect `role`, `plan`, and `plan_expires_at`.

**Migration SQL**:
```sql
-- Expand the existing trigger to protect all sensitive fields
CREATE OR REPLACE FUNCTION public.prevent_is_admin_self_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT has_role_or_higher('admin'::app_role, auth.uid()) THEN
    NEW.is_admin := OLD.is_admin;
    NEW.role := OLD.role;
    NEW.plan := OLD.plan;
    NEW.plan_expires_at := OLD.plan_expires_at;
  END IF;
  RETURN NEW;
END;
$$;
```

### 3. Stripe Events Public Readable (stripe_events_public_readable)
**Action**: Fix via SQL migration — drop the permissive policy and create an admin-only SELECT policy.
```sql
DROP POLICY IF EXISTS "Sistema pode gerenciar eventos Stripe" ON public.stripe_events;
CREATE POLICY "Admins can manage Stripe events" ON public.stripe_events
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Admins can read Stripe events" ON public.stripe_events
  FOR SELECT TO authenticated USING (has_role_or_higher('admin'::app_role));
```

### 4. Sensitive Data Access Log Public Insert
**Action**: Fix via SQL migration — drop the permissive INSERT policy and restrict to service_role only.
```sql
DROP POLICY IF EXISTS "allow" ON public.sensitive_data_access_log;
CREATE POLICY "Service role can insert audit logs" ON public.sensitive_data_access_log
  FOR INSERT TO service_role WITH CHECK (true);
```

### 5. Create Backup Unauthenticated Access
**Action**: Fix edge function — make auth mandatory. Return 401 if no auth header or invalid token. Move admin check outside the `if (user)` block.

### 6. jspdf Critical Vulnerability
**Action**: Update `jspdf` to latest version (v3.0.1+ should have the fix). Run `npm install jspdf@latest`.

### Files changed
1. **SQL Migration** — profiles trigger expansion, stripe_events policies, sensitive_data_access_log policies
2. **`supabase/functions/create-backup/index.ts`** — mandatory auth
3. **`package.json`** — jspdf update

