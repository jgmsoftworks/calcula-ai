import { beforeEach, expect, it, vi } from 'vitest';
import { persistConsent, DEFAULT_DENY } from './consent';
import { trackFunnel, trackRecipeCreated, trackVerifiedPurchase } from './funnel-analytics';
const gtag = vi.fn();
beforeEach(() => {
  localStorage.clear(); sessionStorage.clear(); gtag.mockReset();
  Object.assign(window, { gtag });
});
it('does not send metrics or save metric identifiers without consent', () => {
  trackRecipeCreated('account-a', 1);
  trackVerifiedPurchase('session-a');
  expect(gtag).not.toHaveBeenCalled();
  expect(localStorage.length).toBe(0);
  expect(sessionStorage.length).toBe(0);
});
it('counts first recipe once per account and does not mistake later recipes for activation', () => {
  persistConsent({ ...DEFAULT_DENY, analytics: true });
  trackRecipeCreated('account-a', 2);
  trackRecipeCreated('account-a', 1);
  trackRecipeCreated('account-a', 1);
  trackRecipeCreated('account-b', 1);
  expect(gtag.mock.calls.filter(c => c[1] === 'first_recipe_created')).toHaveLength(2);
  expect(JSON.stringify(gtag.mock.calls)).not.toContain('account-a');
});
it('analytics failure cannot interrupt saving or checkout', () => {
  persistConsent({ ...DEFAULT_DENY, analytics: true });
  gtag.mockImplementation(() => { throw new Error('blocked analytics'); });
  expect(trackFunnel('plan_selected')).toBe(false);
  expect(() => trackRecipeCreated('account-a', 1)).not.toThrow();
  expect(localStorage.getItem('calculaai_first_recipe_account-a')).toBeNull();
});
it('deduplicates verified payment events', () => {
  persistConsent({ ...DEFAULT_DENY, analytics: true });
  trackVerifiedPurchase('session-a'); trackVerifiedPurchase('session-a');
  expect(gtag.mock.calls.filter(c => c[1] === 'purchase')).toHaveLength(1);
});
