import { it, vi } from 'vitest';
vi.stubGlobal('Deno', { env: { get: (name: string) => process.env[name], set: (name: string, value: string) => { process.env[name] = value; }, delete: (name: string) => { delete process.env[name]; } } });
import { checkoutState, subscriptionEnd, invoiceSubscription, maskedEmail } from './billingRules.ts';
import { paymentEmail, sendPaymentEmail } from './billingEmails.ts';
import { fulfillCheckout, withBillingLock } from './billing.ts';

function assert(condition: unknown, message = 'assertion failed'): asserts condition { if (!condition) throw new Error(message); }
async function rejects(action: () => Promise<unknown>, expected: string) {
  try { await action(); } catch (error) { assert(String(error).includes(expected), String(error)); return; }
  throw new Error(`Expected ${expected}`);
}
const future = Math.floor(Date.now() / 1000) + 86400;
const session = { id: 'cs_test_fixture', mode: 'subscription', customer: 'cus_fixture', subscription: 'sub_fixture', status: 'complete', payment_status: 'paid', customer_details: { email: 'BUYER@example.invalid' } };
const subscription = { id: 'sub_fixture', customer: 'cus_fixture', status: 'active', items: { data: [{ current_period_end: future, price: { id: 'price_fixture', product: 'prod_fixture' } }] } };

// In-memory persistence and Auth doubles; no Stripe, Supabase, or email calls.
function fixture(options: { existingUser?: boolean; mailFailure?: boolean; unpaid?: boolean; failProfile?: boolean } = {}) {
  const rows: Record<string, any[]> = { billing_checkouts: [], billing_emails: [], profiles: [] };
  const users: any[] = options.existingUser ? [{ id: 'user_existing', email: 'buyer@example.invalid', email_confirmed_at: '2026-01-01', last_sign_in_at: '2026-01-01' }] : [];
  let generated = 0, sent = 0;
  const rpcCalls: any[] = [];
  const db: any = {
    rpc: (_name: string, args: any) => { rpcCalls.push(args); return Promise.resolve({ data: 'claimed', error: null }); },
    auth: { admin: {
      listUsers: () => Promise.resolve({ data: { users }, error: null }),
      generateLink: ({ email, type }: any) => {
        generated++;
        let user = users.find(u => u.email === email);
        if (!user) { user = { id: 'user_new', email, email_confirmed_at: null, last_sign_in_at: null }; users.push(user); }
        return Promise.resolve({ data: { user, properties: { hashed_token: 'fake-token-for-tests-only', verification_type: type } }, error: null });
      },
    } },
    from: (table: string) => {
      let filters: [string, any][] = [], mode = 'select', values: any;
      const query: any = {
        select: () => query, eq: (key: string, value: any) => { filters.push([key, value]); return query; },
        maybeSingle: () => query,
        insert: (v: any) => { mode = 'insert'; values = v; return query; },
        upsert: (v: any) => { mode = 'upsert'; values = v; return query; },
        update: (v: any) => { mode = 'update'; values = v; return query; },
        then: (resolve: any) => {
          if (options.failProfile && table === 'profiles' && mode === 'upsert') return resolve({ error: { message: 'DB unavailable' } });
          const matches = (row: any) => filters.every(([key, value]) => row[key] === value);
          if (mode === 'insert') rows[table].push({ ...values });
          if (mode === 'upsert') {
            const key = table === 'profiles' ? 'user_id' : 'session_id';
            const old = rows[table].find(r => r[key] === values[key]);
            if (old) Object.assign(old, values); else rows[table].push({ ...values });
          }
          if (mode === 'update') rows[table].filter(matches).forEach(r => Object.assign(r, values));
          return resolve({ data: rows[table].find(matches) ?? null, error: null });
        },
      }; return query;
    },
  };
  const current = { ...session, payment_status: options.unpaid ? 'unpaid' : 'paid' };
  const stripe = { checkout: { sessions: { retrieve: () => Promise.resolve(current) } }, subscriptions: { retrieve: () => Promise.resolve(subscription) }, customers: { retrieve: () => Promise.resolve({ id: 'cus_fixture', email: 'buyer@example.invalid', name: 'Buyer' }) } };
  return { db, stripe, rows, users, rpcCalls, current, get generated() { return generated; }, get sent() { return sent; }, fetch: () => { sent++; return Promise.resolve(new Response(options.mailFailure ? '{}' : '{"id":"mail_fixture"}', { status: options.mailFailure ? 503 : 200 })); } };
}
async function withTransport(f: ReturnType<typeof fixture>, action: () => Promise<void>) {
  const originalFetch = globalThis.fetch;
  Deno.env.set('RESEND_API_KEY', 'fake-test-key'); Deno.env.set('PAYMENTS_EMAIL_FROM', 'test@example.invalid');
  globalThis.fetch = f.fetch;
  try { await action(); } finally { globalThis.fetch = originalFetch; Deno.env.delete('RESEND_API_KEY'); Deno.env.delete('PAYMENTS_EMAIL_FROM'); }
}
const run = (f: ReturnType<typeof fixture>) => fulfillCheckout(f.db, f.stripe, session.id, false, () => Promise.resolve('professional'));

it('paid, complete, active is approved; unpaid/open never grants access', () => {
  assert(checkoutState(session, subscription) === 'approved');
  assert(checkoutState({ ...session, payment_status: 'unpaid' }, subscription) === 'pending');
  assert(checkoutState({ ...session, status: 'open' }, subscription) === 'pending');
  assert(checkoutState(session, { status: 'canceled' }) === 'failed');
});
it('valid trial is distinct from a paid purchase', () => {
  assert(checkoutState({ ...session, payment_status: 'no_payment_required' }, { status: 'trialing', trial_end: future }) === 'trial');
  assert(checkoutState({ ...session, payment_status: 'no_payment_required' }, { status: 'trialing', trial_end: 1 }) !== 'trial');
});
it('uses subscription item period and supports new invoice parent', () => {
  assert(subscriptionEnd(subscription) === new Date(future * 1000).toISOString());
  assert(invoiceSubscription({ parent: { subscription_details: { subscription: { id: 'sub_new' } } } }) === 'sub_new');
  assert(invoiceSubscription({ subscription: 'sub_legacy' }) === 'sub_legacy');
});
it('pending checkout emails once and never creates an account or profile', async () => {
  const f = fixture({ unpaid: true });
  await withTransport(f, async () => { await run(f); await run(f); });
  assert(f.users.length === 0 && f.rows.profiles.length === 0 && f.generated === 0);
  assert(f.sent === 1 && f.rows.billing_checkouts[0].status === 'pending');
});
it('new paid buyer gets one account, correct plan and one activation email on retry', async () => {
  const f = fixture();
  await withTransport(f, async () => { await run(f); await run(f); });
  assert(f.users.length === 1 && f.rows.profiles[0].plan === 'professional');
  assert(f.rows.profiles[0].subscription_status === 'active');
  assert(f.rows.billing_checkouts[0].email === 'buyer@example.invalid');
  assert(f.sent === 1 && f.rows.billing_emails[0].payload === null);
  assert(f.rows.billing_checkouts[0].needs_password_setup === true);
});
it('existing buyer keeps account and password; no activation token is generated', async () => {
  const f = fixture({ existingUser: true });
  await withTransport(f, () => run(f));
  assert(f.generated === 0 && f.users.length === 1);
  assert(f.rows.profiles[0].user_id === 'user_existing');
  assert(f.rows.billing_checkouts[0].needs_password_setup === false);
});
it('provider failure stays unsent and propagates for Stripe retry', async () => {
  const f = fixture({ mailFailure: true });
  await withTransport(f, async () => { await rejects(() => run(f), 'payment_email_provider_503'); });
  assert(!f.rows.billing_emails[0].sent_at && !!f.rows.billing_emails[0].payload);
  assert(f.rpcCalls.at(-1).completed === false);
});
it('profile failure cannot be announced as access granted', async () => {
  const f = fixture({ failProfile: true });
  await withTransport(f, async () => { await rejects(() => run(f), 'billing_profile_update_failed'); });
  assert(f.sent === 0 && f.rows.billing_checkouts.length === 0);
});
it('late pending/failure cannot replace an approved checkout', async () => {
  const f = fixture();
  await withTransport(f, async () => { await run(f); f.current.payment_status = 'unpaid'; await run(f); });
  assert(f.sent === 1 && f.rows.billing_checkouts[0].status === 'approved');
});
it('busy event lock requests retry; completed event skips work', async () => {
  let called = false;
  await rejects(() => withBillingLock({ rpc: () => ({ data: 'busy' }) }, 'evt_fixture', async () => { called = true; }, true), 'billing_processing_retry');
  await withBillingLock({ rpc: () => ({ data: 'done' }) }, 'evt_fixture', async () => { called = true; }, true);
  assert(!called);
});
it('message escaping, canonical login and masked status response', () => {
  const mail = paymentEmail('approved', 'buyer@example.invalid', '<script>');
  assert(!mail.html.includes('<script>') && mail.html.includes('&lt;script&gt;'));
  assert(mail.html.includes('https://calculaaibr.com/auth?mode=login'));
  assert(maskedEmail('buyer@example.invalid') === 'bu***@example.invalid');
  assert(!paymentEmail('pending', 'buyer@example.invalid', 'Lite').html.includes('Entrar no Calcula Aí'));
});
it('unconfigured mail cannot return false success', async () => {
  Deno.env.delete('RESEND_API_KEY'); Deno.env.delete('PAYMENTS_EMAIL_FROM');
  const f = fixture();
  await rejects(() => sendPaymentEmail(f.db, 'missing_config', async () => ({ to: 'buyer@example.invalid', ...paymentEmail('pending','buyer@example.invalid','Lite') })), 'payment_email_not_configured');
});
