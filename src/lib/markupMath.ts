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

  return Math.max(
    0,
    Math.floor((MARKUP_PERCENTAGE_LIMIT - 0.01 - costPercentagesTotal) * 100) / 100,
  );
}
