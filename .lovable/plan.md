

## Plan: Fix Remaining Error-Level Security Findings

### Analysis

1. **sensitive_data_access_log_public_insert** — The previous migration (20260415013808) tried `DROP POLICY IF EXISTS "allow"` but the actual policy name is `"System can insert audit logs"`. The fix never applied. Need to drop the correct policy name and recreate it scoped to `service_role`.

2. **user_roles_admin_bypass** — The trigger function `prevent_is_admin_self_update` was expanded to protect `is_admin`, `role`, `plan`, `plan_expires_at`. However, the `user_is_admin()` SQL function still exists and checks `profiles.is_admin` directly. If any RLS policy uses it, a user could theoretically benefit from a stale `is_admin=true`. The trigger prevents setting it, so the real fix is to **drop the `user_is_admin()` function** entirely (no code references it) so no future policy can accidentally use it, or replace its body to use `has_role_or_higher`.

3. **realtime_messages_no_policies** — Cannot create RLS on `realtime.messages` (reserved schema). Will ignore with explanation.

### Changes

**1. SQL Migration**

```sql
-- Fix: Drop the ACTUAL old policy on sensitive_data_access_log
DROP POLICY IF EXISTS "System can insert audit logs" ON public.sensitive_data_access_log;
CREATE POLICY "Service role inserts audit logs" ON public.sensitive_data_access_log
  FOR INSERT TO service_role WITH CHECK (true);

-- Fix: Replace user_is_admin() to delegate to has_role_or_higher
-- This ensures any lingering usage is safe
CREATE OR REPLACE FUNCTION public.user_is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT has_role_or_higher('admin'::app_role, auth.uid());
$$;
```

**2. Security findings management**
- Mark `sensitive_data_access_log_public_insert` as fixed
- Mark `user_roles_admin_bypass` as fixed
- Ignore `realtime_messages_no_policies` (reserved schema)

### Files
- New SQL migration (single file)
- No application code changes needed

