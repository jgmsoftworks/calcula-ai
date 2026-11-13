import type { AppDatabaseClient, Tables } from '../_shared/database.ts';
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type CostMovement = Pick<Tables<'movimentacoes'>, 'produto_id' | 'quantidade' | 'custo_unitario' | 'tipo'> & { produtos: Pick<Tables<'produtos'>, 'nome' | 'user_id'> };
type SalesMovement = Pick<Tables<'movimentacoes'>, 'produto_id' | 'quantidade'> & { produtos: Pick<Tables<'produtos'>, 'nome' | 'user_id' | 'estoque_atual' | 'estoque_minimo'> };

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

interface Movimentacao {
  produto_id: string;
  produto_nome: string;
  quantidade: number;
  custo_unitario: number;
  tipo: string;
  data: string;
  user_id: string;
}

type UserSettings = {
  low_stock: boolean;
  unpriced_recipes: boolean;
  cost_anomalies: boolean;
  sales_opportunities: boolean;
  engagement_reminders: boolean;
  low_margin_alerts: boolean;
}

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[DAILY-NOTIFICATIONS] ${step}${detailsStr}`);
};

const getUserSettings = async (supabase: AppDatabaseClient, userId: string): Promise<UserSettings> => {
  const { data } = await supabase
    .from('user_configurations')
    .select('configuration')
    .eq('user_id', userId)
    .eq('type', 'notification_settings')
    .single();

  return data?.configuration as UserSettings || {
    low_stock: true,
    unpriced_recipes: true,
    cost_anomalies: true,
    sales_opportunities: true,
    engagement_reminders: true,
    low_margin_alerts: true
  };
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

    // 3. Detectar anomalias de custo (variação > 30% nos últimos 7 dias)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: recentMovements } = await supabaseAdmin
      .from('movimentacoes')
      .select('produto_id, produtos!inner(nome, user_id), quantidade, custo_unitario, tipo, data')
      .eq('tipo', 'entrada')
      .gte('data', sevenDaysAgo).returns<CostMovement[]>();

    logStep("Movimentações recentes analisadas", { count: recentMovements?.length });

    // Agrupar por produto e calcular variação de custo
    const costChanges: Record<string, { produto: string, user_id: string, costs: number[], avgChange: number }> = {};
    
    recentMovements?.forEach((mov: { produto_id: string; produtos: { nome: string; user_id: string }; custo_unitario: number }) => {
      const key = mov.produto_id;
      if (!costChanges[key]) {
        costChanges[key] = {
          produto: mov.produtos.nome,
          user_id: mov.produtos.user_id,
          costs: [],
          avgChange: 0
        };
      }
      costChanges[key].costs.push(mov.custo_unitario);
    });

    // Detectar variações significativas (> 30%)
    for (const [produtoId, data] of Object.entries(costChanges)) {
      if (data.costs.length >= 2) {
        const sortedCosts = data.costs.sort((a, b) => a - b);
        const minCost = sortedCosts[0];
        const maxCost = sortedCosts[sortedCosts.length - 1];
        const variation = ((maxCost - minCost) / minCost) * 100;

        if (variation > 30) {
          const userSettings = await getUserSettings(supabaseAdmin, data.user_id);
          
          if (userSettings.cost_anomalies) {
            const { data: existingNotification } = await supabaseAdmin
              .from('notifications')
              .select('id')
              .eq('user_id', data.user_id)
              .eq('related_id', produtoId)
              .eq('type', 'warning')
              .ilike('message', '%custo variou%')
              .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
              .single();

            if (!existingNotification) {
              await supabaseAdmin
                .from('notifications')
                .insert({
                  user_id: data.user_id,
                  title: '⚠️ Anomalia de Custo',
                  message: `O custo do produto "${data.produto}" variou ${variation.toFixed(0)}% nos últimos 7 dias. Verifique se há oportunidade de negociação com fornecedores.`,
                  type: 'warning',
                  related_id: produtoId
                });

              logStep("Notificação de anomalia de custo criada", { produto: data.produto, variacao: variation });
            }
          }
        }
      }
    }

    // 4. Oportunidades de venda (produtos com vendas mas estoque baixo)
    const { data: salesOpportunities } = await supabaseAdmin
      .from('movimentacoes')
      .select(`
        produto_id,
        produtos!inner(nome, estoque_atual, estoque_minimo, user_id),
        quantidade
      `)
      .eq('tipo', 'saida')
      .gte('data', sevenDaysAgo).returns<SalesMovement[]>();

    logStep("Oportunidades de venda analisadas", { count: salesOpportunities?.length });

    const productSales: Record<string, { produto: string, user_id: string, vendas: number, estoque: number, estoqueMin: number }> = {};
    
    salesOpportunities?.forEach((sale: { produto_id: string; produtos: { nome: string; user_id: string; estoque_atual: number; estoque_minimo: number }; quantidade: number }) => {
      const key = sale.produto_id;
      if (!productSales[key]) {
        productSales[key] = {
          produto: sale.produtos.nome,
          user_id: sale.produtos.user_id,
          vendas: 0,
          estoque: sale.produtos.estoque_atual,
          estoqueMin: sale.produtos.estoque_minimo
        };
      }
      productSales[key].vendas += sale.quantidade;
    });

    // Notificar sobre produtos com boas vendas mas estoque baixo
    for (const [produtoId, data] of Object.entries(productSales)) {
      if (data.vendas >= 5 && data.estoque <= data.estoqueMin * 1.5) {
        const userSettings = await getUserSettings(supabaseAdmin, data.user_id);
        
        if (userSettings.sales_opportunities) {
          const { data: existingNotification } = await supabaseAdmin
            .from('notifications')
            .select('id')
            .eq('user_id', data.user_id)
            .eq('related_id', produtoId)
            .eq('type', 'success')
            .ilike('message', '%oportunidade de venda%')
            .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
            .single();

          if (!existingNotification) {
            await supabaseAdmin
              .from('notifications')
              .insert({
                user_id: data.user_id,
                title: '🎯 Oportunidade de Venda',
                message: `O produto "${data.produto}" teve ${data.vendas} vendas nos últimos 7 dias, mas o estoque está baixo. Considere reabastecer para não perder vendas!`,
                type: 'success',
                related_id: produtoId
              });

            logStep("Notificação de oportunidade criada", { produto: data.produto, vendas: data.vendas });
          }
        }
      }
    }

    // 5. Lembretes de engajamento (usuários inativos há mais de 7 dias)
    const { data: inactiveUsers } = await supabaseAdmin
      .from('user_configurations')
      .select('user_id, configuration, updated_at')
      .eq('type', 'activity_log')
      .lt('updated_at', sevenDaysAgo);

    logStep("Usuários inativos identificados", { count: inactiveUsers?.length });

    for (const userData of inactiveUsers || []) {
      const userSettings = await getUserSettings(supabaseAdmin, userData.user_id);
      
      if (userSettings.engagement_reminders) {
        const { data: existingNotification } = await supabaseAdmin
          .from('notifications')
          .select('id')
          .eq('user_id', userData.user_id)
          .eq('type', 'info')
          .ilike('message', '%sentimos sua falta%')
          .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .single();

        if (!existingNotification) {
          await supabaseAdmin
            .from('notifications')
            .insert({
              user_id: userData.user_id,
              title: '👋 Sentimos sua falta!',
              message: 'Há mais de 7 dias que você não acessa o sistema. Que tal verificar seus produtos e receitas? Novidades te aguardam!',
              type: 'info'
            });

          logStep("Notificação de engajamento criada", { userId: userData.user_id });
        }
      }
    }

    // 6. Alertas de margem baixa em receitas
    const { data: lowMarginRecipes } = await supabaseAdmin
      .from('receitas')
      .select(`
        id,
        nome,
        preco_venda,
        user_id,
        receita_ingredientes(custo_total),
        receita_embalagens(custo_total),
        receita_mao_obra(valor_total)
      `)
      .not('preco_venda', 'is', null)
      .gt('preco_venda', 0);

    logStep("Receitas analisadas para margem", { count: lowMarginRecipes?.length });

    for (const recipe of lowMarginRecipes || []) {
      const custoTotal = 
        (recipe.receita_ingredientes?.reduce((sum: number, i: { custo_total?: number }) => sum + (i.custo_total || 0), 0) || 0) +
        (recipe.receita_embalagens?.reduce((sum: number, i: { custo_total?: number }) => sum + (i.custo_total || 0), 0) || 0) +
        (recipe.receita_mao_obra?.reduce((sum: number, i: { valor_total?: number }) => sum + (i.valor_total || 0), 0) || 0);

      const margem = ((recipe.preco_venda - custoTotal) / recipe.preco_venda) * 100;

      if (margem < 20 && margem >= 0) {
        const userSettings = await getUserSettings(supabaseAdmin, recipe.user_id);
        
        if (userSettings.low_margin_alerts) {
          const { data: existingNotification } = await supabaseAdmin
            .from('notifications')
            .select('id')
            .eq('user_id', recipe.user_id)
            .eq('related_id', recipe.id)
            .eq('type', 'warning')
            .ilike('message', '%margem de lucro%')
            .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
            .single();

          if (!existingNotification) {
            await supabaseAdmin
              .from('notifications')
              .insert({
                user_id: recipe.user_id,
                title: '📉 Margem Baixa',
                message: `A receita "${recipe.nome}" tem margem de lucro de apenas ${margem.toFixed(1)}%. Considere ajustar o preço ou revisar os custos.`,
                type: 'warning',
                related_id: recipe.id
              });

            logStep("Notificação de margem baixa criada", { receita: recipe.nome, margem });
          }
        }
      }
    }

    // 7. Limpeza de notificações antigas (mais de 30 dias)
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
      unpricedRecipesCount: unpricedRecipes?.length || 0,
      costAnomaliesCount: Object.keys(costChanges).length,
      salesOpportunitiesCount: Object.keys(productSales).length,
      lowMarginRecipesCount: lowMarginRecipes?.length || 0
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