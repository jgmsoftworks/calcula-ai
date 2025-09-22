import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Mapeamento de produtos para planos
const PRODUCT_TO_PLAN = {
  "prod_T6TXCmpEQTIaRT": "professional",
  "prod_T6TYlKJ4hdq6m1": "enterprise"
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
      return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }

    console.log(`Processing webhook event: ${event.type}`);

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        const subscription = event.data.object as Stripe.Subscription;
        
        // Buscar cliente
        const customer = await stripe.customers.retrieve(subscription.customer as string);
        if (!customer || customer.deleted) break;
        
        const customerEmail = (customer as Stripe.Customer).email;
        if (!customerEmail) break;

        // Buscar usuário no Supabase pelo email
        const { data: users } = await supabaseClient.auth.admin.listUsers();
        const user = users.users.find(u => u.email === customerEmail);
        
        if (user) {
          const productId = subscription.items.data[0]?.price.product as string;
          const planType = PRODUCT_TO_PLAN[productId] || 'free';
          const subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
          
          // Atualizar plano do usuário
          await supabaseClient
            .from('profiles')
            .upsert({ 
              user_id: user.id,
              plan: planType,
              plan_expires_at: subscriptionEnd
            });
          
          console.log(`Updated user ${user.id} to plan ${planType}`);
        }
        break;

      case 'customer.subscription.deleted':
        const deletedSubscription = event.data.object as Stripe.Subscription;
        
        // Buscar cliente
        const deletedCustomer = await stripe.customers.retrieve(deletedSubscription.customer as string);
        if (!deletedCustomer || deletedCustomer.deleted) break;
        
        const deletedCustomerEmail = (deletedCustomer as Stripe.Customer).email;
        if (!deletedCustomerEmail) break;

        // Buscar usuário no Supabase pelo email
        const { data: deletedUsers } = await supabaseClient.auth.admin.listUsers();
        const deletedUser = deletedUsers.users.find(u => u.email === deletedCustomerEmail);
        
        if (deletedUser) {
          // Downgrade para plano free
          await supabaseClient
            .from('profiles')
            .upsert({ 
              user_id: deletedUser.id,
              plan: 'free',
              plan_expires_at: null
            });
          
          console.log(`Downgraded user ${deletedUser.id} to free plan`);
        }
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});