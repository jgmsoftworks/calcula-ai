// The server can read either an Edge secret or the encrypted Supabase Vault.
// The RPC is SECURITY INVOKER and executable only by service_role.
export async function billingWebhookSecret(db: any): Promise<string> {
  const configured = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  if (configured) return configured;
  const { data, error } = await db.rpc('billing_webhook_signing_secret');
  if (error || typeof data !== 'string' || !data.startsWith('whsec_')) {
    throw new Error('webhook_signing_configuration_unavailable');
  }
  return data;
}
