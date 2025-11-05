import { describe, it, expect } from 'vitest';
import { doubleClose } from '@hps-internal/engine';

describe('doubleClose simple math', () => {
  it('computes spread, costs, carrying, and net', () => {
    const input = {
      sellerPrice: 200000,
      buyerPrice: 230000,
      aToBCloseCosts: 4500,
      bToCCloseCosts: 5500,
      holdingDays: 21,
      carryPerDay: 38,
    };
    const res = doubleClose(input);
    expect(res.gross_spread).toBeCloseTo(30000, 2);
    expect(res.carrying_costs).toBeCloseTo(798, 2); // 21 * 38
    expect(res.costs_total).toBeCloseTo(4500 + 5500 + 798, 2);
    expect(res.net_profit_b).toBeCloseTo(30000 - (4500 + 5500 + 798), 2);
  });
});
