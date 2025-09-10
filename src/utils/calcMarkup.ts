export type MarkupParams = {
  percentFees: number;
  percentTaxes: number;
  percentPayment: number;
  percentCommissions: number;
  percentOthers: number;
  desiredProfit: number;
  fixedValue?: number;
  averageTicket?: number;
};

export function calcMarkup(params: MarkupParams) {
  const p =
    params.percentFees +
    params.percentTaxes +
    params.percentPayment +
    params.percentCommissions +
    params.percentOthers +
    params.desiredProfit;

  const totalPercent = p;

  const multiplier = 1 / (1 - p);

  let effectiveMultiplier = multiplier;
  if (params.fixedValue && params.averageTicket) {
    effectiveMultiplier += params.fixedValue / params.averageTicket;
  }

  return { totalPercent, multiplier, effectiveMultiplier };
}
