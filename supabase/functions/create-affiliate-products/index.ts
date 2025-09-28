import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Preços base em centavos (Brazilian Real)
const BASE_PRICES = {
  professional_monthly: 4990, // R$ 49,90
  professional_yearly: 47880, // R$ 478,80
  enterprise_monthly: 8990, // R$ 89,90
  enterprise_yearly: 83880, // R$ 838,80
};

const PLAN_NAMES = {
  professional: "CalculaAI Professional",
  enterprise: "CalculaAI Enterprise"
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
    const { affiliateId, affiliateName } = await req.json();
    
    if (!affiliateId || !affiliateName) {
      throw new Error("affiliateId e affiliateName são obrigatórios");
    }

    console.log(`Criando produtos para afiliado: ${affiliateName} (${affiliateId})`);

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const products = [];

    // Criar 4 produtos únicos para este afiliado
    for (const planType of ['professional', 'enterprise']) {
      for (const billing of ['monthly', 'yearly']) {
        const planKey = `${planType}_${billing}`;
        const basePrice = BASE_PRICES[planKey as keyof typeof BASE_PRICES];
        
        // Nome único do produto incluindo o afiliado
        const productName = `${PLAN_NAMES[planType as keyof typeof PLAN_NAMES]} ${billing === 'monthly' ? 'Mensal' : 'Anual'} - ${affiliateName} (Afiliado)`;
        
        console.log(`Criando produto: ${productName}`);

        // Criar produto no Stripe
        const product = await stripe.products.create({
          name: productName,
          description: `Plano ${planType} ${billing} vendido através do afiliado ${affiliateName}`,
          metadata: {
            affiliate_id: affiliateId,
            affiliate_name: affiliateName,
            plan_type: planType,
            billing: billing,
            created_by: 'affiliate_system'
          }
        });

        // Criar preço no Stripe
        const price = await stripe.prices.create({
          product: product.id,
          unit_amount: basePrice,
          currency: 'brl',
          recurring: {
            interval: billing === 'monthly' ? 'month' : 'year'
          },
          metadata: {
            affiliate_id: affiliateId,
            affiliate_name: affiliateName,
            plan_type: planType,
            billing: billing
          }
        });

        console.log(`Produto criado: ${product.id}, Preço: ${price.id}`);

        // Salvar no banco de dados
        const { error: dbError } = await supabaseClient
          .from('affiliate_stripe_products')
          .insert({
            affiliate_id: affiliateId,
            plan_type: planType,
            billing: billing,
            stripe_product_id: product.id,
            stripe_price_id: price.id
          });

        if (dbError) {
          console.error('Erro ao salvar no banco:', dbError);
          throw dbError;
        }

        products.push({
          planType,
          billing,
          productId: product.id,
          priceId: price.id,
          amount: basePrice
        });
      }
    }

    console.log(`✅ Produtos criados com sucesso para ${affiliateName}`);

    return new Response(JSON.stringify({ 
      success: true, 
      products,
      message: `4 produtos únicos criados para ${affiliateName}`
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Erro ao criar produtos:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});