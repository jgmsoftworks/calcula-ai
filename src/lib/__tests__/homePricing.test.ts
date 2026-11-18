import { describe, expect, it } from 'vitest';
import { markupIndirectPercent } from '../markupMath';
import { assessMargins } from '../homePricing';

const credit = { id: 'credit', name: 'Crédito', target: 25, indirect: 12, fixed: 1.5 };
const pix = { id: 'pix', name: 'Pix', target: 25, indirect: 0, fixed: 0 };
const recipe = { id: 'cake', name: 'Bolo', image: null, markupId: credit.id, unitCost: 5, price: 10 };

describe('home recipe margins', () => {
  it('uses each saved markup, fixed and percentage fees, and rounds the target price up to a cent', () => {
    const result = assessMargins([recipe, { ...recipe, id: 'second', markupId: pix.id }], [credit, pix], null);
    expect(result.assessed).toBe(2);
    expect(result.alerts).toHaveLength(1);
    expect(result.alerts[0]).toMatchObject({ id: 'cake', targetPrice: 10.32 });
    expect(result.alerts[0].net).toBeCloseTo(2.3);
    expect(result.alerts[0].margin).toBeCloseTo(23);
    expect(result.average).toBeCloseTo(36.5);
    expect(assessMargins([{ ...recipe, price: 10.32 }], [credit], null).alerts).toHaveLength(0);
    expect(assessMargins([{ ...recipe, price: 10.31 }], [credit], null).alerts).toHaveLength(1);
    expect(assessMargins([recipe], [credit, pix], pix.id).alerts).toHaveLength(0);
  });

  it('sorts negative margins first by shortfall and excludes unpriced or unconfigured sheets from the average', () => {
    const result = assessMargins([recipe, { ...recipe, id: 'loss', price: 2 },
      { ...recipe, price: 0 }, { ...recipe, unitCost: 0 }, { ...recipe, markupId: null }], [credit], null);
    expect(result.alerts.map(r => r.id)).toEqual(['loss', 'cake']);
    expect(result.skipped).toBe(3);
    expect(assessMargins([recipe], [{ ...credit, target: 88 }], null).average).toBeNull();
  });

  it('uses saved aggregate charges for legacy markups and never adds them again to detailed charges', () => {
    const markup = { gasto_sobre_faturamento: 10, encargos_sobre_venda: 4 };
    expect(markupIndirectPercent(markup, null)).toBe(14);
    expect(markupIndirectPercent(markup, { taxas: 3, impostos: 2, lucroDesejado: 25 })).toBe(5);
  });

  it('keeps missing yields and uncertain preparation prices out of every simulation without suppressing legitimate negative margins', () => {
    const rows = [{ ...recipe, unitCost: null }, { ...recipe, priceIssue: 'sale' as const }, { ...recipe, priceIssue: 'composition' as const },
      { ...recipe, id: 'valid-loss', price: 1, unitCost: 75 }];
    for (const channel of [null, pix.id]) {
      const result = assessMargins(rows, [credit, pix], channel);
      expect(result).toMatchObject({ assessed: 1, missingYield: 1, unconfirmedSale: 1, unconfirmedComposition: 1, skipped: 3 });
      expect(result.alerts.map(r => r.id)).toEqual(['valid-loss']);
      expect(result.average).toBeLessThan(-100);
    }
  });

  it('accepts exact equality and can simulate a sheet with no saved markup', () => {
    const exact = { ...recipe, unitCost: 7.5, markupId: null };
    const result = assessMargins([exact], [pix], pix.id);
    expect(result.average).toBe(25);
    expect(result.alerts).toEqual([]);
  });
});
