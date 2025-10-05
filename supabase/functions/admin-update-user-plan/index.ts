import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ADMIN-UPDATE-PLAN] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Verificar autenticação e permissão de admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const adminUser = userData.user;
    
    logStep("Admin authenticated", { adminId: adminUser.id });

    // Verificar se é admin
    const { data: isAdmin, error: adminError } = await supabaseClient
      .rpc('has_role_or_higher', { 
        required_role: 'admin',
        check_user_id: adminUser.id 
      });

    if (adminError || !isAdmin) {
      logStep("Admin check failed", { isAdmin, adminError });
      throw new Error("Unauthorized: Admin access required");
    }

    // Obter dados da requisição
    const { userId, newPlan, expiresAt, reason } = await req.json();
    logStep("Request data", { userId, newPlan, expiresAt, reason });

    if (!userId || !newPlan) {
      throw new Error("Missing required fields: userId and newPlan");
    }

    // Buscar dados atuais do usuário
    const { data: currentProfile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (profileError) throw new Error(`Error fetching user profile: ${profileError.message}`);
    logStep("Current profile", { currentPlan: currentProfile.plan, stripeCustomerId: currentProfile.stripe_customer_id });

    // Verificar se usuário tem assinatura ativa no Stripe
    let stripeWarning = null;
    if (currentProfile.stripe_customer_id) {
      const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { 
        apiVersion: "2025-08-27.basil" 
      });

      const subscriptions = await stripe.subscriptions.list({
        customer: currentProfile.stripe_customer_id,
        status: "active",
        limit: 1,
      });

      if (subscriptions.data.length > 0) {
        stripeWarning = {
          hasActiveSubscription: true,
          subscriptionId: subscriptions.data[0].id,
          message: "Usuário possui assinatura ativa no Stripe. Considere cancelar a assinatura no Stripe."
        };
        logStep("Active Stripe subscription found", stripeWarning);
      }
    }

    // Atualizar plano do usuário
    const updateData: any = {
      plan: newPlan,
      updated_at: new Date().toISOString()
    };

    if (expiresAt) {
      updateData.plan_expires_at = expiresAt;
    } else {
      updateData.plan_expires_at = null;
    }

    const { error: updateError } = await supabaseClient
      .from('profiles')
      .update(updateData)
      .eq('user_id', userId);

    if (updateError) throw new Error(`Error updating profile: ${updateError.message}`);
    logStep("Profile updated successfully");

    // Registrar ação de auditoria
    const { error: auditError } = await supabaseClient
      .from('admin_actions')
      .insert({
        admin_user_id: adminUser.id,
        target_user_id: userId,
        action_type: 'plan_change',
        old_value: {
          plan: currentProfile.plan,
          plan_expires_at: currentProfile.plan_expires_at
        },
        new_value: {
          plan: newPlan,
          plan_expires_at: expiresAt || null
        },
        reason: reason || 'Alteração manual do plano'
      });

    if (auditError) {
      logStep("Audit log failed", { error: auditError });
      // Não falhar a operação por erro no log de auditoria
    } else {
      logStep("Audit log created");
    }

    return new Response(JSON.stringify({
      success: true,
      message: "Plano atualizado com sucesso",
      stripeWarning,
      oldPlan: currentProfile.plan,
      newPlan,
      expiresAt: expiresAt || null
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ 
      error: errorMessage,
      success: false 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
