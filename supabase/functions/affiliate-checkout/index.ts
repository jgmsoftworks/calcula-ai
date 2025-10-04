import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper logging function for debugging
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[AFFILIATE-CHECKOUT] ${step}${detailsStr}`);
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

  logStep('Function started');

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const { planType, billing, affiliateCode, direct } = await req.json();
    logStep('Request received', { planType, billing, affiliateCode, direct });
    
    // Verificar se há cookie de afiliado para visitantes
    let affiliateCodeFromCookie = null;
    if (direct && !affiliateCode) {
      const cookies = req.headers.get("cookie") || "";
      const affCookieMatch = cookies.match(/aff_code=([^;]+)/);
      if (affCookieMatch) {
        affiliateCodeFromCookie = affCookieMatch[1];
        logStep('Affiliate code from cookie', { code: affiliateCodeFromCookie });
      }
    }
    
    const effectiveAffiliateCode = affiliateCode || affiliateCodeFromCookie;
    let priceId = null;
    let affiliateId = null;

    // Se há código de afiliado, buscar o price ID específico
    if (effectiveAffiliateCode) {
      logStep('Looking for affiliate products', { code: effectiveAffiliateCode });
      
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
        .eq('link_code', effectiveAffiliateCode)
        .single();

      if (linkData?.affiliate) {
        affiliateId = linkData.affiliate.id;
        logStep('Affiliate found', { affiliateId, name: linkData.affiliate.name });
        
        const affiliateProducts = linkData.affiliate.affiliate_stripe_products || [];
        const specificProduct = affiliateProducts.find(
          (p: any) => p.plan_type === planType && p.billing === billing && p.is_active
        );

        if (specificProduct) {
          priceId = specificProduct.stripe_price_id;
          logStep('Using affiliate specific price', { priceId });
        }

        // Atualizar contador de cliques
        await supabaseClient
          .from('affiliate_links')
          .update({ clicks_count: (linkData.clicks_count || 0) + 1 })
          .eq('link_code', effectiveAffiliateCode);
        
        logStep('Click count updated');
      } else {
        logStep('Affiliate not found');
      }
    }

    // Se não encontrou price ID específico, usar fallback
    if (!priceId) {
      const planKey = `${planType}_${billing}` as keyof typeof FALLBACK_PLAN_PRICES;
      priceId = FALLBACK_PLAN_PRICES[planKey];
      logStep('Using fallback price', { planKey, priceId });
    }

    if (!priceId) {
      logStep('ERROR: No price ID found', { planType, billing });
      throw new Error(`Plano inválido: ${planType}_${billing}`);
    }

    // Initialize Stripe
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      logStep('ERROR: STRIPE_SECRET_KEY not set');
      throw new Error('STRIPE_SECRET_KEY not configured');
    }
    
    const stripe = new Stripe(stripeKey, {
      apiVersion: "2025-08-27.basil",
    });
    logStep('Stripe initialized');

    // Configure customer based on authentication
    let customerConfig: any = {};
    
    if (!direct) {
      const authHeader = req.headers.get("Authorization");
      if (authHeader) {
        const token = authHeader.replace("Bearer ", "");
        const { data } = await supabaseClient.auth.getUser(token);
        const user = data.user;
        
        if (user?.email) {
          logStep('User authenticated', { userId: user.id, email: user.email });
          
          // Check if customer already exists in Stripe
          const customers = await stripe.customers.list({ email: user.email, limit: 1 });
          if (customers.data.length > 0) {
            customerConfig = { customer: customers.data[0].id };
            logStep('Existing Stripe customer found', { customerId: customers.data[0].id });
          } else {
            customerConfig = { customer_email: user.email };
            logStep('New customer, will use email', { email: user.email });
          }
        }
      }
    } else {
      logStep('Direct checkout mode - customer will enter email in Stripe');
    }

    // Buscar cupom ativo para o afiliado
    let discountConfig: any = {};
    if (effectiveAffiliateCode && affiliateId) {
      logStep('Looking for affiliate coupons', { affiliateId });
      
      const { data: coupons } = await supabaseClient
        .from('affiliate_coupons')
        .select('stripe_coupon_id, max_redemptions, times_redeemed, expires_at, discount_type, discount_value')
        .eq('affiliate_id', affiliateId)
        .eq('is_active', true)
        .or(`expires_at.is.null,expires_at.gte.${new Date().toISOString()}`)
        .limit(1);

      if (coupons && coupons.length > 0) {
        const coupon = coupons[0];
        logStep('Coupon found', { 
          couponId: coupon.stripe_coupon_id,
          type: coupon.discount_type,
          value: coupon.discount_value 
        });
        
        // Verificar limite de usos
        if (!coupon.max_redemptions || coupon.times_redeemed < coupon.max_redemptions) {
          // Validar cupom no Stripe antes de aplicar
          try {
            const stripeCoupon = await stripe.coupons.retrieve(coupon.stripe_coupon_id);
            if (stripeCoupon && stripeCoupon.valid) {
              discountConfig = {
                discounts: [{ coupon: coupon.stripe_coupon_id }]
              };
              logStep('Coupon validated and will be applied', { couponId: coupon.stripe_coupon_id });
            } else {
              logStep('Coupon invalid in Stripe', { couponId: coupon.stripe_coupon_id });
            }
          } catch (error) {
            logStep('Error validating coupon in Stripe', { 
              error: error.message,
              couponId: coupon.stripe_coupon_id 
            });
          }
        } else {
          logStep('Coupon reached redemption limit', { 
            redeemed: coupon.times_redeemed,
            max: coupon.max_redemptions 
          });
        }
      } else {
        logStep('No active coupons found for affiliate');
      }
    }

    // Create Stripe checkout session
    logStep('Creating Stripe checkout session', { 
      priceId,
      hasCustomer: !!customerConfig.customer,
      hasEmail: !!customerConfig.customer_email,
      hasDiscount: !!discountConfig.discounts
    });

    try {
      const session = await stripe.checkout.sessions.create({
        line_items: [{
          price: priceId,
          quantity: 1,
        }],
        mode: "subscription",
        success_url: `${req.headers.get("origin")}/auth/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.headers.get("origin")}/planos`,
        metadata: {
          affiliate_code: effectiveAffiliateCode || "",
          affiliate_id: affiliateId || "",
          plan_type: planType,
          billing: billing,
          is_affiliate_sale: effectiveAffiliateCode ? "true" : "false"
        },
        ...customerConfig,
        ...discountConfig
      });

      logStep('Checkout session created successfully', { 
        sessionId: session.id,
        url: session.url 
      });

      return new Response(JSON.stringify({ url: session.url }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    } catch (stripeError: any) {
      logStep('Stripe session creation failed', { 
        error: stripeError.message,
        type: stripeError.type,
        code: stripeError.code,
        param: stripeError.param
      });
      throw stripeError;
    }
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep('ERROR in affiliate-checkout', { 
      message: errorMessage,
      type: error.type,
      code: error.code
    });
    
    return new Response(JSON.stringify({ 
      error: errorMessage,
      details: error.type || 'unknown_error'
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});