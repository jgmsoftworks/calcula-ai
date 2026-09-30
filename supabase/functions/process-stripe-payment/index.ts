import { billingDb, billingStripe, checkoutState, objectId } from '../_shared/billing.ts';
import { maskedEmail } from '../_shared/billingRules.ts';
const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers });
  if (req.method !== 'POST') return json({ error: 'Método não permitido.' }, 405);
  try {
    const body = await req.json();
    if (body.signup_data) return json({ error: 'Defina sua senha pelo link enviado ao e-mail da compra.' }, 400);
    const sessionId = body.session_id;
    if (typeof sessionId !== 'string' || !/^cs_(live|test)_[A-Za-z0-9]{16,200}$/.test(sessionId)) return json({ error: 'Link de confirmação inválido.' }, 400);
    const stripe = billingStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.mode !== 'subscription') return json({ error: 'Compra não reconhecida.' }, 400);
    const subId = objectId(session.subscription);
    const subscription = subId ? await stripe.subscriptions.retrieve(subId) : null;
    const state = checkoutState(session, subscription);
    const db = billingDb();
    const { data: checkout, error } = await db.from('billing_checkouts').select('status,plan,email,user_id,needs_password_setup').eq('session_id', sessionId).maybeSingle();
    if (error) throw new Error('checkout_lookup_failed');
    const { data: email, error: mailError } = await db.from('billing_emails').select('sent_at').eq('key', `checkout:${sessionId}:${state}`).maybeSingle();
    if (mailError) throw new Error('email_lookup_failed');
    const fulfilled = ['approved','trial'].includes(state) && !!checkout?.user_id;
    // A checkout ID proves purchase context, never identity. No credentials or
    // full personal data, account creation, or email sending on this endpoint.
    return json({ success: fulfilled, status: state, access_ready: fulfilled,
      email_sent: !!email?.sent_at,
      email_hint: maskedEmail(checkout?.email ?? session.customer_details?.email ?? '***@***'),
      needs_password_setup: checkout?.needs_password_setup ?? true, plan: checkout?.plan ?? null });
  } catch (error) {
    if ((error as { type?: string }).type === 'StripeInvalidRequestError') return json({ error: 'Não encontramos esta confirmação de pagamento.' }, 404);
    console.error('[PAYMENT-STATUS] lookup_failed');
    return json({ error: 'Não foi possível verificar agora. Se você já pagou, não compre novamente.' }, 503);
  }
});
