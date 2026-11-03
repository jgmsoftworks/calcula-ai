import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import type Stripe from 'https://esm.sh/stripe@18.5.0';
import { handlePreflight, jsonResponse, requireAdmin } from '../_shared/stripeAdmin.ts';
import { collectFinancialMetrics } from '../_shared/collectFinancialMetrics.ts';
import { currencyScale } from '../_shared/financialMetrics.ts';

async function collectAccount(stripe: Stripe, label: string, now: number) {
  try {
    const [account, { report, balance, charges }] = await Promise.all([
      stripe.accounts.retrieve(), collectFinancialMetrics(stripe, now),
    ]);
    const brl = report.currencies.find(c => c.currency === 'brl')!;
    // Compatibility for already-open clients during the coordinated rollout.
    // All legacy fields now come from the same reconciled BRL report.
    const balanceBrl = (rows: Array<{ currency: string; amount: number }>) => rows.filter(b => b.currency === 'brl').reduce((sum, b) => sum + b.amount, 0) / 100;
    return {
      active_subscriptions: brl.paidSubscriptions, trialing: report.trialing, past_due: brl.pastDueSubscriptions,
      canceled_last_30d: report.canceledSubscriptions30d, mrr_brl: brl.mrr,
      revenue_last_30d_brl: brl.netReceived30d, balance_available_brl: balanceBrl(balance.available), balance_pending_brl: balanceBrl(balance.pending),
      ...(brl.mrrReason ? { error: brl.mrrReason } : {}),
      label, account: { id: account.id, name: account.business_profile?.name ?? account.settings?.dashboard?.display_name ?? label,
        country: account.country }, financial: report,
      balances: [...new Set([...balance.available, ...balance.pending].map((b: { currency: string }) => b.currency))].map(currency => ({
        currency,
        available: balance.available.filter((b: { currency: string }) => b.currency === currency).reduce((sum: number, b: { amount: number }) => sum + b.amount, 0) / currencyScale(String(currency)),
        pending: balance.pending.filter((p: { currency: string }) => p.currency === currency).reduce((sum: number, p: { amount: number }) => sum + p.amount, 0) / currencyScale(String(currency)),
      })),
      recent_charges: charges.slice(0, 10).map(c => ({ id: c.id, amount: c.amount / currencyScale(c.currency), currency: c.currency,
        created: c.created, status: c.status, customer_email: c.billing_details?.email ?? c.receipt_email ?? null })),
    };
  } catch {
    console.error('[stripe-admin-dashboard] account_reporting_failed', label);
    return { label, financial: null, error: 'Não foi possível conciliar esta conta Stripe. Os valores financeiros estão indisponíveis; tente atualizar.' };
  }
}

serve(async req => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;
  if (!['GET', 'POST'].includes(req.method)) return jsonResponse({ error: 'Método não permitido' }, 405);
  try {
    const { stripe, stripeLegacy, supabase } = await requireAdmin(req);
    const { data, error } = await supabase.from('stripe_settings').select('value').eq('key', 'legacy_enabled').maybeSingle();
    if (error) throw error;
    const legacyEnabled = data?.value === 'true';
    const now = Math.floor(Date.now() / 1000);
    const [current, legacy] = await Promise.all([
      collectAccount(stripe, 'Atual', now),
      legacyEnabled && stripeLegacy ? collectAccount(stripeLegacy, 'Legada', now) : Promise.resolve(null),
    ]);
    const response = jsonResponse({ current, legacy, legacyEnabled,
      scopeNote: legacyEnabled
        ? (stripeLegacy ? 'Contas Stripe atual e legada apresentadas separadamente.' : 'Conta legada habilitada, mas conexão ausente; ela não está incluída.')
        : 'Conta Stripe atual. Conta legada não habilitada; pagamentos externos não incluídos.' });
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('[stripe-admin-dashboard] reporting_unavailable');
    return jsonResponse({ error: 'Não foi possível consultar os dados financeiros.' }, 503);
  }
});
