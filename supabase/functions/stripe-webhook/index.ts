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

const logError = (error: unknown, context: string, details?: any) => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  console.error(`[STRIPE-WEBHOOK ERROR] ${context}`, {
    message: errorMessage,
    stack,
    details,
    timestamp: new Date().toISOString()
  });
  return errorMessage;
};

const logStep = (step: string, details?: any) => {
  console.log(`[STRIPE-WEBHOOK] ${step}`, details ? { details, timestamp: new Date().toISOString() } : { timestamp: new Date().toISOString() });
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
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      throw new Error("No Stripe signature found");
    }

    // Verificar webhook signature (em produção, usar endpoint secret)
    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, Deno.env.get("STRIPE_WEBHOOK_SECRET") || "");
    } catch (err) {
      console.log(`Webhook signature verification failed.`, err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      return new Response(`Webhook Error: ${errorMessage}`, { status: 400 });
    }

    logStep(`Processing webhook event: ${event.type}`, { eventId: event.id });

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        const subscription = event.data.object as Stripe.Subscription;
        
        // Buscar cliente com fallback seguro
        try {
          const customer = await stripe.customers.retrieve(subscription.customer as string);
          if (!customer || customer.deleted) {
            logStep('Customer not found or deleted', { customerId: subscription.customer });
            break;
          }
          
          const customerEmail = (customer as Stripe.Customer).email;
          if (!customerEmail) {
            logStep('Customer email not available', { customerId: subscription.customer });
            break;
          }

          // Buscar usuário no Supabase pelo email
          const { data: users, error: usersError } = await supabaseClient.auth.admin.listUsers();
          if (usersError) {
            logError(usersError, 'Failed to list users', { customerEmail });
            break;
          }
          
          const user = users.users.find(u => u.email === customerEmail);
          
          if (user) {
            const productId = subscription.items.data[0]?.price.product as string;
            const planType = (PRODUCT_TO_PLAN as Record<string, string>)[productId] || 'free';
            const subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
            
            // Atualizar plano do usuário com retry
            const { error: updateError } = await supabaseClient
              .from('profiles')
              .upsert({ 
                user_id: user.id,
                plan: planType,
                plan_expires_at: subscriptionEnd
              });
            
            if (updateError) {
              logError(updateError, 'Failed to update user plan', { userId: user.id, planType });
            } else {
              logStep(`Updated user to plan`, { userId: user.id, planType, subscriptionEnd });
            }
          } else {
            logStep('User not found in Supabase', { customerEmail });
          }
        } catch (customerError) {
          logError(customerError, 'Error processing customer subscription', { customerId: subscription.customer });
        }
        break;

      case 'customer.subscription.deleted':
        const deletedSubscription = event.data.object as Stripe.Subscription;
        
        try {
          // Buscar cliente
          const deletedCustomer = await stripe.customers.retrieve(deletedSubscription.customer as string);
          if (!deletedCustomer || deletedCustomer.deleted) {
            logStep('Deleted customer not found', { customerId: deletedSubscription.customer });
            break;
          }
          
          const deletedCustomerEmail = (deletedCustomer as Stripe.Customer).email;
          if (!deletedCustomerEmail) {
            logStep('Deleted customer email not available', { customerId: deletedSubscription.customer });
            break;
          }

          // Buscar usuário no Supabase pelo email
          const { data: deletedUsers, error: deletedUsersError } = await supabaseClient.auth.admin.listUsers();
          if (deletedUsersError) {
            logError(deletedUsersError, 'Failed to list users for deletion', { customerEmail: deletedCustomerEmail });
            break;
          }
          
          const deletedUser = deletedUsers.users.find(u => u.email === deletedCustomerEmail);
          
          if (deletedUser) {
            // Downgrade para plano free
            const { error: downgradError } = await supabaseClient
              .from('profiles')
              .upsert({ 
                user_id: deletedUser.id,
                plan: 'free',
                plan_expires_at: null
              });
            
            if (downgradError) {
              logError(downgradError, 'Failed to downgrade user to free', { userId: deletedUser.id });
            } else {
              logStep(`Downgraded user to free plan`, { userId: deletedUser.id });
            }
          } else {
            logStep('User not found for downgrade', { customerEmail: deletedCustomerEmail });
          }
        } catch (deleteError) {
          logError(deleteError, 'Error processing subscription deletion', { customerId: deletedSubscription.customer });
        }
        break;

      default:
        logStep(`Unhandled event type: ${event.type}`, { eventId: event.id });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = logError(error, "Webhook processing failed");
    
    // Para webhooks, é importante retornar o status certo
    let statusCode = 500;
    if (errorMessage.includes("signature") || errorMessage.includes("Webhook Error")) {
      statusCode = 400; // Bad request para problemas de assinatura
    }
    
    return new Response(JSON.stringify({ 
      error: "Webhook processing failed",
      message: errorMessage,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: statusCode,
    });
  }
});