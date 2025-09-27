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

const createUserFromCustomer = async (supabaseClient: any, customer: any, planType: string) => {
  logStep("Creating new user from Stripe customer", { 
    customerEmail: customer.email, 
    customerId: customer.id,
    planType 
  });

  try {
    // Criar usuário com dados completos do Stripe
    const userData = {
      email: customer.email,
      email_confirm: true,
      user_metadata: {
        email: customer.email,
        email_verified: true,
        full_name: customer.name || customer.email.split('@')[0],
        business_name: customer.name || customer.email.split('@')[0],
        stripe_customer_id: customer.id,
        plan: planType,
        created_from_stripe: true,
        created_at: new Date().toISOString()
      }
    };

    logStep("Creating user with Supabase Auth", userData);

    const { data: newUserData, error: createUserError } = await supabaseClient.auth.admin.createUser(userData);

    if (createUserError || !newUserData.user) {
      throw new Error(`Failed to create user: ${createUserError?.message || 'Unknown error'}`);
    }

    logStep("User created successfully in Auth", { 
      userId: newUserData.user.id, 
      email: newUserData.user.email 
    });

    return newUserData.user;
  } catch (error) {
    logError(error, "Failed to create user from Stripe customer", { 
      customerEmail: customer.email, 
      customerId: customer.id 
    });
    throw error;
  }
};

const updateUserProfile = async (supabaseClient: any, user: any, planType: string, subscriptionEnd: string | null, customer: any) => {
  logStep("Updating user profile", { 
    userId: user.id, 
    planType, 
    subscriptionEnd 
  });

  try {
    // Preparar dados do perfil com informações do Stripe
    const profileData: any = {
      user_id: user.id,
      plan: planType,
      plan_expires_at: subscriptionEnd,
      full_name: user.user_metadata?.full_name || customer.name || user.email?.split('@')[0] || '',
      business_name: user.user_metadata?.business_name || customer.name || user.email?.split('@')[0] || '',
      updated_at: new Date().toISOString()
    };

    // Adicionar dados adicionais do customer se disponíveis
    if (customer.phone) {
      profileData.phone = customer.phone;
    }
    if (customer.address?.line1) {
      profileData.logradouro = customer.address.line1;
      profileData.cidade = customer.address.city;
      profileData.estado = customer.address.state;
      profileData.cep = customer.address.postal_code;
      profileData.pais = customer.address.country || 'Brasil';
    }

    logStep("Upserting profile data", profileData);

    const { error: profileError } = await supabaseClient
      .from('profiles')
      .upsert(profileData, {
        onConflict: 'user_id'
      });

    if (profileError) {
      throw new Error(`Failed to update profile: ${profileError.message}`);
    }

    logStep("Profile updated successfully", { 
      userId: user.id, 
      planType 
    });

    // Verificar se o perfil foi realmente criado/atualizado
    const { data: verifyProfile, error: verifyError } = await supabaseClient
      .from('profiles')
      .select('user_id, plan, plan_expires_at')
      .eq('user_id', user.id)
      .single();

    if (verifyError || !verifyProfile) {
      logError(verifyError, "Failed to verify profile creation", { userId: user.id });
    } else {
      logStep("Profile verification successful", verifyProfile);
    }

    return true;
  } catch (error) {
    logError(error, "Failed to update user profile", { 
      userId: user.id, 
      planType 
    });
    throw error;
  }
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
        
        logStep(`Processing subscription event: ${event.type}`, {
          subscriptionId: subscription.id,
          customerId: subscription.customer,
          status: subscription.status,
          currentPeriodEnd: subscription.current_period_end
        });

        try {
          // Recuperar customer com dados expandidos
          const customer = await stripe.customers.retrieve(subscription.customer as string, {
            expand: ['subscriptions']
          });
          
          if (!customer || customer.deleted) {
            logStep('Customer not found or deleted', { customerId: subscription.customer });
            break;
          }
          
          const customerEmail = (customer as Stripe.Customer).email;
          if (!customerEmail) {
            logStep('Customer email not available', { customerId: subscription.customer });
            break;
          }

          logStep("Retrieved customer data", {
            customerEmail,
            customerId: customer.id,
            customerName: (customer as Stripe.Customer).name
          });

          // Determinar tipo de plano baseado no produto
          const productId = subscription.items.data[0]?.price.product as string;
          const planType = productId && (productId in PRODUCT_TO_PLAN) 
            ? (PRODUCT_TO_PLAN as Record<string, string>)[productId]
            : 'professional'; // fallback seguro

          const subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();

          logStep("Determined subscription details", {
            productId,
            planType,
            subscriptionEnd,
            subscriptionStatus: subscription.status
          });

          // Buscar usuário existente no Supabase
          const { data: users, error: usersError } = await supabaseClient.auth.admin.listUsers();
          if (usersError) {
            throw new Error(`Failed to list users: ${usersError.message}`);
          }
          
          let user = users.users.find(u => u.email === customerEmail);

          // Criar usuário automaticamente se não existir
          if (!user) {
            logStep("User not found, creating new user automatically", { customerEmail });
            user = await createUserFromCustomer(supabaseClient, customer, planType);
          } else {
            logStep("Found existing user", { 
              userId: user.id, 
              email: user.email,
              existingPlan: user.user_metadata?.plan 
            });
          }

          // Atualizar perfil do usuário com dados mais completos
          if (user) {
            await updateUserProfile(supabaseClient, user, planType, subscriptionEnd, customer);

            logStep(`Successfully processed subscription ${event.type}`, {
              userId: user.id,
              email: user.email,
              planType,
              subscriptionEnd
            });
          } else {
            logError(null, "User is undefined after creation/retrieval", {
              customerEmail,
              customerId: customer.id
            });
          }

        } catch (subscriptionError) {
          logError(subscriptionError, `Error processing subscription ${event.type}`, {
            customerId: subscription.customer,
            subscriptionId: subscription.id,
            eventType: event.type
          });
          
          // Não quebrar o webhook por um erro - continuar processamento
          logStep("Continuing webhook processing despite subscription error");
        }
        break;

      case 'customer.subscription.deleted':
        const deletedSubscription = event.data.object as Stripe.Subscription;
        
        logStep("Processing subscription deletion", {
          subscriptionId: deletedSubscription.id,
          customerId: deletedSubscription.customer
        });
        
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

          logStep("Retrieved deleted customer data", {
            customerEmail: deletedCustomerEmail,
            customerId: deletedCustomer.id
          });

          // Buscar usuário no Supabase pelo email
          const { data: deletedUsers, error: deletedUsersError } = await supabaseClient.auth.admin.listUsers();
          if (deletedUsersError) {
            throw new Error(`Failed to list users for deletion: ${deletedUsersError.message}`);
          }
          
          const deletedUser = deletedUsers.users.find(u => u.email === deletedCustomerEmail);
          
          if (deletedUser) {
            logStep("Downgrading user to free plan", { 
              userId: deletedUser.id, 
              email: deletedUser.email 
            });

            // Downgrade para plano free com dados de expiração
            const downgradData = {
              user_id: deletedUser.id,
              plan: 'free',
              plan_expires_at: null,
              updated_at: new Date().toISOString()
            };

            const { error: downgradeError } = await supabaseClient
              .from('profiles')
              .upsert(downgradData, { onConflict: 'user_id' });
            
            if (downgradeError) {
              throw new Error(`Failed to downgrade user: ${downgradeError.message}`);
            }

            // Verificar downgrade
            const { data: verifyDowngrade } = await supabaseClient
              .from('profiles')
              .select('user_id, plan')
              .eq('user_id', deletedUser.id)
              .single();

            logStep("Successfully downgraded user to free plan", { 
              userId: deletedUser.id,
              newPlan: verifyDowngrade?.plan || 'unknown'
            });
          } else {
            logStep('User not found for downgrade', { customerEmail: deletedCustomerEmail });
          }
        } catch (deleteError) {
          logError(deleteError, 'Error processing subscription deletion', { 
            customerId: deletedSubscription.customer,
            subscriptionId: deletedSubscription.id
          });
        }
        break;

      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session;
        
        logStep("Processing checkout session completed", {
          sessionId: session.id,
          customerId: session.customer,
          amountTotal: session.amount_total,
          metadata: session.metadata
        });

        // Verificar se há código de afiliado nos metadados
        const affiliateCode = session.metadata?.affiliate_code;
        if (affiliateCode) {
          try {
            logStep("Processing affiliate sale", { 
              affiliateCode, 
              sessionId: session.id,
              customerId: session.customer 
            });

            // Buscar link de afiliado
            const { data: affiliateLink, error: linkError } = await supabaseClient
              .from('affiliate_links')
              .select(`
                *,
                affiliate:affiliates(*)
              `)
              .eq('link_code', affiliateCode)
              .eq('is_active', true)
              .single();

            if (linkError || !affiliateLink) {
              logStep("Affiliate link not found", { affiliateCode });
            } else {
              // Recuperar customer do Stripe
              const customer = await stripe.customers.retrieve(session.customer as string);
              const customerEmail = (customer as Stripe.Customer).email;
              const customerName = (customer as Stripe.Customer).name;
              
              // Determinar tipo de plano e valor
              const planType = session.metadata?.plan_type || 'professional';
              const saleAmount = (session.amount_total || 0) / 100; // Converter de centavos
              
              // Calcular comissão
              const affiliate = affiliateLink.affiliate;
              let commissionAmount = 0;
              
              if (affiliate.commission_type === 'percentage') {
                commissionAmount = (saleAmount * affiliate.commission_percentage) / 100;
              } else {
                commissionAmount = affiliate.commission_fixed_amount || 0;
              }

              // Registrar venda de afiliado
              const { data: sale, error: saleError } = await supabaseClient
                .from('affiliate_sales')
                .insert({
                  affiliate_id: affiliate.id,
                  affiliate_link_id: affiliateLink.id,
                  customer_email: customerEmail || '',
                  customer_name: customerName,
                  plan_type: planType,
                  sale_amount: saleAmount,
                  commission_amount: commissionAmount,
                  stripe_session_id: session.id,
                  status: 'confirmed'
                })
                .select()
                .single();

              if (saleError) {
                logError(saleError, "Failed to create affiliate sale", { affiliateCode, sessionId: session.id });
              } else {
                logStep("Affiliate sale created", { 
                  saleId: sale.id, 
                  affiliateId: affiliate.id,
                  commissionAmount 
                });

                // Criar comissão
                const { error: commissionError } = await supabaseClient
                  .from('affiliate_commissions')
                  .insert({
                    affiliate_id: affiliate.id,
                    sale_id: sale.id,
                    amount: commissionAmount,
                    status: 'pending'
                  });

                if (commissionError) {
                  logError(commissionError, "Failed to create commission", { saleId: sale.id });
                } else {
                  logStep("Commission created successfully", { 
                    affiliateId: affiliate.id,
                    amount: commissionAmount 
                  });
                }

                // Atualizar contador de conversões no link
                await supabaseClient
                  .from('affiliate_links')
                  .update({ 
                    conversions_count: (affiliateLink.conversions_count || 0) + 1 
                  })
                  .eq('id', affiliateLink.id);

                // Atualizar totais do afiliado
                await supabaseClient
                  .from('affiliates')
                  .update({
                    total_sales: (affiliate.total_sales || 0) + saleAmount,
                    total_commissions: (affiliate.total_commissions || 0) + commissionAmount,
                    total_customers: (affiliate.total_customers || 0) + 1
                  })
                  .eq('id', affiliate.id);
              }
            }
          } catch (affiliateError) {
            logError(affiliateError, "Error processing affiliate sale", { 
              affiliateCode, 
              sessionId: session.id 
            });
          }
        }
        break;

      case 'invoice.payment_succeeded':
        const invoice = event.data.object as Stripe.Invoice;
        
        logStep("Processing successful payment", {
          invoiceId: invoice.id,
          customerId: invoice.customer,
          amountPaid: invoice.amount_paid,
          subscriptionId: invoice.subscription
        });

        // Aqui podemos implementar lógica adicional para pagamentos bem-sucedidos
        // Como envio de emails de confirmação, ativação de recursos, etc.
        break;

      case 'invoice.payment_failed':
        const failedInvoice = event.data.object as Stripe.Invoice;
        
        logStep("Processing failed payment", {
          invoiceId: failedInvoice.id,
          customerId: failedInvoice.customer,
          amountDue: failedInvoice.amount_due,
          subscriptionId: failedInvoice.subscription
        });

        // Implementar lógica para pagamentos falhos
        // Como notificações, suspensão de conta temporária, etc.
        break;

      default:
        logStep(`Received unhandled event type: ${event.type}`, { 
          eventId: event.id,
          eventType: event.type 
        });
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