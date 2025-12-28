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
type GateStatus = 'pass' | 'watch' | 'fail' | 'info_needed';

type OfferMenuTierEligibility = {
  enabled: boolean | null;
  risk_gate_status: GateStatus | null;
  evidence_gate_status: GateStatus | null;
  reasons: string[] | null;
  blocking_gate_keys: string[] | null;
  blocking_evidence_kinds: string[] | null;
};

type OfferMenuCashTier = {
  price: number | null;
  close_window_days: number | null;
  terms_posture_key: string | null;
  notes: string | null;
  cash_gate_status?: CashGateStatus | null;
  cash_deficit?: number | null;
  eligibility?: OfferMenuTierEligibility | null;
};

type OfferMenuCash = {
  status: 'CASH_OFFER' | 'CASH_SHORTFALL' | null;
  spread_to_payoff: number | null;
  shortfall_amount: number | null;
  gap_flag?: 'no_gap' | 'narrow_gap' | 'wide_gap' | null;
  fee_metadata: {
    policy_band_amount: number | null;
    effective_amount: number | null;
    source: 'policy_band' | 'user_override' | null;
  } | null;
  tiers: {
    fastpath: OfferMenuCashTier | null;
    standard: OfferMenuCashTier | null;
    premium: OfferMenuCashTier | null;
  } | null;
};

type DtmSelectionMethod = 'default_cash_close_days' | 'earliest_compliant' | 'manual_only';
type DtmUrgencyBand = { label: string; max_dtm_days: number };

type EvidenceFreshnessPolicy = {
  max_age_days: number | null;
  is_required_for_ready: boolean;
  is_required_for_conf_a: boolean;
  is_required_for_conf_b?: boolean;
  downgrade_if_missing_to?: 'B' | 'C' | null;
  downgrade_if_stale_to?: 'B' | 'C' | null;
  block_ready_if_missing?: boolean;
  block_ready_if_stale?: boolean;
};

type ConfidencePolicy = {
  min_comps_for_aiv_A?: number | null;
  min_comps_for_aiv_B?: number | null;
  min_comps_for_arv_A?: number | null;
  min_comps_for_arv_B?: number | null;
  max_comp_age_days_A?: number | null;
  max_comp_age_days_B?: number | null;
  max_zip_stats_age_days_A?: number | null;
  max_zip_stats_age_days_B?: number | null;
  required_evidence_for_A?: string[];
  required_evidence_for_B?: string[];
  downgrade_if_any_gate_watch_to?: 'B' | 'C' | null;
  downgrade_if_any_gate_fail_to?: 'C' | null;
};

type RiskGatePolicy = {
  label: string;
  required_evidence_kinds?: string[];
  max_evidence_age_days?: number | null;
  hard_fail_conditions?: string[];
  watch_conditions?: string[];
  block_ready_on_fail?: boolean;
  downgrade_conf_on_fail_to?: 'C' | null;
  downgrade_conf_on_watch_to?: 'B' | 'C' | null;
  enabled?: boolean;
};

export type UnderwritingPolicy = {
  valuation?: {
    aiv_safety_cap_pct?: number | null;
    aiv_hard_min?: number | null;
    aiv_hard_max?: number | null;
    aiv_soft_max_vs_arv_multiplier?: number | null;
    aiv_cap_override_min_role?: string | null;
    aiv_cap_override_require_bindable_insurance?: boolean;
    aiv_cap_override_require_clear_title_quote?: boolean;
    aiv_cap_override_require_fast_zip_liquidity?: boolean;
    aiv_cap_override_require_logged_reason?: boolean;
    arv_comps_set_size_for_median?: number | null;
    arv_hard_min?: number | null;
    arv_hard_max?: number | null;
    arv_min_comps?: number | null;
    arv_soft_max_comps_age_days?: number | null;
    arv_soft_max_vs_aiv_multiplier?: number | null;
    buyer_ceiling_formula_definition?: string | null;
  };
  floors?: {
    investor_aiv_discount_p20_zip?: number | null;
    investor_aiv_discount_typical_zip?: number | null;
    payoff_min_retained_equity_pct?: number | null;
    payoff_move_out_cash_default?: number | null;
    payoff_move_out_cash_max?: number | null;
    payoff_move_out_cash_min?: number | null;
  };
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
  speed_band_dom_fast_max_days: number;
  speed_band_dom_balanced_max_days: number;
  speed_band_moi_fast_max: number;
  speed_band_moi_balanced_max: number;
  speed_band_derivation_method?: 'dom' | 'moi' | 'conservative' | 'average';
  carry_dom_offset_days: number;
  carry_dom_multiplier: number;
  carry_divisor_days: number;
  carry_months_cap: number;
  carry_formula_definition?: string | null;
  carry_months_uninsurable_extra?: number | null;
  dtm?: {
    max_days_to_money?: number | null;
    selection_method?: DtmSelectionMethod | null;
    default_cash_close_days?: number | null;
    default_wholesale_close_days?: number | null;
    manual_days_to_money_default?: number | null;
    roll_forward_rule?: 'next_business_day' | 'previous_business_day' | 'none' | null;
    clear_to_close_buffer_days?: number | null;
    board_approval_buffer_days?: number | null;
    urgent_cash_max_auction_days?: number | null;
    urgent_cash_max_dtm_days?: number | null;
    urgency_bands?: DtmUrgencyBand[];
  };
  cash_wholesale_dtm_threshold_days?: number | null; // legacy back-compat
  default_path_bias?: 'cash_wholesale' | 'list_mls';
  clear_to_close_buffer_days?: number | null; // legacy back-compat
  auction_urgency_window_days?: number | null; // legacy back-compat
  evidence_freshness?: {
    [kind: string]: EvidenceFreshnessPolicy;
  };
  confidence?: ConfidencePolicy;
  gates?: {
    [gateName: string]: RiskGatePolicy;
  };
  workflow?: {
    required_fields_ready?: string[];
    allow_override_to_ready?: boolean;
    require_reason_for_override?: boolean;
    needs_review_if_confidence_C?: boolean;
    needs_review_if_spread_shortfall?: boolean;
    state_labels?: {
      needs_info?: string;
      needs_review?: string;
      ready_for_offer?: string;
    };
  };
  workflow_policy?: {
    analyst_review_borderline_threshold?: number | null;
    cash_presentation_min_spread_over_payoff?: number | null;
    allow_placeholders_when_evidence_missing?: boolean | null;
    allow_advisor_override_workflow_state?: boolean | null;
    confidence_grade_rubric?: string | null;
  };
  ux_policy?: {
    bankers_rounding_mode?: string | null;
    buyer_costs_dual_scenario_when_unknown?: boolean | null;
    buyer_costs_line_item_modeling_method?: string | null;
  };
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
  profit_policy?: {
    assignment_fee?: {
      target_dollars?: number | null;
      max_publicized_pct_of_arv?: number | null;
    };
    flip_margin?: {
      baseline_pct?: number | null;
    };
    wholetail_margin?: {
      min_pct?: number | null;
      max_pct?: number | null;
      max_repairs_pct_of_arv?: number | null;
    };
    initial_offer_spread_multiplier?: number | null;
    min_spread_by_arv_band?: Array<{
      min_arv: number;
      max_arv: number | null;
      min_spread_dollars: number;
      min_spread_pct_of_arv?: number;
    }> | null;
  };
  disposition_policy?: {
    enabled_tracks?: string[] | null;
    double_close?: {
      min_spread_threshold_dollars?: number | null;
      include_per_diem_carry?: boolean | null;
    };
    doc_stamps?: {
      deed_rate_multiplier?: number | null;
      title_premium_rate_source?: string | null;
    };
  };
  compliance_policy?: {
    bankruptcy_stay_gate_enabled?: boolean;
    fha_90_day_gate_enabled?: boolean;
    firpta_gate_enabled?: boolean;
    flood_50_gate_enabled?: boolean;
    flood_zone_source?: string | null;
    scra_gate_enabled?: boolean;
    fha_va_overlays_gate_enabled?: boolean;
    va_wdo_water_test_gate_enabled?: boolean;
    warrantability_review_gate_enabled?: boolean;
  };
};

function minNonNull(values: Array<number | null | undefined>): number | null {
  const filtered = values.filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  if (filtered.length === 0) return null;
  return Math.min(...filtered);
}

function parseCarryMonthsFormula(
  formula: string | null | undefined,
): { multiplier?: number; offset?: number; divisor?: number } {
  if (!formula) return {};
  const multiplierMatch = formula.match(/\{DOM_zip\}\s*\*\s*([0-9.]+)/i);
  const offsetMatch = formula.match(/\+\s*([0-9.]+)/);
  const divisorMatch = formula.match(/\/\s*([0-9.]+)/);
  const multiplier = multiplierMatch ? Number(multiplierMatch[1]) : undefined;
  const offset = offsetMatch ? Number(offsetMatch[1]) : undefined;
  const divisor = divisorMatch ? Number(divisorMatch[1]) : undefined;
  return {
    multiplier: Number.isFinite(multiplier) ? multiplier : undefined,
    offset: Number.isFinite(offset) ? offset : undefined,
    divisor: Number.isFinite(divisor) ? divisor : undefined,
  };
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
    getNumber(policy, ['valuation', 'aiv_safety_cap_pct'], null) ??
    getNumber(policy, ['valuation', 'aivSafetyCapPercentage'], null) ??
    getNumber(policy, ['aivSafetyCapPercentage'], null) ??
    getNumber(policy, ['caps', 'aivSafetyCapPct'], null) ??
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

  const valuationPolicy: UnderwritingPolicy['valuation'] = {
    aiv_safety_cap_pct: aivCapPct,
    aiv_cap_override_min_role:
      getString(policy, ['valuation', 'aiv_cap_override_min_role'], null) ??
      getString(policy, ['valuation', 'aivCapOverrideApprovalRole'], null) ??
      getString(policy, ['aivCapOverrideApprovalRole'], null),
    aiv_hard_min:
      getNumber(policy, ['valuation', 'aiv_hard_min'], null) ??
      getNumber(policy, ['valuation', 'aivHardMin'], null) ??
      getNumber(policy, ['aivHardMin'], null),
    aiv_hard_max:
      getNumber(policy, ['valuation', 'aiv_hard_max'], null) ??
      getNumber(policy, ['valuation', 'aivHardMax'], null) ??
      getNumber(policy, ['aivHardMax'], null),
    aiv_soft_max_vs_arv_multiplier:
      getNumber(policy, ['valuation', 'aiv_soft_max_vs_arv_multiplier'], null) ??
      getNumber(policy, ['valuation', 'aivSoftMaxVsArvMultiplier'], null) ??
      getNumber(policy, ['caps', 'aivSoftMaxVsArvMultiplier'], null) ??
      getNumber(policy, ['aivSoftMaxVsArvMultiplier'], null),
    aiv_cap_override_require_bindable_insurance:
      getBoolean(policy, ['valuation', 'aiv_cap_override_require_bindable_insurance'], null) ??
      getBoolean(policy, ['aivCapOverrideConditionBindableInsuranceRequired'], null) ??
      undefined,
    aiv_cap_override_require_clear_title_quote:
      getBoolean(policy, ['valuation', 'aiv_cap_override_require_clear_title_quote'], null) ??
      getBoolean(policy, ['aivCapOverrideConditionClearTitleQuoteRequired'], null) ??
      undefined,
    aiv_cap_override_require_fast_zip_liquidity:
      getBoolean(policy, ['valuation', 'aiv_cap_override_require_fast_zip_liquidity'], null) ??
      getBoolean(policy, ['aivCapOverrideConditionFastZipLiquidityRequired'], null) ??
      undefined,
    aiv_cap_override_require_logged_reason:
      getBoolean(policy, ['valuation', 'aiv_cap_override_require_logged_reason'], null) ??
      getBoolean(policy, ['aivCapEvidenceVpApprovalLoggingRequirement'], null) ??
      undefined,
    arv_comps_set_size_for_median:
      getNumber(policy, ['valuation', 'arv_comps_set_size_for_median'], null) ??
      getNumber(policy, ['arvCompsSetSizeForMedian'], null),
    arv_hard_min:
      getNumber(policy, ['valuation', 'arv_hard_min'], null) ??
      getNumber(policy, ['valuation', 'arvHardMin'], null) ??
      getNumber(policy, ['arvHardMin'], null),
    arv_hard_max:
      getNumber(policy, ['valuation', 'arv_hard_max'], null) ??
      getNumber(policy, ['valuation', 'arvHardMax'], null) ??
      getNumber(policy, ['arvHardMax'], null),
    arv_min_comps:
      getNumber(policy, ['valuation', 'arv_min_comps'], null) ??
      getNumber(policy, ['arvMinComps'], null),
    arv_soft_max_comps_age_days:
      getNumber(policy, ['valuation', 'arv_soft_max_comps_age_days'], null) ??
      getNumber(policy, ['arvSoftMaxCompsAgeDays'], null),
    arv_soft_max_vs_aiv_multiplier:
      getNumber(policy, ['valuation', 'arv_soft_max_vs_aiv_multiplier'], null) ??
      getNumber(policy, ['valuation', 'arvSoftMaxVsAivMultiplier'], null) ??
      getNumber(policy, ['arvSoftMaxVsAivMultiplier'], null),
    buyer_ceiling_formula_definition:
      getString(policy, ['valuation', 'buyer_ceiling_formula_definition'], null) ??
      getString(policy, ['buyerCeilingFormulaDefinition'], null),
  };

  const aivSafetyCapDefaultPct = valuationPolicy.aiv_safety_cap_pct ?? aivCapPct;

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

  const holdCostPerMonth =
    getNumber(policy, ['carry', 'hold_cost_per_month_token'], null) ??
    getNumber(policy, ['carry', 'hold_cost_per_month'], null) ??
    undefined; // TODO(policy): wire hold cost per month by speed/track per SoTruth.

  const carryFormulaDefinition =
    getString(policy, ['carry', 'formula_definition'], null) ??
    getString(policy, ['carry', 'carryMonthsFormulaDefinition'], null) ??
    null;
  const carryParsed = parseCarryMonthsFormula(carryFormulaDefinition);
  const carryDomMultiplier =
    getNumber(policy, ['carry', 'dom_multiplier'], null) ?? carryParsed.multiplier ?? 1;
  const carryDomOffset =
    getNumber(policy, ['carry', 'dom_offset_days'], null) ?? carryParsed.offset ?? 35;
  const carryDivisor =
    getNumber(policy, ['carry', 'dom_divisor_days'], null) ?? carryParsed.divisor ?? 30;
  const carryCap =
    getNumber(policy, ['carry', 'months_cap_token'], null) ??
    getNumber(policy, ['carry', 'months_cap'], null) ??
    getNumber(policy, ['carry', 'carryMonthsCap'], null) ??
    5;
  const carryUninsurableExtra =
    getNumber(policy, ['carry', 'uninsurableAdderExtraHoldCosts'], null) ??
    getNumber(policy, ['carry', 'uninsurable_extra_hold_costs'], null) ??
    null;

  // DTM / urgency policy
  const urgencyBandsRaw = (() => {
    const bands = policy?.dtm?.urgency_bands;
    if (Array.isArray(bands) && bands.length > 0) return bands;
    return null;
  })();
  const urgencyBands =
    urgencyBandsRaw?.slice().sort((a, b) => (a.max_dtm_days ?? 0) - (b.max_dtm_days ?? 0)) ??
    [
      { label: 'Critical', max_dtm_days: 14 }, // TODO(policy): drive from Sandbox "Disposition Recommendation Logic - DTM Thresholds"
      { label: 'Elevated', max_dtm_days: 45 }, // TODO(policy): drive from Sandbox "Disposition Recommendation Logic - DTM Thresholds"
      { label: 'Normal', max_dtm_days: Number.POSITIVE_INFINITY },
    ];

  const timelinePolicy = policy?.timeline ?? {};

  const dtmPolicy = {
    max_days_to_money:
      getNumber(policy, ['dtm', 'max_days_to_money'], null) ??
      getNumber(policy, ['dtm', 'days_to_money_max'], null) ??
      getNumber(timelinePolicy, ['daysToMoneyMaxDays'], null) ??
      null,
    selection_method: ((): DtmSelectionMethod | null => {
      const method =
        getString(policy, ['dtm', 'selection_method'], null) ??
        getString(timelinePolicy, ['daysToMoneySelectionMethod'], null) ??
        getString(policy, ['daysToMoneySelectionMethod'], null);
      if (method === 'earliest_compliant') return 'earliest_compliant';
      if (method === 'manual_only') return 'manual_only';
      if (method === 'default_cash_close_days') return 'default_cash_close_days';
      return null; // TODO(policy): map explicit knob when present.
    })(),
    default_cash_close_days:
      getNumber(policy, ['dtm', 'default_cash_close_days'], null) ??
      getNumber(policy, ['dtm', 'default_days_to_cash_close'], null) ??
      getNumber(timelinePolicy, ['daysToMoneyDefaultCashCloseDays'], null) ??
      getNumber(policy, ['daysToMoneyDefaultCashCloseDays'], null) ??
      getNumber(policy, ['cash_wholesale_dtm_threshold_days'], null) ??
      null,
    default_wholesale_close_days:
      getNumber(policy, ['dtm', 'default_wholesale_close_days'], null) ??
      getNumber(policy, ['dtm', 'default_days_to_wholesale_close'], null) ??
      getNumber(timelinePolicy, ['defaultDaysToWholesaleClose'], null) ??
      getNumber(policy, ['defaultDaysToWholesaleClose'], null) ??
      null,
    manual_days_to_money_default:
      getNumber(policy, ['dtm', 'manual_days_to_money_default'], null) ??
      getNumber(policy, ['dtm', 'manual_days_to_money'], null) ??
      null,
    roll_forward_rule: ((): 'next_business_day' | 'previous_business_day' | 'none' | null => {
      const r = getString(policy, ['dtm', 'roll_forward_rule'], null);
      if (r === 'next_business_day' || r === 'previous_business_day' || r === 'none') return r;
      return null; // TODO(policy): map from Sandbox label if present.
    })(),
    clear_to_close_buffer_days:
      getNumber(policy, ['dtm', 'clear_to_close_buffer_days'], null) ??
      getNumber(policy, ['clear_to_close_buffer_days'], null) ??
      getNumber(timelinePolicy, ['clearToCloseBufferDays'], null) ??
      getNumber(policy, ['clearToCloseBufferDays'], null) ??
      null,
    board_approval_buffer_days:
      getNumber(policy, ['dtm', 'board_approval_buffer_days'], null) ??
      getNumber(timelinePolicy, ['boardApprovalBufferDays'], null) ??
      null,
    urgent_cash_max_auction_days:
      getNumber(policy, ['dtm', 'urgent_cash_max_auction_days'], null) ??
      getNumber(timelinePolicy, ['dispositionRecommendationUrgentCashMaxAuctionDays'], null) ??
      getNumber(policy, ['dispositionRecommendationUrgentCashMaxAuctionDays'], null) ??
      null,
    urgent_cash_max_dtm_days:
      getNumber(policy, ['dtm', 'urgent_cash_max_dtm_days'], null) ??
      getNumber(timelinePolicy, ['urgentMaxDtm'], null) ??
      getNumber(timelinePolicy, ['dispositionRecommendationUrgentCashMaxDtm'], null) ??
      getNumber(policy, ['dispositionRecommendationUrgentCashMaxDtm'], null) ??
      null,
    urgency_bands: urgencyBands,
  };

  const evidenceFreshnessPolicy =
    typeof policy?.evidence_freshness === 'object' && policy?.evidence_freshness != null
      ? (policy.evidence_freshness as UnderwritingPolicy['evidence_freshness'])
      : undefined;
  const confidencePolicy =
    typeof policy?.confidence === 'object' && policy?.confidence != null
      ? (policy.confidence as ConfidencePolicy)
      : undefined;
  const gatesPolicy =
    typeof policy?.gates === 'object' && policy?.gates != null ? (policy.gates as UnderwritingPolicy['gates']) : {};
  const workflowPolicy =
    typeof policy?.workflow === 'object' && policy?.workflow != null
      ? (policy.workflow as UnderwritingPolicy['workflow'])
      : undefined;

  const pctToDecimal = (n: number | null | undefined): number | null => {
    if (n == null) return null;
    if (n > 1 || n > 0.5) return n / 100; // treat as percentage points from knobs (e.g., 1.0 = 1%)
    if (n >= 0) return n;
    return null;
  };

  const floorsPolicy: UnderwritingPolicy['floors'] = {
    investor_aiv_discount_p20_zip:
      pctToDecimal(getNumber(policy, ['floors', 'floorInvestorAivDiscountP20Zip'], null)) ??
      pctToDecimal(getNumber(policy, ['floorsSpreads', 'investor_floor_discount_p20_pct'], null)) ??
      pctToDecimal(getNumber(policy, ['floorInvestorAivDiscountP20Zip'], null)),
    investor_aiv_discount_typical_zip:
      pctToDecimal(getNumber(policy, ['floors', 'floorInvestorAivDiscountTypicalZip'], null)) ??
      pctToDecimal(getNumber(policy, ['floorsSpreads', 'investor_floor_discount_typical_pct'], null)) ??
      pctToDecimal(getNumber(policy, ['floorInvestorAivDiscountTypicalZip'], null)),
    payoff_min_retained_equity_pct:
      pctToDecimal(getNumber(policy, ['floors', 'floorPayoffMinRetainedEquityPercentage'], null)) ??
      pctToDecimal(getNumber(policy, ['floorsSpreads', 'retained_equity_pct'], null)) ??
      pctToDecimal(getNumber(policy, ['floorPayoffMinRetainedEquityPercentage'], null)),
    payoff_move_out_cash_default:
      getNumber(policy, ['floors', 'floorPayoffMoveOutCashDefault'], null) ??
      getNumber(policy, ['floorsSpreads', 'move_out_cash_default'], null) ??
      getNumber(policy, ['floorPayoffMoveOutCashDefault'], null),
    payoff_move_out_cash_max:
      getNumber(policy, ['floors', 'floorPayoffMoveOutCashMax'], null) ??
      getNumber(policy, ['floorsSpreads', 'move_out_cash_max'], null) ??
      getNumber(policy, ['floorPayoffMoveOutCashMax'], null),
    payoff_move_out_cash_min:
      getNumber(policy, ['floors', 'floorPayoffMoveOutCashMin'], null) ??
      getNumber(policy, ['floorsSpreads', 'move_out_cash_min'], null) ??
      getNumber(policy, ['floorPayoffMoveOutCashMin'], null),
  };

  const investorDiscountP20 =
    floorsPolicy.investor_aiv_discount_p20_zip ??
    getNumber(policy, ['floorsSpreads', 'investor_floor_discount_p20_pct'], null);
  const investorDiscountTypical =
    floorsPolicy.investor_aiv_discount_typical_zip ??
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
    floorsPolicy.payoff_min_retained_equity_pct ??
    getNumber(policy, ['floorsSpreads', 'retained_equity_pct'], null) ??
    null;

  const moveOutCashDefault =
    floorsPolicy.payoff_move_out_cash_default ??
    getNumber(policy, ['floorsSpreads', 'move_out_cash_default'], null) ??
    0;
  const moveOutCashMin =
    floorsPolicy.payoff_move_out_cash_min ??
    getNumber(policy, ['floorsSpreads', 'move_out_cash_min'], null) ??
    undefined;
  const moveOutCashMax =
    floorsPolicy.payoff_move_out_cash_max ??
    getNumber(policy, ['floorsSpreads', 'move_out_cash_max'], null) ??
    undefined;

  const holdCostsPolicy = (policy as any)?.hold_costs ?? (policy as any)?.holdCosts ?? null;
  const holdCosts: UnderwritingPolicy['hold_costs'] = {
    flip: {
      fast: {
        monthly_pct_of_arv:
          holdCostsPolicy?.flip?.fast?.monthly_pct_of_arv ??
          pctToDecimal(getNumber(policy, ['holdCostsFlipFastZip'], null)),
      },
      neutral: {
        monthly_pct_of_arv:
          holdCostsPolicy?.flip?.neutral?.monthly_pct_of_arv ??
          pctToDecimal(getNumber(policy, ['holdCostsFlipNeutralZip'], null)),
      },
      slow: {
        monthly_pct_of_arv:
          holdCostsPolicy?.flip?.slow?.monthly_pct_of_arv ??
          pctToDecimal(getNumber(policy, ['holdCostsFlipSlowZip'], null)),
      },
    },
    wholetail: {
      fast: {
        monthly_pct_of_arv:
          holdCostsPolicy?.wholetail?.fast?.monthly_pct_of_arv ??
          pctToDecimal(getNumber(policy, ['holdCostsWholetailFastZip'], null)),
      },
      neutral: {
        monthly_pct_of_arv:
          holdCostsPolicy?.wholetail?.neutral?.monthly_pct_of_arv ??
          pctToDecimal(getNumber(policy, ['holdCostsWholetailNeutralZip'], null)),
      },
      slow: {
        monthly_pct_of_arv:
          holdCostsPolicy?.wholetail?.slow?.monthly_pct_of_arv ??
          pctToDecimal(getNumber(policy, ['holdCostsWholetailSlowZip'], null)),
      },
    },
    wholesale_monthly_pct_of_arv_default:
      holdCostsPolicy?.wholesale_monthly_pct_of_arv_default ??
      pctToDecimal(getNumber(policy, ['holdCostsWholesaleMonthlyPctOfArvDefault'], null)),
    default_monthly_bills: {
      tax:
        holdCostsPolicy?.default_monthly_bills?.tax ??
        getNumber(policy, ['holdingCostsMonthlyDefaultTaxes'], null),
      insurance:
        holdCostsPolicy?.default_monthly_bills?.insurance ??
        getNumber(policy, ['holdingCostsMonthlyDefaultInsurance'], null),
      hoa:
        holdCostsPolicy?.default_monthly_bills?.hoa ??
        getNumber(policy, ['holdingCostsMonthlyDefaultHoa'], null),
      utilities:
        holdCostsPolicy?.default_monthly_bills?.utilities ??
        getNumber(policy, ['holdingCostsMonthlyDefaultUtilities'], null),
    },
  };

  const aivOverrideRules = {
    min_role: valuationPolicy.aiv_cap_override_min_role ?? getString(policy, ['aivCapOverrideApprovalRole'], null),
    require_bindable_insurance: Boolean(
      valuationPolicy.aiv_cap_override_require_bindable_insurance ??
        policy?.aivCapOverrideConditionBindableInsuranceRequired ??
        false,
    ),
    require_clear_title: Boolean(
      valuationPolicy.aiv_cap_override_require_clear_title_quote ??
        policy?.aivCapOverrideConditionClearTitleQuoteRequired ??
        false,
    ),
    require_fast_zip: Boolean(
      valuationPolicy.aiv_cap_override_require_fast_zip_liquidity ??
        policy?.aivCapOverrideConditionFastZipLiquidityRequired ??
        false,
    ),
    require_logged_reason: Boolean(
      valuationPolicy.aiv_cap_override_require_logged_reason ??
        policy?.aivCapEvidenceVpApprovalLoggingRequirement ??
        false,
    ),
  };

  const speedBandDomFast = getNumber(policy, ['speedBandsFastMaxDom'], null) ?? 30;
  const speedBandDomBalanced = getNumber(policy, ['speedBandsBalancedMaxDom'], null) ?? 90;
  const speedBandMoiFast = getNumber(policy, ['speedBandsFastMaxMoi'], null) ?? 3;
  const speedBandMoiBalanced = getNumber(policy, ['speedBandsBalancedMaxMoi'], null) ?? 6;
  const speedBandMethod =
    getString(policy, ['zipSpeedBandDerivationMethod'], null) ??
    null; // TODO(policy): map to enum; default derivation remains conservative.

  const cashWholesaleDtmThreshold =
    getNumber(policy, ['workflow', 'cashWholesaleDtmThresholdDays'], null) ??
    getNumber(policy, ['cashWholesaleDtmThresholdDays'], null) ??
    null; // TODO(policy): wire exact knob if present.
  const defaultPathBias =
    getString(policy, ['workflow', 'defaultPathBias'], null) ??
    getString(policy, ['defaultPathBias'], null) ??
    null;
  const clearToCloseBufferDays =
    getNumber(policy, ['workflow', 'clearToCloseBufferDays'], null) ??
    getNumber(policy, ['clearToCloseBufferDays'], null) ??
    getNumber(policy, ['clearToCloseBufferDaysUnresolvedTitleInsurance'], null) ??
    getNumber(timelinePolicy, ['clearToCloseBufferDays'], null) ??
    null;
  const auctionUrgencyWindowDays = getNumber(policy, ['workflow', 'auctionUrgencyWindowDays'], null) ?? null;

  const bandsSource =
    policy?.floorsSpreads?.min_spread_by_arv_band ??
    policy?.floorsSpreads?.minSpreadByArvBand ??
    policy?.min_spread_by_arv_band ??
    policy?.minSpreadByArvBand ??
    policy?.profit_policy?.min_spread_by_arv_band ??
    policy?.profit?.minSpreadByArvBand ??
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
    getNumber(policy, ['workflow_policy', 'cash_presentation_min_spread_over_payoff'], null) ??
    getNumber(policy, ['workflow', 'cashPresentationGateMinimumSpreadOverPayoff'], null) ??
    getNumber(policy, ['cashPresentationGateMinimumSpreadOverPayoff'], null) ??
    10000; // TODO(policy): wire cashPresentationGateMinimumSpreadOverPayoff knob in policy payload.

  const borderlineBandWidth =
    getNumber(policy, ['workflow_policy', 'analyst_review_borderline_threshold'], null) ??
    getNumber(policy, ['workflow', 'analystReviewTriggerBorderlineBandThreshold'], null) ??
    getNumber(policy, ['analystReviewTriggerBorderlineBandThreshold'], null) ??
    5000; // TODO(policy): wire analystReviewTriggerBorderlineBandThreshold knob in policy payload.

  const profitPolicy = {
    assignment_fee: {
      target_dollars:
        getNumber(policy, ['profit_policy', 'assignment_fee', 'target_dollars'], null) ??
        getNumber(policy, ['profit', 'assignmentFeeTargetDollars'], null) ??
        getNumber(policy, ['floorsSpreads', 'assignmentFeeTarget'], null) ??
        getNumber(policy, ['assignmentFeeTarget'], null),
      max_publicized_pct_of_arv:
        pctToDecimal(
          getNumber(policy, ['profit_policy', 'assignment_fee', 'max_publicized_pct_of_arv'], null) ??
            getNumber(policy, ['profit', 'assignmentFeeMaxPublicizedPctOfArv'], null) ??
            getNumber(policy, ['floorsSpreads', 'assignmentFeeMaxPublicizedArvPercentage'], null) ??
            getNumber(policy, ['assignmentFeeMaxPublicizedArvPercentage'], null),
        ),
    },
    flip_margin: {
      baseline_pct:
        getNumber(policy, ['profit_policy', 'flip_margin', 'baseline_pct'], null) ??
        pctToDecimal(getNumber(policy, ['profit', 'flipMarginBaselinePct'], null)) ??
        pctToDecimal(getNumber(policy, ['margins', 'buyerTargetMarginFlipBaselinePolicy'], null)) ??
        pctToDecimal(getNumber(policy, ['floorsSpreads', 'buyerTargetMarginFlipBaselinePolicy'], null)),
    },
    wholetail_margin: {
      min_pct:
        getNumber(policy, ['profit_policy', 'wholetail_margin', 'min_pct'], null) ??
        pctToDecimal(getNumber(policy, ['profit', 'wholetailMarginMinPct'], null)) ??
        pctToDecimal(getNumber(policy, ['margins', 'buyerTargetMarginWholetailMinPercentage'], null)),
      max_pct:
        getNumber(policy, ['profit_policy', 'wholetail_margin', 'max_pct'], null) ??
        pctToDecimal(getNumber(policy, ['profit', 'wholetailMarginMaxPct'], null)) ??
        pctToDecimal(getNumber(policy, ['margins', 'buyerTargetMarginWholetailMaxPercentage'], null)),
      max_repairs_pct_of_arv:
        getNumber(policy, ['profit_policy', 'wholetail_margin', 'max_repairs_pct_of_arv'], null) ??
        pctToDecimal(getNumber(policy, ['profit', 'wholetailMaxRepairsPctOfArv'], null)) ??
        pctToDecimal(getNumber(policy, ['wholetail', 'buyerSegmentationWholetailMaxRepairsAsArvPercentage'], null)),
    },
    initial_offer_spread_multiplier:
      getNumber(policy, ['profit_policy', 'initial_offer_spread_multiplier'], null) ??
      getNumber(policy, ['profit', 'initialOfferSpreadMultiplier'], null) ??
      getNumber(policy, ['spreads', 'initialOfferSpreadMultiplier'], null) ??
      null,
    min_spread_by_arv_band: Array.isArray(bandsSource) ? bandsSource : undefined,
  };

  const dispositionPolicy = {
    enabled_tracks:
      (policy?.disposition_policy?.enabled_tracks as string[] | undefined) ??
      (policy?.disposition?.dispositionTrackEnablement as string[] | undefined) ??
      (policy?.dispositionTrackEnablement as string[] | undefined),
    double_close: {
      min_spread_threshold_dollars:
        getNumber(policy, ['disposition_policy', 'double_close', 'min_spread_threshold_dollars'], null) ??
        getNumber(policy, ['disposition', 'doubleCloseMinSpreadThreshold'], null) ??
        getNumber(policy, ['doubleCloseMinSpreadThreshold'], null),
      include_per_diem_carry:
        getBoolean(policy, ['disposition_policy', 'double_close', 'include_per_diem_carry'], null) ??
        getBoolean(policy, ['disposition', 'doubleClosePerDiemCarryModeling'], null) ??
        getBoolean(policy, ['doubleClosePerDiemCarryModeling'], null),
    },
    doc_stamps: {
      deed_rate_multiplier:
        getNumber(policy, ['disposition_policy', 'doc_stamps', 'deed_rate_multiplier'], null) ??
        getNumber(policy, ['disposition', 'deedDocumentaryStampRatePolicy'], null) ??
        getNumber(policy, ['deedDocumentaryStampRatePolicy'], null),
      title_premium_rate_source:
        getString(policy, ['disposition_policy', 'doc_stamps', 'title_premium_rate_source'], null) ??
        getString(policy, ['disposition', 'titlePremiumRateSource'], null) ??
        getString(policy, ['titlePremiumRateSource'], null),
    },
  };

  const compliancePolicy: UnderwritingPolicy['compliance_policy'] = {
    bankruptcy_stay_gate_enabled:
      getBoolean(policy, ['compliance', 'bankruptcyStayGateLegalBlock'], null) ??
      getBoolean(policy, ['compliance_policy', 'bankruptcy_stay_gate_enabled'], null) ??
      false,
    fha_90_day_gate_enabled:
      getBoolean(policy, ['compliance', 'fha90DayResaleRuleGate'], null) ??
      getBoolean(policy, ['compliance_policy', 'fha_90_day_gate_enabled'], null) ??
      false,
    firpta_gate_enabled:
      getBoolean(policy, ['compliance', 'firptaWithholdingGate'], null) ??
      getBoolean(policy, ['compliance_policy', 'firpta_gate_enabled'], null) ??
      false,
    flood_50_gate_enabled:
      getBoolean(policy, ['compliance', 'flood50RuleGate'], null) ??
      getBoolean(policy, ['compliance_policy', 'flood_50_gate_enabled'], null) ??
      false,
    flood_zone_source:
      getString(policy, ['compliance', 'floodZoneEvidenceSourceFemaMapSelector'], null) ??
      getString(policy, ['compliance_policy', 'flood_zone_source'], null) ??
      null,
    scra_gate_enabled:
      getBoolean(policy, ['compliance', 'scraVerificationGate'], null) ??
      getBoolean(policy, ['compliance_policy', 'scra_gate_enabled'], null) ??
      false,
    fha_va_overlays_gate_enabled:
      getBoolean(policy, ['compliance', 'stateProgramGateFhaVaOverlays'], null) ??
      getBoolean(policy, ['compliance_policy', 'fha_va_overlays_gate_enabled'], null) ??
      false,
    va_wdo_water_test_gate_enabled:
      getBoolean(policy, ['compliance', 'vaProgramRequirementsWdoWaterTestEvidence'], null) ??
      getBoolean(policy, ['compliance_policy', 'va_wdo_water_test_gate_enabled'], null) ??
      false,
    warrantability_review_gate_enabled:
      getBoolean(policy, ['compliance', 'warrantabilityReviewRequirementCondoEligibilityScreens'], null) ??
      getBoolean(policy, ['compliance_policy', 'warrantability_review_gate_enabled'], null) ??
      false,
  };

  return {
    valuation: valuationPolicy,
    floors: floorsPolicy,
    aiv_cap_pct: aivSafetyCapDefaultPct ?? 1,
    aiv_safety_cap: {
      default_pct: aivSafetyCapDefaultPct ?? null,
      override_pct: aivCapOverridePct ?? null,
      override_rules: aivOverrideRules,
    },
    allow_aiv_cap_99_insurable: false, // legacy flag; override handled via aiv_safety_cap rules
    min_spread_by_arv_band: minSpreadBands,
    cash_gate_min: cashGateMin ?? 10000,
    borderline_band_width: borderlineBandWidth ?? 5000,
    speed_band_dom_fast_max_days: speedBandDomFast,
    speed_band_dom_balanced_max_days: speedBandDomBalanced,
    speed_band_moi_fast_max: speedBandMoiFast,
    speed_band_moi_balanced_max: speedBandMoiBalanced,
    speed_band_derivation_method:
      speedBandMethod === 'dom' ||
      speedBandMethod === 'moi' ||
      speedBandMethod === 'conservative' ||
      speedBandMethod === 'average'
        ? speedBandMethod
        : undefined,
    carry_dom_multiplier: carryDomMultiplier ?? 1,
    carry_dom_offset_days: carryDomOffset ?? 35,
    carry_divisor_days: carryDivisor ?? 30,
    carry_months_cap: carryCap ?? 5,
    carry_formula_definition: carryFormulaDefinition,
    carry_months_uninsurable_extra: carryUninsurableExtra ?? null,
    cash_wholesale_dtm_threshold_days: cashWholesaleDtmThreshold,
    default_path_bias:
      defaultPathBias === 'list_mls' ? 'list_mls' : defaultPathBias === 'cash_wholesale' ? 'cash_wholesale' : undefined,
    clear_to_close_buffer_days: clearToCloseBufferDays,
    auction_urgency_window_days: auctionUrgencyWindowDays ?? undefined,
    dtm: dtmPolicy,
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
    profit_policy: profitPolicy,
    disposition_policy: dispositionPolicy,
    compliance_policy: compliancePolicy,
    evidence_freshness: evidenceFreshnessPolicy,
    confidence: confidencePolicy,
    gates: gatesPolicy,
    workflow: workflowPolicy,
    workflow_policy: policy.workflow_policy ?? undefined,
    ux_policy: policy.ux_policy ?? undefined,
  };
}

function computeBuyerCeiling(params: {
  arv: number | null;
  policy: UnderwritingPolicy;
  repairs: number | null;
  carryMonths: number | null;
  moiZip: number | null;
  infoNeeded: InfoNeeded[];
  track?: 'wholesale' | 'flip' | 'wholetail';
  speedBand?: SpeedBand;
}): {
  buyerCeiling: number | null;
  holdCostPerMonth: number;
  carryCostTotal: number;
  holdCostTrace: Record<string, unknown>;
  marginPctUsed: number | null;
  marginTrace: Record<string, unknown>;
  buyerCostsTotal: number;
} {
  const { arv, policy, repairs, carryMonths, moiZip, infoNeeded, track = 'wholesale', speedBand } = params;

  // Phase 1 Law (SoT): Buyer Ceiling uses MOI-tiered dynamic target margins.
  // Conservative selection rule: choose the HIGH end of each MOI tier range.
  // MOI tiers:
  // - Hot (MOI <= 2.0): 14-16% -> use 16%
  // - Balanced (MOI <= 4.0): 16-18% -> use 18%
  // - Cool (MOI > 4.0): 18-20% -> use 20%
  //
  // Policy scalar fallback is allowed ONLY when MOI is missing.
  const normalizePct = (n: number | null | undefined): number | null => {
    if (n == null) return null;
    if (!Number.isFinite(n)) return null;
    if (n <= 0) return null;
    // tolerate percent points (e.g., 18 => 18%)
    if (n > 1) return n / 100;
    if (n >= 1) return null;
    return n;
  };

  const tiers: Array<{
    tier: 'hot' | 'balanced' | 'cool';
    moi_max_inclusive: number | null;
    min_pct: number;
    max_pct: number;
  }> = [
    { tier: 'hot', moi_max_inclusive: 2.0, min_pct: 0.14, max_pct: 0.16 },
    { tier: 'balanced', moi_max_inclusive: 4.0, min_pct: 0.16, max_pct: 0.18 },
    { tier: 'cool', moi_max_inclusive: null, min_pct: 0.18, max_pct: 0.20 },
  ];

  const scalarFallbackPct = normalizePct(policy.buyer_target_margin_wholesale_pct);

  let marginPctUsed: number | null = null;
  let marginTrace: Record<string, unknown> = {
    moi_zip: moiZip ?? null,
    selection_method: null,
    selected_tier: null,
    selected_range_min: null,
    selected_range_max: null,
    selected_margin_pct: null,
    policy_scalar_fallback_pct: scalarFallbackPct,
    tier_definitions: tiers,
  };

  if (moiZip != null && Number.isFinite(moiZip)) {
    const tier =
      tiers.find((t) => t.moi_max_inclusive != null && moiZip <= t.moi_max_inclusive) ??
      tiers[tiers.length - 1];

    // Conservative selection: high end of tier range.
    marginPctUsed = tier.max_pct;
    marginTrace = {
      ...marginTrace,
      selection_method: 'moi_tier_conservative_high_end',
      selected_tier: tier.tier,
      selected_range_min: tier.min_pct,
      selected_range_max: tier.max_pct,
      selected_margin_pct: marginPctUsed,
    };
  } else if (scalarFallbackPct != null) {
    marginPctUsed = scalarFallbackPct;
    marginTrace = {
      ...marginTrace,
      selection_method: 'policy_scalar_fallback_no_moi',
      selected_margin_pct: marginPctUsed,
    };
    infoNeeded.push({
      path: 'deal.market.moi_zip',
      token: null,
      reason: 'MOI missing; using policy scalar wholesale margin fallback (non-tiered).',
      source_of_truth: 'investor_set',
    });
  } else {
    infoNeeded.push({
      path: 'deal.market.moi_zip',
      token: null,
      reason: 'MOI required to compute Buyer Ceiling (Max_Buyer) under MOI-tiered margin rules.',
      source_of_truth: 'investor_set',
    });
    infoNeeded.push({
      path: 'policy.floorsSpreads.wholesale_target_margin_pct',
      token: null,
      reason: 'Missing policy scalar wholesale target margin fallback.',
      source_of_truth: 'team_policy_set',
    });
    return {
      buyerCeiling: null,
      holdCostPerMonth: 0,
      carryCostTotal: 0,
      holdCostTrace: {},
      marginPctUsed: null,
      marginTrace,
      buyerCostsTotal: 0,
    };
  }

  if (marginPctUsed == null || marginPctUsed <= 0 || marginPctUsed >= 1) {
    infoNeeded.push({
      path: 'policy.floorsSpreads.wholesale_target_margin_pct',
      token: null,
      reason: 'Invalid buyer target margin selected; must be > 0% and < 100%.',
      source_of_truth: 'team_policy_set',
    });
    return {
      buyerCeiling: null,
      holdCostPerMonth: 0,
      carryCostTotal: 0,
      holdCostTrace: {},
      marginPctUsed: null,
      marginTrace,
      buyerCostsTotal: 0,
    };
  }

  if (arv == null) {
    infoNeeded.push({
      path: 'deal.market.arv',
      token: null,
      reason: 'ARV required to compute Buyer Ceiling (Max_Buyer).',
      source_of_truth: 'investor_set',
    });
    return {
      buyerCeiling: null,
      holdCostPerMonth: 0,
      carryCostTotal: 0,
      holdCostTrace: {},
      marginPctUsed,
      marginTrace,
      buyerCostsTotal: 0,
    };
  }

  if (repairs == null) {
    infoNeeded.push({
      path: 'deal.repairs.total',
      token: null,
      reason: 'Repairs required to compute Buyer Ceiling (Max_Buyer).',
      source_of_truth: 'investor_set',
    });
    return {
      buyerCeiling: null,
      holdCostPerMonth: 0,
      carryCostTotal: 0,
      holdCostTrace: {},
      marginPctUsed,
      marginTrace,
      buyerCostsTotal: 0,
    };
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
  const bills = holdCosts?.default_monthly_bills ?? {};
  const trackConfig =
    track === 'flip' ? holdCosts?.flip : track === 'wholetail' ? holdCosts?.wholetail : null;
  const pct =
    trackConfig?.[normalizedSpeed ?? 'neutral']?.monthly_pct_of_arv ??
    holdCosts?.wholesale_monthly_pct_of_arv_default ??
    null;
  const defaultBillsSum =
    (bills?.tax ?? 0) +
    (bills?.insurance ?? 0) +
    (bills?.hoa ?? 0) +
    (bills?.utilities ?? 0);
  const pctHoldCost = pct != null ? pct * arv : 0;
  const holdCostPerMonth =
    pctHoldCost > 0 || defaultBillsSum > 0
      ? round2(pctHoldCost + defaultBillsSum)
      : policy.hold_cost_per_month ?? 0; // legacy fallback
  const carryCostTotal =
    carryMonths != null && holdCostPerMonth != null ? round2(carryMonths * holdCostPerMonth) : 0;

  const holdCostTrace = {
    track,
    speed_band: normalizedSpeed,
    pct_of_arv: pct ?? null,
    default_bills: {
      tax: bills?.tax ?? 0,
      insurance: bills?.insurance ?? 0,
      hoa: bills?.hoa ?? 0,
      utilities: bills?.utilities ?? 0,
    },
    default_bills_sum: defaultBillsSum,
    hold_cost_per_month: holdCostPerMonth,
    carry_months: carryMonths,
    carry_cost_total: carryCostTotal,
    buyer_costs_total: buyerCostsTotal,
    source: pct != null || defaultBillsSum > 0 ? 'policy' : 'legacy_scalar',
  };

  const base = arv * (1 - marginPctUsed);
  const buyerCeiling = round2(base - buyerCostsTotal - repairsTotal - carryCostTotal);

  return {
    buyerCeiling,
    holdCostPerMonth,
    carryCostTotal,
    holdCostTrace,
    marginPctUsed,
    marginTrace,
    buyerCostsTotal,
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
): {
  floorInvestor: number | null;
  discountP20: number | null;
  discountTypical: number | null;
  appliedDiscount: number | null;
  usedBand: 'p20' | 'typical' | null;
} {
  if (aiv == null) {
    infoNeeded.push({
      path: 'deal.market.aiv',
      token: null,
      reason: 'AIV required to compute Floor_Investor.',
      source_of_truth: 'investor_set',
    });
    return { floorInvestor: null, discountP20: null, discountTypical: null, appliedDiscount: null, usedBand: null };
  }

  const discountP20 =
    policy.floors?.investor_aiv_discount_p20_zip ??
    policy.investor_discount_p20_zip_pct ??
    null;
  const discountTypical =
    policy.floors?.investor_aiv_discount_typical_zip ??
    policy.investor_discount_typical_zip_pct ??
    null;

  if (discountP20 == null || discountTypical == null) {
    infoNeeded.push({
      path: 'policy.floorsSpreads.investor_floor_discount',
      token: '<INVESTOR_FLOOR_DISCOUNT>',
      reason: 'Missing investor floor discount percentages (P20/Typical).',
      source_of_truth: 'team_policy_set',
    });
  }

  const useP20 = zipPercentile != null && zipPercentile <= 20;
  const appliedDiscount = useP20 ? discountP20 ?? discountTypical : discountTypical ?? discountP20;
  const usedBand = appliedDiscount == null ? null : useP20 && discountP20 != null ? 'p20' : 'typical';

  if (appliedDiscount == null) {
    return { floorInvestor: null, discountP20, discountTypical, appliedDiscount: null, usedBand };
  }

  return {
    floorInvestor: round2(aiv * (1 - appliedDiscount)),
    discountP20,
    discountTypical,
    appliedDiscount,
    usedBand,
  };
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
  const multiplier =
    getNumber(policy, ['profit_policy', 'initial_offer_spread_multiplier'], null) ??
    getNumber(policy, ['profit', 'initialOfferSpreadMultiplier'], null) ??
    getNumber(policy, ['spreads', 'initialOfferSpreadMultiplier'], null) ??
    1;
  const adjusted =
    minSpread != null && Number.isFinite(multiplier) && multiplier > 0
      ? round2(minSpread * multiplier)
      : minSpread;

  return { minSpread: adjusted, band: selected };
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

function computeCashGateForPrice(
  price: number | null,
  payoffProjected: number | null,
  minSpreadRequired: number | null,
): { cash_gate_status: CashGateStatus; cash_deficit: number | null } {
  if (
    price == null ||
    payoffProjected == null ||
    minSpreadRequired == null ||
    !Number.isFinite(price) ||
    !Number.isFinite(payoffProjected) ||
    !Number.isFinite(minSpreadRequired)
  ) {
    return { cash_gate_status: 'unknown', cash_deficit: null };
  }

  const spread = round2(price - payoffProjected);
  if (spread >= minSpreadRequired) {
    return { cash_gate_status: 'pass', cash_deficit: 0 };
  }

  return {
    cash_gate_status: 'shortfall',
    cash_deficit: round2(Math.max(0, minSpreadRequired - spread)),
  };
}

function computeSpeedBandPolicy(
  domZip: number | null,
  moiZip: number | null,
  policy: UnderwritingPolicy,
): { speedBand: SpeedBand; trace: Record<string, unknown> } {
  const dom = domZip;
  const moi = moiZip;
  const domBand =
    dom == null
      ? null
      : dom <= policy.speed_band_dom_fast_max_days
      ? 'fast'
      : dom <= policy.speed_band_dom_balanced_max_days
      ? 'balanced'
      : 'slow';
  const moiBand =
    moi == null
      ? null
      : moi <= policy.speed_band_moi_fast_max
      ? 'fast'
      : moi <= policy.speed_band_moi_balanced_max
      ? 'balanced'
      : 'slow';

  const method = policy.speed_band_derivation_method ?? 'conservative'; // TODO(policy): drive from knob if present.
  let band: SpeedBand = null;
  if (method === 'dom') {
    band = domBand;
  } else if (method === 'moi') {
    band = moiBand;
  } else if (method === 'average') {
    band = domBand ?? moiBand ?? null;
    if (band && moiBand && domBand && band !== moiBand) {
      band = domBand; // lean to DOM when mixed
    }
  } else {
    // conservative: pick slower of the two when both exist
    if (domBand && moiBand) {
      const order = ['fast', 'balanced', 'slow'];
      band = order[Math.max(order.indexOf(domBand), order.indexOf(moiBand))] as SpeedBand;
    } else {
      band = domBand ?? moiBand ?? null;
    }
  }

  return {
    speedBand: band,
    trace: {
      dom_zip: domZip,
      moi_zip: moiZip,
      dom_fast_max: policy.speed_band_dom_fast_max_days,
      dom_balanced_max: policy.speed_band_dom_balanced_max_days,
      moi_fast_max: policy.speed_band_moi_fast_max,
      moi_balanced_max: policy.speed_band_moi_balanced_max,
      method,
      dom_band: domBand,
      moi_band: moiBand,
    },
  };
}

function computeCarryMonthsFromPolicy(
  domZip: number | null,
  policy: UnderwritingPolicy,
): { raw: number | null; capped: number | null; base_raw: number | null; extra_months: number | null } {
  if (domZip == null) return { raw: null, capped: null, base_raw: null, extra_months: null };
  const baseRaw =
    ((domZip ?? 0) * (policy.carry_dom_multiplier ?? 1) + (policy.carry_dom_offset_days ?? 0)) /
    (policy.carry_divisor_days ?? 30);
  const extraMonths = Number.isFinite(policy.carry_months_uninsurable_extra ?? null)
    ? Number(policy.carry_months_uninsurable_extra)
    : 0;
  const raw = baseRaw + extraMonths;
  const capped =
    policy.carry_months_cap != null && Number.isFinite(policy.carry_months_cap)
      ? Math.min(raw, policy.carry_months_cap)
      : raw;
  return { raw, capped, base_raw: baseRaw, extra_months: extraMonths || null };
}

function computeCarryTotals(
  carryMonths: number | null,
  holdMonthly: number | null,
): { carry_total: number | null } {
  if (carryMonths == null || holdMonthly == null) return { carry_total: null };
  return { carry_total: round2(carryMonths * holdMonthly) };
}

function computeDaysToMoneyPolicy(params: {
  domZip: number | null;
  auctionDateIso: string | null;
  policy: UnderwritingPolicy;
  bindableInsurance?: boolean | null;
  clearTitle?: boolean | null;
  boardApprovalRequired?: boolean | null;
}): {
  dtmSelected: number | null;
  dtmCashWholesale: number | null;
  dtmList: number | null;
  dtmAuction: number | null;
  urgency: 'normal' | 'elevated' | 'critical' | null;
  source: 'auction' | 'cash_wholesale' | 'list' | 'unknown' | null;
  clearToCloseBufferDays: number | null;
  trace: Record<string, unknown>;
} {
  const { domZip, auctionDateIso, policy, bindableInsurance, clearTitle, boardApprovalRequired } = params;
  const dtmPolicy = policy.dtm ?? {};
  const defaultCashClose = dtmPolicy.default_cash_close_days ?? policy.cash_wholesale_dtm_threshold_days ?? null;
  const defaultWholesaleClose = dtmPolicy.default_wholesale_close_days ?? defaultCashClose;
  const maxDtm = dtmPolicy.max_days_to_money ?? null;

  const candidates: Array<{ source: 'auction' | 'cash_wholesale' | 'list' | 'manual'; dtm_days: number | null }> = [
    { source: 'cash_wholesale', dtm_days: defaultCashClose },
    { source: 'list', dtm_days: defaultWholesaleClose != null ? Math.round(defaultWholesaleClose * 1.5) : null },
  ];

  if (dtmPolicy.manual_days_to_money_default != null) {
    candidates.push({ source: 'manual', dtm_days: dtmPolicy.manual_days_to_money_default });
  }

  // Auction is only computed deterministically when a date diff is available; keep null otherwise (TODO(data)).
  candidates.push({ source: 'auction', dtm_days: auctionDateIso ? null : null });

  // Use DOM as a proxy when no defaults provided to stay deterministic.
  if (candidates.every((c) => c.dtm_days == null) && domZip != null) {
    candidates.push({ source: 'cash_wholesale', dtm_days: Math.max(0, Math.round(domZip)) });
  }

  // Apply buffers when evidence is missing/unresolved.
  const buffer =
    (bindableInsurance === false || clearTitle === false) && dtmPolicy.clear_to_close_buffer_days != null
      ? dtmPolicy.clear_to_close_buffer_days
      : dtmPolicy.clear_to_close_buffer_days ?? null;
  const boardBuffer =
    boardApprovalRequired && dtmPolicy.board_approval_buffer_days != null ? dtmPolicy.board_approval_buffer_days : 0;

  const applyBuffers = (days: number | null): number | null => {
    if (days == null) return null;
    let withBuffers = days + (buffer ?? 0) + boardBuffer;
    if (maxDtm != null) {
      withBuffers = Math.min(withBuffers, maxDtm);
    }
    return Math.max(0, Math.round(withBuffers));
  };

  const buffered = candidates
    .map((c) => ({ ...c, dtm_days: applyBuffers(c.dtm_days) }))
    .filter((c) => c.dtm_days != null) as Array<{ source: any; dtm_days: number }>;

  const sorted = buffered.sort((a, b) => (a.dtm_days ?? Number.MAX_SAFE_INTEGER) - (b.dtm_days ?? Number.MAX_SAFE_INTEGER));
  const selected = sorted[0] ?? null;
  const dtmSelected = selected?.dtm_days ?? null;
  const dtmCashWholesale =
    buffered.find((c) => c.source === 'cash_wholesale')?.dtm_days ??
    (defaultCashClose != null ? applyBuffers(defaultCashClose) : null);
  const dtmList =
    buffered.find((c) => c.source === 'list')?.dtm_days ??
    (defaultWholesaleClose != null ? applyBuffers(Math.round(defaultWholesaleClose * 1.5)) : null);
  const dtmAuction = buffered.find((c) => c.source === 'auction')?.dtm_days ?? null;
  const source: 'auction' | 'cash_wholesale' | 'list' | 'unknown' | null = selected?.source ?? null;

  // Urgency from policy bands; map labels to canonical enum values.
  const band = (dtmPolicy.urgency_bands ?? []).find((b) => dtmSelected != null && dtmSelected <= b.max_dtm_days);
  const urgencyMapped = (() => {
    if (band?.label) {
      const l = band.label.toLowerCase();
      if (l.includes('critical') || l.includes('emerg')) return 'critical';
      if (l.includes('elevated') || l.includes('high') || l.includes('urgent')) return 'elevated';
      return 'normal';
    }
    if (dtmSelected == null) return null;
    if (dtmSelected <= 14) return 'critical';
    if (dtmSelected <= 45) return 'elevated';
    return 'normal';
  })();
  const urgencyBandLabel = band?.label ?? null;

  return {
    dtmSelected,
    dtmCashWholesale,
    dtmList,
    dtmAuction,
    urgency: urgencyMapped,
    source,
    clearToCloseBufferDays: buffer,
    trace: {
      today_iso: null, // TODO(data): supply deterministic "today" to compute true date offsets.
      candidates: buffered,
      selected_source: source,
      dtm_selected: dtmSelected,
      dtm_cash_wholesale: dtmCashWholesale,
      dtm_list: dtmList,
      dtm_auction: dtmAuction,
      max_days_to_money: maxDtm,
      clear_to_close_buffer_days: buffer,
      board_approval_buffer_days: boardBuffer,
      urgency_band_label: urgencyBandLabel,
    },
  };
}

type EvidenceFreshnessByKind = {
  [kind: string]: {
    as_of_date: string | null;
    age_days: number | null;
    status: 'fresh' | 'stale' | 'missing';
    blocking_for_ready: boolean;
    reasons: string[];
  };
};

function computeEvidenceSummary(params: {
  policy: UnderwritingPolicy;
  deal: Json;
  now: Date;
}): {
  freshness_by_kind: EvidenceFreshnessByKind;
  any_blocking_for_ready: boolean;
  missing_required_kinds: string[];
  allow_placeholders: boolean;
  placeholders_used: boolean;
  placeholder_kinds: string[];
} {
  const { policy, deal, now } = params;
  const freshness: EvidenceFreshnessByKind = {};
  const policyMap = policy.evidence_freshness ?? {};
  const kinds = Object.keys(policyMap);
  const allowPlaceholders =
    policy.workflow_policy?.allow_placeholders_when_evidence_missing === true;
  const getDate = (paths: string[][]): string | null => {
    for (const p of paths) {
      const v = getString(deal, p, null);
      if (v) return v;
    }
    return null;
  };
  const candidatePaths: Record<string, string[][]> = {
    payoff: [
      ['debt', 'payoff_as_of'],
      ['debt', 'good_thru_date'],
    ],
    title_quote: [['title', 'as_of'], ['title', 'quote_as_of']],
    insurance: [['status', 'insurance_as_of'], ['insurance', 'as_of']],
    hoa: [['hoa', 'as_of'], ['association', 'as_of']],
    lien_search: [['lien_search', 'as_of'], ['municipal', 'as_of']],
    comps: [['market', 'comps_as_of']],
    zip_stats: [['market', 'zip_stats_as_of']],
  };

  let anyBlocking = false;
  const missingRequired: string[] = [];
  const placeholderKinds: string[] = [];

  kinds.forEach((kind) => {
    const policyKind = policyMap[kind];
    const asOf = getDate(candidatePaths[kind] ?? []);
    const ageDays =
      asOf != null ? Math.max(0, Math.floor((now.getTime() - new Date(asOf).getTime()) / 86400000)) : null;
    let status: 'fresh' | 'stale' | 'missing' = 'missing';
    const reasons: string[] = [];
    if (asOf == null) {
      status = 'missing';
      reasons.push('missing_as_of');
    } else if (policyKind.max_age_days != null && ageDays != null && ageDays > policyKind.max_age_days) {
      status = 'stale';
      reasons.push('stale_age');
    } else {
      status = 'fresh';
    }
    const wouldBlockMissing = status === 'missing' && policyKind.block_ready_if_missing === true;
    if (wouldBlockMissing && allowPlaceholders) {
      placeholderKinds.push(kind);
    }
    const blocking = (wouldBlockMissing && !allowPlaceholders) || (status === 'stale' && policyKind.block_ready_if_stale === true);
    if (blocking) anyBlocking = true;
    if (policyKind.is_required_for_ready && status === 'missing') {
      missingRequired.push(kind);
    }
    freshness[kind] = {
      as_of_date: asOf,
      age_days: ageDays,
      status,
      blocking_for_ready: blocking,
      reasons,
    };
  });

  return {
    freshness_by_kind: freshness,
    any_blocking_for_ready: anyBlocking,
    missing_required_kinds: missingRequired,
    allow_placeholders: allowPlaceholders,
    placeholders_used: placeholderKinds.length > 0,
    placeholder_kinds: placeholderKinds,
  };
}

function downgrade(grade: 'A' | 'B' | 'C', to: 'A' | 'B' | 'C' | null | undefined): 'A' | 'B' | 'C' {
  if (to == null) return grade;
  const order = ['A', 'B', 'C'];
  const target = order.indexOf(to);
  const current = order.indexOf(grade);
  return order[Math.max(current, target)] as 'A' | 'B' | 'C';
}

function computeConfidenceGrade(params: {
  policy: UnderwritingPolicy;
  evidenceSummary: ReturnType<typeof computeEvidenceSummary>;
  deal: Json;
  risk?: { anyWatch: boolean; anyFail: boolean };
}): { grade: 'A' | 'B' | 'C'; reasons: string[] } {
  const { policy, evidenceSummary, deal, risk } = params;
  const reasons: string[] = [];
  const conf = policy.confidence ?? {};
  let grade: 'A' | 'B' | 'C' = 'A';
  const placeholdersAllowed = evidenceSummary.allow_placeholders === true;
  const placeholdersUsed = evidenceSummary.placeholders_used === true;

  const rubricRaw = policy.workflow_policy?.confidence_grade_rubric;
  if (rubricRaw) {
    try {
      const parsed = JSON.parse(rubricRaw) as Record<string, [number, number]>;
      const score =
        getNumber(deal, ['analysis', 'confidence_score'], null) ??
        getNumber(deal, ['confidence_score'], null);
      if (score != null) {
        const found = Object.entries(parsed).find(([_, range]) => {
          const [min, max] = range;
          return score >= min && score <= max;
        });
        if (found) {
          const g = found[0].toUpperCase();
          if (g === 'A' || g === 'B' || g === 'C') {
            grade = g;
            reasons.push('rubric_score');
          }
        }
      }
    } catch {
      reasons.push('confidence_rubric_parse_failed');
    }
  }

  const compsAiv = getNumber(deal, ['market', 'comps_aiv_count'], null) ?? 0;
  const compsArv = getNumber(deal, ['market', 'comps_arv_count'], null) ?? 0;
  if (conf.min_comps_for_aiv_A != null && compsAiv < conf.min_comps_for_aiv_A) {
    grade = downgrade(grade, 'B');
    reasons.push('aiv_comps_below_A');
  }
  if (conf.min_comps_for_arv_A != null && compsArv < conf.min_comps_for_arv_A) {
    grade = downgrade(grade, 'B');
    reasons.push('arv_comps_below_A');
  }
  if (conf.min_comps_for_aiv_B != null && compsAiv < conf.min_comps_for_aiv_B) {
    grade = downgrade(grade, 'C');
    reasons.push('aiv_comps_below_B');
  }
  if (conf.min_comps_for_arv_B != null && compsArv < conf.min_comps_for_arv_B) {
    grade = downgrade(grade, 'C');
    reasons.push('arv_comps_below_B');
  }

  const compFresh = evidenceSummary.freshness_by_kind['comps'];
  if (compFresh?.status === 'stale') {
    if (conf.max_comp_age_days_A != null) grade = downgrade(grade, 'B');
    if (conf.max_comp_age_days_B != null && compFresh.age_days != null && compFresh.age_days > conf.max_comp_age_days_B) {
      grade = downgrade(grade, 'C');
    }
    reasons.push('comps_stale');
  }
  const zipFresh = evidenceSummary.freshness_by_kind['zip_stats'];
  if (zipFresh?.status === 'stale') {
    if (conf.max_zip_stats_age_days_A != null) grade = downgrade(grade, 'B');
    if (
      conf.max_zip_stats_age_days_B != null &&
      zipFresh.age_days != null &&
      zipFresh.age_days > conf.max_zip_stats_age_days_B
    ) {
      grade = downgrade(grade, 'C');
    }
    reasons.push('zip_stats_stale');
  }

  const requiredA = conf.required_evidence_for_A ?? [];
  const requiredB = conf.required_evidence_for_B ?? [];
  requiredA.forEach((kind) => {
    const k = evidenceSummary.freshness_by_kind[kind];
    if (k && (k.status === 'missing' || k.status === 'stale')) {
      grade = downgrade(grade, 'B');
      reasons.push(`required_for_A_${kind}_missing_or_stale`);
    }
  });
  requiredB.forEach((kind) => {
    const k = evidenceSummary.freshness_by_kind[kind];
    if (k && (k.status === 'missing' || k.status === 'stale')) {
      grade = downgrade(grade, 'C');
      reasons.push(`required_for_B_${kind}_missing_or_stale`);
    }
  });

  if (risk?.anyFail && conf.downgrade_if_any_gate_fail_to) {
    grade = downgrade(grade, conf.downgrade_if_any_gate_fail_to);
    reasons.push('gate_fail_downgrade');
  } else if (risk?.anyWatch && conf.downgrade_if_any_gate_watch_to) {
    grade = downgrade(grade, conf.downgrade_if_any_gate_watch_to);
    reasons.push('gate_watch_downgrade');
  }

  if (evidenceSummary.any_blocking_for_ready) {
    grade = downgrade(grade, 'B');
    reasons.push('blocking_evidence');
  }

  if (placeholdersAllowed && placeholdersUsed) {
    grade = downgrade(grade, 'B');
    reasons.push('placeholders_allowed_missing_evidence');
  } else if (placeholdersAllowed) {
    reasons.push('placeholders_allowed');
  }

  return { grade, reasons };
}

function computeRiskGates(params: {
  policy: UnderwritingPolicy;
  evidenceSummary: ReturnType<typeof computeEvidenceSummary>;
  deal: Json;
}): {
  per_gate: Record<string, { status: 'pass' | 'watch' | 'fail'; reasons: string[]; enabled: boolean }>;
  overall: 'pass' | 'watch' | 'fail';
  anyWatch: boolean;
  anyFail: boolean;
} {
  const { policy, evidenceSummary, deal } = params;
  const per_gate: Record<string, { status: 'pass' | 'watch' | 'fail'; reasons: string[]; enabled: boolean }> = {};
  let anyWatch = false;
  let anyFail = false;
  const gates: Record<string, RiskGatePolicy> = { ...(policy.gates ?? {}) };

  // Derived compliance gates driven by sandbox policy
  const compliance = policy.compliance_policy ?? {};
  const addComplianceGate = (
    key: string,
    label: string,
    enabledFlag: boolean | undefined,
    hardFailCond: string | undefined,
    extraReasons: string[] = [],
  ) => {
    gates[key] = {
      label,
      enabled: enabledFlag !== false && enabledFlag !== undefined ? true : false,
      hard_fail_conditions: enabledFlag ? (hardFailCond ? [hardFailCond] : []) : [],
      required_evidence_kinds: [],
      watch_conditions: [],
      block_ready_on_fail: true,
    };
    if (extraReasons.length > 0) {
      gates[key].watch_conditions = [...(gates[key].watch_conditions ?? []), ...extraReasons];
    }
  };

  addComplianceGate('bankruptcy_stay', 'Bankruptcy stay gate', compliance.bankruptcy_stay_gate_enabled, 'bankruptcy_stay');
  addComplianceGate('fha_90_day', 'FHA 90-day resale gate', compliance.fha_90_day_gate_enabled, 'fha_90_day_resale');
  addComplianceGate('firpta_withholding', 'FIRPTA withholding gate', compliance.firpta_gate_enabled, 'firpta_withholding');
  addComplianceGate('flood_50_rule', 'FEMA 50% rule gate', compliance.flood_50_gate_enabled, 'flood_50_rule', [
    compliance.flood_zone_source ? `flood_zone_source:${compliance.flood_zone_source}` : '',
  ]);
  addComplianceGate('scra', 'SCRA verification gate', compliance.scra_gate_enabled, 'scra_verification_missing');
  addComplianceGate(
    'fha_va_overlays',
    'FHA/VA overlays gate',
    compliance.fha_va_overlays_gate_enabled,
    'fha_va_overlay_block',
  );
  addComplianceGate(
    'va_wdo_water',
    'VA WDO/water test gate',
    compliance.va_wdo_water_test_gate_enabled,
    'va_wdo_water_test_missing',
  );
  addComplianceGate(
    'warrantability_review',
    'Warrantability review gate',
    compliance.warrantability_review_gate_enabled,
    'warrantability_review_fail',
  );

  Object.entries(gates).forEach(([gateName, gatePolicy]) => {
    const enabled = gatePolicy.enabled !== false;
    let status: 'pass' | 'watch' | 'fail' | string = 'pass';
    const reasons: string[] = [];
    if (!enabled) {
      reasons.push('disabled');
    } else {
      // Evidence requirements
      const reqKinds = gatePolicy.required_evidence_kinds ?? [];
      reqKinds.forEach((kind) => {
        const ev = evidenceSummary.freshness_by_kind[kind];
        if (ev && (ev.status === 'missing' || ev.status === 'stale') && ev.blocking_for_ready) {
          status = 'fail';
          reasons.push(`required_evidence_${kind}_missing_or_blocking`);
        }
      });
      // Hard fail conditions
      (gatePolicy.hard_fail_conditions ?? []).forEach((cond) => {
        const flag = getBoolean(deal, ['flags', cond], null);
        if (flag === true) {
          status = 'fail';
          reasons.push(cond);
        }
      });
      // Watch conditions (only if not already fail)
      if (status !== 'fail') {
        (gatePolicy.watch_conditions ?? []).forEach((cond) => {
          const flag = getBoolean(deal, ['flags', cond], null);
          if (flag === true) {
            status = 'watch';
            reasons.push(cond);
          }
        });
      }
    }
    const statusValue = status as 'pass' | 'watch' | 'fail';
    per_gate[gateName] = { status: statusValue, reasons, enabled };
    switch (statusValue) {
      case 'watch':
        anyWatch = true;
        break;
      case 'fail':
        anyFail = true;
        break;
      default:
        break;
    }
  });
  const overall: 'pass' | 'watch' | 'fail' = anyFail ? 'fail' : anyWatch ? 'watch' : 'pass';
  return { per_gate, overall, anyWatch, anyFail };
}

function computeWorkflowState(params: {
  policy: UnderwritingPolicy;
  spreadSummary: { min_spread_required: number | null; spread_cash: number | null };
  confidenceGrade: 'A' | 'B' | 'C';
  risk: { overall: 'pass' | 'watch' | 'fail' };
  evidenceSummary: ReturnType<typeof computeEvidenceSummary>;
  requiredFieldsStatus: { all_present: boolean; missing: string[] };
}): { workflow_state: 'NeedsInfo' | 'NeedsReview' | 'ReadyForOffer'; reasons: string[] } {
  const { policy, spreadSummary, confidenceGrade, risk, evidenceSummary, requiredFieldsStatus } = params;
  const reasons: string[] = [];
  const wf = policy.workflow ?? {};
  const placeholdersAllowed = evidenceSummary.allow_placeholders === true;
  const placeholdersUsed = evidenceSummary.placeholders_used === true;
  if (placeholdersUsed) {
    reasons.push('placeholders_used_missing_evidence');
  } else if (placeholdersAllowed) {
    reasons.push('placeholders_allowed');
  }
  const needsInfo =
    !requiredFieldsStatus.all_present ||
    evidenceSummary.any_blocking_for_ready ||
    risk.overall === 'fail' ||
    (spreadSummary.min_spread_required != null &&
      spreadSummary.spread_cash != null &&
      spreadSummary.spread_cash < 0);
  if (needsInfo) reasons.push('missing_required_or_blocking');
  if (risk.overall === 'fail') reasons.push('risk_fail');
  if (evidenceSummary.any_blocking_for_ready) reasons.push('blocking_evidence');
  if (spreadSummary.min_spread_required != null && spreadSummary.spread_cash != null && spreadSummary.spread_cash < 0) {
    reasons.push('negative_spread');
  }
  if (needsInfo) return { workflow_state: 'NeedsInfo', reasons };

  const needsReview =
    (wf.needs_review_if_confidence_C && confidenceGrade === 'C') ||
    (wf.needs_review_if_spread_shortfall &&
      spreadSummary.min_spread_required != null &&
      spreadSummary.spread_cash != null &&
      spreadSummary.spread_cash < spreadSummary.min_spread_required) ||
    risk.overall === 'watch';
  if (needsReview) {
    if (confidenceGrade === 'C') reasons.push('confidence_C');
    if (
      spreadSummary.min_spread_required != null &&
      spreadSummary.spread_cash != null &&
      spreadSummary.spread_cash < spreadSummary.min_spread_required
    ) {
      reasons.push('spread_shortfall');
    }
    if (risk.overall === 'watch') reasons.push('risk_watch');
    return { workflow_state: 'NeedsReview', reasons };
  }

  return { workflow_state: 'ReadyForOffer', reasons };
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
  workflow_reasons?: string[] | null;
  confidence_grade: 'A' | 'B' | 'C' | null;
  confidence_reasons: string[] | null;
  floor_investor?: number | null;
  payoff_plus_essentials?: number | null;
  spread_cash?: number | null;
  min_spread_required?: number | null;
  cash_gate_status?: CashGateStatus | null;
  cash_deficit?: number | null;
  offer_menu_cash?: OfferMenuCash | null;
  borderline_flag?: boolean | null;

  timeline_summary?: {
    dom_zip_days: number | null;
    moi_zip_months: number | null;
    days_to_money: number | null;
    dtm_selected_days: number | null;
    dtm_cash_wholesale_days?: number | null;
    dtm_list_mls_days?: number | null;
    dtm_auction_days?: number | null;
    dtm_source?: 'auction' | 'cash_wholesale' | 'list' | 'unknown' | null;
    clear_to_close_buffer_days?: number | null;
    dtm_max_days?: number | null;
    days_to_money_selection_method?: DtmSelectionMethod | null;
    carry_months_raw?: number | null;
    carry_months_base_raw?: number | null;
    carry_uninsurable_extra_months?: number | null;
    carry_months_capped?: number | null;
    carry_months: number | null;
    hold_monthly_dollars?: number | null;
    carry_total_dollars?: number | null;
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
    per_gate?: Record<string, { status: 'pass' | 'watch' | 'fail'; reasons?: string[]; enabled?: boolean }>;
  };

  evidence_summary?: {
    confidence_grade?: 'A' | 'B' | 'C' | null;
    confidence_reasons?: string[];
    freshness_by_kind: Record<
      string,
      {
        as_of_date?: string | null;
        age_days?: number | null;
        status?: 'fresh' | 'stale' | 'missing';
        blocking_for_ready?: boolean;
        reasons?: string[];
      }
    >;
    any_blocking_for_ready?: boolean;
    missing_required_kinds?: string[];
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
  let arv = getNumber(deal, ['market', 'arv'], null);
  let aiv = getNumber(deal, ['market', 'aiv'], null);
  const domZip = getNumber(deal, ['market', 'dom_zip'], null);
  const moiZip = getNumber(deal, ['market', 'moi_zip'], null);
  const zipPercentile = getNumber(deal, ['market', 'zip_percentile'], null);
  const speedBandResult = computeSpeedBandPolicy(domZip, moiZip, uwPolicy);
  const speedBand = speedBandResult.speedBand;

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

  // ---- Valuation bounds (policy-driven)
  const valuationPolicy = uwPolicy.valuation ?? {};
  const valuationTrace: Record<string, unknown> = {
    aiv_raw: aiv,
    arv_raw: arv,
    policy: valuationPolicy,
  };
  if (aiv != null) {
    const min = valuationPolicy.aiv_hard_min ?? null;
    const max = valuationPolicy.aiv_hard_max ?? null;
    if (min != null && aiv < min) {
      valuationTrace.aiv_hard_min_applied = min;
      aiv = min;
    }
    if (max != null && aiv > max) {
      valuationTrace.aiv_hard_max_applied = max;
      aiv = max;
    }
    const softCap =
      valuationPolicy.aiv_soft_max_vs_arv_multiplier != null && arv != null
        ? round2(arv * valuationPolicy.aiv_soft_max_vs_arv_multiplier)
        : null;
    if (softCap != null && aiv > softCap) {
      valuationTrace.aiv_soft_cap_applied = softCap;
      valuationTrace.aiv_soft_cap_multiplier = valuationPolicy.aiv_soft_max_vs_arv_multiplier;
      aiv = softCap;
    }
  }
  if (arv != null) {
    const min = valuationPolicy.arv_hard_min ?? null;
    const max = valuationPolicy.arv_hard_max ?? null;
    if (min != null && arv < min) {
      valuationTrace.arv_hard_min_applied = min;
      arv = min;
    }
    if (max != null && arv > max) {
      valuationTrace.arv_hard_max_applied = max;
      arv = max;
    }
    const softCap =
      valuationPolicy.arv_soft_max_vs_aiv_multiplier != null && aiv != null
        ? round2(aiv * valuationPolicy.arv_soft_max_vs_aiv_multiplier)
        : null;
    if (softCap != null && arv > softCap) {
      valuationTrace.arv_soft_cap_applied = softCap;
      valuationTrace.arv_soft_cap_multiplier = valuationPolicy.arv_soft_max_vs_aiv_multiplier;
      arv = softCap;
    }
  }
  valuationTrace.aiv_final = aiv;
  valuationTrace.arv_final = arv;
  trace.push({
    rule: 'VALUATION_BOUNDS',
    used: ['deal.market.aiv', 'deal.market.arv', 'policy.valuation'],
    details: valuationTrace,
  });

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
    used: ['deal.market.aiv', 'policy.aiv.safety_cap_pct_token', 'policy.valuation.aiv_safety_cap_pct'],
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

  // ---- Speed band (policy-driven)
  trace.push({
    rule: 'SPEED_BAND_POLICY',
    used: ['deal.market.dom_zip', 'deal.market.moi_zip', 'policy.speedBands'],
    details: speedBandResult.trace,
  });

  // ---- Carry Months (policy-driven, DOM-based)
  const carryCalc = computeCarryMonthsFromPolicy(domZip, uwPolicy);
  const carryMonths = carryCalc.capped;

  trace.push({
    rule: 'CARRY_MONTHS_POLICY',
    used: ['deal.market.dom_zip', 'policy.carry'],
    details: {
      dom_zip: domZip,
      base_raw_months: carryCalc.base_raw,
      raw_months: carryCalc.raw,
      carry_months: carryMonths,
      uninsurable_extra_months: carryCalc.extra_months,
      carry_formula: uwPolicy.carry_formula_definition ?? null,
      carry_dom_multiplier: uwPolicy.carry_dom_multiplier ?? null,
      carry_dom_offset_days: uwPolicy.carry_dom_offset_days ?? null,
      carry_divisor_days: uwPolicy.carry_divisor_days ?? null,
      carry_months_cap: uwPolicy.carry_months_cap ?? null,
    },
  });

  if (domZip != null) {
    summaryNotes.push(
      carryMonths != null
        ? `Carry months = ${carryMonths.toFixed(2)} (raw ${carryCalc.raw?.toFixed(2)}, cap ${
            uwPolicy.carry_months_cap ?? 'n/a'
          }).`
        : `DOM provided (${domZip}) but carry months not computed due to missing rule/cap.`,
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
    moiZip,
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
      moi_zip: moiZip ?? null,
      margin_pct: buyerCeilingResult.marginPctUsed,
      margin_selection: buyerCeilingResult.marginTrace,
      repairs_total: repairsTotal,
      buyer_costs_total: buyerCeilingResult.buyerCostsTotal,
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

  const floorInvestorResult = computeFloorInvestor(
    aiv,
    zipPercentile,
    uwPolicy,
    infoNeeded,
  );
  const floorInvestor = floorInvestorResult.floorInvestor;
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
      investor_discount_p20: floorInvestorResult.discountP20,
      investor_discount_typical: floorInvestorResult.discountTypical,
      investor_discount_used: floorInvestorResult.usedBand,
      investor_discount_applied: floorInvestorResult.appliedDiscount,
      retained_equity_pct: uwPolicy.floors?.payoff_min_retained_equity_pct ?? uwPolicy.retained_equity_pct ?? null,
      move_out_cash_default: uwPolicy.floors?.payoff_move_out_cash_default ?? uwPolicy.move_out_cash_default ?? null,
      move_out_cash_min: uwPolicy.floors?.payoff_move_out_cash_min ?? uwPolicy.move_out_cash_min ?? null,
      move_out_cash_max: uwPolicy.floors?.payoff_move_out_cash_max ?? uwPolicy.move_out_cash_max ?? null,
    },
  });

  const payoffProjected = payoffClose;  // ---- Profit Core (Phase 1 Law): Net-to-Seller MAO (Contract Price)
  // Net_Offer_to_Seller = Max_Buyer (Buyer Ceiling) - Wholesaler_Fee
  // Wholesaler_Fee is a subtractive constraint resolved from policy min_spread_by_arv_band
  // with an optional user override (deal.policy.assignment_fee_target) clamped to policy minimum.
  const assignmentFeeOverrideRaw = getNumber(deal, ['policy', 'assignment_fee_target'], null);
  const assignmentFeeOverride =
    assignmentFeeOverrideRaw != null && Number.isFinite(assignmentFeeOverrideRaw)
      ? Math.max(0, assignmentFeeOverrideRaw)
      : null;
  const feeSource: 'policy_band' | 'user_override' =
    assignmentFeeOverrideRaw != null && Number.isFinite(assignmentFeeOverrideRaw)
      ? 'user_override'
      : 'policy_band';

  const feeBands = uwPolicy.min_spread_by_arv_band ?? [];
  const feeBandSelected =
    arv != null
      ? feeBands.find(
          (band) =>
            (band.min_arv == null || arv >= band.min_arv) && (band.max_arv == null || arv <= band.max_arv),
        ) ?? null
      : null;

  const feeBandMinDollars = feeBandSelected?.min_spread_dollars ?? null;
  const feeBandMinPct = feeBandSelected?.min_spread_pct_of_arv ?? null;
  const feeFromPct = arv != null && feeBandMinPct != null ? round2(arv * feeBandMinPct) : null;
  const wholesalerFeePolicyMin =
    feeBandMinDollars != null || feeFromPct != null
      ? round2(Math.max(feeBandMinDollars ?? 0, feeFromPct ?? 0))
      : null;

  if (wholesalerFeePolicyMin == null && arv != null) {
    infoNeeded.push({
      path: 'policy.min_spread_by_arv_band',
      token: null,
      reason: 'Missing wholesaler fee bands (min spread by ARV band) required to compute Net-to-Seller offer.',
      source_of_truth: 'team_policy_set',
    });
  }

  const feeOverrideClampedToMin =
    wholesalerFeePolicyMin != null && assignmentFeeOverride != null
      ? assignmentFeeOverride < wholesalerFeePolicyMin
      : false;

  const wholesalerFeeEffective =
    wholesalerFeePolicyMin != null && assignmentFeeOverride != null
      ? round2(Math.max(wholesalerFeePolicyMin, assignmentFeeOverride))
      : assignmentFeeOverride ?? wholesalerFeePolicyMin;

  trace.push({
    rule: 'WHOLESALE_FEE_CONSTRAINT',
    used: ['deal.market.arv', 'policy.min_spread_by_arv_band', 'deal.policy.assignment_fee_target'],
    details: {
      arv,
      selected_band: feeBandSelected
        ? {
            min_arv: feeBandSelected.min_arv ?? null,
            max_arv: feeBandSelected.max_arv ?? null,
            min_spread_dollars: feeBandMinDollars,
            min_spread_pct_of_arv: feeBandMinPct,
          }
        : null,
      fee_from_pct: feeFromPct,
      fee_policy_min: wholesalerFeePolicyMin,
      fee_override_input: assignmentFeeOverride,
      fee_override_clamped_to_min: feeOverrideClampedToMin,
      fee_effective: wholesalerFeeEffective,
    },
  });

  const rawContractPrice =
    buyerCeiling != null && wholesalerFeeEffective != null
      ? round2(buyerCeiling - wholesalerFeeEffective)
      : null;
  const rawContractPriceClamped =
    rawContractPrice != null ? Math.max(0, rawContractPrice) : null;

  // Safety cap (AIV clamp) remains authoritative.
  const maoCapWholesale = aivCapped ?? aiv ?? null;

  // Final Net-to-Seller MAO (ceiling) for Wholesale.
  const maoFinalWholesale =
    rawContractPriceClamped != null
      ? minNonNull([rawContractPriceClamped, maoCapWholesale])
      : null;

  // Standard-tier offer (primary_offer) = Sweet Spot (midpoint of corridor overlap) when possible.
  const sweetSpotWholesale =
    respectFloor != null && maoFinalWholesale != null && respectFloor <= maoFinalWholesale
      ? round2((respectFloor + maoFinalWholesale) / 2)
      : null;

  const primaryOffer = sweetSpotWholesale ?? maoFinalWholesale;

  trace.push({
    rule: 'MAO_CLAMP',
    used: ['BUYER_CEILING', 'AIV_SAFETY_CAP', 'WHOLESALE_FEE_CONSTRAINT', 'RESPECT_FLOOR'],
    details: {
      buyer_ceiling: buyerCeiling,
      wholesaler_fee_effective: wholesalerFeeEffective,
      raw_contract_price: rawContractPriceClamped,
      mao_cap_wholesale: maoCapWholesale,
      mao_final_wholesale: maoFinalWholesale,
      respect_floor: respectFloor,
      sweet_spot_wholesale: sweetSpotWholesale,
      primary_offer: primaryOffer,
    },
  });

  const primaryTrack: UnderwriteOutputs['primary_offer_track'] = primaryOffer != null ? 'wholesale' : null;
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

  const { minSpread: minSpreadRequired, band: minSpreadBand } = computeMinSpreadRequired(
    arv,
    uwPolicy,
    infoNeeded,
  );
  const cashGate = computeCashGate(spreadCash, uwPolicy);

  const assignmentFeeTarget = uwPolicy.profit_policy?.assignment_fee?.target_dollars ?? null;
  const assignmentFeeMaxPct = uwPolicy.profit_policy?.assignment_fee?.max_publicized_pct_of_arv ?? null;
  const assignmentFeeMaxPublicized =
    arv != null && assignmentFeeMaxPct != null ? round2(arv * assignmentFeeMaxPct) : null;
  const assignmentFeeWithinPolicy =
    assignmentFeeTarget != null && assignmentFeeMaxPublicized != null
      ? assignmentFeeTarget <= assignmentFeeMaxPublicized
      : null;

  const repairsPctOfArv = arv != null && repairsTotal != null ? repairsTotal / arv : null;
  const wholetailMaxRepairsPct = uwPolicy.profit_policy?.wholetail_margin?.max_repairs_pct_of_arv ?? null;
  const wholetailRepairsOk =
    repairsPctOfArv != null && wholetailMaxRepairsPct != null ? repairsPctOfArv <= wholetailMaxRepairsPct : null;

  const doubleCloseThreshold =
    uwPolicy.disposition_policy?.double_close?.min_spread_threshold_dollars ??
    getNumber(policy, ['disposition', 'doubleCloseMinSpreadThreshold'], null) ??
    null;
  const doubleClosePerDiem =
    uwPolicy.disposition_policy?.double_close?.include_per_diem_carry ??
    getBoolean(policy, ['disposition', 'doubleClosePerDiemCarryModeling'], null) ??
    null;
  const doubleCloseEligible = doubleCloseThreshold != null && spreadCash != null ? spreadCash >= doubleCloseThreshold : null;
  const docStampRate = uwPolicy.disposition_policy?.doc_stamps?.deed_rate_multiplier ?? null;
  const docStampsEstimate = docStampRate != null && primaryOffer != null ? round2(primaryOffer * docStampRate) : null;

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
      initial_offer_spread_multiplier: uwPolicy.profit_policy?.initial_offer_spread_multiplier ?? null,
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
    rule: 'ASSIGNMENT_FEE_POLICY',
    used: ['deal.market.arv', 'policy.profit_policy.assignment_fee'],
    details: {
      arv,
      assignment_fee_target: assignmentFeeTarget,
      max_publicized_pct_of_arv: assignmentFeeMaxPct,
      max_publicized_dollars: assignmentFeeMaxPublicized,
      within_policy: assignmentFeeWithinPolicy,
    },
  });

  trace.push({
    rule: 'PROFIT_POLICY',
    used: ['policy.profit_policy'],
    details: {
      flip_margin_baseline_pct: uwPolicy.profit_policy?.flip_margin?.baseline_pct ?? null,
      wholetail_margin_min_pct: uwPolicy.profit_policy?.wholetail_margin?.min_pct ?? null,
      wholetail_margin_max_pct: uwPolicy.profit_policy?.wholetail_margin?.max_pct ?? null,
      wholetail_max_repairs_pct_of_arv: wholetailMaxRepairsPct ?? null,
      repairs_pct_of_arv: repairsPctOfArv ?? null,
      wholetail_repairs_within_policy: wholetailRepairsOk,
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
      ? 'Recommend Wholesale - offer anchored at Respect Floor.'
      : null;

  trace.push({
    rule: 'DOUBLE_CLOSE_POLICY',
    used: ['policy.disposition_policy', 'spread_cash'],
    details: {
      spread_cash: spreadCash,
      threshold_dollars: doubleCloseThreshold,
      eligible: doubleCloseEligible,
      include_per_diem_carry: doubleClosePerDiem ?? null,
      doc_stamp_rate: docStampRate,
      doc_stamp_estimate: docStampsEstimate,
      enabled_tracks: uwPolicy.disposition_policy?.enabled_tracks ?? null,
    },
  });

  const auctionDateIso = getString(deal, ['timeline', 'auction_date'], null);
  const dtm = computeDaysToMoneyPolicy({
    domZip,
    auctionDateIso,
    policy: uwPolicy,
    bindableInsurance,
    clearTitle,
    boardApprovalRequired: getBoolean(deal, ['status', 'board_approval_required'], null),
  });

  trace.push({
    rule: 'DTM_URGENCY_POLICY',
    used: ['timeline', 'policy.speedBands', 'policy.dtm'],
    details: dtm.trace,
  });

  const timelineSummary: TimelineSummary = {
    dom_zip_days: domZip ?? null,
    moi_zip_months: moiZip ?? null,
    days_to_money: dtm.dtmSelected,
    dtm_selected_days: dtm.dtmSelected,
    dtm_cash_wholesale_days: dtm.dtmCashWholesale,
    dtm_list_mls_days: dtm.dtmList,
    dtm_auction_days: dtm.dtmAuction,
    dtm_source: dtm.source ?? null,
    clear_to_close_buffer_days: dtm.clearToCloseBufferDays ?? null,
    dtm_max_days: uwPolicy.dtm?.max_days_to_money ?? null,
    days_to_money_selection_method: uwPolicy.dtm?.selection_method ?? null,
    carry_months_raw: carryCalc.raw,
    carry_months_base_raw: carryCalc.base_raw,
    carry_uninsurable_extra_months: carryCalc.extra_months,
    carry_months_capped: carryMonths,
    carry_months: carryMonths,
    hold_monthly_dollars: buyerCeilingResult.holdCostPerMonth ?? null,
    carry_total_dollars: buyerCeilingResult.carryCostTotal ?? null,
    speed_band: speedBand,
    urgency: dtm.urgency,
    auction_date_iso: auctionDateIso,
  };

  const nowIso =
    getString(deal, ['analysis', 'as_of_date'], null) ??
    getString(policy, ['analysis', 'as_of_date'], null) ??
    '2025-01-01';
  const evidenceSummary = computeEvidenceSummary({
    policy: uwPolicy,
    deal,
    now: new Date(nowIso),
  });
  trace.push({
    rule: 'EVIDENCE_FRESHNESS_POLICY',
    used: ['policy.evidence_freshness'],
    details: {
      freshness_by_kind: evidenceSummary.freshness_by_kind,
      any_blocking_for_ready: evidenceSummary.any_blocking_for_ready,
      missing_required_kinds: evidenceSummary.missing_required_kinds,
      allow_placeholders_when_evidence_missing: evidenceSummary.allow_placeholders,
      placeholders_used: evidenceSummary.placeholders_used,
      placeholder_kinds: evidenceSummary.placeholder_kinds,
    },
  });

  const riskGates = computeRiskGates({
    policy: uwPolicy,
    evidenceSummary,
    deal,
  });
  trace.push({
    rule: 'RISK_GATES_POLICY',
    used: ['policy.gates'],
    details: riskGates,
  });

  const confidenceResult = computeConfidenceGrade({
    policy: uwPolicy,
    evidenceSummary,
    deal,
    risk: { anyFail: riskGates.anyFail, anyWatch: riskGates.anyWatch },
  });
  trace.push({
    rule: 'CONFIDENCE_POLICY',
    used: ['policy.confidence', 'policy.evidence_freshness', 'policy.gates'],
    details: {
      grade: confidenceResult.grade,
      reasons: confidenceResult.reasons,
      allow_placeholders_when_evidence_missing: evidenceSummary.allow_placeholders,
      placeholders_used: evidenceSummary.placeholders_used,
      placeholder_kinds: evidenceSummary.placeholder_kinds,
      rubric_raw: uwPolicy.workflow_policy?.confidence_grade_rubric ?? null,
    },
  });

  const borderlineBandWidth = uwPolicy.borderline_band_width ?? 0;
  const spreadDelta =
    spreadCash != null && minSpreadRequired != null
      ? spreadCash - minSpreadRequired
      : null;
  const borderlineDueToSpread =
    spreadDelta != null && Math.abs(spreadDelta) <= borderlineBandWidth;
  const confidenceIsC = confidenceResult.grade === 'C';
  const borderlineFlag = Boolean(borderlineDueToSpread || confidenceIsC);
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
      confidence_grade: confidenceResult.grade,
      borderline_band_width: borderlineBandWidth,
    },
  });

  const requiredFieldsReady = uwPolicy.workflow?.required_fields_ready ?? [];
  const missingRequiredFields = requiredFieldsReady.filter((p) => getString(deal, p.split('.'), null) == null);
  const requiredFieldsStatus = {
    all_present: missingRequiredFields.length === 0,
    missing: missingRequiredFields,
  };
  const workflowResult = computeWorkflowState({
    policy: uwPolicy,
    spreadSummary: { min_spread_required: minSpreadRequired ?? null, spread_cash: spreadCash ?? null },
    confidenceGrade: confidenceResult.grade,
    risk: { overall: riskGates.overall },
    evidenceSummary,
    requiredFieldsStatus,
  });
  trace.push({
    rule: 'WORKFLOW_STATE_POLICY',
    used: ['spread', 'confidence', 'risk', 'evidence', 'workflow'],
    details: {
      workflow_state: workflowResult.workflow_state,
      reasons: workflowResult.reasons,
      workflow_policy: uwPolicy.workflow_policy ?? null,
      allow_placeholders_when_evidence_missing: evidenceSummary.allow_placeholders,
      placeholders_used: evidenceSummary.placeholders_used,
      placeholder_kinds: evidenceSummary.placeholder_kinds,
    },
  });

  const riskSummary: UnderwriteOutputs['risk_summary'] = {
    overall: riskGates.overall,
    reasons: [],
    per_gate: riskGates.per_gate,
  };

  const evidenceOutputs: UnderwriteOutputs['evidence_summary'] = {
    freshness_by_kind: evidenceSummary.freshness_by_kind,
    any_blocking_for_ready: evidenceSummary.any_blocking_for_ready,
    missing_required_kinds: evidenceSummary.missing_required_kinds,
  };

  const closeWindowDays =
    timelineSummary?.dtm_selected_days ?? timelineSummary?.days_to_money ?? null;
  const fastpathGate = computeCashGateForPrice(respectFloor, payoffProjected, minSpreadRequired);
  const standardGateFromPrice = computeCashGateForPrice(primaryOffer, payoffProjected, minSpreadRequired);
  const premiumGate = computeCashGateForPrice(maoFinalWholesale, payoffProjected, minSpreadRequired);
  const standardGate =
    cashGate.status === 'unknown'
      ? standardGateFromPrice
      : { cash_gate_status: cashGate.status, cash_deficit: cashGate.deficit };
  const offerMenuStatus =
    standardGate.cash_gate_status === 'pass'
      ? 'CASH_OFFER'
      : standardGate.cash_gate_status === 'shortfall'
      ? 'CASH_SHORTFALL'
      : null;
  const offerMenuSpreadToPayoff =
    spreadCash ??
    (primaryOffer != null && payoffProjected != null
      ? round2(primaryOffer - payoffProjected)
      : null);
  const offerMenuTiers: {
    fastpath: OfferMenuCashTier;
    standard: OfferMenuCashTier;
    premium: OfferMenuCashTier;
  } = {
    fastpath: {
      price: respectFloor ?? null,
      close_window_days: closeWindowDays,
      terms_posture_key: 'fastpath',
      notes: 'FastPath: anchored at respect floor.',
      cash_gate_status: fastpathGate.cash_gate_status,
      cash_deficit: fastpathGate.cash_deficit,
    },
    standard: {
      price: primaryOffer ?? null,
      close_window_days: closeWindowDays,
      terms_posture_key: 'standard',
      notes: 'Standard: anchored at primary offer.',
      cash_gate_status: standardGate.cash_gate_status,
      cash_deficit: standardGate.cash_deficit,
    },
    premium: {
      price: maoFinalWholesale ?? null,
      close_window_days: closeWindowDays,
      terms_posture_key: 'premium',
      notes: 'Premium: anchored at MAO.',
      cash_gate_status: premiumGate.cash_gate_status,
      cash_deficit: premiumGate.cash_deficit,
    },
  };

  const riskGateStatus: GateStatus = riskSummary?.overall ?? 'info_needed';
  const missingRequiredKinds = evidenceSummary.missing_required_kinds ?? [];
  const freshnessEntries = evidenceSummary.freshness_by_kind ?? {};
  const anyStaleEvidence = Object.values(freshnessEntries).some((entry) => entry?.status === 'stale');
  const evidenceGateStatus: GateStatus =
    evidenceSummary.any_blocking_for_ready === true
      ? 'fail'
      : missingRequiredKinds.length > 0
      ? 'info_needed'
      : anyStaleEvidence
      ? 'watch'
      : 'pass';
  const blockingGateKeys =
    riskSummary?.per_gate != null
      ? Object.entries(riskSummary.per_gate)
          .filter(([_, gate]) => gate?.status === 'fail')
          .map(([key]) => key)
      : null;
  const blockingEvidenceKinds =
    evidenceGateStatus === 'fail'
      ? Object.entries(freshnessEntries)
          .filter(([_, entry]) => entry?.blocking_for_ready)
          .map(([key]) => key)
      : evidenceGateStatus === 'info_needed'
      ? missingRequiredKinds
      : [];
  const eligibilityReasons: string[] = [];
  if (riskGateStatus === 'fail') eligibilityReasons.push('risk_gate_fail');
  if (riskGateStatus === 'watch') eligibilityReasons.push('risk_gate_watch');
  if (riskGateStatus === 'info_needed') eligibilityReasons.push('risk_gate_info_needed');
  if (evidenceGateStatus === 'fail') eligibilityReasons.push('evidence_blocking');
  if (evidenceGateStatus === 'info_needed') eligibilityReasons.push('evidence_missing');
  if (evidenceGateStatus === 'watch') eligibilityReasons.push('evidence_stale');
  const offerMenuEligibility: OfferMenuTierEligibility = {
    enabled:
      riskGateStatus !== 'fail' &&
      riskGateStatus !== 'info_needed' &&
      evidenceGateStatus !== 'fail' &&
      evidenceGateStatus !== 'info_needed',
    risk_gate_status: riskGateStatus,
    evidence_gate_status: evidenceGateStatus,
    reasons: eligibilityReasons.length > 0 ? eligibilityReasons : null,
    blocking_gate_keys: blockingGateKeys,
    blocking_evidence_kinds: blockingEvidenceKinds,
  };
  const attachEligibility = (tier: OfferMenuCashTier | null): OfferMenuCashTier | null =>
    tier ? { ...tier, eligibility: offerMenuEligibility } : null;
  const offerMenuCash: OfferMenuCash = {
    status: offerMenuStatus,
    spread_to_payoff: offerMenuSpreadToPayoff,
    shortfall_amount: standardGate.cash_deficit ?? null,
    gap_flag: gapFlag ?? null,
    fee_metadata: {
      policy_band_amount: wholesalerFeePolicyMin ?? null,
      effective_amount: wholesalerFeeEffective ?? null,
      source: feeSource ?? null,
    },
    tiers: {
      fastpath: attachEligibility(offerMenuTiers.fastpath),
      standard: attachEligibility(offerMenuTiers.standard),
      premium: attachEligibility(offerMenuTiers.premium),
    },
  };
  trace.push({
    rule: 'OFFER_MENU_ELIGIBILITY_OVERLAY',
    used: ['risk_summary', 'evidence_summary'],
    details: {
      eligibility: offerMenuEligibility,
      blocking_gate_keys: blockingGateKeys,
      blocking_evidence_kinds: blockingEvidenceKinds,
    },
  });

  const outputs: UnderwriteOutputs = {
    caps: { aivCapApplied, aivCapValue: aivCapped },
    carry: {
      monthsRule: null,
      monthsCap: uwPolicy.carry_months_cap ?? null,
      rawMonths: carryCalc.raw,
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
    workflow_state: workflowResult.workflow_state,
    workflow_reasons: workflowResult.reasons,
    confidence_grade: confidenceResult.grade,
    confidence_reasons: confidenceResult.reasons,
    timeline_summary: timelineSummary,
    risk_summary: riskSummary,
    evidence_summary: evidenceOutputs,
    floor_investor: floorInvestor,
    payoff_plus_essentials: payoffPlusEssentials,
    spread_cash: spreadCash,
    min_spread_required: minSpreadRequired,
    cash_gate_status: cashGate.status,
    cash_deficit: cashGate.deficit,
    offer_menu_cash: offerMenuCash,
    borderline_flag: borderlineFlag,
  };

  return { ok: true, infoNeeded, trace, outputs };
}
