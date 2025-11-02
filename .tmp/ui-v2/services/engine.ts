import React from 'react';
import type {
  DealWrapper,
  EngineResult,
  EngineCalculations,
  SandboxSettings,
  Deal,
} from '../types';
import { num } from '../utils/helpers';

const getEmptyCalcs = (): EngineCalculations => ({
  instantCashOffer: NaN,
  projectedPayoffClose: NaN,
  netToSeller: NaN,
  respectFloorPrice: NaN,
  buyerCeiling: NaN,
  dealSpread: NaN,
  urgencyBand: '—',
  urgencyDays: 0,
  listingAllowed: true,
  tenantBuffer: 0,
  displayMargin: 0,
  displayCont: 0,
  carryMonths: 0,
  maoFinal: NaN,
  totalRepairs: 0,
  carryCosts: 0,
  resaleCosts: 0,
  repairs_with_contingency: 0,
  resale_costs_total: 0,
  commissionPct: 0,
  capAIV: NaN,
  sellerNetRetail: NaN,
  marketTemp: 72,
});

export const HPSEngine = (() => {
  const runEngine = (dealWrapper: DealWrapper, sandbox: SandboxSettings): EngineResult => {
    const { deal } = dealWrapper;
    const calculations = getEmptyCalcs();
    const flags: any = {};
    const missingInfo: string[] = [];

    const hasCoreInput =
      String(deal.market.arv).trim() !== '' ||
      String(deal.market.as_is_value).trim() !== '' ||
      String(deal.debt.senior_principal).trim() !== '';

    // Validation
    const arv = num(deal.market.arv);
    const aiv = num(deal.market.as_is_value);
    const senior_principal = num(deal.debt.senior_principal);

    if (hasCoreInput) {
      if (arv === 0) missingInfo.push('ARV');
      if (senior_principal === 0) missingInfo.push('Senior Principal');
      if (aiv === 0) missingInfo.push('As-Is Value');
    }

    // --- CORE CALCULATIONS ---
    const repairs_base = num(deal.costs.repairs_base);
    const contingencyBands: any[] = sandbox.repairsContingencyPercentageByClass || [];
    const contingencyPct =
      (contingencyBands.find((b) => b.repairClass === 'Medium')?.contingency || 15) / 100;
    calculations.repairs_with_contingency = repairs_base * (1 + contingencyPct);
    calculations.totalRepairs = calculations.repairs_with_contingency;
    calculations.displayCont = contingencyPct;

    const dom_zip = num(deal.market.dom_zip);
    // Formula: (({DOM_zip} * 1.5) + 30) / 30
    const calculatedCarryMonths = (dom_zip * 1.5 + 30) / 30;
    calculations.carryMonths = Math.min(calculatedCarryMonths, sandbox.carryMonthsMaximumCap || 12);

    const monthlyTaxes = deal.policy.costs_are_annual
      ? num(deal.costs.monthly.taxes) / 12
      : num(deal.costs.monthly.taxes);
    const monthlyInsurance = deal.policy.costs_are_annual
      ? num(deal.costs.monthly.insurance) / 12
      : num(deal.costs.monthly.insurance);
    const monthlyCarryTotal =
      monthlyTaxes +
      monthlyInsurance +
      num(deal.costs.monthly.hoa) +
      num(deal.costs.monthly.utilities) +
      num(deal.costs.monthly.interest);
    calculations.carryCosts = monthlyCarryTotal * calculations.carryMonths;

    const commissionItems: any[] = sandbox.listingCostModelSellerCostLineItems || [];
    const commissionPct =
      deal.costs.list_commission_pct ??
      commissionItems.find((i) => i.item === 'Commissions')?.defaultPct / 100 ??
      0.06;
    const concessionsPct =
      deal.costs.concessions_pct ??
      commissionItems.find((i) => i.item === 'Seller Concessions')?.defaultPct / 100 ??
      0.02;
    const sellClosePct =
      deal.costs.sell_close_pct ??
      commissionItems.find((i) => i.item === 'Title & Stamps')?.defaultPct / 100 ??
      0.015;
    calculations.commissionPct = commissionPct;
    calculations.resaleCosts = arv * (commissionPct + concessionsPct + sellClosePct);
    calculations.resale_costs_total = calculations.resaleCosts;

    const margin = (sandbox.buyerTargetMarginFlipBaselinePolicy || 15) / 100;
    calculations.displayMargin = margin;
    calculations.buyerCeiling =
      arv * (1 - margin) -
      calculations.repairs_with_contingency -
      (calculations.carryCosts + calculations.resaleCosts);

    const daysToClose = num(deal.policy.planned_close_days);
    calculations.projectedPayoffClose =
      senior_principal + num(deal.debt.senior_per_diem) * daysToClose;

    const investorDiscount = (sandbox.floorInvestorAivDiscountTypicalZip || 15) / 100;
    const investorFloor = aiv * (1 - investorDiscount);
    const payoffFloor =
      calculations.projectedPayoffClose +
      num(deal.title.cure_cost) +
      num(sandbox.floorPayoffMoveOutCashDefault);
    calculations.respectFloorPrice = Math.max(investorFloor, payoffFloor);

    calculations.instantCashOffer =
      calculations.respectFloorPrice +
      (calculations.buyerCeiling - calculations.respectFloorPrice) *
        (sandbox.initialOfferSpreadMultiplier || 0.5);

    calculations.dealSpread =
      arv -
      calculations.resaleCosts -
      calculations.carryCosts -
      calculations.repairs_with_contingency -
      calculations.instantCashOffer;

    calculations.netToSeller =
      calculations.instantCashOffer - calculations.projectedPayoffClose - num(deal.title.cure_cost);

    const auctionDate = new Date(deal.timeline.auction_date);
    const today = new Date();
    calculations.urgencyDays = Math.max(
      0,
      Math.ceil((auctionDate.getTime() - today.getTime()) / (1000 * 3600 * 24))
    );
    const urgencyBands: any[] = sandbox.dispositionRecommendationLogicDtmThresholds || [];
    const urgencyBand = urgencyBands.find((b) => calculations.urgencyDays <= b.maxDtm) || {
      label: 'Low',
    };
    calculations.urgencyBand = urgencyBand.label;

    return {
      calculations,
      flags,
      state: 'ReadyForOffer',
      missingInfo,
    };
  };

  const useDealEngine = (deal: DealWrapper, sandbox: SandboxSettings) =>
    React.useMemo(() => runEngine(deal, sandbox), [deal, sandbox]);
  return { runEngine, useDealEngine };
})();

/* VISUAL-ONLY STUB */
export const DoubleClose = (() => {
  const MOCK_DC_CALCS = {
    // Use benign placeholders consistent with empty state
    Deed_Stamps_AB: 0,
    Deed_Stamps_BC: 0,
    Title_AB: 0,
    Title_BC: 0,
    Other_AB: 0,
    Other_BC: 0,
    TF_Points_$: 0,
    DocStamps_Note: 0,
    Intangible_Tax: 0,
    Extra_Closing_Load: 0,
    Gross_Spread: NaN,
    Net_Spread_Before_Carry: NaN,
    Net_Spread_After_Carry: NaN,
    Carry_Daily: 0,
    Carry_Total: 0,
    Fee_Target_Threshold: 0,
    Fee_Target_Check: '—',
    Seasoning_Flag: 'OK',
    notes: ['County: Orange (deed rate 0.007)', 'Calculations stubbed for visual preview.'],
  };

  const computeDoubleClose = (dc: any, deal: any) => {
    /* VISUAL-ONLY STUB */
    return MOCK_DC_CALCS;
  };

  const autofill = (dc: any, deal: DealWrapper, calc: any) => {
    /* VISUAL-ONLY STUB - Autofill only non-calculated fields */
    const d = JSON.parse(JSON.stringify(dc || {}));
    if (!d.county) d.county = deal?.deal?.property?.county || 'Orange';
    if (!d.carry_basis) d.carry_basis = 'day';
    if (d.using_tf && !isFinite(num(d.tf_points_rate))) d.tf_points_rate = 0.02;

    if (!('pab' in d)) d.pab = NaN;
    if (!('pbc' in d)) d.pbc = NaN;
    if (d.using_tf && !('tf_principal' in d)) d.tf_principal = NaN;

    if (!('title_ab' in d)) d.title_ab = 0;
    if (!('title_bc' in d)) d.title_bc = 0;
    if (!('other_ab' in d)) d.other_ab = 0;
    if (!('other_bc' in d)) d.other_bc = 0;

    return d;
  };

  return { computeDoubleClose, autofill };
})();
