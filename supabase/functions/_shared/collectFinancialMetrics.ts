import { calculateFinancialMetrics, listAll, type StripeRecord } from './financialMetrics.ts';

// Structural API boundary allows tests without network or credentials.
interface ListApi { list: (params: Record<string, unknown>) => PromiseLike<{ data: StripeRecord[]; has_more: boolean }> }
export async function collectFinancialMetrics(stripe: {
  subscriptions: ListApi; invoices: ListApi; invoicePayments: ListApi; charges: ListApi; refunds: ListApi; events: ListApi;
  balance: { retrieve: () => PromiseLike<StripeRecord> };
}, now: number) {
  const all = (api: ListApi, params = {}) => listAll<StripeRecord & { id: string }>(
    async cursor => {
      const page = await api.list({ ...params, limit: 100, ...(cursor ? { starting_after: cursor } : {}) });
      if (page.data.some(row => typeof row.id !== 'string')) throw new Error('stripe_object_id_missing');
      return { ...page, data: page.data as Array<StripeRecord & { id: string }> };
    },
  );
  const [subscriptions, invoices, invoicePayments, charges, refunds, events, balance] = await Promise.all([
    all(stripe.subscriptions, { status: 'all', expand: ['data.discounts', 'data.items.data.discounts'] }),
    all(stripe.invoices, { status: 'paid' }),
    all(stripe.invoicePayments, { status: 'paid' }),
    all(stripe.charges, { expand: ['data.balance_transaction'] }),
    all(stripe.refunds, { expand: ['data.balance_transaction'] }),
    all(stripe.events, { types: ['customer.subscription.created', 'customer.subscription.updated', 'customer.subscription.deleted',
      'customer.subscription.paused', 'customer.subscription.resumed'], created: { gte: now - 30 * 86400, lte: now } }).catch(() => null),
    stripe.balance.retrieve(),
  ]);
  if (balance.livemode !== true) throw new Error('stripe_test_mode');
  return { report: calculateFinancialMetrics({ subscriptions, invoices, invoicePayments, charges, refunds, events, now }), balance, charges };
}
