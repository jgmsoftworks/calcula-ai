export const APP_URL = 'https://calculaaibr.com';
export type CheckoutState = 'pending' | 'approved' | 'trial' | 'failed';
export function checkoutState(session: { status: string | null; payment_status: string }, subscription: { status: string; trial_end?: number | null } | null, now = Date.now()): CheckoutState {
  if (session.status === 'expired') return 'failed';
  if (session.status !== 'complete') return 'pending';
  if (subscription?.status === 'trialing' && session.payment_status === 'no_payment_required' && (subscription.trial_end ?? 0) * 1000 > now) return 'trial';
  if (session.payment_status === 'paid' && subscription?.status === 'active') return 'approved';
  if (subscription && ['canceled', 'unpaid', 'incomplete_expired', 'paused'].includes(subscription.status)) return 'failed';
  return 'pending';
}
export function subscriptionEnd(subscription: { items: { data: { current_period_end?: number }[] }; trial_end?: number | null; status: string }) {
  const ends = subscription.items.data.map(item => item.current_period_end).filter((n): n is number => Number.isFinite(n));
  const end = subscription.status === 'trialing' ? subscription.trial_end : ends.length ? Math.min(...ends) : null;
  if (!end) throw new Error('subscription_period_missing');
  return new Date(end * 1000).toISOString();
}
export function normalizedEmail(email: string) { return email.trim().toLowerCase(); }
export function maskedEmail(email: string) {
  const [local, domain] = email.split('@');
  return `${local.slice(0, 2)}***@${domain}`;
}
export function objectId(value: string | { id: string } | null | undefined) {
  return typeof value === 'string' ? value : value?.id ?? null;
}
export function invoiceSubscription(invoice: { parent?: { subscription_details?: { subscription?: string | { id: string } | null } | null } | null; subscription?: string | { id: string } | null }) {
  return objectId(invoice.parent?.subscription_details?.subscription ?? invoice.subscription);
}
