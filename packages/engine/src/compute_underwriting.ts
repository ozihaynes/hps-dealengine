/**
 * Deterministic underwriting core (MVP).
 * - Resolves AIV cap and fee rates from an already-token-resolved policy.
 * - Adds Carry Months (DOM→months with cap) using tokens.
 * - Returns caps + fee rates + fee preview + carry, with round-to-cents math.
 * - Adds a provenance trace and infoNeeded for any missing policy inputs.
 */

type Json = any;

type InfoNeeded = {
  path: string;
  token?: string | null;
  reason: string;
  source_of_truth?: 'investor_set' | 'team_policy_set' | 'external_feed' | 'unknown';
};

type TraceEntry = {
  rule: string;
  used: string[];
  details?: Record<string, unknown>;
};

type SpeedBand = 'fast' | 'balanced' | 'slow' | null;

type FloorComponents = {
  aiv: number | null;
  payoffClose: number | null;
  investorDiscountPctP20?: number | null;
  investorDiscountPctTypical?: number | null;
  retainedEquityPct?: number | null;
  moveOutCashDefault?: number | null;
};

type CashGateStatus = 'pass' | 'shortfall' | 'unknown';

type UnderwritingPolicy = {
  aiv_cap_pct: number;
  allow_aiv_cap_99_insurable?: boolean;
  aiv_safety_cap?: {
    default_pct: number | null;
    override_pct: number | null;
    override_rules?: {
      min_role?: string | null;
      require_bindable_insurance?: boolean;
      require_clear_title?: boolean;
      require_fast_zip?: boolean;
      require_logged_reason?: boolean;
    };
  };
  min_spread_by_arv_band: Array<{
    min_arv: number;
    max_arv: number | null;
    min_spread_dollars: number;
    min_spread_pct_of_arv?: number;
  }>;
  cash_gate_min: number;
  borderline_band_width: number;
  hold_costs?: {
    flip?: {
      fast?: { monthly_pct_of_arv?: number | null };
      neutral?: { monthly_pct_of_arv?: number | null };
      slow?: { monthly_pct_of_arv?: number | null };
    };
    wholetail?: {
      fast?: { monthly_pct_of_arv?: number | null };
      neutral?: { monthly_pct_of_arv?: number | null };
      slow?: { monthly_pct_of_arv?: number | null };
    };
    wholesale_monthly_pct_of_arv_default?: number | null;
    default_monthly_bills?: {
      tax?: number | null;
      insurance?: number | null;
      hoa?: number | null;
      utilities?: number | null;
    };
  };
  buyer_target_margin_wholesale_pct: number;
  buyer_costs: {
    list_commission_pct: number;
    concessions_pct: number;
    sell_close_pct: number;
  };
  hold_cost_per_month?: number; // TODO(policy): wire hold cost per month by speed/track from SoTruth.
  investor_discount_p20_zip_pct: number;
  investor_discount_typical_zip_pct: number;
  retained_equity_pct: number;
  move_out_cash_default: number;
  move_out_cash_min?: number;
  move_out_cash_max?: number;
};

function minNonNull(values: Array<number | null | undefined>): number | null {
  const filtered = values.filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  if (filtered.length === 0) return null;
  return Math.min(...filtered);
}

function buildUnderwritingPolicy(input: any, infoNeeded: InfoNeeded[]): UnderwritingPolicy {
  const policy = input?.policy ?? {};

  const normalizeCapPct = (n: number | null): number | null => {
    if (n == null) return null;
    if (n > 1) {
      // Treat as a percent reduction (e.g., 3 => 0.97 cap)
      const pct = n / 100;
      return 1 - pct;
    }
    return n;
  };

  const aivCapPctRaw =
    getNumber(policy, ['aiv', 'safety_cap_pct_token'], null) ??
    getNumber(policy, ['aiv', 'safety_cap_pct'], null);
  const aivCapPct = normalizeCapPct(aivCapPctRaw);
  if (aivCapPct == null) {
    infoNeeded.push({
      path: 'policy.aiv.safety_cap_pct_token',
      token: '<AIV_CAP_PCT>',
      reason: 'Missing AIV safety cap percentage.',
      source_of_truth: 'team_policy_set',
    });
  }
  const aivCapOverridePctRaw =
    getNumber(policy, ['aiv', 'safety_cap_override_pct'], null) ??
    getNumber(policy, ['aiv', 'override_cap_pct'], null);
  const aivCapOverridePct =
    normalizeCapPct(aivCapOverridePctRaw) ??
    (aivCapPct != null ? Math.min(1, aivCapPct + 0.02) : 0.99); // TODO(policy): map explicit override pct knob when present.

  const buyerTargetMarginWholesalePct =
    getNumber(policy, ['floorsSpreads', 'wholesale_target_margin_pct'], null) ??
    getNumber(policy, ['floorsSpreads', 'buyerTargetMarginWholesalePct'], null);
  if (buyerTargetMarginWholesalePct == null) {
    infoNeeded.push({
      path: 'policy.floorsSpreads.wholesale_target_margin_pct',
      token: '<WHOLESALE_TARGET_MARGIN_PCT>',
      reason: 'Missing wholesale target margin percentage for Buyer Ceiling.',
      source_of_truth: 'team_policy_set',
    });
  }

  const listPct =
    getNumber(policy, ['fees', 'list_commission_pct_token'], null) ??
    getNumber(policy, ['fees', 'list_commission_pct'], null) ??
    0;
  const concessionsPct =
    getNumber(policy, ['fees', 'concessions_pct_token'], null) ??
    getNumber(policy, ['fees', 'concessions_pct'], null) ??
    0;
  const sellClosePct =
    getNumber(policy, ['fees', 'sell_close_pct_token'], null) ??
    getNumber(policy, ['fees', 'sell_close_pct'], null) ??
    0;

  const investorDiscountP20 =
    getNumber(policy, ['floorsSpreads', 'investor_floor_discount_p20_pct'], null);
  const investorDiscountTypical =
    getNumber(policy, ['floorsSpreads', 'investor_floor_discount_typical_pct'], null);
  if (investorDiscountP20 == null || investorDiscountTypical == null) {
    infoNeeded.push({
      path: 'policy.floorsSpreads.investor_floor_discount',
      token: '<INVESTOR_FLOOR_DISCOUNT>',
      reason: 'Missing investor floor discount percentages (P20/Typical).',
      source_of_truth: 'team_policy_set',
    });
  }

  const retainedEquityPct =
    getNumber(policy, ['floorsSpreads', 'retained_equity_pct'], null) ??
    null; // TODO(policy): wire to sandbox knob "Floor, Payoff (Min Retained Equity Percentage)".

  const moveOutCashDefault =
    getNumber(policy, ['floorsSpreads', 'move_out_cash_default'], null) ??
    0; // TODO(policy): wire min/max and default from sandbox knobs (Floor, Payoff Move-Out Cash).
  const moveOutCashMin = getNumber(policy, ['floorsSpreads', 'move_out_cash_min'], null) ?? undefined;
  const moveOutCashMax = getNumber(policy, ['floorsSpreads', 'move_out_cash_max'], null) ?? undefined;

  const holdCostPerMonth =
    getNumber(policy, ['carry', 'hold_cost_per_month_token'], null) ??
    getNumber(policy, ['carry', 'hold_cost_per_month'], null) ??
    undefined; // TODO(policy): wire hold cost per month by speed/track per SoTruth.

  const pctToDecimal = (n: number | null | undefined): number | null => {
    if (n == null) return null;
    if (n > 1 || n > 0.5) return n / 100; // treat as percentage points from knobs (e.g., 1.0 = 1%)
    if (n >= 0) return n;
    return null;
  };

  const holdCosts: UnderwritingPolicy['hold_costs'] = {
    flip: {
      fast: { monthly_pct_of_arv: pctToDecimal(getNumber(policy, ['holdCostsFlipFastZip'], null)) },
      neutral: { monthly_pct_of_arv: pctToDecimal(getNumber(policy, ['holdCostsFlipNeutralZip'], null)) },
      slow: { monthly_pct_of_arv: pctToDecimal(getNumber(policy, ['holdCostsFlipSlowZip'], null)) },
    },
    wholetail: {
      fast: { monthly_pct_of_arv: pctToDecimal(getNumber(policy, ['holdCostsWholetailFastZip'], null)) },
      neutral: { monthly_pct_of_arv: pctToDecimal(getNumber(policy, ['holdCostsWholetailNeutralZip'], null)) },
      slow: { monthly_pct_of_arv: pctToDecimal(getNumber(policy, ['holdCostsWholetailSlowZip'], null)) },
    },
    wholesale_monthly_pct_of_arv_default: pctToDecimal(
      getNumber(policy, ['holdCostsWholesaleMonthlyPctOfArvDefault'], null),
    ),
    default_monthly_bills: {
      tax: getNumber(policy, ['holdingCostsMonthlyDefaultTaxes'], null),
      insurance: getNumber(policy, ['holdingCostsMonthlyDefaultInsurance'], null),
      hoa: getNumber(policy, ['holdingCostsMonthlyDefaultHoa'], null),
      utilities: getNumber(policy, ['holdingCostsMonthlyDefaultUtilities'], null),
    },
  };

  const aivOverrideRules = {
    min_role: getString(policy, ['aivCapOverrideApprovalRole'], null),
    require_bindable_insurance: Boolean(policy?.aivCapOverrideConditionBindableInsuranceRequired ?? false),
    require_clear_title: Boolean(policy?.aivCapOverrideConditionClearTitleQuoteRequired ?? false),
    require_fast_zip: Boolean(policy?.aivCapOverrideConditionFastZipLiquidityRequired ?? false),
    require_logged_reason: Boolean(policy?.aivCapEvidenceVpApprovalLoggingRequirement ?? false),
  };

  const bandsSource =
    policy?.floorsSpreads?.min_spread_by_arv_band ??
    policy?.floorsSpreads?.minSpreadByArvBand ??
    policy?.min_spread_by_arv_band ??
    policy?.minSpreadByArvBand ??
    null;
  const defaultSpreadBands = [
    { min_arv: 0, max_arv: 200000, min_spread_dollars: 15000 },
    { min_arv: 200000, max_arv: 400000, min_spread_dollars: 20000 },
    { min_arv: 400000, max_arv: 650000, min_spread_dollars: 25000 },
    { min_arv: 650000, max_arv: null, min_spread_dollars: 30000, min_spread_pct_of_arv: 0.04 },
  ];
  const minSpreadBands: UnderwritingPolicy['min_spread_by_arv_band'] = Array.isArray(bandsSource)
    ? (() => {
        const sorted = [...bandsSource].sort((a, b) => {
          const aMax = a?.maxArv ?? a?.max_arv ?? Number.POSITIVE_INFINITY;
          const bMax = b?.maxArv ?? b?.max_arv ?? Number.POSITIVE_INFINITY;
          return aMax - bMax;
        });
        let currentMin = 0;
        const bands: UnderwritingPolicy['min_spread_by_arv_band'] = [];
        for (const entry of sorted) {
          const maxArvRaw = entry?.maxArv ?? entry?.max_arv ?? null;
          const maxArv =
            typeof maxArvRaw === 'number' && Number.isFinite(maxArvRaw) ? maxArvRaw : null;
          const minSpreadDollars =
            entry?.minSpread ??
            entry?.min_spread ??
            entry?.min_spread_dollars ??
            entry?.minSpreadDollars ??
            0;
          const minSpreadPctRaw =
            entry?.minSpreadPct ??
            entry?.min_spread_pct ??
            entry?.min_spread_pct_of_arv ??
            entry?.minSpreadPctOfArv ??
            null;
          const minSpreadPct =
            typeof minSpreadPctRaw === 'number'
              ? minSpreadPctRaw > 1
                ? minSpreadPctRaw / 100
                : minSpreadPctRaw
              : undefined;
          bands.push({
            min_arv: currentMin,
            max_arv: maxArv,
            min_spread_dollars: minSpreadDollars,
            min_spread_pct_of_arv: minSpreadPct,
          });
          if (maxArv != null && Number.isFinite(maxArv)) {
            currentMin = maxArv;
          }
        }
        return bands.length > 0 ? bands : defaultSpreadBands;
      })()
    : defaultSpreadBands; // TODO(policy): wire to sandbox "Spread Minimum by ARV Band Policy" if missing in payload.

  const cashGateMin =
    getNumber(policy, ['workflow', 'cashPresentationGateMinimumSpreadOverPayoff'], null) ??
    getNumber(policy, ['cashPresentationGateMinimumSpreadOverPayoff'], null) ??
    10000; // TODO(policy): wire cashPresentationGateMinimumSpreadOverPayoff knob in policy payload.

  const borderlineBandWidth =
    getNumber(policy, ['workflow', 'analystReviewTriggerBorderlineBandThreshold'], null) ??
    getNumber(policy, ['analystReviewTriggerBorderlineBandThreshold'], null) ??
    5000; // TODO(policy): wire analystReviewTriggerBorderlineBandThreshold knob in policy payload.

  return {
    aiv_cap_pct: aivCapPct ?? 1,
    aiv_safety_cap: {
      default_pct: aivCapPct ?? null,
      override_pct: aivCapOverridePct ?? null,
      override_rules: aivOverrideRules,
    },
    allow_aiv_cap_99_insurable: false, // legacy flag; override handled via aiv_safety_cap rules
    min_spread_by_arv_band: minSpreadBands,
    cash_gate_min: cashGateMin ?? 10000,
    borderline_band_width: borderlineBandWidth ?? 5000,
    buyer_target_margin_wholesale_pct: buyerTargetMarginWholesalePct ?? 0,
    buyer_costs: {
      list_commission_pct: listPct,
      concessions_pct: concessionsPct,
      sell_close_pct: sellClosePct,
    },
    hold_costs: holdCosts,
    hold_cost_per_month: holdCostPerMonth,
    investor_discount_p20_zip_pct: investorDiscountP20 ?? 0,
    investor_discount_typical_zip_pct: investorDiscountTypical ?? 0,
    retained_equity_pct: retainedEquityPct ?? 0,
    move_out_cash_default: moveOutCashDefault,
    move_out_cash_min: moveOutCashMin,
    move_out_cash_max: moveOutCashMax,
  };
}

function computeBuyerCeiling(params: {
  arv: number | null;
  policy: UnderwritingPolicy;
  repairs: number | null;
  carryMonths: number | null;
  infoNeeded: InfoNeeded[];
  track?: 'wholesale' | 'flip' | 'wholetail';
  speedBand?: SpeedBand;
}): {
  buyerCeiling: number | null;
  holdCostPerMonth: number;
  carryCostTotal: number;
  holdCostTrace: Record<string, unknown>;
} {
  const { arv, policy, repairs, carryMonths, infoNeeded, track = 'wholesale', speedBand } = params;

  if (arv == null) {
    infoNeeded.push({
      path: 'deal.market.arv',
      token: null,
      reason: 'ARV required to compute Buyer Ceiling.',
      source_of_truth: 'investor_set',
    });
    return { buyerCeiling: null, holdCostPerMonth: 0, carryCostTotal: 0, holdCostTrace: {} };
  }

  const repairsTotal = repairs ?? 0; // TODO(policy): wire to deterministic repairs total input.
  const buyerCostsTotal = (() => {
    const basePrice = arv;
    const listAmt = round2(basePrice * (policy.buyer_costs.list_commission_pct ?? 0));
    const consAmt = round2(basePrice * (policy.buyer_costs.concessions_pct ?? 0));
    const sellCloseAmt = round2(basePrice * (policy.buyer_costs.sell_close_pct ?? 0));
    return listAmt + consAmt + sellCloseAmt;
  })();

  const normalizedSpeed: 'fast' | 'neutral' | 'slow' | null =
    speedBand === undefined || speedBand === null
      ? null
      : speedBand === 'balanced'
      ? 'neutral'
      : speedBand;
  const holdCosts = policy.hold_costs;
  const trackConfig =
    track === 'flip' ? holdCosts?.flip : track === 'wholetail' ? holdCosts?.wholetail : null;
  const pct =
    trackConfig?.[normalizedSpeed ?? 'neutral']?.monthly_pct_of_arv ??
    holdCosts?.wholesale_monthly_pct_of_arv_default ??
    null;
  const defaultBillsSum =
    (holdCosts?.default_monthly_bills?.tax ?? 0) +
    (holdCosts?.default_monthly_bills?.insurance ?? 0) +
    (holdCosts?.default_monthly_bills?.hoa ?? 0) +
    (holdCosts?.default_monthly_bills?.utilities ?? 0);
  const pctHoldCost = pct != null ? pct * arv : 0;
  const holdCostPerMonth =
    pctHoldCost > 0 || defaultBillsSum > 0
      ? round2(pctHoldCost + defaultBillsSum)
      : policy.hold_cost_per_month ?? 0; // legacy fallback
  const carryCostTotal =
    carryMonths != null && holdCostPerMonth != null ? round2(carryMonths * holdCostPerMonth) : 0;

  const base = arv * (1 - policy.buyer_target_margin_wholesale_pct);
  const ceiling = base - repairsTotal - buyerCostsTotal - carryCostTotal;
  return {
    buyerCeiling: round2(ceiling),
    holdCostPerMonth,
    carryCostTotal,
    holdCostTrace: {
      track,
      speed_band: normalizedSpeed,
      pct_of_arv: pct ?? null,
      default_bills_sum: defaultBillsSum,
      hold_cost_per_month: holdCostPerMonth,
      carry_months: carryMonths,
      carry_cost_total: carryCostTotal,
      source: pct != null || defaultBillsSum > 0 ? 'policy' : 'legacy_scalar',
    },
  };
}

function computeAivSafetyCap(params: {
  aiv: number | null;
  policy: UnderwritingPolicy;
  infoNeeded: InfoNeeded[];
  evidence: {
    bindable_insurance?: boolean;
    clear_title_quote?: boolean;
    fast_zip_liquidity?: boolean;
    approver_role?: string | null;
    has_logged_reason?: boolean;
  };
}): { aivCapped: number | null; capPctApplied: number | null; applied: boolean; trace: Record<string, unknown> } {
  const { aiv, policy, infoNeeded, evidence } = params;
  const safetyCap = policy.aiv_safety_cap;
  const defaultPct = safetyCap?.default_pct ?? policy.aiv_cap_pct;
  const overridePct = safetyCap?.override_pct ?? defaultPct;
  const rules = safetyCap?.override_rules;

  if (aiv == null || defaultPct == null) {
    if (defaultPct == null) {
      infoNeeded.push({
        path: 'policy.aiv.safety_cap_pct_token',
        token: '<AIV_CAP_PCT>',
        reason: 'Missing AIV safety cap percentage.',
        source_of_truth: 'team_policy_set',
      });
    }
    return { aivCapped: aiv, capPctApplied: defaultPct ?? null, applied: false, trace: {} };
  }

  const roleRank = (role: string | null | undefined): number => {
    if (!role) return -1;
    const order = ['Analyst', 'Underwriter', 'Manager', 'VP', 'Admin', 'Owner'];
    const idx = order.findIndex((r) => r.toLowerCase() === role.toLowerCase());
    return idx >= 0 ? idx : -1;
  };
  const roleMeetsMinimum = (role: string | null | undefined, minRole: string | null | undefined): boolean => {
    if (!minRole) return true;
    return roleRank(role) >= roleRank(minRole);
  };

  const overrideChecks: string[] = [];
  const hasAnyRule =
    !!rules?.min_role ||
    rules?.require_bindable_insurance ||
    rules?.require_clear_title ||
    rules?.require_fast_zip ||
    rules?.require_logged_reason;
  let overrideAllowed = hasAnyRule;
  if (rules && hasAnyRule) {
    if (rules.require_bindable_insurance && evidence.bindable_insurance !== true) {
      overrideAllowed = false;
      overrideChecks.push('bindable_insurance_missing');
    }
    if (rules.require_clear_title && evidence.clear_title_quote !== true) {
      overrideAllowed = false;
      overrideChecks.push('clear_title_missing');
    }
    if (rules.require_fast_zip && evidence.fast_zip_liquidity !== true) {
      overrideAllowed = false;
      overrideChecks.push('fast_zip_required');
    }
    if (rules.require_logged_reason && evidence.has_logged_reason !== true) {
      overrideAllowed = false;
      overrideChecks.push('override_reason_missing');
    }
    if (!roleMeetsMinimum(evidence.approver_role, rules.min_role ?? null)) {
      overrideAllowed = false;
      overrideChecks.push('approver_role_insufficient');
    }
  } else {
    overrideAllowed = false;
  }

  const capPct = overrideAllowed ? overridePct ?? defaultPct : defaultPct;
  const capped = capPct != null ? round2(aiv * capPct) : null;

  return {
    aivCapped: capped,
    capPctApplied: capPct ?? null,
    applied: capped != null ? capped < aiv : false,
    trace: {
      default_pct: defaultPct,
      override_pct: overridePct,
      cap_pct_used: capPct ?? null,
      override_allowed: overrideAllowed,
      override_reasons_blocked: overrideAllowed ? [] : overrideChecks,
      evidence: {
        bindable_insurance: evidence.bindable_insurance ?? null,
        clear_title_quote: evidence.clear_title_quote ?? null,
        fast_zip_liquidity: evidence.fast_zip_liquidity ?? null,
        approver_role: evidence.approver_role ?? null,
        has_logged_reason: evidence.has_logged_reason ?? null,
      },
    },
  };
}

function computeFloorInvestor(
  aiv: number | null,
  zipPercentile: number | null,
  policy: UnderwritingPolicy,
  infoNeeded: InfoNeeded[],
): number | null {
  if (aiv == null) {
    infoNeeded.push({
      path: 'deal.market.aiv',
      token: null,
      reason: 'AIV required to compute Floor_Investor.',
      source_of_truth: 'investor_set',
    });
    return null;
  }

  const discountP20 =
    policy.investor_discount_p20_zip_pct ??
    null; // TODO(policy): wire to SoTruth "Floor, Investor (AIV Discount, P20 ZIP)" knob.
  const discountTypical =
    policy.investor_discount_typical_zip_pct ??
    null; // TODO(policy): wire to SoTruth "Floor, Investor (AIV Discount, Typical ZIP)" knob.

  if (discountP20 == null || discountTypical == null) {
    infoNeeded.push({
      path: 'policy.floorsSpreads.investor_floor_discount',
      token: '<INVESTOR_FLOOR_DISCOUNT>',
      reason: 'Missing investor floor discount percentages (P20/Typical).',
      source_of_truth: 'team_policy_set',
    });
  }

  const appliedDiscount =
    zipPercentile != null && zipPercentile <= 20
      ? discountP20 ?? discountTypical
      : discountTypical ?? discountP20;

  if (appliedDiscount == null) {
    return null;
  }

  return round2(aiv * (1 - appliedDiscount));
}

function computePayoffPlusEssentials(
  payoffClose: number | null,
  aiv: number | null,
  policy: UnderwritingPolicy,
  infoNeeded: InfoNeeded[],
): number | null {
  if (payoffClose == null) {
    infoNeeded.push({
      path: 'deal.debt.payoff',
      token: null,
      reason: 'Payoff required to compute payoff + essentials floor.',
      source_of_truth: 'investor_set',
    });
    return null;
  }

  const retainedEquityPct =
    policy.retained_equity_pct ??
    null; // TODO(policy): wire to SoTruth "Floor, Payoff (Min Retained Equity Percentage)".
  const moveOutCashDefault =
    policy.move_out_cash_default ??
    0; // TODO(policy): wire to SoTruth "Floor, Payoff (Move-Out Cash Default/Min/Max)".

  if (retainedEquityPct == null) {
    infoNeeded.push({
      path: 'policy.floorsSpreads.retained_equity_pct',
      token: '<RETAINED_EQUITY_PCT>',
      reason: 'Missing retained equity percentage for payoff floor.',
      source_of_truth: 'team_policy_set',
    });
  }

  const retainedEquityAmount =
    aiv != null && retainedEquityPct != null ? round2(aiv * retainedEquityPct) : 0;
  let moveOutCash = moveOutCashDefault ?? 0;
  if (policy.move_out_cash_min != null) {
    moveOutCash = Math.max(moveOutCash, policy.move_out_cash_min);
  }
  if (policy.move_out_cash_max != null) {
    moveOutCash = Math.min(moveOutCash, policy.move_out_cash_max);
  }

  return round2(payoffClose + retainedEquityAmount + moveOutCash);
}

function computeRespectFloor(
  floorInvestor: number | null,
  payoffPlusEssentials: number | null,
  infoNeeded: InfoNeeded[],
  compositionMode: 'max' | 'investor_only' | 'payoff_only' = 'max',
): number | null {
  if (floorInvestor == null && payoffPlusEssentials == null) {
    infoNeeded.push({
      path: 'respect_floor',
      token: null,
      reason: 'Respect Floor could not be computed (missing investor floor and payoff+essentials).',
      source_of_truth: 'team_policy_set',
    });
    return null;
  }

  if (floorInvestor == null) return payoffPlusEssentials;
  if (payoffPlusEssentials == null) return floorInvestor;

  switch (compositionMode) {
    case 'investor_only':
      return floorInvestor;
    case 'payoff_only':
      return payoffPlusEssentials;
    case 'max':
    default:
      return Math.max(floorInvestor, payoffPlusEssentials);
  }
}

function computeMinSpreadRequired(
  arv: number | null,
  policy: UnderwritingPolicy,
  infoNeeded: InfoNeeded[],
): { minSpread: number | null; band: UnderwritingPolicy['min_spread_by_arv_band'][number] | null } {
  if (arv == null) {
    infoNeeded.push({
      path: 'deal.market.arv',
      token: null,
      reason: 'ARV required to compute min spread ladder.',
      source_of_truth: 'investor_set',
    });
    return { minSpread: null, band: null };
  }

  const bands = policy.min_spread_by_arv_band ?? [];
  const selected =
    bands.find(
      (b) =>
        (b.min_arv == null || arv >= b.min_arv) &&
        (b.max_arv == null || (Number.isFinite(b.max_arv) ? arv <= b.max_arv : true)),
    ) ?? null;

  if (!selected) {
    return { minSpread: null, band: null };
  }

  const minSpreadBase = selected.min_spread_dollars ?? null;
  const pct = selected.min_spread_pct_of_arv;
  const minSpreadFromPct =
    pct != null ? round2(arv * pct) : null;
  const minSpread =
    minSpreadFromPct != null && minSpreadBase != null
      ? Math.max(minSpreadBase, minSpreadFromPct)
      : minSpreadFromPct ?? minSpreadBase ?? null;

  return { minSpread, band: selected };
}

function computeCashGate(
  spreadCash: number | null,
  policy: UnderwritingPolicy,
): { status: CashGateStatus; deficit: number | null; cashGateMin: number } {
  const cashGateMin = policy.cash_gate_min ?? 0;
  if (spreadCash == null) {
    return { status: 'unknown', deficit: null, cashGateMin };
  }
  if (spreadCash >= cashGateMin) {
    return { status: 'pass', deficit: 0, cashGateMin };
  }
  return { status: 'shortfall', deficit: round2(cashGateMin - spreadCash), cashGateMin };
}

export type UnderwriteOutputs = {
  caps: { aivCapApplied: boolean; aivCapValue: number | null };
  carry: {
    monthsRule: string | null;
    monthsCap: number | null;
    rawMonths: number | null;
    carryMonths: number | null;
  };
  fees: {
    rates: {
      list_commission_pct: number;
      concessions_pct: number;
      sell_close_pct: number;
    };
    preview: {
      base_price: number;
      list_commission_amount: number;
      concessions_amount: number;
      sell_close_amount: number;
      total_seller_side_costs: number;
    };
  };
  summaryNotes: string[];

  // Strategy / offer bundle (provisional; aligned with contracts)
  buyer_ceiling: number | null;
  respect_floor: number | null;
  payoff_projected: number | null;
  shortfall_vs_payoff: number | null;
  window_floor_to_offer: number | null;
  headroom_offer_to_ceiling: number | null;
  cushion_vs_payoff: number | null;
  mao_wholesale: number | null;
  mao_flip: number | null;
  mao_wholetail: number | null;
  mao_as_is_cap: number | null;
  mao_cap_wholesale?: number | null;
  buyer_ceiling_unclamped?: number | null;
  primary_offer: number | null;
  primary_offer_track: 'wholesale' | 'flip' | 'wholetail' | 'as_is_cap' | null;
  seller_offer_band: 'low' | 'fair' | 'high' | null;
  buyer_ask_band: 'aggressive' | 'balanced' | 'generous' | null;
  sweet_spot_flag: boolean | null;
  gap_flag: 'no_gap' | 'narrow_gap' | 'wide_gap' | null;
  strategy_recommendation: string | null;
  workflow_state: 'NeedsInfo' | 'NeedsReview' | 'ReadyForOffer' | null;
  confidence_grade: 'A' | 'B' | 'C' | null;
  confidence_reasons: string[] | null;
  floor_investor?: number | null;
  payoff_plus_essentials?: number | null;
  spread_cash?: number | null;
  min_spread_required?: number | null;
  cash_gate_status?: CashGateStatus | null;
  cash_deficit?: number | null;
  borderline_flag?: boolean | null;

  timeline_summary?: {
    days_to_money: number | null;
    carry_months: number | null;
    speed_band: 'fast' | 'balanced' | 'slow' | null;
    urgency: 'normal' | 'elevated' | 'critical' | null;
    auction_date_iso?: string | null;
  };

  risk_summary?: {
    overall: 'pass' | 'watch' | 'fail' | 'info_needed';
    insurability?: 'pass' | 'watch' | 'fail' | 'info_needed';
    title?: 'pass' | 'watch' | 'fail' | 'info_needed';
    payoff?: 'pass' | 'watch' | 'fail' | 'info_needed';
    fha_va_flip?: 'pass' | 'watch' | 'fail' | 'info_needed';
    firpta?: 'pass' | 'watch' | 'fail' | 'info_needed';
    pace_solar_ucc?: 'pass' | 'watch' | 'fail' | 'info_needed';
    condo_sirs?: 'pass' | 'watch' | 'fail' | 'info_needed';
    manufactured?: 'pass' | 'watch' | 'fail' | 'info_needed';
    scra?: 'pass' | 'watch' | 'fail' | 'info_needed';
    reasons: string[];
  };

  evidence_summary?: {
    confidence_grade: 'A' | 'B' | 'C' | null;
    confidence_reasons: string[];
    freshness_by_kind: {
      comps?: 'fresh' | 'stale' | 'missing';
      payoff_letter?: 'fresh' | 'stale' | 'missing';
      title_quote?: 'fresh' | 'stale' | 'missing';
      insurance?: 'fresh' | 'stale' | 'missing';
      repairs?: 'fresh' | 'stale' | 'missing';
    };
  };
};

type TimelineSummary = NonNullable<UnderwriteOutputs['timeline_summary']>;
type RiskSummary = NonNullable<UnderwriteOutputs['risk_summary']>;
type EvidenceSummary = NonNullable<UnderwriteOutputs['evidence_summary']>;

export type AnalyzeResult = {
  ok: true;
  infoNeeded: InfoNeeded[];
  trace: TraceEntry[];
  outputs: UnderwriteOutputs;
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function getNumber(obj: any, path: string[], fallback: number | null = null): number | null {
  let cur = obj;
  for (const k of path) {
    if (cur == null) return fallback;
    cur = cur[k];
  }
  if (typeof cur === 'number' && Number.isFinite(cur)) return cur;
  return fallback;
}

function getString(obj: any, path: string[], fallback: string | null = null): string | null {
  let cur = obj;
  for (const k of path) {
    if (cur == null) return fallback;
    cur = cur[k];
  }
  if (typeof cur === 'string' && cur.length > 0) return cur;
  return fallback;
}

function getBoolean(obj: any, path: string[], fallback: boolean | null = null): boolean | null {
  let cur = obj;
  for (const k of path) {
    if (cur == null) return fallback;
    cur = cur[k];
  }
  if (typeof cur === 'boolean') return cur;
  if (typeof cur === 'string') {
    const s = cur.toLowerCase();
    if (s === 'true') return true;
    if (s === 'false') return false;
  }
  return fallback;
}

/** Parse a simple DOM→months rule like "DOM/30". Unknown patterns fall back to DOM/30. */
function monthsFromDom(dom: number, rule: string | null): number {
  const r = (rule ?? 'DOM/30').trim().toUpperCase();
  const m = r.match(/^DOM\s*\/\s*(\d+(\.\d+)?)$/);
  const divisor = m ? Number(m[1]) : 30;
  if (!Number.isFinite(divisor) || divisor <= 0) return dom / 30;
  return dom / divisor;
}

function speedBandFromMarket(dom: number | null, moi: number | null): SpeedBand {
  if (dom == null && moi == null) return null;
  if ((dom != null && dom <= 30) || (moi != null && moi <= 3)) return 'fast';
  if ((dom != null && dom <= 90) || (moi != null && moi <= 6)) return 'balanced';
  return 'slow';
}

export function computeUnderwriting(deal: Json, policy: Json): AnalyzeResult {
  const infoNeeded: InfoNeeded[] = [];
  const trace: TraceEntry[] = [];
  const summaryNotes: string[] = [];

  const uwPolicy = buildUnderwritingPolicy({ policy }, infoNeeded);

  // ---- Inputs from deal
  const arv = getNumber(deal, ['market', 'arv'], null);
  const aiv = getNumber(deal, ['market', 'aiv'], null);
  const domZip = getNumber(deal, ['market', 'dom_zip'], null);
  const moiZip = getNumber(deal, ['market', 'moi_zip'], null);
  const zipPercentile = getNumber(deal, ['market', 'zip_percentile'], null);
  const speedBand = speedBandFromMarket(domZip, moiZip);

  if (arv == null) {
    infoNeeded.push({
      path: 'deal.market.arv',
      token: null,
      reason: 'ARV required to compute Buyer Ceiling.',
      source_of_truth: 'investor_set',
    });
  }
  if (aiv == null) {
    infoNeeded.push({
      path: 'deal.market.aiv',
      token: null,
      reason: 'AIV (as-is value) required to compute caps and fee preview.',
      source_of_truth: 'investor_set',
    });
  }

  // ---- Policy tokens (already resolved by API)
  // Carry: rule + hard cap
  const carryRule =
    getString(policy, ['carry', 'dom_to_months_rule_token'], null) ??
    getString(policy, ['carry', 'dom_to_months_rule'], null);

  const carryCap =
    getNumber(policy, ['carry', 'months_cap_token'], null) ??
    getNumber(policy, ['carry', 'months_cap'], null);

  if (carryRule == null) {
    infoNeeded.push({
      path: 'policy.carry.dom_to_months_rule_token',
      token: '<DOM_TO_MONTHS_RULE>',
      reason: 'Missing DOM→months rule.',
      source_of_truth: 'team_policy_set',
    });
  }
  if (carryCap == null) {
    infoNeeded.push({
      path: 'policy.carry.months_cap_token',
      token: '<CARRY_MONTHS_CAP>',
      reason: 'Missing hard cap on carry months.',
      source_of_truth: 'team_policy_set',
    });
  }

  // Fee rates (percent as decimal)
  const listPct =
    getNumber(policy, ['fees', 'list_commission_pct_token'], null) ??
    getNumber(policy, ['fees', 'list_commission_pct'], null);
  const concessionsPct =
    getNumber(policy, ['fees', 'concessions_pct_token'], null) ??
    getNumber(policy, ['fees', 'concessions_pct'], null);
  const sellClosePct =
    getNumber(policy, ['fees', 'sell_close_pct_token'], null) ??
    getNumber(policy, ['fees', 'sell_close_pct'], null);

  if (listPct == null) {
    infoNeeded.push({
      path: 'policy.fees.list_commission_pct_token',
      token: '<LIST_COMM_PCT>',
      reason: 'Missing list commission percentage.',
      source_of_truth: 'team_policy_set',
    });
  }
  if (concessionsPct == null) {
    infoNeeded.push({
      path: 'policy.fees.concessions_pct_token',
      token: '<CONCESSIONS_PCT>',
      reason: 'Missing concessions percentage.',
      source_of_truth: 'team_policy_set',
    });
  }
  if (sellClosePct == null) {
    infoNeeded.push({
      path: 'policy.fees.sell_close_pct_token',
      token: '<SELL_CLOSE_PCT>',
      reason: 'Missing seller-side closing cost percentage.',
      source_of_truth: 'team_policy_set',
    });
  }

  // ---- Caps
  const insurabilityStatus = getString(deal, ['status', 'insurability'], null);
  const bindableInsurance =
    insurabilityStatus === 'bindable' || getBoolean(deal, ['status', 'insurance_bindable'], null) === true;
  const clearTitle =
    getBoolean(deal, ['title', 'clear'], null) === true ||
    getString(deal, ['title', 'status'], null) === 'clear' ||
    getBoolean(deal, ['title', 'quote_present'], null) === true;
  const approverRole =
    getString(deal, ['approvals', 'aiv_cap_override_role'], null) ??
    getString(deal, ['user', 'role'], null);
  const hasLoggedReason =
    getString(deal, ['approvals', 'aiv_cap_override_reason'], null) != null ||
    getBoolean(deal, ['approvals', 'aiv_cap_override_reason_logged'], null) === true;

  const { aivCapped, capPctApplied, applied: aivCapApplied, trace: aivCapTrace } = computeAivSafetyCap({
    aiv,
    policy: uwPolicy,
    infoNeeded,
    evidence: {
      bindable_insurance: bindableInsurance ?? undefined,
      clear_title_quote: clearTitle ?? undefined,
      fast_zip_liquidity: speedBand ? speedBand === 'fast' || speedBand === 'balanced' : undefined,
      approver_role: approverRole ?? undefined,
      has_logged_reason: hasLoggedReason ?? undefined,
    },
  });

  trace.push({
    rule: 'AIV_SAFETY_CAP',
    used: ['deal.market.aiv', 'policy.aiv.safety_cap_pct_token'],
    details: {
      aiv,
      cap_pct: capPctApplied,
      cap_value: aivCapped,
      applied: aivCapApplied,
      ...aivCapTrace,
    },
  });

  if (aivCapped != null && capPctApplied != null) {
    summaryNotes.push(
      aivCapApplied
        ? `AIV safety cap applied at ${capPctApplied}; capped AIV = ${aivCapped.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}.`
        : `AIV safety cap not binding; cap = ${round2(capPctApplied * 100).toFixed(0)}% of AIV.`
    );
  }

  const basePrice = aivCapped ?? aiv ?? 0;

  // ---- Carry Months (DOM → months, clamped)
  let rawMonths: number | null = null;
  let carryMonths: number | null = null;

  if (domZip != null) {
    rawMonths = monthsFromDom(domZip, carryRule);
  }
  if (rawMonths != null) {
    carryMonths = carryCap != null ? Math.min(rawMonths, carryCap) : rawMonths;
  }

  trace.push({
    rule: 'CARRY_MONTHS',
    used: [
      'deal.market.dom_zip',
      'policy.carry.dom_to_months_rule_token',
      'policy.carry.months_cap_token',
    ],
    details: {
      dom_zip: domZip,
      rule: carryRule ?? null,
      raw_months: rawMonths,
      months_cap: carryCap ?? null,
      carry_months: carryMonths,
    },
  });

  if (domZip != null) {
    summaryNotes.push(
      carryMonths != null
        ? `Carry months = ${carryMonths.toFixed(2)} (rule ${carryRule ?? 'DOM/30'}, raw ${rawMonths?.toFixed(2)}).`
        : `DOM provided (${domZip}) but carry months not computed due to missing rule/cap.`
    );
  }

  // ---- Fees preview
  const lp = listPct ?? 0;
  const cp = concessionsPct ?? 0;
  const sp = sellClosePct ?? 0;

  const listAmt = round2(basePrice * lp);
  const consAmt = round2(basePrice * cp);
  const sellCloseAmt = round2(basePrice * sp);
  const totalSellerSide = round2(listAmt + consAmt + sellCloseAmt);
  const repairsTotal =
    getNumber(deal, ['costs', 'repairs_base'], null) ??
    getNumber(deal, ['costs', 'repairs'], null) ??
    0; // TODO(policy): source repairs total from deterministic estimator snapshot.
  const holdCostPerMonth =
    getNumber(policy, ['carry', 'hold_cost_per_month_token'], null) ??
    getNumber(policy, ['carry', 'hold_cost_per_month'], null) ??
    null; // TODO(policy): wire hold cost per month from policy speed-band tables.

  trace.push({
    rule: 'FEES_PREVIEW',
    used: [
      'policy.fees.list_commission_pct_token',
      'policy.fees.concessions_pct_token',
      'policy.fees.sell_close_pct_token',
      'basePrice',
    ],
    details: {
      basePrice,
      list_commission_pct: lp,
      concessions_pct: cp,
      sell_close_pct: sp,
      list_commission_amount: listAmt,
      concessions_amount: consAmt,
      sell_close_amount: sellCloseAmt,
      total_seller_side_costs: totalSellerSide,
    },
  });

  // ---- Strategy & posture derived values (provisional, policy-light)
  const buyerCeilingResult = computeBuyerCeiling({
    arv,
    policy: uwPolicy,
    repairs: repairsTotal,
    carryMonths,
    infoNeeded,
    track: 'wholesale',
    speedBand,
  });

  trace.push({
    rule: 'BUYER_CEILING',
    used: [
      'deal.market.arv',
      'policy.floorsSpreads.wholesale_target_margin_pct',
      'deal.costs.repairs_base',
      'policy.fees.*',
      'carryMonths',
    ],
    details: {
      arv,
      margin_pct: uwPolicy.buyer_target_margin_wholesale_pct,
      repairs_total: repairsTotal,
      buyer_costs_total: totalSellerSide,
      carry_months: carryMonths,
      hold_cost_per_month: buyerCeilingResult.holdCostPerMonth,
      buyer_ceiling: buyerCeilingResult.buyerCeiling,
    },
  });
  trace.push({
    rule: 'HOLD_COST_POLICY',
    used: ['policy.hold_costs', 'policy.hold_cost_per_month', 'carryMonths'],
    details: buyerCeilingResult.holdCostTrace,
  });
  const buyerCeiling = buyerCeilingResult.buyerCeiling;

  const payoffClose =
    getNumber(deal, ['debt', 'payoff'], null) ??
    getNumber(deal, ['debt', 'senior_principal'], null) ??
    null;

  const floorInvestor = computeFloorInvestor(
    aiv,
    zipPercentile,
    uwPolicy,
    infoNeeded,
  );
  const payoffPlusEssentials = computePayoffPlusEssentials(
    payoffClose,
    aiv,
    uwPolicy,
    infoNeeded,
  );
  const respectFloor = computeRespectFloor(
    floorInvestor,
    payoffPlusEssentials,
    infoNeeded,
    'max',
  );

  trace.push({
    rule: 'RESPECT_FLOOR',
    used: [
      'deal.market.aiv',
      'deal.debt.payoff',
      'policy.floorsSpreads.investor_floor_discount_p20_pct',
      'policy.floorsSpreads.investor_floor_discount_typical_pct',
      'policy.floorsSpreads.retained_equity_pct',
      'policy.floorsSpreads.move_out_cash_default',
    ],
    details: {
      floor_investor: floorInvestor,
      payoff_plus_essentials: payoffPlusEssentials,
      respect_floor: respectFloor,
      composition_mode: 'max',
    },
  });

  const payoffProjected = payoffClose;

  const maoPresentationWholesale = respectFloor;
  const maoCapWholesale = aivCapped ?? aiv ?? null;
  const maoFinalWholesale = minNonNull([
    maoPresentationWholesale,
    maoCapWholesale,
    buyerCeiling,
  ]);

  trace.push({
    rule: 'MAO_CLAMP',
    used: ['BUYER_CEILING', 'AIV_SAFETY_CAP'],
    details: {
      mao_presentation_wholesale: maoPresentationWholesale,
      mao_cap_wholesale: maoCapWholesale,
      buyer_ceiling: buyerCeiling,
      mao_final_wholesale: maoFinalWholesale,
    },
  });

  const primaryOffer = maoFinalWholesale;
  const primaryTrack: UnderwriteOutputs['primary_offer_track'] =
    primaryOffer != null ? 'wholesale' : null;

  const windowFloorToOffer =
    primaryOffer != null && respectFloor != null
      ? round2(primaryOffer - respectFloor)
      : null;
  const headroomOfferToCeiling =
    buyerCeiling != null && primaryOffer != null
      ? round2(buyerCeiling - primaryOffer)
      : null;
  const cushionVsPayoff =
    primaryOffer != null && payoffProjected != null
      ? round2(primaryOffer - payoffProjected)
      : null;
  const shortfallVsPayoff =
    primaryOffer != null && payoffProjected != null
      ? round2(payoffProjected - primaryOffer)
      : null;
  const spreadCash =
    primaryOffer != null && payoffProjected != null
      ? round2(primaryOffer - payoffProjected)
      : null;
  if (spreadCash == null) {
    infoNeeded.push({
      path: 'spread_cash',
      token: null,
      reason: 'Missing inputs to compute cash spread (offer or payoff).',
      source_of_truth: 'investor_set',
    });
  }

  const workflowState: UnderwriteOutputs['workflow_state'] =
    primaryOffer == null || respectFloor == null || buyerCeiling == null
      ? 'NeedsInfo'
      : windowFloorToOffer != null && windowFloorToOffer < 0
      ? 'NeedsReview'
      : 'ReadyForOffer';

  const confidenceGrade: UnderwriteOutputs['confidence_grade'] =
    infoNeeded.length > 0 || primaryOffer == null ? 'C' : 'B';

  const confidenceReasons: string[] | null =
    confidenceGrade === 'C'
      ? ['Missing inputs or outstanding infoNeeded items.']
      : null;

  const { minSpread: minSpreadRequired, band: minSpreadBand } = computeMinSpreadRequired(
    arv,
    uwPolicy,
    infoNeeded,
  );
  const cashGate = computeCashGate(spreadCash, uwPolicy);
  const borderlineBandWidth = uwPolicy.borderline_band_width ?? 0;
  const spreadDelta =
    spreadCash != null && minSpreadRequired != null
      ? spreadCash - minSpreadRequired
      : null;
  const borderlineDueToSpread =
    spreadDelta != null && Math.abs(spreadDelta) <= borderlineBandWidth;
  const confidenceIsC = confidenceGrade === 'C';
  const borderlineFlag = Boolean(borderlineDueToSpread || confidenceIsC);

  trace.push({
    rule: 'SPREAD_LADDER',
    used: ['deal.market.arv'],
    details: {
      arv,
      min_spread_required: minSpreadRequired,
      band_min_arv: minSpreadBand?.min_arv ?? null,
      band_max_arv: minSpreadBand?.max_arv ?? null,
      min_spread_pct_of_arv: minSpreadBand?.min_spread_pct_of_arv ?? null,
      cash_gate_min: cashGate.cashGateMin,
    },
  });

  trace.push({
    rule: 'CASH_GATE',
    used: ['primary_offer', 'deal.debt.payoff'],
    details: {
      spread_cash: spreadCash,
      cash_gate_status: cashGate.status,
      cash_deficit: cashGate.deficit,
      cash_gate_min: cashGate.cashGateMin,
    },
  });

  trace.push({
    rule: 'BORDERLINE',
    used: ['SPREAD_LADDER', 'CASH_GATE', 'confidence_grade'],
    details: {
      borderline_flag: borderlineFlag,
      reason:
        borderlineDueToSpread && confidenceIsC
          ? 'both'
          : borderlineDueToSpread
          ? 'spread'
          : confidenceIsC
          ? 'confidence'
          : 'none',
      confidence_grade: confidenceGrade,
      borderline_band_width: borderlineBandWidth,
    },
  });

  const sellerOfferBand: UnderwriteOutputs['seller_offer_band'] =
    primaryOffer != null && respectFloor != null && buyerCeiling != null
      ? primaryOffer < respectFloor
        ? 'low'
        : primaryOffer > buyerCeiling
        ? 'high'
        : 'fair'
      : null;

  const buyerAskBand: UnderwriteOutputs['buyer_ask_band'] =
    headroomOfferToCeiling != null
      ? headroomOfferToCeiling < 0
        ? 'aggressive'
        : headroomOfferToCeiling <= 5000
        ? 'balanced'
        : 'generous'
      : null; // TODO(policy): replace 5k presentation band with policy-driven thresholds.

  const sweetSpot =
    windowFloorToOffer != null &&
    windowFloorToOffer >= 0 &&
    headroomOfferToCeiling != null &&
    headroomOfferToCeiling >= 0;

  const gapFlag: UnderwriteOutputs['gap_flag'] =
    windowFloorToOffer == null || headroomOfferToCeiling == null
      ? null
      : windowFloorToOffer < 0 || headroomOfferToCeiling < 0
      ? 'wide_gap'
      : Math.min(windowFloorToOffer, headroomOfferToCeiling) <= 5000
      ? 'narrow_gap'
      : 'no_gap'; // TODO(policy): replace 5k band with policy thresholds.

  const strategyRecommendation =
    primaryTrack === 'wholesale'
      ? 'Recommend Wholesale — offer anchored at Respect Floor.'
      : null;

  const computeUrgency = (days: number | null): TimelineSummary['urgency'] => {
    if (days == null) return null;
    if (days <= 14) return 'critical';
    if (days <= 45) return 'elevated';
    return 'normal';
  };

  const computeDaysToMoney = (): number | null => {
    const dom = getNumber(deal, ['market', 'dom_zip'], null);
    if (dom != null) return Math.max(0, Math.round(dom));
    return null;
  };

  const timelineSummary: TimelineSummary = {
    days_to_money: computeDaysToMoney(),
    carry_months: carryMonths,
    speed_band: speedBand,
    urgency: computeUrgency(computeDaysToMoney()),
    auction_date_iso: getString(deal, ['timeline', 'auction_date'], null),
  };

  const riskReasons: string[] = [];
  const riskSummary: RiskSummary = {
    overall: 'pass',
    reasons: riskReasons,
  };

  const insurability = insurabilityStatus;
  if (insurability === 'bindable') {
    riskSummary.insurability = 'pass';
  } else if (insurability) {
    riskSummary.insurability = 'watch';
    riskReasons.push('insurability: watch');
  } else {
    riskSummary.insurability = 'info_needed';
    riskReasons.push('insurability: info_needed');
  }

  const payoffPresent = getNumber(deal, ['debt', 'payoff'], null) ?? null;
  if (payoffPresent != null) {
    riskSummary.payoff = 'pass';
  } else {
    riskSummary.payoff = 'info_needed';
    riskReasons.push('payoff: info_needed');
  }

  const titleRisk = getNumber(deal, ['title', 'risk_pct'], null);
  if (titleRisk != null && titleRisk > 0.2) {
    riskSummary.title = 'watch';
    riskReasons.push('title: watch');
  }

  // Overall gate roll-up
  if (
    Object.values(riskSummary).some((v) => v === 'fail')
  ) {
    riskSummary.overall = 'fail';
  } else if (
    Object.values(riskSummary).some((v) => v === 'watch' || v === 'info_needed')
  ) {
    riskSummary.overall = 'watch';
  } else {
    riskSummary.overall = 'pass';
  }

  const evidenceSummary: EvidenceSummary = {
    confidence_grade: confidenceGrade,
    confidence_reasons: confidenceReasons ?? [],
    freshness_by_kind: {
      comps: 'missing',
      payoff_letter: payoffPresent != null ? 'fresh' : 'missing',
      title_quote: riskSummary.title ? 'missing' : 'missing',
      insurance: insurability ? 'fresh' : 'missing',
      repairs: 'missing',
    },
  };

  const outputs: UnderwriteOutputs = {
    caps: { aivCapApplied, aivCapValue: aivCapped },
    carry: {
      monthsRule: carryRule ?? null,
      monthsCap: carryCap ?? null,
      rawMonths,
      carryMonths,
    },
    fees: {
      rates: {
        list_commission_pct: lp,
        concessions_pct: cp,
        sell_close_pct: sp,
      },
      preview: {
        base_price: basePrice,
        list_commission_amount: listAmt,
        concessions_amount: consAmt,
        sell_close_amount: sellCloseAmt,
        total_seller_side_costs: totalSellerSide,
      },
    },
    summaryNotes,
    buyer_ceiling: buyerCeiling,
    buyer_ceiling_unclamped: buyerCeiling,
    respect_floor: respectFloor,
    payoff_projected: payoffProjected,
    shortfall_vs_payoff: shortfallVsPayoff,
    window_floor_to_offer: windowFloorToOffer,
    headroom_offer_to_ceiling: headroomOfferToCeiling,
    cushion_vs_payoff: cushionVsPayoff,
    mao_wholesale: maoFinalWholesale,
    mao_flip: maoFinalWholesale,
    mao_wholetail: maoFinalWholesale,
    mao_as_is_cap: aivCapped ?? aiv ?? null,
    primary_offer: primaryOffer,
    primary_offer_track: primaryTrack,
    mao_cap_wholesale: maoCapWholesale,
    seller_offer_band: sellerOfferBand,
    buyer_ask_band: buyerAskBand,
    sweet_spot_flag: sweetSpot,
    gap_flag: gapFlag,
    strategy_recommendation: strategyRecommendation,
    workflow_state: workflowState,
    confidence_grade: confidenceGrade,
    confidence_reasons: confidenceReasons,
    timeline_summary: timelineSummary,
    risk_summary: riskSummary,
    evidence_summary: evidenceSummary,
    floor_investor: floorInvestor,
    payoff_plus_essentials: payoffPlusEssentials,
    spread_cash: spreadCash,
    min_spread_required: minSpreadRequired,
    cash_gate_status: cashGate.status,
    cash_deficit: cashGate.deficit,
    borderline_flag: borderlineFlag,
  };

  return { ok: true, infoNeeded, trace, outputs };
}
