/** A business region is fixed at onboarding; a browser locale is never a billing market. */
export function marketCurrency(country: string) {
  if (country === 'BR') return 'brl';
  if (country === 'PT') return 'eur';
  throw new Error('Unsupported business country');
}
export function validMarketPrice(price: { active?: boolean; currency?: string; unit_amount?: number | null; recurring?: { interval?: string; interval_count?: number } | null }, country: string, billing: string, amount: number) {
  return price.active === true && price.currency === marketCurrency(country) &&
    Number.isInteger(amount) && amount > 0 && price.unit_amount === amount &&
    price.recurring?.interval === (billing === 'yearly' ? 'year' : 'month') &&
    price.recurring?.interval_count === 1;
}
