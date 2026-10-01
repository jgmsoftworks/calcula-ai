import Stripe from 'npm:stripe@22.6.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import { slugFromStripe } from './planos.ts';
import { APP_URL, checkoutState, invoiceSubscription, normalizedEmail, objectId, subscriptionEnd } from './billingRules.ts';
import { paymentEmail, sendPaymentEmail } from './billingEmails.ts';

export { Stripe, APP_URL, checkoutState, invoiceSubscription, objectId, subscriptionEnd };
export const billingDb = () => createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } });
export const billingStripe = () => new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2026-08-26.dahlia', httpClient: Stripe.createFetchHttpClient(), maxNetworkRetries: 2, timeout: 20000 });
export async function findBillingUser(db: any, email: string) {
  for (let page = 1; ; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error('billing_user_lookup_failed');
    const user = data.users.find((u: any) => normalizedEmail(u.email ?? '') === normalizedEmail(email));
    if (user) return user;
    if (data.users.length < 1000) return null;
  }
}
export async function withBillingLock(db: any, key: string, action: () => Promise<void>, once = false) {
  const token = crypto.randomUUID();
  const { data, error } = await db.rpc('claim_billing_job', { job_key: key, token });
  if (error) throw new Error('billing_lock_failed');
  if (data === 'done') return;
  if (data !== 'claimed') throw new Error('billing_processing_retry');
  let completed = false;
  try { await action(); completed = once; }
  finally {
    const { error: releaseError } = await db.rpc('release_billing_job', { job_key: key, token, completed });
    if (releaseError) throw new Error('billing_lock_release_failed');
  }
}
export async function planForSubscription(subscription: any) {
  if (subscription.items.data.length !== 1) throw new Error('unsupported_subscription_items');
  const price = subscription.items.data[0]?.price;
  const plan = await slugFromStripe(objectId(price?.product), price?.id);
  if (!plan || !['lite','professional','enterprise'].includes(plan)) throw new Error('unknown_subscription_plan');
  return plan;
}
function activationLink(properties: any) {
  if (!properties?.hashed_token) throw new Error('account_activation_link_failed');
  const type = properties.verification_type;
  if (!['invite', 'recovery'].includes(type)) throw new Error('unexpected_activation_type');
  // Fragment avoids sending the activation secret to web servers/analytics.
  return `${APP_URL}/reset-password#token_hash=${encodeURIComponent(properties.hashed_token)}&type=${type}&setup=1`;
}
async function setupLink(db: any, email: string, isNew: boolean) {
  const { data, error } = await db.auth.admin.generateLink({ type: isNew ? 'invite' : 'recovery', email, options: { redirectTo: `${APP_URL}/reset-password` } });
  if (error) throw new Error('account_activation_link_failed');
  return activationLink(data.properties);
}
export async function fulfillCheckout(db: any, stripe: any, sessionId: string, failedEvent = false, resolvePlan = planForSubscription) {
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (session.mode !== 'subscription') return;
  const customerId = objectId(session.customer);
  const subscriptionId = objectId(session.subscription);
  if (!customerId || !subscriptionId) throw new Error('checkout_subscription_missing');
  await withBillingLock(db, `customer:${customerId}`, async () => {
    // Read live Stripe state instead of trusting delayed/out-of-order event data.
    const current = await stripe.checkout.sessions.retrieve(sessionId);
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const customer = await stripe.customers.retrieve(customerId);
    if (customer.deleted) return;
    const email = normalizedEmail(current.customer_details?.email ?? customer.email ?? '');
    if (!email.includes('@')) throw new Error('checkout_email_missing');
    const plan = await resolvePlan(subscription);
    let state = checkoutState(current, subscription);
    if (failedEvent && state === 'pending') state = 'failed';
    const { data: previous, error: previousError } = await db.from('billing_checkouts').select('*').eq('session_id', sessionId).maybeSingle();
    if (previousError) throw new Error('checkout_state_read_failed');
    // A stale failure/pending event cannot revoke a previously fulfilled checkout.
    if (previous && ['approved','trial'].includes(previous.status) && ['pending','failed'].includes(state)) return;
    let user: any = null;
    let needsSetup = false;
    let createdLink: string | undefined;
    if (state === 'approved' || state === 'trial') {
      if (Date.parse(subscriptionEnd(subscription)) <= Date.now()) throw new Error('subscription_expired');
      user = await findBillingUser(db, email);
      if (!user) {
        // Supabase creates an unconfirmed user; only the email owner can activate it.
        const { data, error } = await db.auth.admin.generateLink({ type: 'invite', email, options: { redirectTo: `${APP_URL}/reset-password`, data: { full_name: customer.name ?? '', created_from_stripe: true } } });
        if (error) {
          user = await findBillingUser(db, email); // concurrent checkout for same email
          if (!user) throw new Error('billing_account_creation_failed');
        } else {
          user = data.user;
          createdLink = activationLink(data.properties);
        }
      }
      needsSetup = !user.email_confirmed_at && !user.last_sign_in_at;
      const { data: profile, error: profileReadError } = await db.from('profiles').select('user_id').eq('user_id', user.id).maybeSingle();
      if (profileReadError) throw new Error('billing_profile_read_failed');
      const values: Record<string, unknown> = {
        user_id: user.id, plan, plan_expires_at: subscriptionEnd(subscription), subscription_status: 'active',
        access_blocked_at: null, grace_period_ends_at: null,
        trial_ends_at: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
        updated_at: new Date().toISOString(),
      };
      if (!profile) { values.full_name = customer.name ?? ''; values.business_name = customer.name ?? ''; }
      const { error } = await db.from('profiles').upsert(values, { onConflict: 'user_id' });
      if (error) throw new Error('billing_profile_update_failed');
    }
    const { error } = await db.from('billing_checkouts').upsert({ session_id: sessionId, subscription_id: subscriptionId, customer_id: customerId, email, user_id: user?.id ?? previous?.user_id ?? null, plan, status: state, needs_password_setup: needsSetup, updated_at: new Date().toISOString() });
    if (error) throw new Error('checkout_state_write_failed');
    await sendPaymentEmail(db, `checkout:${sessionId}:${state}`, async () => ({
      to: email,
      ...paymentEmail(state, email, plan === 'professional' ? 'Profissional' : plan === 'enterprise' ? 'Empresarial' : 'Lite', needsSetup ? createdLink ?? await setupLink(db, email, !user.email_confirmed_at) : undefined),
    }));
  });
}

export async function syncBillingSubscription(db: any, stripe: any, subscriptionId: string) {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const customerId = objectId(subscription.customer)!;
  // Provisioning belongs to completed Checkout only, never subscription.created.
  const { data: checkouts, error } = await db.from('billing_checkouts').select('user_id,email').eq('subscription_id', subscriptionId).not('user_id', 'is', null).limit(1);
  if (error) throw new Error('subscription_mapping_failed');
  let userId = checkouts?.[0]?.user_id;
  if (!userId) {
    const customer = await stripe.customers.retrieve(customerId);
    if (customer.deleted || !customer.email) return;
    userId = (await findBillingUser(db, customer.email))?.id;
    if (userId) {
      const { data: legacy, error: legacyError } = await db.from('profiles').select('plan,plan_expires_at').eq('user_id', userId).maybeSingle();
      if (legacyError) throw new Error('legacy_profile_lookup_failed');
      // Never grant a free account a paid plan from subscription.created/updated.
      if (!legacy || (!legacy.plan_expires_at && !['professional','enterprise'].includes(legacy.plan))) return;
    }
  }
  if (!userId) return;
  const active = ['active','trialing'].includes(subscription.status);
  // Do not let an old canceled subscription revoke a newer active subscription.
  if (!active) {
    const siblings = await stripe.subscriptions.list({ customer: customerId, status: 'all', limit: 100 });
    if (siblings.data.some((s: any) => s.id !== subscriptionId && ['active','trialing'].includes(s.status))) return;
  }
  const now = new Date().toISOString();
  const { data: profile, error: profileError } = await db.from('profiles').select('grace_period_ends_at').eq('user_id', userId).maybeSingle();
  if (profileError) throw new Error('subscription_profile_read_failed');
  const values: Record<string, unknown> = { updated_at: now };
  if (active) {
    Object.assign(values, { plan: await planForSubscription(subscription), plan_expires_at: subscriptionEnd(subscription), subscription_status: 'active', access_blocked_at: null, grace_period_ends_at: null, trial_ends_at: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null });
  } else if (subscription.status === 'past_due') {
    const grace = profile?.grace_period_ends_at ?? new Date(Date.now() + 7 * 86400000).toISOString();
    Object.assign(values, { subscription_status: 'past_due', grace_period_ends_at: grace, access_blocked_at: Date.parse(grace) <= Date.now() ? now : null });
  } else if (['canceled','unpaid','incomplete_expired','paused'].includes(subscription.status)) {
    Object.assign(values, { subscription_status: 'canceled', access_blocked_at: now });
  } else return;
  const { error: writeError } = await db.from('profiles').update(values).eq('user_id', userId);
  if (writeError) throw new Error('subscription_profile_update_failed');
  const customer = await stripe.customers.retrieve(customerId);
  if (!customer.deleted && customer.email) {
    const email = normalizedEmail(customer.email);
    if (active) {
      const { error } = await db.from('subscription_issues').update({ status: 'resolved', resolved_at: now, updated_at: now }).eq('email', email).in('status', ['pending','contacted']);
      if (error) throw new Error('subscription_issue_resolution_failed');
    } else {
      const { data: issue, error: readError } = await db.from('subscription_issues').select('id').eq('stripe_subscription_id', subscriptionId).in('status', ['pending','contacted']).limit(1).maybeSingle();
      if (readError) throw new Error('subscription_issue_lookup_failed');
      const details = { user_id: userId, email, stripe_customer_id: customerId, stripe_subscription_id: subscriptionId, issue_type: subscription.status === 'past_due' ? 'past_due' : 'subscription_canceled', grace_period_ends_at: values.grace_period_ends_at ?? null, updated_at: now };
      const { error } = issue ? await db.from('subscription_issues').update(details).eq('id', issue.id) : await db.from('subscription_issues').insert({ ...details, status: 'pending' });
      if (error) throw new Error('subscription_issue_write_failed');
    }
  }
}

export async function notifyInvoice(db: any, stripe: any, eventInvoice: any, failed: boolean) {
  const invoice = await stripe.invoices.retrieve(eventInvoice.id);
  const subscriptionId = invoiceSubscription(invoice);
  if (!subscriptionId || (failed && invoice.status === 'paid')) return;
  // Checkout sends initial access instructions. This handles renewals/trial conversion.
  if (!failed && (invoice.status !== 'paid' || invoice.billing_reason !== 'subscription_cycle')) return;
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const customer = await stripe.customers.retrieve(objectId(invoice.customer)!);
  if (customer.deleted || !customer.email) return;
  const email = normalizedEmail(customer.email);
  const plan = await planForSubscription(subscription);
  const key = `invoice:${invoice.id}:${failed ? `failed-${invoice.attempt_count}` : 'approved'}`;
  await withBillingLock(db, `email:${key}`, async () => {
    await sendPaymentEmail(db, key, async () => ({ to: email, ...paymentEmail(failed ? 'failed' : 'approved', email, plan) }));
  });
}
