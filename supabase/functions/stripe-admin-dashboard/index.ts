// Painel admin Stripe — KPIs e métricas em tempo real.
// Retorna dados da conta atual + legada (se STRIPE_SECRET_KEY_LEGACY existir).
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import {
  corsHeaders,
  handlePreflight,
  jsonResponse,
  requireAdmin,
} from "../_shared/stripeAdmin.ts";

interface AccountMetrics {
  label: string;
  account: { name: string | null; email: string | null; country: string | null } | null;
  active_subscriptions: number;
  trialing: number;
  past_due: number;
  canceled_last_30d: number;
  mrr_brl: number;
  revenue_last_30d_brl: number;
  balance_available_brl: number;
  balance_pending_brl: number;
  recent_charges: Array<{
    id: string;
    amount: number;
    currency: string;
    created: number;
    customer_email: string | null;
    status: string;
    description: string | null;
  }>;
  error?: string;
}

async function collectMetrics(stripe: Stripe, label: string): Promise<AccountMetrics> {
  const result: AccountMetrics = {
    label,
    account: null,
    active_subscriptions: 0,
    trialing: 0,
    past_due: 0,
    canceled_last_30d: 0,
    mrr_brl: 0,
    revenue_last_30d_brl: 0,
    balance_available_brl: 0,
    balance_pending_brl: 0,
    recent_charges: [],
  };

  try {
    const acc = await stripe.accounts.retrieve();
    result.account = {
      name: acc.business_profile?.name ?? acc.settings?.dashboard?.display_name ?? null,
      email: acc.email ?? null,
      country: acc.country ?? null,
    };

    // Assinaturas ativas (até 100, paginação simples)
    const active = await stripe.subscriptions.list({ status: "active", limit: 100 });
    result.active_subscriptions = active.data.length;
    let mrr = 0;
    for (const sub of active.data) {
      for (const item of sub.items.data) {
        const amount = (item.price.unit_amount ?? 0) * (item.quantity ?? 1);
        const interval = item.price.recurring?.interval;
        if (interval === "month") mrr += amount;
        else if (interval === "year") mrr += amount / 12;
        else if (interval === "week") mrr += amount * 4.33;
      }
    }
    result.mrr_brl = mrr / 100;

    const trialing = await stripe.subscriptions.list({ status: "trialing", limit: 100 });
    result.trialing = trialing.data.length;

    const pastDue = await stripe.subscriptions.list({ status: "past_due", limit: 100 });
    result.past_due = pastDue.data.length;

    const canceled = await stripe.subscriptions.list({
      status: "canceled",
      limit: 100,
      created: { gte: Math.floor(Date.now() / 1000) - 30 * 86400 },
    });
    result.canceled_last_30d = canceled.data.length;

    // Receita últimos 30d
    const charges = await stripe.charges.list({
      limit: 100,
      created: { gte: Math.floor(Date.now() / 1000) - 30 * 86400 },
    });
    let revenue = 0;
    for (const c of charges.data) {
      if (c.paid && !c.refunded) revenue += c.amount - (c.amount_refunded ?? 0);
    }
    result.revenue_last_30d_brl = revenue / 100;

    // Últimas cobranças (10)
    result.recent_charges = charges.data.slice(0, 10).map((c) => ({
      id: c.id,
      amount: c.amount / 100,
      currency: c.currency,
      created: c.created,
      customer_email: c.billing_details?.email ?? c.receipt_email ?? null,
      status: c.status,
      description: c.description,
    }));

    // Saldo
    const balance = await stripe.balance.retrieve();
    result.balance_available_brl =
      balance.available.reduce((s, b) => s + b.amount, 0) / 100;
    result.balance_pending_brl =
      balance.pending.reduce((s, b) => s + b.amount, 0) / 100;
  } catch (err) {
    result.error = err instanceof Error ? err.message : String(err);
  }

  return result;
}

serve(async (req) => {
  const pre = handlePreflight(req);
  if (pre) return pre;

  try {
    const { stripe, stripeLegacy, supabase } = await requireAdmin(req);

    const { data: legacyEnabledRow } = await supabase
      .from("stripe_settings")
      .select("value")
      .eq("key", "legacy_enabled")
      .maybeSingle();
    const legacyEnabled = legacyEnabledRow?.value === "true";

    const current = await collectMetrics(stripe, "Atual");
    const legacy =
      legacyEnabled && stripeLegacy
        ? await collectMetrics(stripeLegacy, "Legado")
        : null;

    return jsonResponse({ current, legacy });
  } catch (err) {
    if (err instanceof Response) return err;
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[stripe-admin-dashboard] erro:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
