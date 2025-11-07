import { describe, it, expect } from 'vitest';
import { aivSafetyCap } from '../src/slices/aiv';
import { carryMonthsFromDom } from '../src/slices/carry';

describe('AIV safety cap', () => {
  it('caps AIV by percentage', () => {
    expect(aivSafetyCap(300_000, 0.96)).toBe(288_000);
  });
  it('nulls on bad inputs', () => {
    expect(aivSafetyCap(null as any, 0.96)).toBeNull();
    expect(aivSafetyCap(300_000, null as any)).toBeNull();
  });
});

describe('DOM → carry months', () => {
  it('applies cap', () => {
    // (200 + 35) / 30 = 7.8333..., cap 4 -> 4
    expect(carryMonthsFromDom(200, 4)).toBe(4);
  });
  it('no cap uses formula', () => {
    expect(carryMonthsFromDom(25, undefined)).toBeCloseTo((25 + 35) / 30, 4);
  });
  it('nulls on bad inputs', () => {
    expect(carryMonthsFromDom(null as any, 4)).toBeNull();
  });
});
