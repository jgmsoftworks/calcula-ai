import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PLAN_PRICES = {
  professional_monthly: "price_1Qo3XwL9S1MuVhKR6oRGh8Dn",
  professional_yearly: "price_1Qo3YzL9S1MuVhKRGxT3MJgz",
  enterprise_monthly: "price_1Qo3ZxL9S1MuVhKRfxQRsNyW",
  enterprise_yearly: "price_1Qo3a7L9S1MuVhKRGhFqpHxR",
} as const;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    const { planType, billing, affiliateCode } = await req.json();
    
    // Rastrear clique no link de afiliado se presente
    if (affiliateCode) {
      const { data: linkData } = await supabaseClient
        .from('affiliate_links')
        .select('clicks_count')
        .eq('link_code', affiliateCode)
        .single();

      if (linkData) {
        await supabaseClient
          .from('affiliate_links')
          .update({ clicks_count: (linkData.clicks_count || 0) + 1 })
          .eq('link_code', affiliateCode);
      }
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const planKey = `${planType}_${billing}` as keyof typeof PLAN_PRICES;
    const priceId = PLAN_PRICES[planKey];

    if (!priceId) {
      throw new Error("Plano inválido");
    }

    const session = await stripe.checkout.sessions.create({
      line_items: [{
        price: priceId,
        quantity: 1,
      }],
      mode: "subscription",
      success_url: `${req.headers.get("origin")}/auth/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/planos`,
      metadata: {
        affiliate_code: affiliateCode || "",
        plan_type: planType,
        billing: billing
      }
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Erro:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});