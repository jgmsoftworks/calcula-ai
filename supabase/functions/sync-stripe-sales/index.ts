import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SYNC-STRIPE-SALES] ${step}${detailsStr}`);
};

// Mapear produtos Stripe para tipos de plano
const PRODUCT_TO_PLAN: Record<string, string> = {
  'prod_RnvW0xUpCQRJPv': 'professional_monthly',
  'prod_RnvW14nZmMTlnR': 'professional_yearly',
  'prod_RnvWiS1Gy2t2Wj': 'enterprise_monthly',
  'prod_RnvWc1EUi0e0Op': 'enterprise_yearly',
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");
    
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Buscar sessões de checkout completadas nos últimos 30 dias
    const thirtyDaysAgo = Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60);
    
    const sessions = await stripe.checkout.sessions.list({
      status: 'complete',
      limit: 100,
      created: { gte: thirtyDaysAgo }
    });

    logStep("Checkout sessions fetched", { count: sessions.data.length });

    let syncedCount = 0;
    let skippedCount = 0;

    for (const session of sessions.data) {
      // Verificar se já existe registro desta venda
      const { data: existingSale } = await supabaseClient
        .from('affiliate_sales')
        .select('id')
        .eq('stripe_session_id', session.id)
        .maybeSingle();

      if (existingSale) {
        skippedCount++;
        continue;
      }

      // Verificar se tem código de afiliado
      const affiliateCode = session.metadata?.affiliate_code;
      
      if (!affiliateCode) {
        logStep("Session without affiliate code", { sessionId: session.id });
        continue;
      }

      // Buscar affiliate link
      const { data: affiliateLink } = await supabaseClient
        .from('affiliate_links')
        .select('id, affiliate_id, affiliates(id, commission_type, commission_percentage, commission_fixed_amount)')
        .eq('link_code', affiliateCode)
        .maybeSingle();

      if (!affiliateLink) {
        logStep("Affiliate link not found", { code: affiliateCode });
        continue;
      }

      const affiliate = affiliateLink.affiliates as any;

      // Buscar detalhes do produto
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
      const priceId = lineItems.data[0]?.price?.id;
      const productId = lineItems.data[0]?.price?.product as string;
      
      const planType = PRODUCT_TO_PLAN[productId] || 'professional_monthly';
      const saleAmount = (session.amount_total || 0) / 100; // Converter de centavos

      // Calcular comissão
      let commissionAmount = 0;
      if (affiliate.commission_type === 'percentage') {
        commissionAmount = (saleAmount * affiliate.commission_percentage) / 100;
      } else {
        commissionAmount = affiliate.commission_fixed_amount;
      }

      // Inserir venda
      const { data: sale, error: saleError } = await supabaseClient
        .from('affiliate_sales')
        .insert({
          affiliate_id: affiliate.id,
          affiliate_link_id: affiliateLink.id,
          customer_email: session.customer_email || session.customer_details?.email || '',
          customer_name: session.customer_details?.name,
          sale_amount: saleAmount,
          commission_amount: commissionAmount,
          plan_type: planType,
          stripe_session_id: session.id,
          stripe_payment_intent_id: session.payment_intent as string,
          status: 'confirmed',
          confirmed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (saleError) {
        logStep("Error inserting sale", { error: saleError.message });
        continue;
      }

      // Inserir comissão
      await supabaseClient
        .from('affiliate_commissions')
        .insert({
          affiliate_id: affiliate.id,
          sale_id: sale.id,
          amount: commissionAmount,
          status: 'pending',
        });

      // Atualizar contadores do link
      await supabaseClient
        .from('affiliate_links')
        .update({ 
          conversions_count: affiliateLink.conversions_count + 1 
        })
        .eq('id', affiliateLink.id);

      // Atualizar totais do afiliado
      await supabaseClient.rpc('increment_affiliate_totals', {
        affiliate_id: affiliate.id,
        sale_amount: saleAmount,
        commission_amount: commissionAmount
      });

      syncedCount++;
      logStep("Sale synced", { sessionId: session.id, amount: saleAmount });
    }

    return new Response(JSON.stringify({ 
      success: true,
      synced: syncedCount,
      skipped: skippedCount,
      total: sessions.data.length
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});