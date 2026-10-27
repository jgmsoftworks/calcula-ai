import { afterEach, describe, expect, it, vi } from 'vitest';
import { BUSINESS_REGIONS, formatMoney, formatPortuguesePhone, formatPortuguesePostcode, getBusinessRegion, initialBusinessCountry, setBusinessRegion } from '../business-region';
import { formatters, parsePtBrNumber, toSafeNumber } from '../formatters';
import { formatQuantityInput } from '../quantityInput';
import { getCompetenciaAnterior, getCurrentMonthRange } from '../cmvCalculations';
import { formatTimeBrasilia } from '../dateUtils';
import { parseAcquisition } from '../acquisition';
import { marketCurrency, validMarketPrice } from '../../../supabase/functions/_shared/marketRules';
import i18n from '@/i18n';
import { dueMonthClosure } from '../../../supabase/functions/_shared/monthClosure';

const spaces = (value: string) => value.replace(/[\u00a0\u202f]/g, ' ');
afterEach(async () => { setBusinessRegion('BR'); vi.useRealTimers(); await i18n.changeLanguage('pt-BR'); });
describe('Portugal accounts', () => {
  it('closes stock at local midnight in winter, summer and the year boundary', () => {
    expect(dueMonthClosure(new Date('2026-06-30T23:00:00Z'), 'PT')).toBe('2026-06');
    expect(dueMonthClosure(new Date('2026-06-30T23:00:00Z'), 'BR')).toBeNull();
    expect(dueMonthClosure(new Date('2026-07-01T03:00:00Z'), 'BR')).toBe('2026-06');
    expect(dueMonthClosure(new Date('2026-07-01T03:00:00Z'), 'PT')).toBeNull();
    expect(dueMonthClosure(new Date('2027-01-01T00:00:00Z'), 'PT')).toBe('2026-12');
    expect(dueMonthClosure(new Date('2026-10-27T00:00:00Z'), 'PT')).toBeNull();
  });
  it('formats EUR without converting the stored number and keeps BRL as the existing default', () => {
    expect(spaces(formatters.valor(12345.67))).toBe('R$ 12.345,67');
    setBusinessRegion('PT');
    expect(spaces(formatters.valor(12345.67))).toBe('12 345,67 €');
    expect(parsePtBrNumber(formatMoney(12345.67))).toBe(12345.67);
    expect(toSafeNumber('12 345,67 €')).toBe(12345.67);
    expect(toSafeNumber('R$ 12.345,67')).toBe(12345.67);
    expect(toSafeNumber('0.045')).toBe(0.045);
  });
  it('does not change currency when language changes', async () => {
    setBusinessRegion('BR'); await i18n.changeLanguage('pt-PT');
    expect(getBusinessRegion()).toEqual(BUSINESS_REGIONS.BR);
    expect(formatMoney(9.90)).toContain('R$');
    setBusinessRegion('PT'); await i18n.changeLanguage('en');
    expect(formatMoney(9.90)).toContain('€');
  });
  it('keeps country through OAuth acquisition and ignores unsupported countries', () => {
    const params = parseAcquisition('?source=landing&trial=1&country=PT&lang=pt-PT');
    expect(params.get('country')).toBe('PT'); expect(params.get('lang')).toBe('pt-PT');
    expect(initialBusinessCountry('?country=DE')).toBe('BR');
    expect(parseAcquisition('?country=DE&lang=script').has('country')).toBe(false);
  });
  it('formats Portuguese contact fields and preserves unfinished quantity input', () => {
    expect(formatPortuguesePhone('912345678')).toBe('+351 912 345 678');
    expect(formatPortuguesePhone('+351 912 345 678')).toBe('+351 912 345 678');
    expect(formatPortuguesePostcode('1000001')).toBe('1000-001');
    expect(formatQuantityInput('12345,', 6, ' ')).toEqual({ text: '12 345,', caret: 7 });
  });
  it('uses Lisbon month boundaries, including daylight saving, independently of the browser', () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-07-01T01:00:00Z'));
    setBusinessRegion('PT');
    expect(getCurrentMonthRange().start).toBe('2026-06-30T23:00:00.000Z');
    expect(getCompetenciaAnterior()).toBe('2026-06');
    expect(formatTimeBrasilia('2026-07-01T12:00:00Z')).toBe('13:00');
    setBusinessRegion('BR');
    expect(getCurrentMonthRange().start).toBe('2026-06-01T03:00:00.000Z');
    expect(getCompetenciaAnterior()).toBe('2026-05');
    expect(formatTimeBrasilia('2026-07-01T12:00:00Z')).toBe('09:00');
  });
  it('rejects mismatched Stripe currencies, amounts, inactive and non-recurring prices', () => {
    const price = { active: true, currency: 'eur', unit_amount: 500, recurring: { interval: 'month', interval_count: 1 } };
    expect(validMarketPrice(price, 'PT', 'monthly', 500)).toBe(true);
    expect(validMarketPrice(price, 'BR', 'monthly', 500)).toBe(false);
    expect(validMarketPrice(price, 'PT', 'yearly', 500)).toBe(false);
    expect(validMarketPrice({ ...price, active: false }, 'PT', 'monthly', 500)).toBe(false);
    expect(validMarketPrice({ ...price, recurring: null }, 'PT', 'monthly', 500)).toBe(false);
    expect(validMarketPrice(price, 'PT', 'monthly', 990)).toBe(false);
    expect(() => marketCurrency('DE')).toThrow();
  });
});
