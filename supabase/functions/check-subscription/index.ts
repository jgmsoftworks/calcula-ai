import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Mapeamento de produtos para planos
const PRODUCT_TO_PLAN = {
  "prod_T6TXCmpEQTIaRT": "professional", // Professional mensal (antigo)
  "prod_T6TeSPeBygwJz7": "professional", // Professional anual (antigo)
  "prod_T6TiY7VskZgNKg": "professional", // Professional anual (novo preço)
  "prod_T6TYlKJ4hdq6m1": "enterprise",   // Enterprise mensal (antigo) 
  "prod_T6TdpmHjPubwhM": "enterprise",   // Enterprise mensal (novo preço)
  "prod_T6Te4Zsr3iA7x5": "enterprise",   // Enterprise anual (antigo)
  "prod_T6TiS2ZoP1MhUL": "enterprise"    // Enterprise anual (novo preço)
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

const logError = (error: unknown, context: string, details?: any) => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  console.error(`[CHECK-SUBSCRIPTION ERROR] ${context}`, {
    message: errorMessage,
    stack,
    details,
    timestamp: new Date().toISOString()
  });
  return errorMessage;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    
    logStep("User authenticated", { userId: user.id, email: user.email });

    const { data: currentProfile } = await supabaseClient
      .from('profiles')
      .select('plan, plan_expires_at')
      .eq('user_id', user.id)
      .maybeSingle();

    const currentPlan = currentProfile?.plan || 'lite';
    const currentPlanExpiresAt = currentProfile?.plan_expires_at || null;
    const hasActiveManualPlan = !['free','lite'].includes(currentPlan) && (
      !currentPlanExpiresAt || new Date(currentPlanExpiresAt).getTime() > Date.now()
    );

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      if (hasActiveManualPlan) {
        logStep("No customer found, preserving active manual plan", { currentPlan, currentPlanExpiresAt });

        return new Response(JSON.stringify({ 
          subscribed: true,
          plan: currentPlan,
          subscription_end: currentPlanExpiresAt
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      logStep("No customer found and no active manual plan, updating to free plan");
      
      // Atualizar perfil para plano free
      await supabaseClient
        .from('profiles')
        .upsert({ 
          user_id: user.id, 
          plan: 'lite',
          plan_expires_at: null
        });
      
      return new Response(JSON.stringify({ 
        subscribed: false, 
        plan: 'lite',
        subscription_end: null 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });
    
    const hasActiveSub = subscriptions.data.length > 0;
    let planType = 'lite';
    let subscriptionEnd = null;

    if (hasActiveSub) {
      const subscription = subscriptions.data[0];
      subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
      logStep("Active subscription found", { subscriptionId: subscription.id, endDate: subscriptionEnd });
      
      const productId = subscription.items.data[0].price.product as string;
      planType = (PRODUCT_TO_PLAN as Record<string, string>)[productId] || 'lite';
      logStep("Determined plan type", { productId, planType });
      
      // Atualizar perfil no Supabase
      await supabaseClient
        .from('profiles')
        .upsert({ 
          user_id: user.id, 
          plan: planType,
          plan_expires_at: subscriptionEnd
        });
    } else {
      if (hasActiveManualPlan) {
        logStep("No active subscription found, preserving active manual plan", { currentPlan, currentPlanExpiresAt });

        return new Response(JSON.stringify({
          subscribed: true,
          plan: currentPlan,
          subscription_end: currentPlanExpiresAt
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      logStep("No active subscription found and no active manual plan, updating to free");
      
      // Atualizar perfil para plano free
      await supabaseClient
        .from('profiles')
        .upsert({ 
          user_id: user.id, 
          plan: 'lite',
          plan_expires_at: null
        });
    }

    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      plan: planType,
      subscription_end: subscriptionEnd
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = logError(error, "Main function execution");
    
    // Fallback seguro: preservar plano manual ativo quando existir; só usar free se não houver plano pago válido
    try {
      const authHeader = req.headers.get("Authorization");
      if (authHeader) {
        const token = authHeader.replace("Bearer ", "");
        const supabaseClient = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
          { auth: { persistSession: false } }
        );
        
        const { data: userData } = await supabaseClient.auth.getUser(token);
        if (userData.user) {
          const { data: currentProfile } = await supabaseClient
            .from('profiles')
            .select('plan, plan_expires_at')
            .eq('user_id', userData.user.id)
            .maybeSingle();

          const currentPlan = currentProfile?.plan || 'lite';
          const currentPlanExpiresAt = currentProfile?.plan_expires_at || null;
          const hasActiveManualPlan = !['free','lite'].includes(currentPlan) && (
            !currentPlanExpiresAt || new Date(currentPlanExpiresAt).getTime() > Date.now()
          );

          if (hasActiveManualPlan) {
            return new Response(JSON.stringify({ 
              subscribed: true, 
              plan: currentPlan,
              subscription_end: currentPlanExpiresAt,
              warning: "Assinatura Stripe indisponível; plano manual ativo preservado."
            }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 200,
            });
          }

          await supabaseClient
            .from('profiles')
            .upsert({ 
              user_id: userData.user.id, 
              plan: 'lite',
              plan_expires_at: null
            });
        }
      }
    } catch (fallbackError) {
      logError(fallbackError, "Fallback update to free plan");
    }

    return new Response(JSON.stringify({ 
      subscribed: false, 
      plan: 'lite',
      subscription_end: null,
      error: "Erro ao verificar assinatura. Usando plano gratuito como fallback."
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200, // Retorna 200 com fallback em vez de erro 500
    });
  }
});