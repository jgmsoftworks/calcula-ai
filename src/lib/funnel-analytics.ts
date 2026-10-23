import { getStoredConsent } from '@/lib/consent';
import { acquisitionContext } from '@/lib/acquisition';
export function trackFunnel(event: string, payload: Record<string, string | number> = {}) {
  if (typeof window === 'undefined' || !getStoredConsent()?.analytics) return false;
  const w = window as Window & { gtag?: (...args: unknown[]) => void };
  if (!w.gtag) return false;
  try {
    w.gtag('event', event, { ...Object.fromEntries(acquisitionContext()), ...payload, transport_type: 'beacon' });
    return true;
  } catch { return false; } // Metrics must never break a user action.
}
// Only called after the existing server function has verified payment_status=paid.
export function trackVerifiedPurchase(sessionId: string) {
  const key = `calculaai_purchase_${sessionId}`;
  try { if (sessionStorage.getItem(key)) return; } catch { /* optional storage */ }
  if (trackFunnel('purchase', { transaction_id: sessionId })) {
    try { sessionStorage.setItem(key, '1'); } catch { /* optional storage */ }
  }
}

// Called only after a complete recipe save, never on opening the form.
// Sequence 1 identifies the initial recipe; local dedupe also covers delete/recreate.
export function trackRecipeCreated(accountId: string, sequence: number) {
  trackFunnel('recipe_created');
  if (sequence !== 1) return;
  const key = `calculaai_first_recipe_${accountId}`;
  try { if (localStorage.getItem(key)) return; } catch { /* optional storage */ }
  if (trackFunnel('first_recipe_created')) {
    try { localStorage.setItem(key, '1'); } catch { /* optional storage */ }
  }
}
