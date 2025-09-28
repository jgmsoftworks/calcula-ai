import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  console.log(`[SYNC-AFFILIATE-SALES] ${step}`, details ? { details, timestamp: new Date().toISOString() } : { timestamp: new Date().toISOString() });
};

const PRODUCT_TO_PLAN: Record<string, string> = {
  "prod_T6TXCmpEQTIaRT": "professional",
  "prod_T6TeSPeBygwJz7": "professional", 
  "prod_T6TiY7VskZgNKg": "professional",
  "prod_T6TYlKJ4hdq6m1": "enterprise",
  "prod_T6TdpmHjPubwhM": "enterprise",
  "prod_T6Te4Zsr3iA7x5": "enterprise",
  "prod_T6TiS2ZoP1MhUL": "enterprise"
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Starting affiliate sales sync");

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { 
      apiVersion: "2025-08-27.basil" 
    });

    logStep("Stripe and Supabase clients initialized");

    // Get the last 30 days of checkout sessions
    const thirtyDaysAgo = Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60);
    
    const sessions = await stripe.checkout.sessions.list({
      created: { gte: thirtyDaysAgo },
      status: 'complete',
      limit: 100
    });

    logStep(`Found ${sessions.data.length} completed checkout sessions in last 30 days`);

    let syncedSales = 0;
    let errors = 0;

    for (const session of sessions.data) {
      try {
        // Check if this sale is already recorded
        const { data: existingSale } = await supabaseClient
          .from('affiliate_sales')
          .select('id')
          .eq('stripe_session_id', session.id)
          .single();

        if (existingSale) {
          continue; // Skip if already exists
        }

        // Check if this session has affiliate metadata (cookie data)
        const affiliateCode = session.metadata?.affiliate_code;
        
        if (!affiliateCode) {
          continue; // Skip non-affiliate sales
        }

        logStep(`Processing affiliate session ${session.id} with code ${affiliateCode}`);

        // Find the affiliate link
        const { data: affiliateLink } = await supabaseClient
          .from('affiliate_links')
          .select(`
            *,
            affiliates!inner(*)
          `)
          .eq('link_code', affiliateCode)
          .single();

        if (!affiliateLink) {
          logStep(`Affiliate link not found for code: ${affiliateCode}`);
          continue;
        }

        // Get line items to determine plan type
        const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
        if (!lineItems.data.length) {
          continue;
        }

        const price = lineItems.data[0].price;
        if (!price?.product) {
          continue;
        }

        const planType = PRODUCT_TO_PLAN[price.product as string] || 'professional';
        const saleAmount = session.amount_total ? session.amount_total / 100 : 0;
        
        // Calculate commission
        const affiliate = affiliateLink.affiliates;
        let commissionAmount = 0;
        
        if (affiliate.commission_type === 'percentage') {
          commissionAmount = (saleAmount * affiliate.commission_percentage) / 100;
        } else {
          commissionAmount = affiliate.commission_fixed_amount;
        }

        // Create the sale record
        const { error: saleError } = await supabaseClient
          .from('affiliate_sales')
          .insert({
            affiliate_id: affiliate.id,
            affiliate_link_id: affiliateLink.id,
            customer_email: session.customer_details?.email || '',
            customer_name: session.customer_details?.name || null,
            customer_user_id: null, // Will be updated if user is found
            sale_amount: saleAmount,
            commission_amount: commissionAmount,
            plan_type: planType,
            stripe_session_id: session.id,
            stripe_payment_intent_id: session.payment_intent as string,
            status: 'confirmed',
            sale_date: new Date(session.created * 1000).toISOString(),
            confirmed_at: new Date(session.created * 1000).toISOString()
          });

        if (saleError) {
          logStep(`Error creating sale record: ${saleError.message}`);
          errors++;
          continue;
        }

        // Create commission record
        const { error: commissionError } = await supabaseClient
          .from('affiliate_commissions')
          .insert({
            affiliate_id: affiliate.id,
            sale_id: null, // Will be updated after getting the sale ID
            amount: commissionAmount,
            status: 'pending'
          });

        if (commissionError) {
          logStep(`Error creating commission record: ${commissionError.message}`);
        }

        // Update affiliate link conversion count
        await supabaseClient
          .from('affiliate_links')
          .update({
            conversions_count: (affiliateLink.conversions_count || 0) + 1
          })
          .eq('id', affiliateLink.id);

        // Update affiliate totals
        await supabaseClient
          .from('affiliates')
          .update({
            total_sales: (affiliate.total_sales || 0) + saleAmount,
            total_commissions: (affiliate.total_commissions || 0) + commissionAmount
          })
          .eq('id', affiliate.id);

        syncedSales++;
        logStep(`Synced sale for session ${session.id}, amount: R$ ${saleAmount.toFixed(2)}`);

      } catch (error) {
        logStep(`Error processing session ${session.id}:`, error);
        errors++;
      }
    }

    logStep(`Sync completed. Sales synced: ${syncedSales}, Errors: ${errors}`);

    return new Response(JSON.stringify({
      success: true,
      syncedSales,
      errors,
      totalSessions: sessions.data.length
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    logStep("Error in sync function:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : String(error) 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});