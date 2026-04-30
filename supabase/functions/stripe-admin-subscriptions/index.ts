// Lista, cancela e atualiza assinaturas. Suporta conta atual e legada.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import {
  corsHeaders,
  handlePreflight,
  jsonResponse,
  requireAdmin,
} from "../_shared/stripeAdmin.ts";

function pickClient(
  source: string | undefined,
  current: Stripe,
  legacy: Stripe | null,
): Stripe {
  if (source === "legacy") {
    if (!legacy) throw new Error("Conta legada não configurada (STRIPE_SECRET_KEY_LEGACY)");
    return legacy;
  }
  return current;
}

async function listSubs(stripe: Stripe, status: string, limit: number) {
  const params: Stripe.SubscriptionListParams = { limit, expand: ["data.customer"] };
  if (status !== "all") params.status = status as Stripe.SubscriptionListParams.Status;
  const subs = await stripe.subscriptions.list(params);
  return subs.data.map((s) => {
    const customer = s.customer as Stripe.Customer | string;
    const item = s.items.data[0];
    return {
      id: s.id,
      status: s.status,
      customer_id: typeof customer === "string" ? customer : customer.id,
      customer_email: typeof customer === "string" ? null : customer.email,
      customer_name: typeof customer === "string" ? null : customer.name,
      amount: (item?.price.unit_amount ?? 0) / 100,
      currency: item?.price.currency ?? "brl",
      interval: item?.price.recurring?.interval ?? null,
      product_id: typeof item?.price.product === "string" ? item?.price.product : null,
      current_period_end: s.current_period_end,
      cancel_at_period_end: s.cancel_at_period_end,
      created: s.created,
    };
  });
}

serve(async (req) => {
  const pre = handlePreflight(req);
  if (pre) return pre;

  try {
    const { stripe, stripeLegacy } = await requireAdmin(req);
    const body = await req.json().catch(() => ({}));
    const action = body.action ?? "list";
    const client = pickClient(body.source, stripe, stripeLegacy);

    switch (action) {
      case "list": {
        const status = body.status ?? "active";
        const limit = Math.min(Number(body.limit ?? 50), 100);
        const subscriptions = await listSubs(client, status, limit);
        return jsonResponse({ subscriptions });
      }
      case "cancel": {
        if (!body.subscription_id) throw new Error("subscription_id obrigatório");
        const immediate = body.immediate === true;
        const sub = immediate
          ? await client.subscriptions.cancel(body.subscription_id)
          : await client.subscriptions.update(body.subscription_id, {
              cancel_at_period_end: true,
            });
        return jsonResponse({ subscription: sub });
      }
      case "reactivate": {
        if (!body.subscription_id) throw new Error("subscription_id obrigatório");
        const sub = await client.subscriptions.update(body.subscription_id, {
          cancel_at_period_end: false,
        });
        return jsonResponse({ subscription: sub });
      }
      case "refund_last_invoice": {
        if (!body.subscription_id) throw new Error("subscription_id obrigatório");
        const sub = await client.subscriptions.retrieve(body.subscription_id);
        const invoiceId = (sub as any).latest_invoice as string | null;
        if (!invoiceId) throw new Error("Sem fatura recente");
        const invoice = await client.invoices.retrieve(invoiceId);
        const chargeId = (invoice as any).charge as string | null;
        if (!chargeId) throw new Error("Sem cobrança associada");
        const refund = await client.refunds.create({ charge: chargeId });
        return jsonResponse({ refund });
      }
      default:
        return jsonResponse({ error: "Ação inválida" }, 400);
    }
  } catch (err) {
    if (err instanceof Response) return err;
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[stripe-admin-subscriptions] erro:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
