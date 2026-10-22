import { afterEach, expect, it } from 'vitest';
import { acquisitionContext, acquisitionDestination, rememberAcquisition } from './acquisition';
afterEach(() => sessionStorage.clear());
it('free signup and trial CTA bypass checkout while preserving campaign attribution', () => {
  const query = '?mode=signup&source=landing&trial=1&plan=lite&utm_campaign=criativo-a';
  rememberAcquisition(query);
  expect(acquisitionDestination(query)).toBe('/');
  expect(acquisitionDestination()).toBe('/');
  expect(acquisitionContext().get('utm_campaign')).toBe('criativo-a');
});
it('trial CTA overrides an older pending paid checkout', () => {
  rememberAcquisition('?source=landing&plan=professional');
  expect(acquisitionDestination('?trial=1')).toBe('/');
  expect(acquisitionDestination('?mode=signup')).toBe('/');
});
it('explicit paid checkout entry remains available', () => {
  expect(acquisitionDestination('?source=landing&plan=lite')).toContain('/checkout?');
});
