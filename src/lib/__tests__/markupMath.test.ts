import { describe, expect, it } from 'vitest';
import {
  calculateMarkupMultiplier,
  isValidMarkupPercentageTotal,
  maxAllowedProfitPercentage,
  sumMarkupPercentages,
} from '../markupMath';

describe('markupMath', () => {
  it('permite totais abaixo de 100%', () => {
    const total = sumMarkupPercentages(20, 10, 5, 5, 30);
    expect(total).toBe(70);
    expect(isValidMarkupPercentageTotal(total)).toBe(true);
    expect(calculateMarkupMultiplier(total)).toBeCloseTo(3.3333333333);
  });

  it('permite 99,99% mas nunca 100%', () => {
    expect(isValidMarkupPercentageTotal(99.99)).toBe(true);
    expect(calculateMarkupMultiplier(99.99)).toBeCloseTo(10000);
  });

  it('bloqueia total igual a 100%', () => {
    expect(isValidMarkupPercentageTotal(100)).toBe(false);
    expect(calculateMarkupMultiplier(100)).toBeNull();
  });

  it('bloqueia total acima de 100%', () => {
    expect(isValidMarkupPercentageTotal(104.07)).toBe(false);
    expect(calculateMarkupMultiplier(104.07)).toBeNull();
  });

  it('calcula o lucro máximo mantendo o total abaixo de 100%', () => {
    expect(maxAllowedProfitPercentage(94.07)).toBe(5.92);
    expect(maxAllowedProfitPercentage(30)).toBe(69.99);
    expect(maxAllowedProfitPercentage(100)).toBe(0);
  });
});
