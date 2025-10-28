import { describe, it, expect } from 'vitest';
import { doubleClose } from '../src/double_close';

describe('engine: doubleClose math', () => {
  it('computes net correctly for a basic case', () => {
    const out = doubleClose({
      sellerPrice: 200000,
      buyerPrice: 230000,
      aToBCloseCosts: 4500,
      bToCCloseCosts: 5200,
      holdingDays: 21,
      carryPerDay: 45,
    });

    expect(out.ok).toBe(true);
    expect(out.gross_spread).toBe(30000);

    // 21 * 45 = 945; 4500 + 5200 + 945 = 10645
    expect(out.costs_total).toBe(10645);

    // 30000 - 10645 = 19355
    expect(out.net_profit_b).toBe(19355);
  });
});
