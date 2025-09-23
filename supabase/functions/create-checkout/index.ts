import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Mapeamento dos planos - Price IDs de PRODUÇÃO
const PLAN_PRICES = {
  professional_monthly: "price_1SALFDBnxFLGYBYf0oYQfE9S",
  professional_yearly: "price_1SAL2uBgdnRO3nnJ7OjBCLUP", 
  enterprise_monthly: "price_1SAL38BgdnRO3nnJNLV1NcT2",
  enterprise_yearly: "price_1SAL3KBgdnRO3nnJWRpnlzXy"
};

// Helper para logs detalhados
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Verificar variáveis de ambiente
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY");
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase environment variables");
    }

    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }

    logStep("Environment variables verified");

    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    // Verificar autenticação
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header provided");
    }

    const token = authHeader.replace("Bearer ", "");
    logStep("Authenticating user");

    const { data, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError) {
      logStep("Authentication failed", { error: authError.message });
      throw new Error(`Authentication error: ${authError.message}`);
    }

    const user = data.user;
    if (!user?.email) {
      throw new Error("User not authenticated or email not available");
    }

    logStep("User authenticated", { userId: user.id, email: user.email });

    // Processar dados da requisição
    const requestBody = await req.json();
    const { planType, billing } = requestBody;
    
    logStep("Request data received", { planType, billing });

    if (!planType || !billing) {
      throw new Error("Missing planType or billing in request");
    }

    const planKey = `${planType}_${billing}` as keyof typeof PLAN_PRICES;
    const priceId = PLAN_PRICES[planKey];
    
    if (!priceId) {
      logStep("Invalid plan configuration", { planKey, availablePlans: Object.keys(PLAN_PRICES) });
      throw new Error(`Invalid plan type: ${planKey}`);
    }

    logStep("Plan validated", { planKey, priceId });

    // Inicializar Stripe
    const stripe = new Stripe(stripeKey, { 
      apiVersion: "2025-08-27.basil" 
    });

    logStep("Stripe initialized");

    // Verificar conexão com Stripe
    try {
      await stripe.prices.retrieve(priceId);
      logStep("Price ID validated in Stripe", { priceId });
    } catch (stripeError) {
      logStep("Stripe price validation failed", { priceId, error: stripeError.message });
      throw new Error(`Invalid price ID in Stripe: ${priceId}`);
    }

    // Verificar se já existe um cliente Stripe
    logStep("Searching for existing customer", { email: user.email });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing customer found", { customerId });
    } else {
      logStep("No existing customer found, will create new one");
    }

    // Criar sessão de checkout
    const origin = req.headers.get("origin") || "http://localhost:3000";
    
    logStep("Creating checkout session", {
      customerId,
      priceId,
      origin,
      mode: "subscription"
    });

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${origin}/planos?success=true`,
      cancel_url: `${origin}/planos?canceled=true`,
      metadata: {
        user_id: user.id,
        plan_type: planType,
        billing_cycle: billing
      }
    });

    logStep("Checkout session created successfully", { 
      sessionId: session.id, 
      url: session.url,
      userId: user.id, 
      planType, 
      billing 
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorDetails = {
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    };

    logStep("ERROR in create-checkout", errorDetails);

    // Retornar erro mais específico
    let userFriendlyMessage = "Erro interno do servidor";
    
    if (errorMessage.includes("Authentication")) {
      userFriendlyMessage = "Erro de autenticação. Faça login novamente.";
    } else if (errorMessage.includes("Invalid price") || errorMessage.includes("No such price")) {
      userFriendlyMessage = "Plano não disponível. Contate o suporte.";
    } else if (errorMessage.includes("STRIPE_SECRET_KEY")) {
      userFriendlyMessage = "Configuração de pagamento indisponível.";
    }

    return new Response(JSON.stringify({ 
      error: userFriendlyMessage,
      details: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
