create or replace function public.billing_webhook_signing_secret()
returns text language sql stable security invoker set search_path = '' as $$
  select decrypted_secret from vault.decrypted_secrets
  where name = 'billing_stripe_webhook_secret'
  limit 1;
$$;
revoke all on function public.billing_webhook_signing_secret() from public, anon, authenticated;
grant execute on function public.billing_webhook_signing_secret() to service_role;
