import { getStoredConsent } from '@/lib/consent';
import { acquisitionContext } from '@/lib/acquisition';
export function trackFunnel(event: string, payload: Record<string, string | number> = {}) {
  if (typeof window === 'undefined' || !getStoredConsent()?.analytics) return false;
  const w = window as Window & { gtag?: (...args: unknown[]) => void };
  if (!w.gtag) return false;
  w.gtag('event', event, { ...Object.fromEntries(acquisitionContext()), ...payload, transport_type: 'beacon' });
  return true;
}
// Only called after the existing server function has verified payment_status=paid.
export function trackVerifiedPurchase(sessionId: string) {
  const key = `calculaai_purchase_${sessionId}`;
  try { if (sessionStorage.getItem(key)) return; } catch { /* optional storage */ }
  if (trackFunnel('purchase', { transaction_id: sessionId })) {
    try { sessionStorage.setItem(key, '1'); } catch { /* optional storage */ }
  }
}
