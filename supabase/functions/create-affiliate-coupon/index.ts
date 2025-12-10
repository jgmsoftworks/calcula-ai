import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[CREATE-AFFILIATE-COUPON] Iniciando criação de cupom');
    
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");
    
    // Check if user is admin using secure RPC function
    const { data: isAdmin, error: roleError } = await supabaseClient.rpc('has_role_or_higher', {
      required_role: 'admin',
      check_user_id: user.id
    });
    
    if (roleError || !isAdmin) {
      throw new Error("Acesso negado. Apenas administradores podem criar cupons");
    }

    // Parse request body
    const { affiliateId, name, description, discountType, discountValue, maxRedemptions, expiresAt } = await req.json();
    
    console.log('[CREATE-AFFILIATE-COUPON] Dados recebidos:', { 
      affiliateId, name, description, discountType, discountValue 
    });

    // Validate required fields
    if (!affiliateId || !name || !discountType || !discountValue) {
      throw new Error("Campos obrigatórios: affiliateId, name, discountType, discountValue");
    }

    // Get affiliate info
    const { data: affiliate, error: affiliateError } = await supabaseClient
      .from('affiliates')
      .select('*')
      .eq('id', affiliateId)
      .single();
    
    if (affiliateError || !affiliate) {
      throw new Error("Afiliado não encontrado");
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Generate unique coupon code
    const couponCode = `${affiliate.name.replace(/\s+/g, '').toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    
    console.log('[CREATE-AFFILIATE-COUPON] Criando cupom no Stripe:', couponCode);

    // Create coupon in Stripe
    const stripeCouponData: any = {
      id: couponCode,
      name: `${name} - ${affiliate.name}`,
      duration: expiresAt ? 'once' : 'forever',
    };

    if (discountType === 'percentage') {
      stripeCouponData.percent_off = discountValue;
    } else {
      stripeCouponData.amount_off = Math.round(discountValue * 100); // Convert to cents
      stripeCouponData.currency = 'brl';
    }

    if (maxRedemptions) {
      stripeCouponData.max_redemptions = maxRedemptions;
    }

    if (expiresAt) {
      stripeCouponData.redeem_by = Math.floor(new Date(expiresAt).getTime() / 1000);
    }

    const stripeCoupon = await stripe.coupons.create(stripeCouponData);
    
    console.log('[CREATE-AFFILIATE-COUPON] Cupom criado no Stripe:', stripeCoupon.id);

    // Save coupon to database
    const { data: coupon, error: couponError } = await supabaseClient
      .from('affiliate_coupons')
      .insert({
        affiliate_id: affiliateId,
        stripe_coupon_id: stripeCoupon.id,
        name,
        description,
        discount_type: discountType,
        discount_value: discountValue,
        max_redemptions: maxRedemptions,
        expires_at: expiresAt,
        is_active: true
      })
      .select()
      .single();

    if (couponError) {
      console.error('[CREATE-AFFILIATE-COUPON] Erro ao salvar no banco:', couponError);
      // Try to delete the Stripe coupon if DB insert failed
      try {
        await stripe.coupons.del(stripeCoupon.id);
      } catch (deleteError) {
        console.error('[CREATE-AFFILIATE-COUPON] Erro ao deletar cupom do Stripe:', deleteError);
      }
      throw new Error("Erro ao salvar cupom no banco de dados");
    }

    console.log('[CREATE-AFFILIATE-COUPON] ✅ Cupom criado com sucesso:', coupon.id);

    return new Response(JSON.stringify({
      success: true,
      coupon: {
        ...coupon,
        affiliate_name: affiliate.name
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('[CREATE-AFFILIATE-COUPON] Erro:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error instanceof Error ? error.message : String(error) 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});