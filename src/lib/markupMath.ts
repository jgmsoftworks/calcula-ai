import type { Markup, MarkupDetalhado } from '@/types/configurations';

export const MARKUP_PERCENTAGE_LIMIT = 100;

export function sumMarkupPercentages(
  ...values: Array<number | null | undefined>
): number {
  return values.reduce((total, value) => {
    const numeric = Number(value ?? 0);
    return total + (Number.isFinite(numeric) ? numeric : 0);
  }, 0);
}

export function isValidMarkupPercentageTotal(total: number): boolean {
  return Number.isFinite(total) && total >= 0 && total < MARKUP_PERCENTAGE_LIMIT;
}

export function calculateMarkupMultiplier(total: number): number | null {
  if (!isValidMarkupPercentageTotal(total)) return null;
  if (total === 0) return 1;
  return MARKUP_PERCENTAGE_LIMIT / (MARKUP_PERCENTAGE_LIMIT - total);
}

export function maxAllowedProfitPercentage(costPercentagesTotal: number): number {
  if (!Number.isFinite(costPercentagesTotal) || costPercentagesTotal >= MARKUP_PERCENTAGE_LIMIT) {
    return 0;
  }

  const available = MARKUP_PERCENTAGE_LIMIT - 0.01 - costPercentagesTotal;
  return Math.max(0, Number(available.toFixed(2)));
}

export function markupIndirectPercent(markup: Pick<Markup, 'gasto_sobre_faturamento' | 'encargos_sobre_venda'>, details?: MarkupDetalhado | null) {
  if (!details) return sumMarkupPercentages(markup.gasto_sobre_faturamento, markup.encargos_sobre_venda);
  return sumMarkupPercentages(details.gastoSobreFaturamento, details.impostos, details.taxas, details.comissoes, details.outros);
}

export function sheetBaseCost(batchCost: number, yieldAmount: number | null | undefined, preparation: boolean) {
  return !preparation && yieldAmount && yieldAmount > 0 ? batchCost / yieldAmount : batchCost;
}

export function sheetCmvPercent(unitCost: number, price: number) {
  if (!(price > 0)) return null;
  const percent = unitCost / price * 100;
  return Number.isFinite(percent) ? Number(percent.toFixed(1)) : null;
}

// The pricing sheet displays net margin to one decimal using Intl rounding.
const sheetMarginFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1, useGrouping: false });

export function meanSheetPercent(values: (number | null)[]) {
  let total = 0;
  let count = 0;
  for (const value of values) {
    if (value === null || !Number.isFinite(value)) continue;
    total += value;
    count++;
  }
  return { average: count ? total / count : null, count };
}

/** Net profit per unit at the entered selling price. The desired margin is a target, never a cost. */
export function netProfitAtPrice(price: number, unitCost: number, fixedFee: number, indirectPercent: number) {
  const custosDiretos = unitCost + fixedFee;
  const custosIndiretos = price * (indirectPercent / 100);
  const lucroLiquido = price - custosDiretos - custosIndiretos;
  const margemLiquida = price > 0 ? (lucroLiquido / price) * 100 : 0;
  return { custosDiretos, custosIndiretos, lucroLiquido, margemLiquida, displayedMargin: Number(sheetMarginFormat.format(margemLiquida)) };
}
