import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PLAN_PRICES = {
  professional_monthly: "price_1SAGaVBnxFLGYBYff91rBqoP", // R$ 49,00
  professional_yearly: "price_1SAGl3BnxFLGYBYfNdoF5crq", // R$ 478,80
  enterprise_monthly: "price_1SAGgdBnxFLGYBYfOzJwhMw3", // R$ 89,90
  enterprise_yearly: "price_1SAGlUBnxFLGYBYfwLnEZoId", // R$ 838,80
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
    const { planType, billing, affiliateCode, direct } = await req.json();
    
    // Verificar se há cookie de afiliado para visitantes
    let affiliateCodeFromCookie = null;
    if (direct && !affiliateCode) {
      // Se for checkout direto sem código de afiliado, verificar cookie
      const cookies = req.headers.get("cookie") || "";
      const affCookieMatch = cookies.match(/aff_code=([^;]+)/);
      if (affCookieMatch) {
        affiliateCodeFromCookie = affCookieMatch[1];
      }
    }
    
    const finalAffiliateCode = affiliateCode || affiliateCodeFromCookie;
    
    // Rastrear clique no link de afiliado se presente
    if (finalAffiliateCode) {
      const { data: linkData } = await supabaseClient
        .from('affiliate_links')
        .select('clicks_count')
        .eq('link_code', finalAffiliateCode)
        .single();

      if (linkData) {
        await supabaseClient
          .from('affiliate_links')
          .update({ clicks_count: (linkData.clicks_count || 0) + 1 })
          .eq('link_code', finalAffiliateCode);
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

    // Para chamadas diretas (guest checkout), não verificar autenticação
    let customerConfig = {};
    
    if (!direct) {
      // Para chamadas autenticadas, usar email do usuário
      const authHeader = req.headers.get("Authorization");
      if (authHeader) {
        const token = authHeader.replace("Bearer ", "");
        const { data } = await supabaseClient.auth.getUser(token);
        const user = data.user;
        
        if (user?.email) {
          // Verificar se já existe um customer no Stripe
          const customers = await stripe.customers.list({ email: user.email, limit: 1 });
          if (customers.data.length > 0) {
            customerConfig = { customer: customers.data[0].id };
          } else {
            customerConfig = { customer_email: user.email };
          }
        }
      }
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
        affiliate_code: finalAffiliateCode || "",
        plan_type: planType,
        billing: billing
      },
      ...customerConfig
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