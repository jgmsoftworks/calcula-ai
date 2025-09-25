import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { getStripe } from "../_shared/billing.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://calculaaibr.com",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const priceForPlan = (plan: string) => {
  switch (plan) {
    case "profissional":
      return Deno.env.get("STRIPE_PRICE_PROFISSIONAL");
    case "empresarial":
      return Deno.env.get("STRIPE_PRICE_EMPRESARIAL");
    default:
      return undefined;
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  try {
    const url = new URL(req.url);
    const plan = url.searchParams.get("plan")?.toLowerCase() ?? "profissional";
    const priceId = priceForPlan(plan);

    if (!priceId) {
      return new Response(JSON.stringify({ error: "Invalid plan" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const stripe = getStripe();
    const successUrl = `https://calculaaibr.com/auth/stripe-complete?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `https://calculaaibr.com/planos?cancelado=1&plan=${plan}`;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      allow_promotion_codes: true,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { plan },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error) {
    console.error("[API-CHECKOUT] Failed to create checkout session", error);
    return new Response(JSON.stringify({ error: "Failed to create checkout session" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
