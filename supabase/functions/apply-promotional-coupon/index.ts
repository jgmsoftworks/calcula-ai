import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[APPLY-PROMOTIONAL-COUPON] ${step}${detailsStr}`);
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

    // Autenticar usuário
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !userData.user) {
      throw new Error("Unauthorized");
    }

    const userId = userData.user.id;
    logStep("User authenticated", { userId });

    const { couponCode } = await req.json();
    
    if (!couponCode) {
      throw new Error("Código do cupom é obrigatório");
    }

    const normalizedCode = couponCode.trim().toUpperCase();
    
    // Validate coupon code format
    if (!/^[A-Z0-9_-]{3,20}$/.test(normalizedCode)) {
      logStep("Invalid coupon code format", { code: normalizedCode });
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Código do cupom inválido. Use apenas letras, números, _ e - (3-20 caracteres)" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }
    
    logStep("Validating coupon", { code: normalizedCode });

    // Buscar cupom promocional
    const { data: coupon, error: couponError } = await supabaseClient
      .from('promotional_coupons')
      .select('*')
      .eq('code', normalizedCode)
      .eq('is_active', true)
      .single();

    if (couponError || !coupon) {
      logStep("Coupon not found or inactive");
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Cupom inválido ou inativo" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    logStep("Coupon found", { couponId: coupon.id, type: coupon.discount_type });

    // Validar expiração
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      logStep("Coupon expired");
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Cupom expirado" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Validar limite de usos
    if (coupon.max_redemptions && coupon.times_redeemed >= coupon.max_redemptions) {
      logStep("Coupon redemption limit reached");
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Limite de usos do cupom atingido" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Verificar se usuário já usou este cupom
    const { data: existingRedemption } = await supabaseClient
      .from('coupon_redemptions')
      .select('id')
      .eq('coupon_id', coupon.id)
      .eq('user_id', userId)
      .single();

    if (existingRedemption) {
      logStep("User already redeemed this coupon");
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Você já utilizou este cupom" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Aplicar benefício baseado no tipo de cupom
    let planGranted = 'professional'; // default
    let trialEndsAt = null;

    if (coupon.discount_type === 'trial_period' && coupon.trial_days) {
      // Período de teste - aplicar direto no perfil do usuário
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + coupon.trial_days);
      trialEndsAt = trialEndDate.toISOString();

      // Determinar plano baseado em applies_to_plans
      if (coupon.applies_to_plans && coupon.applies_to_plans.length > 0) {
        planGranted = coupon.applies_to_plans[0];
      }

      logStep("Applying trial period", { days: coupon.trial_days, plan: planGranted, endsAt: trialEndsAt });

      // Atualizar perfil do usuário
      const { error: updateError } = await supabaseClient
        .from('profiles')
        .update({
          plan: planGranted,
          plan_expires_at: trialEndsAt,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (updateError) {
        logStep("Error updating user profile", { error: updateError });
        throw new Error("Erro ao aplicar período de teste");
      }

      logStep("Trial period applied successfully");
    } else {
      // Para cupons de desconto percentual ou fixo, apenas retornar o cupom
      // O usuário usará na hora do checkout
      logStep("Coupon validated for checkout use");
    }

    // Registrar resgate do cupom
    const { error: redemptionError } = await supabaseClient
      .from('coupon_redemptions')
      .insert({
        coupon_id: coupon.id,
        user_id: userId,
        plan_granted: planGranted,
        trial_ends_at: trialEndsAt,
        applied_at: new Date().toISOString()
      });

    if (redemptionError) {
      logStep("Error creating redemption record", { error: redemptionError });
      throw new Error("Erro ao registrar uso do cupom");
    }

    // Incrementar contador de usos
    const { error: incrementError } = await supabaseClient
      .from('promotional_coupons')
      .update({ 
        times_redeemed: coupon.times_redeemed + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', coupon.id);

    if (incrementError) {
      logStep("Error incrementing redemption count", { error: incrementError });
    }

    logStep("Coupon applied successfully");

    return new Response(
      JSON.stringify({
        success: true,
        coupon: {
          code: coupon.code,
          discount_type: coupon.discount_type,
          discount_value: coupon.discount_value,
          trial_days: coupon.trial_days
        },
        plan_granted: planGranted,
        trial_ends_at: trialEndsAt
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});