import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Preços padrão (fallback se não houver afiliado)
const FALLBACK_PLAN_PRICES = {
  professional_monthly: "price_1SAL2dBnxFLGYBYfkowqS28X", // R$ 49,90
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
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const { planType, billing, affiliateCode, direct } = await req.json();
    
    console.log(`[AFFILIATE-CHECKOUT] Iniciando checkout - Plan: ${planType}_${billing}, Affiliate: ${affiliateCode}`);
    
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
    let priceId = null;
    let affiliateId = null;

    // Se há código de afiliado, buscar o price ID específico
    if (finalAffiliateCode) {
      console.log(`[AFFILIATE-CHECKOUT] Buscando produto específico para afiliado: ${finalAffiliateCode}`);
      
      // Buscar o link do afiliado e seus produtos
      const { data: linkData } = await supabaseClient
        .from('affiliate_links')
        .select(`
          *,
          affiliate:affiliates!inner(
            id,
            name,
            affiliate_stripe_products(
              stripe_price_id,
              plan_type,
              billing,
              is_active
            )
          )
        `)
        .eq('link_code', finalAffiliateCode)
        .single();

      if (linkData?.affiliate) {
        affiliateId = linkData.affiliate.id;
        
        // Encontrar o produto específico para este plano
        const affiliateProducts = linkData.affiliate.affiliate_stripe_products || [];
        const specificProduct = affiliateProducts.find(
          (p: any) => p.plan_type === planType && p.billing === billing && p.is_active
        );

        if (specificProduct) {
          priceId = specificProduct.stripe_price_id;
          console.log(`[AFFILIATE-CHECKOUT] Usando price ID específico do afiliado: ${priceId}`);
        }

        // Atualizar contador de cliques
        await supabaseClient
          .from('affiliate_links')
          .update({ clicks_count: (linkData.clicks_count || 0) + 1 })
          .eq('link_code', finalAffiliateCode);
      }
    }

    // Se não encontrou price ID específico, usar fallback
    if (!priceId) {
      const planKey = `${planType}_${billing}` as keyof typeof FALLBACK_PLAN_PRICES;
      priceId = FALLBACK_PLAN_PRICES[planKey];
      console.log(`[AFFILIATE-CHECKOUT] Usando price ID padrão: ${priceId}`);
    }

    if (!priceId) {
      throw new Error("Plano inválido");
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

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

    // Buscar cupom ativo para o afiliado
    let discountConfig = {};
    if (finalAffiliateCode && affiliateId) {
      console.log(`[AFFILIATE-CHECKOUT] Buscando cupons ativos para afiliado: ${affiliateId}`);
      
      const { data: coupons } = await supabaseClient
        .from('affiliate_coupons')
        .select('*')
        .eq('affiliate_id', affiliateId)
        .eq('is_active', true)
        .or(`expires_at.is.null,expires_at.gte.${new Date().toISOString()}`)
        .limit(1);

      if (coupons && coupons.length > 0) {
        const coupon = coupons[0];
        console.log(`[AFFILIATE-CHECKOUT] Cupom encontrado: ${coupon.stripe_coupon_id}`);
        
        // Verificar se o cupom ainda não atingiu o limite de usos
        if (!coupon.max_redemptions || coupon.times_redeemed < coupon.max_redemptions) {
          discountConfig = {
            discounts: [{
              coupon: coupon.stripe_coupon_id
            }]
          };
          console.log(`[AFFILIATE-CHECKOUT] Aplicando cupom: ${coupon.stripe_coupon_id}`);
        } else {
          console.log(`[AFFILIATE-CHECKOUT] Cupom atingiu limite de usos: ${coupon.times_redeemed}/${coupon.max_redemptions}`);
        }
      } else {
        console.log(`[AFFILIATE-CHECKOUT] Nenhum cupom ativo encontrado para afiliado: ${affiliateId}`);
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
        affiliate_id: affiliateId || "",
        plan_type: planType,
        billing: billing,
        is_affiliate_sale: finalAffiliateCode ? "true" : "false"
      },
      ...customerConfig,
      ...discountConfig
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