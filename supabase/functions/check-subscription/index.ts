import { billingDb, billingStripe, planForSubscription, subscriptionEnd } from '../_shared/billing.ts';
const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { headers, status });
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers });
  const db = billingDb();
  const token = req.headers.get('Authorization')?.replace(/^Bearer /, '');
  if (!token) return json({ error: 'Faça login para continuar.' }, 401);
  const { data: auth, error: authError } = await db.auth.getUser(token);
  if (authError || !auth.user?.email) return json({ error: 'Sessão inválida.' }, 401);
  const { data: profile, error: profileError } = await db.from('profiles').select('plan,plan_expires_at,subscription_status,access_blocked_at').eq('user_id', auth.user.id).maybeSingle();
  if (profileError) return json({ error: 'Não foi possível verificar seu plano.' }, 503);
  const cachedActive = !profile?.access_blocked_at && profile?.subscription_status === 'active' && (profile.plan_expires_at ? Date.parse(profile.plan_expires_at) > Date.now() : ['professional','enterprise'].includes(profile.plan));
  const cached = { subscribed: !!cachedActive, plan: profile?.plan ?? 'lite', subscription_end: profile?.plan_expires_at ?? null };
  try {
    const stripe = billingStripe();
    const customers = await stripe.customers.list({ email: auth.user.email, limit: 100 });
    let best: { plan: string; end: string } | null = null;
    const rank: Record<string, number> = { lite: 1, professional: 2, enterprise: 3 };
    for (const customer of customers.data) {
      const subscriptions = await stripe.subscriptions.list({ customer: customer.id, status: 'all', limit: 100 });
      for (const subscription of subscriptions.data) {
        if (!['active','trialing'].includes(subscription.status)) continue;
        const plan = await planForSubscription(subscription);
        const end = subscriptionEnd(subscription);
        if (Date.parse(end) <= Date.now()) continue;
        if (!best || rank[plan] > rank[best.plan] || (plan === best.plan && end > best.end)) best = { plan, end };
      }
    }
    // This endpoint is a read. Only verified webhook events change entitlements.
    return json(best ? { subscribed: true, plan: best.plan, subscription_end: best.end } : cached);
  } catch {
    // An API outage must never erase an already-provisioned subscription.
    return json({ ...cached, warning: 'Confirmação temporariamente indisponível; exibindo seu último plano registrado.' });
  }
});
