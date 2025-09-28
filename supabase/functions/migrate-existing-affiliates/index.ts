import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
    console.log('[MIGRATE-AFFILIATES] Iniciando migração de afiliados existentes');

    // Buscar todos os afiliados que não têm produtos no Stripe
    const { data: affiliatesWithoutProducts, error: affiliatesError } = await supabaseClient
      .from('affiliates')
      .select(`
        id,
        name,
        email,
        status,
        affiliate_stripe_products(id)
      `)
      .eq('status', 'active');

    if (affiliatesError) {
      throw affiliatesError;
    }

    const affiliatesToMigrate = affiliatesWithoutProducts?.filter(
      affiliate => !affiliate.affiliate_stripe_products || affiliate.affiliate_stripe_products.length === 0
    ) || [];

    console.log(`[MIGRATE-AFFILIATES] Encontrados ${affiliatesToMigrate.length} afiliados para migrar`);

    if (affiliatesToMigrate.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: "Nenhum afiliado precisa ser migrado",
        migratedCount: 0
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // Migrar cada afiliado
    for (const affiliate of affiliatesToMigrate) {
      try {
        console.log(`[MIGRATE-AFFILIATES] Migrando: ${affiliate.name} (${affiliate.id})`);

        // Chamar a função de criar produtos
        const { data: productsResult, error: productsError } = await supabaseClient.functions.invoke(
          'create-affiliate-products',
          {
            body: {
              affiliateId: affiliate.id,
              affiliateName: affiliate.name
            }
          }
        );

        if (productsError) {
          throw productsError;
        }

        if (productsResult?.success) {
          successCount++;
          console.log(`[MIGRATE-AFFILIATES] ✅ ${affiliate.name} migrado com sucesso`);
        } else {
          throw new Error(productsResult?.error || 'Erro desconhecido ao criar produtos');
        }

      } catch (error) {
        errorCount++;
        const errorMsg = `${affiliate.name}: ${error instanceof Error ? error.message : String(error)}`;
        errors.push(errorMsg);
        console.error(`[MIGRATE-AFFILIATES] ❌ Erro ao migrar ${affiliate.name}:`, error);
      }
    }

    const result = {
      success: errorCount === 0,
      message: `Migração concluída: ${successCount} sucessos, ${errorCount} erros`,
      migratedCount: successCount,
      errorCount,
      errors: errors.length > 0 ? errors : undefined
    };

    console.log('[MIGRATE-AFFILIATES] Resultado:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("[MIGRATE-AFFILIATES] Erro geral:", error);
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