import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Product {
  id: string;
  nome: string;
  estoque_atual: number;
  estoque_minimo: number;
  user_id: string;
}

interface Recipe {
  id: string;
  nome: string;
  preco_venda: number;
  user_id: string;
}

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[DAILY-NOTIFICATIONS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Iniciando verificação diária de notificações");

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Verificar produtos com estoque baixo
    const { data: lowStockProducts, error: stockError } = await supabaseAdmin
      .from('produtos')
      .select('id, nome, estoque_atual, estoque_minimo, user_id')
      .filter('estoque_atual', 'lte', 'estoque_minimo')
      .eq('ativo', true);

    if (stockError) throw stockError;

    logStep("Produtos com estoque baixo encontrados", { count: lowStockProducts?.length });

    // Criar notificações de estoque baixo
    for (const product of lowStockProducts || []) {
      // Verificar se já existe notificação recente para este produto
      const { data: existingNotification } = await supabaseAdmin
        .from('notifications')
        .select('id')
        .eq('user_id', product.user_id)
        .eq('related_id', product.id)
        .eq('type', 'warning')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .single();

      if (!existingNotification) {
        await supabaseAdmin
          .from('notifications')
          .insert({
            user_id: product.user_id,
            title: '🔔 Estoque Baixo',
            message: `O produto "${product.nome}" está com estoque baixo (${product.estoque_atual} unidades). Recomendamos reabastecer.`,
            type: 'warning',
            related_id: product.id
          });

        logStep("Notificação de estoque baixo criada", { produto: product.nome });
      }
    }

    // 2. Verificar receitas sem preço de venda definido
    const { data: unpricedRecipes, error: recipeError } = await supabaseAdmin
      .from('receitas')
      .select('id, nome, preco_venda, user_id')
      .or('preco_venda.is.null,preco_venda.eq.0');

    if (recipeError) throw recipeError;

    logStep("Receitas sem preço encontradas", { count: unpricedRecipes?.length });

    // Agrupar por usuário para evitar spam
    const userRecipes = unpricedRecipes?.reduce((acc: Record<string, Recipe[]>, recipe) => {
      if (!acc[recipe.user_id]) acc[recipe.user_id] = [];
      acc[recipe.user_id].push(recipe);
      return acc;
    }, {});

    // Criar notificações para receitas sem preço (máx 1 por usuário por dia)
    for (const [userId, recipes] of Object.entries(userRecipes || {})) {
      const { data: existingNotification } = await supabaseAdmin
        .from('notifications')
        .select('id')
        .eq('user_id', userId)
        .eq('type', 'info')
        .ilike('message', '%preço de venda%')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .single();

      if (!existingNotification && recipes.length > 0) {
        const message = recipes.length === 1 
          ? `A receita "${recipes[0].nome}" não possui preço de venda definido.`
          : `Você tem ${recipes.length} receitas sem preço de venda definido.`;

        await supabaseAdmin
          .from('notifications')
          .insert({
            user_id: userId,
            title: '💰 Precificação Pendente',
            message: `${message} Configure os preços para maximizar seus lucros.`,
            type: 'info'
          });

        logStep("Notificação de precificação criada", { userId, count: recipes.length });
      }
    }

    // 3. Limpeza de notificações antigas (mais de 30 dias)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    
    const { error: cleanupError } = await supabaseAdmin
      .from('notifications')
      .delete()
      .lt('created_at', thirtyDaysAgo)
      .eq('read', true);

    if (cleanupError) {
      logStep("Erro na limpeza de notificações", cleanupError);
    } else {
      logStep("Limpeza de notificações antigas concluída");
    }

    logStep("Verificação diária concluída com sucesso");

    return new Response(JSON.stringify({ 
      success: true, 
      lowStockCount: lowStockProducts?.length || 0,
      unpricedRecipesCount: unpricedRecipes?.length || 0
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    logStep("ERRO na verificação diária", { error: error.message });
    
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});