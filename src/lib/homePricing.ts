import { supabase } from '@/integrations/supabase/client';
import type { MarkupDetalhado } from '@/types/configurations';
import { calcularDadosReceita, RECEITA_COMPONENTES_CUSTO } from './receitasData';
import { readAll } from './dashboardData';
import { isValidMarkupPercentageTotal, markupIndirectPercent, netProfitAtPrice } from './markupMath';

interface HomeRecipe {
  id: string;
  name: string;
  image: string | null;
  price: number;
  unitCost: number | null;
  priceIssue?: 'sale' | 'composition';
  markupId: string | null;
  markupType: string | null;
}
interface HomeMarkup {
  id: string;
  name: string;
  target: number;
  indirect: number;
  fixed: number;
}

export async function fetchHomePricing(userId: string, signal: AbortSignal) {
  const [recipes, markups, configs] = await Promise.all([
    readAll((from, to) => supabase.from('receitas')
      .select(`id, nome, imagem_url, preco_venda, rendimento_valor, rendimento_unidade, markup_id, markup:markups!inner(tipo), ${RECEITA_COMPONENTES_CUSTO}`)
      .eq('user_id', userId).eq('status', 'finalizada').eq('markup.tipo', 'normal').order('id').range(from, to).abortSignal(signal)),
    readAll((from, to) => supabase.from('markups').select('id, nome, margem_lucro, gasto_sobre_faturamento, encargos_sobre_venda')
      .eq('user_id', userId).eq('ativo', true).eq('tipo', 'normal').order('id').range(from, to).abortSignal(signal)),
    readAll((from, to) => supabase.from('user_configurations').select('type, configuration')
      .eq('user_id', userId).like('type', 'markup\\_%').order('type').range(from, to).abortSignal(signal)),
  ]);

  const details = new Map(configs.data.map(c => [c.type, c.configuration as MarkupDetalhado | null]));
  const channels: HomeMarkup[] = markups.data.map(m => {
    const d = details.get(`markup_${m.nome.toLowerCase().replace(/\s+/g, '_')}`);
    return {
      id: m.id, name: m.nome, target: d?.lucroDesejado ?? m.margem_lucro, fixed: d?.valorEmReal ?? 0,
      indirect: markupIndirectPercent(m, d),
    };
  }).sort((a, b) => a.name.localeCompare(b.name));
  const catalog: HomeRecipe[] = recipes.data.map(r => {
    const c = calcularDadosReceita(r);
    const total = c.custo_ingredientes + c.custo_embalagens + c.custo_mao_obra + c.custo_sub_receitas;
    // A preparation stores its batch cost in preco_venda. Other sheets store a selling price there.
    const hasUnverifiedComponent = r.sub_receitas.some(({ sub_receita: child }) =>
      child?.status !== 'finalizada' || child.markup?.tipo !== 'sub_receita' ||
      !(child.rendimento_valor > 0 && child.preco_venda > 0));
    const cents = r.preco_venda * 100;
    const isDiscreteUnit = ['un', 'unidade', 'unidade (un)'].includes(r.rendimento_unidade?.trim().toLowerCase());
    const subcentUnitPrice = isDiscreteUnit && Math.abs(cents - Math.round(cents)) > 1e-7;
    let priceIssue: HomeRecipe['priceIssue'];
    if (hasUnverifiedComponent) priceIssue = 'composition';
    else if (subcentUnitPrice) priceIssue = 'sale';
    return { id: r.id, name: r.nome, image: r.imagem_url, price: r.preco_venda, markupId: r.markup_id, markupType: r.markup?.tipo ?? null, priceIssue,
      unitCost: r.rendimento_valor > 0 ? total / r.rendimento_valor : null };
  });
  return { recipes: catalog, channels };
}

export function assessMargins(recipes: HomeRecipe[], channels: HomeMarkup[], overrideId: string | null) {
  const byId = new Map(channels.map(m => [m.id, m]));
  const alerts = [];
  let total = 0;
  let assessed = 0;
  let missingYield = 0;
  let unconfirmedSale = 0;
  let unconfirmedComposition = 0;
  let sum = 0;
  for (const recipe of recipes) {
    if (recipe.markupType !== 'normal' || !recipe.markupId) continue;
    total++;
    if (recipe.unitCost === null) { missingYield++; continue; }
    if (recipe.priceIssue === 'composition') { unconfirmedComposition++; continue; }
    if (recipe.priceIssue === 'sale') { unconfirmedSale++; continue; }
    const m = byId.get(overrideId ?? recipe.markupId);
    if (!m || !Number.isFinite(recipe.unitCost) ||
        !Number.isFinite(recipe.price) || !(recipe.price > 0 && recipe.unitCost > 0) || m.fixed < 0 || m.target < 0 ||
        !isValidMarkupPercentageTotal(m.indirect + m.target)) continue;
    const { lucroLiquido, margemLiquida } = netProfitAtPrice(recipe.price, recipe.unitCost, m.fixed, m.indirect);
    const gap = m.target - margemLiquida;
    assessed++;
    sum += margemLiquida;
    if (gap > 1e-8) {
      const exactPrice = (recipe.unitCost + m.fixed) / (1 - (m.indirect + m.target) / 100);
      // Round up to a sellable cent so the displayed price actually meets the target.
      const targetPrice = Math.ceil(exactPrice * 100 - 1e-8) / 100;
      alerts.push({ ...recipe, markup: m.name, target: m.target, net: lucroLiquido, margin: margemLiquida, gap, targetPrice });
    }
  }
  alerts.sort((a, b) => b.gap - a.gap || a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  return { alerts, total, average: assessed ? sum / assessed : null, assessed, missingYield, unconfirmedSale, unconfirmedComposition, skipped: total - assessed };
}
