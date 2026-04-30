// Lista produtos e preços ativos da conta atual (para popular Payment Links).
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import {
  corsHeaders,
  handlePreflight,
  jsonResponse,
  requireAdmin,
} from "../_shared/stripeAdmin.ts";

serve(async (req) => {
  const pre = handlePreflight(req);
  if (pre) return pre;

  try {
    const { stripe } = await requireAdmin(req);
    const products = await stripe.products.list({ active: true, limit: 100 });
    const prices = await stripe.prices.list({ active: true, limit: 100, expand: ["data.product"] });

    return jsonResponse({
      products: products.data.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        active: p.active,
      })),
      prices: prices.data.map((pr) => ({
        id: pr.id,
        product_id: typeof pr.product === "string" ? pr.product : pr.product.id,
        product_name: typeof pr.product === "string" ? null : (pr.product as any).name,
        unit_amount: (pr.unit_amount ?? 0) / 100,
        currency: pr.currency,
        interval: pr.recurring?.interval ?? null,
      })),
    });
  } catch (err) {
    if (err instanceof Response) return err;
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[stripe-admin-products] erro:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
