// Pure reporting rules. Never read profiles, logins, or catalog prices here.
// Stripe events can carry different API versions, so normalize at this boundary.
/* eslint-disable @typescript-eslint/no-explicit-any */
export type StripeRecord = Record<string, any>;
const DAY = 86400;
export const currencyScale = (currency: string) => 10 ** (new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits ?? 2);
export const objectId = (value: any): string | null => typeof value === 'string' ? value : value?.id ?? null;
export const invoiceSubscription = (invoice: StripeRecord) =>
  objectId(invoice.parent?.subscription_details?.subscription ?? invoice.subscription);

export interface CurrencyMetrics {
  currency: string;
  mrr: number | null;
  arr: number | null;
  arpu: number | null;
  payingCustomers: number;
  paidSubscriptions: number;
  pastDueSubscriptions: number;
  churnRate: number | null;
  churnBase: number | null;
  churnedCustomers: number | null;
  churnReason: string | null;
  ltv: number | null;
  ltvReason: string | null;
  mrrReason: string | null;
  grossReceived30d: number;
  refunded30d: number;
  netReceived30d: number;
  revenueHistory: Array<{ month: string; gross: number; refunds: number; net: number }>;
}

export interface FinancialReport {
  generatedAt: string;
  periodStart: string;
  currencies: CurrencyMetrics[];
  trialing: number;
  canceledSubscriptions30d: number;
  warnings: string[];
}

export async function listAll<T extends { id: string }>(
  fetchPage: (cursor?: string) => Promise<{ data: T[]; has_more: boolean }>,
): Promise<T[]> {
  const result: T[] = [];
  const seen = new Set<string>();
  let cursor: string | undefined;
  for (let page = 0; page < 100; page++) {
    const next = await fetchPage(cursor);
    for (const row of next.data) if (!seen.has(row.id)) { seen.add(row.id); result.push(row); }
    if (!next.has_more) return result;
    const last = next.data.at(-1)?.id;
    if (!last || last === cursor) throw new Error('stripe_pagination_incomplete');
    cursor = last;
  }
  // Never silently publish a truncated financial total.
  throw new Error('stripe_reporting_limit_exceeded');
}

function monthlyFactor(price: StripeRecord): number {
  const recurring = price.recurring;
  if (!recurring || recurring.usage_type === 'metered' || price.billing_scheme === 'tiered'
    || price.transform_quantity || price.tax_behavior === 'inclusive') throw new Error('unsupported_price');
  const count = recurring.interval_count ?? 1;
  const factors: Record<string, number> = { month: 1, year: 1 / 12, week: 365.25 / 12 / 7, day: 365.25 / 12 };
  if (!(count > 0) || !factors[recurring.interval]) throw new Error('unsupported_interval');
  return factors[recurring.interval] / count;
}

function applyDiscounts(lines: Array<{ amount: number; product: string | null; factor: number }>,
  discounts: any[], currency: string, now: number) {
  for (const discount of discounts) {
    if (typeof discount !== 'object') throw new Error('discount_not_expanded');
    if (discount.end && discount.end <= now) continue;
    const coupon = discount.coupon ?? discount.source?.coupon;
    if (!coupon || typeof coupon !== 'object') throw new Error('coupon_not_expanded');
    // One-off coupons affect cash received, not the recurring run rate.
    if (coupon.duration === 'once') continue;
    const applicable = lines.filter(l => !coupon.applies_to?.products || coupon.applies_to.products.includes(l.product));
    const total = applicable.reduce((sum, l) => sum + l.amount, 0);
    if (!total) continue;
    if (coupon.percent_off != null) {
      applicable.forEach(l => { l.amount *= 1 - coupon.percent_off / 100; });
    } else if (coupon.amount_off != null) {
      if (coupon.currency !== currency || new Set(applicable.map(l => l.factor)).size > 1) throw new Error('unsupported_fixed_discount');
      const reduction = Math.min(total, coupon.amount_off);
      applicable.forEach(l => { l.amount -= reduction * l.amount / total; });
    } else throw new Error('unsupported_discount');
  }
}

export function subscriptionMrr(sub: StripeRecord, now: number): number {
  if (sub.items?.has_more) throw new Error('subscription_items_incomplete');
  const lines = (sub.items?.data ?? []).map((item: StripeRecord) => {
    const price = item.price;
    if (!price || price.currency !== sub.currency) throw new Error('unsupported_currency');
    const unit = price.unit_amount_decimal ?? price.unit_amount;
    if (unit == null || !Number.isFinite(Number(unit))) throw new Error('unsupported_amount');
    const line = { amount: Number(unit) * (item.quantity ?? 1), product: objectId(price.product), factor: monthlyFactor(price) };
    applyDiscounts([line], item.discounts ?? [], sub.currency, now);
    return line;
  });
  if (!lines.length) throw new Error('subscription_items_missing');
  applyDiscounts(lines, sub.discounts ?? (sub.discount ? [sub.discount] : []), sub.currency, now);
  return lines.reduce((total: number, l: { amount: number; factor: number }) => total + Math.max(0, l.amount) * l.factor, 0) / currencyScale(sub.currency);
}

function retainedStatus(sub: StripeRecord) {
  // Payment retries are not churn. A subscription in unpaid/paused/canceled is.
  return ['active', 'past_due'].includes(sub.status) && !sub.pause_collection;
}

function cohortChurn(subs: StripeRecord[], events: StripeRecord[] | null, firstPaid: Map<string, number>, start: number, now: number) {
  if (!events) return { base: null, lost: null, rate: null, reason: 'Histórico de mudanças de assinatura indisponível.' };
  const initial = new Set<string>();
  const current = new Set<string>();
  let unknown = false;
  for (const sub of subs) {
    const first = firstPaid.get(sub.id);
    const customer = objectId(sub.customer);
    if (!first || !customer) continue;
    if (retainedStatus(sub)) current.add(customer);
    if (first > start || sub.created > start) continue;
    // Reconstruct the opening state from Stripe's first change, not login or
    // current status alone. Ambiguous deletion-only history is unavailable.
    const changes = events.filter(e => e.data?.object?.id === sub.id && e.created >= start && e.created <= now)
      .sort((a, b) => a.created - b.created);
    let opening = sub;
    const event = changes[0];
    if (event?.type === 'customer.subscription.created') continue;
    if (event?.type === 'customer.subscription.deleted') { unknown = true; continue; }
    if (event) {
      const previous = event.data.previous_attributes ?? {};
      opening = { ...event.data.object, ...previous };
      // Simultaneous status transitions cannot be ordered by event ID.
      const tied = changes.filter(e => e.created === event.created && e.data?.previous_attributes?.status);
      if (tied.length > 1) { unknown = true; continue; }
    } else if (sub.ended_at && sub.ended_at >= start) { unknown = true; continue; }
    if (retainedStatus(opening)) initial.add(customer);
  }
  if (unknown) return { base: null, lost: null, rate: null, reason: 'Histórico insuficiente para reconstruir a base pagante inicial.' };
  const lost = [...initial].filter(id => !current.has(id)).length;
  return { base: initial.size, lost, rate: initial.size ? lost / initial.size * 100 : null,
    reason: initial.size ? null : 'Sem clientes pagantes na base inicial dos últimos 30 dias.' };
}

export function calculateFinancialMetrics(input: {
  subscriptions: StripeRecord[]; invoices: StripeRecord[]; charges: StripeRecord[];
  invoicePayments: StripeRecord[]; refunds: StripeRecord[]; events: StripeRecord[] | null; now: number;
}): FinancialReport {
  const { now } = input;
  const start = now - 30 * DAY;
  const subs = input.subscriptions.filter(s => s.livemode === true);
  const invoices = input.invoices.filter(i => i.livemode === true);
  const charges = input.charges.filter(c => c.livemode === true && c.paid && c.status === 'succeeded' && c.captured);
  const chargeIds = new Set(charges.map(c => c.id));
  const refunds = input.refunds.filter(r => r.status === 'succeeded' && chargeIds.has(objectId(r.charge)));
  const paymentsByInvoice = new Map<string, StripeRecord[]>();
  for (const payment of input.invoicePayments) {
    const invoiceId = objectId(payment.invoice);
    if (invoiceId && payment.livemode === true && payment.status === 'paid' && payment.amount_paid > 0) {
      paymentsByInvoice.set(invoiceId, [...(paymentsByInvoice.get(invoiceId) ?? []), payment]);
    }
  }
  const invoiceCharges = (invoice: StripeRecord) => charges.filter(charge =>
    objectId(invoice.charge) === charge.id || (objectId(invoice.payment_intent) && objectId(invoice.payment_intent) === objectId(charge.payment_intent)) ||
    (paymentsByInvoice.get(invoice.id) ?? []).some(payment => objectId(payment.payment?.charge) === charge.id ||
      (objectId(payment.payment?.payment_intent) && objectId(payment.payment.payment_intent) === objectId(charge.payment_intent))));
  const firstPaid = new Map<string, number>();
  for (const invoice of invoices) {
    const id = invoiceSubscription(invoice);
    const paidAt = invoice.status_transitions?.paid_at;
    if (id && invoice.status === 'paid' && invoice.amount_paid > 0 && !invoice.paid_out_of_band && paidAt && paidAt <= now && invoiceCharges(invoice).length) {
      firstPaid.set(id, Math.min(firstPaid.get(id) ?? Infinity, paidAt));
    }
  }
  const invoiceMap = new Map(invoices.map(i => [i.id, i]));
  const currencies = new Set(['brl', ...subs.map(s => s.currency), ...charges.map(c => c.currency)].filter(Boolean));
  const warnings: string[] = [];
  if (invoices.some(i => i.paid_out_of_band && i.amount_paid > 0)) warnings.push('Pagamentos marcados manualmente fora do Stripe não compõem os recebimentos confirmados.');
  if (invoices.some(i => i.amount_paid > 0 && !invoiceCharges(i).length)) warnings.push('Há faturas sem cobrança capturada conciliada. Elas não comprovam clientes pagantes neste painel.');
  const metrics = [...currencies].sort().map(currency => {
    const relevant = subs.filter(s => s.currency === currency);
    const customers = new Set<string>();
    let mrr = 0, paidSubscriptions = 0, mrrReason: string | null = null;
    for (const sub of relevant) {
      const latest = invoiceMap.get(objectId(sub.latest_invoice) ?? '');
      if (sub.status !== 'active' || sub.pause_collection || !firstPaid.has(sub.id) || latest?.status !== 'paid') continue;
      if (sub.ended_at && sub.ended_at <= now) continue;
      if (latest.amount_paid > 0 && !invoiceCharges(latest).some(c => (c.amount_captured ?? c.amount) > (c.amount_refunded ?? 0))) continue;
      try {
        const amount = subscriptionMrr(sub, now);
        if (amount <= 0) continue;
        mrr += amount;
      } catch { mrrReason = 'Há contrato com preço, imposto ou desconto que exige conciliação. O total não foi estimado.'; }
      paidSubscriptions++;
      const customer = objectId(sub.customer);
      if (customer) customers.add(customer);
    }
    const churn = cohortChurn(relevant, input.events?.filter(e => e.livemode === true) ?? null, firstPaid, start, now);
    const arpu = !mrrReason && customers.size ? mrr / customers.size : null;
    const ltv = arpu != null && churn.rate != null && churn.rate > 0 ? arpu / (churn.rate / 100) : null;
    const history: CurrencyMetrics['revenueHistory'] = [];
    const date = new Date(now * 1000);
    for (let offset = 5; offset >= 0; offset--) {
      const month = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - offset, 1)).toISOString().slice(0, 7);
      history.push({ month, gross: 0, refunds: 0, net: 0 });
    }
    let gross30 = 0, refunded30 = 0;
    for (const charge of charges.filter(c => c.currency === currency)) {
      const timestamp = typeof charge.balance_transaction === 'object' ? charge.balance_transaction?.created : null;
      if (!timestamp) throw new Error('payment_date_unavailable');
      if (timestamp > now) continue;
      const amount = (charge.amount_captured ?? charge.amount) / currencyScale(currency);
      const row = history.find(h => h.month === new Date(timestamp * 1000).toISOString().slice(0, 7));
      if (row) row.gross += amount;
      if (timestamp >= start) gross30 += amount;
    }
    for (const refund of refunds.filter(r => r.currency === currency && r.created <= now)) {
      const amount = refund.amount / currencyScale(currency);
      const timestamp = typeof refund.balance_transaction === 'object' ? refund.balance_transaction?.created : null;
      if (!timestamp) throw new Error('refund_date_unavailable');
      if (timestamp > now) continue;
      const row = history.find(h => h.month === new Date(timestamp * 1000).toISOString().slice(0, 7));
      if (row) row.refunds += amount;
      if (timestamp >= start && timestamp <= now) refunded30 += amount;
    }
    const round = (amount: number) => Math.round((amount + Number.EPSILON) * currencyScale(currency)) / currencyScale(currency);
    history.forEach(h => { h.gross = round(h.gross); h.refunds = round(h.refunds); h.net = round(h.gross - h.refunds); });
    return { currency, mrr: mrrReason ? null : round(mrr), arr: mrrReason ? null : round(mrr * 12), arpu: arpu == null ? null : round(arpu),
      payingCustomers: customers.size, paidSubscriptions,
      pastDueSubscriptions: relevant.filter(s => s.status === 'past_due').length,
      churnRate: churn.rate, churnBase: churn.base, churnedCustomers: churn.lost, churnReason: churn.reason,
      ltv: ltv == null ? null : round(ltv), ltvReason: ltv != null ? null : churn.reason ?? (churn.rate === 0 ? 'Sem churn observado; LTV não é estimável.' : 'Sem ARPU pagante disponível.'),
      mrrReason, grossReceived30d: round(gross30), refunded30d: round(refunded30), netReceived30d: round(gross30 - refunded30),
      revenueHistory: history };
  });
  return { generatedAt: new Date(now * 1000).toISOString(), periodStart: new Date(start * 1000).toISOString(), currencies: metrics,
    trialing: subs.filter(s => s.status === 'trialing').length,
    canceledSubscriptions30d: subs.filter(s => s.status === 'canceled' && s.ended_at >= start && s.ended_at <= now).length,
    warnings };
}
