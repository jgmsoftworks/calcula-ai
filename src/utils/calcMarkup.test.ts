import test from 'node:test';
import assert from 'node:assert/strict';
import { calcMarkup } from './calcMarkup';

test('calculates total percent and multiplier', () => {
  const res = calcMarkup({
    percentFees: 0.1,
    percentTaxes: 0.2,
    percentPayment: 0.05,
    percentCommissions: 0.05,
    percentOthers: 0,
    desiredProfit: 0.1,
  });
  assert.ok(Math.abs(res.totalPercent - 0.5) < 1e-6);
  assert.ok(Math.abs(res.multiplier - 2) < 1e-6);
});

test('includes fixed value when average ticket provided', () => {
  const res = calcMarkup({
    percentFees: 0,
    percentTaxes: 0,
    percentPayment: 0,
    percentCommissions: 0,
    percentOthers: 0,
    desiredProfit: 0,
    fixedValue: 100,
    averageTicket: 200,
  });
  assert.ok(Math.abs(res.effectiveMultiplier - 1.5) < 1e-6);
});

test('handles zero percentages', () => {
  const res = calcMarkup({
    percentFees: 0,
    percentTaxes: 0,
    percentPayment: 0,
    percentCommissions: 0,
    percentOthers: 0,
    desiredProfit: 0,
  });
  assert.equal(res.multiplier, 1);
});
