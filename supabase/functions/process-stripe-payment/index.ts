import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Mapeamento de produtos para planos
const PRODUCT_TO_PLAN: Record<string, string> = {
  "prod_T6TXCmpEQTIaRT": "professional", // Professional mensal (antigo)
  "prod_T6TeSPeBygwJz7": "professional", // Professional anual (antigo)  
  "prod_T6TiY7VskZgNKg": "professional", // Professional anual (novo preço)
  "prod_T6TYlKJ4hdq6m1": "enterprise",   // Enterprise mensal (antigo)
  "prod_T6TdpmHjPubwhM": "enterprise",   // Enterprise mensal (novo preço)
  "prod_T6Te4Zsr3iA7x5": "enterprise",   // Enterprise anual (antigo)
  "prod_T6TiS2ZoP1MhUL": "enterprise"    // Enterprise anual (novo preço)
};

const logError = (error: unknown, context: string, details?: any) => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  console.error(`[PROCESS-STRIPE-PAYMENT ERROR] ${context}`, {
    message: errorMessage,
    stack,
    details,
    timestamp: new Date().toISOString()
  });
  return errorMessage;
};

const logStep = (step: string, details?: any) => {
  console.log(`[PROCESS-STRIPE-PAYMENT] ${step}`, details ? { details, timestamp: new Date().toISOString() } : { timestamp: new Date().toISOString() });
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY not configured");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    
    // Obter session_id e dados do body
    const url = new URL(req.url);
    let sessionId = url.searchParams.get("session_id");
    let signupData = null;

    // Se for POST, obter dados do body
    if (req.method === "POST") {
      try {
        const body = await req.json();
        sessionId = sessionId || body.session_id;
        signupData = body.signup_data;
      } catch (e) {
        // Se não conseguir ler o body, continuar apenas com URL params
      }
    }
    
    if (!sessionId) {
      throw new Error("session_id parameter is required");
    }

    logStep("Processing Stripe session", { sessionId });

    // Recuperar dados da sessão do Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['customer', 'line_items', 'line_items.data.price.product']
    });

    if (!session.customer || typeof session.customer === 'string') {
      throw new Error("Invalid customer data in session");
    }

    const customer = session.customer as Stripe.Customer;
    const customerEmail = customer.email;

    if (!customerEmail) {
      throw new Error("Customer email not found in session");
    }

    logStep("Retrieved session data", { 
      customerEmail, 
      customerId: customer.id,
      paymentStatus: session.payment_status 
    });

    // Verificar se o pagamento foi bem-sucedido
    if (session.payment_status !== 'paid') {
      throw new Error(`Payment not completed. Status: ${session.payment_status}`);
    }

    // Determinar o plano baseado no produto
    const lineItem = session.line_items?.data?.[0];
    const productId = typeof lineItem?.price?.product === 'string' 
      ? lineItem.price.product 
      : lineItem?.price?.product?.id;

    const planType = productId && (productId in PRODUCT_TO_PLAN) 
      ? PRODUCT_TO_PLAN[productId] 
      : 'professional'; // fallback

    logStep("Determined plan", { productId, planType });

    // Verificar se o usuário já existe no Supabase
    const { data: existingUsers, error: usersError } = await supabaseClient.auth.admin.listUsers();
    
    if (usersError) {
      logError(usersError, "Failed to list users", { customerEmail });
      throw new Error("Failed to check existing users");
    }

    let user = existingUsers.users.find(u => u.email === customerEmail);
    const userExists = !!user;

    if (!user) {
      logStep("User does not exist", { customerEmail, hasSignupData: !!signupData });
      
      // Se não temos dados de cadastro, retornar info para o frontend solicitar
      if (!signupData) {
        logStep("Returning user creation required", { customerEmail });
        
        return new Response(JSON.stringify({
          success: true,
          user_exists: false,
          customer_name: customer.name,
          customer_email: customerEmail,
          plan: planType
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // Criar novo usuário com dados fornecidos
      logStep("Creating new user with signup data", { customerEmail, fullName: signupData.full_name });
      
      const { data: newUserData, error: createUserError } = await supabaseClient.auth.admin.createUser({
        email: customerEmail,
        password: signupData.password,
        email_confirm: true, // Auto-confirmar email
        user_metadata: {
          email: customerEmail,
          email_verified: true,
          full_name: signupData.full_name || customer.name || '',
          business_name: signupData.full_name || customer.name || customerEmail.split('@')[0]
        }
      });

      if (createUserError || !newUserData.user) {
        logError(createUserError, "Failed to create user", { customerEmail });
        throw new Error("Failed to create user account");
      }

      user = newUserData.user;
      logStep("User created successfully", { userId: user.id });
    } else {
      logStep("User already exists", { userId: user.id });
    }

    // Atualizar/criar perfil do usuário com o novo plano
    const subscriptionEnd = session.expires_at ? new Date(session.expires_at * 1000).toISOString() : null;
    
    const { error: profileError } = await supabaseClient
      .from('profiles')
      .upsert({
        user_id: user.id,
        plan: planType,
        plan_expires_at: subscriptionEnd,
        full_name: user.user_metadata?.full_name || customer.name || '',
        business_name: user.user_metadata?.business_name || customer.name || customerEmail.split('@')[0],
        updated_at: new Date().toISOString()
      });

    if (profileError) {
      logError(profileError, "Failed to update user profile", { userId: user.id, planType });
    } else {
      logStep("Profile updated successfully", { userId: user.id, planType });
    }

    // Gerar token de acesso para login automático
    const { data: tokenData, error: tokenError } = await supabaseClient.auth.admin.generateLink({
      type: 'magiclink',
      email: customerEmail,
      options: {
        redirectTo: `${req.headers.get("origin")}/?welcome=true&plan=${planType}`
      }
    });

    if (tokenError || !tokenData.properties?.action_link) {
      logError(tokenError, "Failed to generate access token", { customerEmail });
      throw new Error("Failed to generate login link");
    }

    // Extrair URL de login automático
    const loginUrl = tokenData.properties.action_link;
    
    logStep("Generated login URL successfully", { 
      userId: user.id, 
      planType,
      hasLoginUrl: !!loginUrl,
      userExists
    });

    // Retornar dados para o frontend
    return new Response(JSON.stringify({
      success: true,
      user_exists: userExists,
      user_id: user.id,
      customer_name: customer.name,
      customer_email: customerEmail,
      plan: planType,
      magic_link: loginUrl
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    const errorMessage = logError(error, "Payment processing failed");
    
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});