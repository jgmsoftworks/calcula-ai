import { describe, it, expect, vi } from 'vitest';
import { calculateFinancialMetrics as calculate, subscriptionMrr, listAll, type StripeRecord } from '../../../supabase/functions/_shared/financialMetrics';
import { collectFinancialMetrics } from '../../../supabase/functions/_shared/collectFinancialMetrics';
const now = Date.parse('2026-11-03T12:00:00Z') / 1000;
const day = 86400;
const sub = (id: string, patch: StripeRecord = {}): StripeRecord => ({ id, customer: `cus_${id}`, livemode: true, status: 'active', currency: 'brl',
  created: now - 90 * day, latest_invoice: `in_${id}`, items: { data: [{ quantity: 1, price: { unit_amount: 2990, currency: 'brl', product: 'prod_1', recurring: { interval: 'month', interval_count: 1 } } }] }, ...patch });
function paid(s: StripeRecord, patch: StripeRecord = {}): StripeRecord {
  return { id: `in_${s.id}`, livemode: true, status: 'paid', amount_paid: 2990, parent: { subscription_details: { subscription: s.id } },
    status_transitions: { paid_at: now - 60 * day }, charge: `ch_${s.id}`, ...patch };
}
function charge(s: StripeRecord, patch: StripeRecord = {}): StripeRecord {
  return { id: `ch_${s.id}`, livemode: true, paid: true, status: 'succeeded', captured: true, amount: 2990, amount_captured: 2990,
    currency: s.currency, balance_transaction: { created: now - 60 * day }, ...patch };
}
function fixture(subscriptions: StripeRecord[], extra: StripeRecord = {}) {
  return { now, subscriptions, invoices: subscriptions.map(s => paid(s)), charges: subscriptions.map(s => charge(s)),
    invoicePayments: [], refunds: [], events: [], ...extra };
}
const brl = (input: ReturnType<typeof fixture>) => calculate(input).currencies.find(m => m.currency === 'brl')!;

describe('financial truth independent of profiles', () => {
  it('counts only 3 paid active contracts out of the 10-account scenario', () => {
    const subs = Array.from({ length: 10 }, (_, i) => sub(String(i)));
    subs[3].status = 'trialing'; subs[4].status = 'trialing'; subs[5].status = 'canceled'; subs[6].status = 'past_due';
    const data = fixture(subs); data.invoices = data.invoices.slice(0, 7); data.charges = data.charges.slice(0, 7);
    expect(brl(data)).toMatchObject({ mrr: 89.7, payingCustomers: 3, paidSubscriptions: 3 });
  });
  it('excludes zero trial invoices, manual settlements, failed charges and test mode', () => {
    const subs = [sub('zero'), sub('manual'), sub('failed'), sub('test', { livemode: false })];
    const data = fixture(subs);
    data.invoices[0].amount_paid = 0; data.invoices[1].paid_out_of_band = true; data.charges[2].paid = false;
    expect(brl(data).mrr).toBe(0);
    expect(brl(data).ltv).toBeNull();
  });
  it('requires confirmed invoice-payment linkage, not just a paid invoice flag', () => {
    const s = sub('a'); const data = fixture([s]); delete data.invoices[0].charge;
    expect(brl(data).mrr).toBe(0);
    data.charges[0].payment_intent = 'pi_1';
    data.invoicePayments = [{ id: 'ip_1', invoice: 'in_a', amount_paid: 2990, status: 'paid', livemode: true, payment: { payment_intent: 'pi_1' } }];
    expect(brl(data).mrr).toBe(29.9);
  });
  it('uses customer count for ARPU and LTV, not subscription count or total MRR', () => {
    const a = sub('a'), b = sub('b', { customer: a.customer }), c = sub('c', { status: 'canceled', ended_at: now - day });
    const event = { livemode: true, created: now - day, type: 'customer.subscription.updated', data: { object: c, previous_attributes: { status: 'active' } } };
    const result = brl(fixture([a, b, c], { events: [event] }));
    expect(result).toMatchObject({ payingCustomers: 1, mrr: 59.8, arpu: 59.8, churnBase: 2, churnedCustomers: 1, churnRate: 50, ltv: 119.6 });
  });
  it('keeps scheduled cancellations and inactive logins paying until the contract ends', () => {
    const s = sub('a', { cancel_at_period_end: true, canceled_at: now - day, last_sign_in_at: null });
    expect(brl(fixture([s]))).toMatchObject({ mrr: 29.9, churnRate: 0, ltv: null });
  });
  it('does not turn past_due into churn', () => {
    const s = sub('a', { status: 'past_due' });
    const event = { livemode: true, created: now - day, type: 'customer.subscription.updated', data: { object: s, previous_attributes: { status: 'active' } } };
    expect(brl(fixture([s], { events: [event] }))).toMatchObject({ mrr: 0, churnRate: 0, pastDueSubscriptions: 1 });
  });
  it('treats actual unpaid loss as churn and uses the opening cohort', () => {
    const s = sub('a', { status: 'unpaid' }), newcomer = sub('b', { created: now - day });
    const event = { livemode: true, created: now - day, type: 'customer.subscription.updated', data: { object: s, previous_attributes: { status: 'past_due' } } };
    const data = fixture([s, newcomer], { events: [event] }); data.invoices[1].status_transitions.paid_at = now - day;
    expect(brl(data)).toMatchObject({ churnBase: 1, churnedCustomers: 1, churnRate: 100 });
  });
  it('does not count cancellation of one of multiple subscriptions as customer churn', () => {
    const a = sub('a'), b = sub('b', { customer: a.customer, status: 'canceled', ended_at: now - day });
    const event = { livemode: true, created: now - day, type: 'customer.subscription.updated', data: { object: b, previous_attributes: { status: 'active' } } };
    expect(brl(fixture([a, b], { events: [event] })).churnRate).toBe(0);
  });
  it('reports missing/ambiguous history and empty cohorts as unavailable', () => {
    expect(brl(fixture([sub('a')], { events: null })).churnRate).toBeNull();
    const s = sub('c', { status: 'canceled', ended_at: now - day });
    const event = { livemode: true, created: now - day, type: 'customer.subscription.deleted', data: { object: s } };
    expect(brl(fixture([s], { events: [event] })).churnRate).toBeNull();
    expect(brl(fixture([]))).toMatchObject({ mrr: 0, churnRate: null, ltv: null });
  });
  it('counts cancellations by actual end date, regardless of creation date', () => {
    const s = sub('old', { status: 'canceled', ended_at: now - day });
    expect(calculate(fixture([s])).canceledSubscriptions30d).toBe(1);
  });
  it('normalizes annual, quarterly, quantity and recurring discounts', () => {
    const s = sub('annual'); s.items.data[0].price.unit_amount = 55000; s.items.data[0].price.recurring.interval = 'year';
    expect(subscriptionMrr(s, now)).toBeCloseTo(550 / 12);
    s.discounts = [{ coupon: { duration: 'forever', percent_off: 20 } }];
    expect(subscriptionMrr(s, now)).toBeCloseTo(440 / 12);
    s.items.data[0].quantity = 2; s.items.data[0].price.recurring = { interval: 'month', interval_count: 3 };
    expect(subscriptionMrr(s, now)).toBeCloseTo(1100 * 0.8 / 3);
    s.discounts = [{ coupon: { duration: 'once', percent_off: 100 } }];
    expect(subscriptionMrr(s, now)).toBeCloseTo(1100 / 3);
  });
  it('applies fixed discounts and returns unavailable for unsupported pricing instead of fabricating totals', () => {
    const s = sub('a', { discounts: [{ coupon: { duration: 'forever', amount_off: 1000, currency: 'brl' } }] });
    expect(subscriptionMrr(s, now)).toBe(19.9);
    s.items.data[0].price.billing_scheme = 'tiered';
    expect(brl(fixture([s])).mrr).toBeNull();
  });
  it('keeps currencies separate, including the annual cash vs MRR distinction', () => {
    const a = sub('annual'); a.items.data[0].price.unit_amount = 55000; a.items.data[0].price.recurring.interval = 'year';
    const e = sub('e', { currency: 'eur' }); e.items.data[0].price.currency = 'eur';
    const data = fixture([a, e]); data.charges[0] = charge(a, { amount: 55000, amount_captured: 55000, balance_transaction: { created: now - day } });
    const report = calculate(data);
    expect(report.currencies.find(m => m.currency === 'brl')?.grossReceived30d).toBe(550);
    expect(report.currencies.find(m => m.currency === 'brl')?.mrr).toBeCloseTo(550 / 12);
    expect(report.currencies.find(m => m.currency === 'eur')?.mrr).toBe(29.9);
  });
  it('uses capture date and subtracts completed refunds of old charges on the refund date', () => {
    const s = sub('a'); const data = fixture([s]);
    data.charges[0] = charge(s, { created: now - day, balance_transaction: { created: now - 40 * day } });
    data.refunds = [{ id: 'r_1', charge: 'ch_a', status: 'succeeded', amount: 1000, currency: 'brl', created: now - day, balance_transaction: { created: now - day } },
      { id: 'r_2', charge: 'ch_a', status: 'pending', amount: 2000, currency: 'brl', created: now - day }];
    expect(brl(data)).toMatchObject({ grossReceived30d: 0, refunded30d: 10, netReceived30d: -10 });
  });
  it('excludes fully refunded current invoices from adimplente MRR', () => {
    const s = sub('a'); const data = fixture([s]); data.charges[0].amount_refunded = 2990;
    expect(brl(data).mrr).toBe(0);
  });
  it('reads every page and rejects silent truncation', async () => {
    const fetch = vi.fn().mockResolvedValueOnce({ data: Array.from({length:100}, (_,i)=>({id:String(i)})), has_more: true })
      .mockResolvedValueOnce({ data: [{id:'100'}], has_more:false });
    expect(await listAll(fetch)).toHaveLength(101); expect(fetch).toHaveBeenLastCalledWith('99');
    await expect(listAll(async()=>({data:[],has_more:true}))).rejects.toThrow('incomplete');
  });
  it('fails closed on collection errors/test keys; event failure only suppresses churn', async () => {
    const api = () => ({list: vi.fn().mockResolvedValue({data:[],has_more:false})});
    const stripe = { subscriptions:api(),invoices:api(),invoicePayments:api(),charges:api(),refunds:api(),events:api(),balance:{retrieve:vi.fn().mockResolvedValue({livemode:false})} };
    await expect(collectFinancialMetrics(stripe,now)).rejects.toThrow('stripe_test_mode');
    stripe.balance.retrieve.mockResolvedValue({livemode:true}); stripe.events.list.mockRejectedValue(new Error('timeout'));
    expect((await collectFinancialMetrics(stripe,now)).report.currencies[0].churnRate).toBeNull();
    stripe.charges.list.mockRejectedValue(new Error('timeout'));
    await expect(collectFinancialMetrics(stripe,now)).rejects.toThrow('timeout');
  });
});
