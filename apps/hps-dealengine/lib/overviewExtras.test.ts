import { describe, expect, it } from 'vitest';
import type { Deal } from '../types';
import {
  getDealAnalysisView,
  getDealStructureView,
  getMarketTempView,
  getNegotiationContextView,
  getWholesaleFeeView,
} from './overviewExtras';

const baseDeal: Deal = {
  market: {
    arv: 300000,
    as_is_value: 200000,
    price_to_list_ratio: 0,
    local_discount_pct: 0,
    dom: 0,
    months_of_inventory: 0,
  },
  costs: {
    double_close: {},
  },
  debt: {
    senior_principal: 0,
  },
  policy: {
    min_spread: 15000,
  } as any,
} as Deal;

const baseCalc = {
  buyerCeiling: 240000,
  respectFloorPrice: 200000,
  dealSpread: 40000,
  urgencyDays: 45,
  urgencyBand: 'High',
  listingAllowed: true,
  displayMargin: 0.14,
  displayCont: 0.05,
  carryMonths: 4,
  maoFinal: 220000,
  instantCashOffer: 210000,
  totalRepairs: 25000,
  carryCosts: 8000,
  resaleCosts: 12000,
  projectedPayoffClose: 180000,
  tenantBuffer: 3000,
  timeline_summary: {
    speed_band: 'balanced',
    days_to_money: 60,
    urgency: 'normal',
  },
  risk_summary: {
    overall: 'pass',
  },
  evidence_summary: {
    status: 'ready',
  },
} as any;

describe('overviewExtras presenters', () => {
  it('computes wholesale fee view from existing calc fields', () => {
    const view = getWholesaleFeeView(baseCalc, baseDeal);
    expect(view.wholesaleFee).toBeCloseTo(40000);
    expect(view.buyerCeiling).toBe(240000);
    expect(view.respectFloor).toBe(200000);
    expect(view.wholesaleFeeWithDc).toBeCloseTo(view.wholesaleFee - view.dcLoad);
  });

  it('maps deal analysis view with health and key metrics', () => {
    const view = getDealAnalysisView(baseCalc, baseDeal);
    expect(view.healthLabel).toBe('Pass');
    expect(view.buyerMarginPct).toBeCloseTo(0.14);
    expect(view.contingencyPct).toBeCloseTo(0.05);
    expect(view.totalRepairs).toBe(25000);
    expect(view.projectedPayoff).toBe(180000);
  });

  it('builds market temp view with score and label', () => {
    const view = getMarketTempView(baseCalc);
    expect(view.speedBand).toBe('balanced');
    expect(view.label).toBeDefined();
    expect(view.score).toBeGreaterThan(0);
  });

  it('builds deal structure view from calc and deal', () => {
    const view = getDealStructureView(baseCalc, baseDeal);
    expect(view.respectFloor).toBe(200000);
    expect(view.arv).toBe(300000);
    expect(view.aiv).toBe(200000);
    expect(view.buyerCeiling).toBe(240000);
  });

  it('builds negotiation context view with spread status', () => {
    const view = getNegotiationContextView(baseCalc, baseDeal);
    expect(view.spreadStatus).toBe('wide');
    expect(view.respectFloor).toBe(200000);
    expect(view.buyerCeiling).toBe(240000);
    expect(view.riskOverall).toBe('pass');
  });
});
