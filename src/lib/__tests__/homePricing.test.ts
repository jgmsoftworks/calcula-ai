import { describe, expect, it } from 'vitest';
import { markupIndirectPercent, meanSheetPercent, netProfitAtPrice, sheetCmvPercent } from '../markupMath';
import { assessMargins } from '../homePricing';

const credit = { id: 'credit', name: 'Crédito', target: 25, indirect: 12, fixed: 1.5 };
const pix = { id: 'pix', name: 'Pix', target: 25, indirect: 0, fixed: 0 };
const recipe = { id: 'cake', name: 'Bolo', image: null, markupType: 'normal', markupId: credit.id, unitCost: 5, price: 10 };

describe('home recipe margins', () => {
  it('averages the percentage shown on each sheet once, including negative and zero values', () => {
    const cmvs = Array.from({ length: 100 }, () => sheetCmvPercent(3, 10));
    expect(meanSheetPercent(cmvs)).toEqual({ count: 100, average: 30 });
    const margins = [13, 7, 10].map(cost => netProfitAtPrice(10, cost, 0, 0).displayedMargin);
    expect(margins).toEqual([-30, 30, 0]);
    expect(meanSheetPercent([...margins, null])).toEqual({ count: 3, average: 0 });
    expect(meanSheetPercent([sheetCmvPercent(0, 10), sheetCmvPercent(1, 0)])).toEqual({ count: 1, average: 0 });
    expect(meanSheetPercent([null])).toEqual({ count: 0, average: null });
  });

  it('uses each saved markup, fixed and percentage fees, and rounds the target price up to a cent', () => {
    const result = assessMargins([recipe, { ...recipe, id: 'second', markupId: pix.id }], [credit, pix], null);
    expect(result.assessed).toBe(2);
    expect(result.alerts).toHaveLength(1);
    expect(result.alerts[0]).toMatchObject({ id: 'cake', targetPrice: 10.32 });
    expect(result.alerts[0].net).toBeCloseTo(2.3);
    expect(result.alerts[0].margin).toBeCloseTo(23);
    expect(assessMargins([{ ...recipe, price: 10.32 }], [credit], null).alerts).toHaveLength(0);
    expect(assessMargins([{ ...recipe, price: 10.31 }], [credit], null).alerts).toHaveLength(1);
    expect(assessMargins([recipe], [credit, pix], pix.id).alerts).toHaveLength(0);
  });

  it('sorts negative margins first by shortfall and excludes unpriced or unconfigured sheets from price alerts', () => {
    const result = assessMargins([recipe, { ...recipe, id: 'loss', price: 2 },
      { ...recipe, price: 0 }, { ...recipe, unitCost: 0 }, { ...recipe, markupId: null }], [credit], null);
    expect(result.alerts.map(r => r.id)).toEqual(['loss', 'cake']);
    expect(result.assessed).toBe(2);
    expect(assessMargins([recipe], [{ ...credit, target: 88 }], null).alerts).toHaveLength(0);
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
      expect(result).toMatchObject({ total: 4, assessed: 1 });
      expect(result.alerts.map(r => r.id)).toEqual(['valid-loss']);
      expect(result.alerts[0].margin).toBeLessThan(-100);
    }
  });

  it('accepts exact equality and never grants a sale markup to an unclassified sheet in simulation', () => {
    const exact = { ...recipe, unitCost: 7.5 };
    const preparation = { ...recipe, price: 1, markupType: 'sub_receita', markupId: 'prep' };
    const unclassified = { ...recipe, price: 1, markupType: null, markupId: null };
    for (const selected of [null, credit.id, pix.id]) {
      const control = assessMargins([exact], [credit, pix], selected);
      const result = assessMargins([exact, preparation, unclassified], [credit, pix], selected);
      expect(result).toEqual(control);
      expect(result.total).toBe(1);
    }
    expect(assessMargins([exact], [credit, pix], pix.id)).toMatchObject({ assessed: 1, alerts: [] });
  });
});
