/**
 * Net Clearance Calculator — V2.5 Wholesaler Dashboard
 *
 * Calculates "what clears to me" (net profit to wholesaler) for each exit strategy:
 * - Assignment: Simple wholesale fee
 * - Double Close: Buy then resell with additional costs
 * - Wholetail: Light rehab and retail sale
 *
 * This powers the "Profit Cockpit" UI component showing per-exit profitability.
 *
 * @module slices/netClearance
 * @trace NET_CLEARANCE
 */

import type {
  NetClearance,
  ClearanceBreakdown,
  ExitStrategyType,
} from "@hps-internal/contracts";
import type { TraceEntry } from "../types";

// ═══════════════════════════════════════════════════════════════════════════
// POLICY INTERFACE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Policy tokens for net clearance computation.
 * These define the cost structures for each exit strategy.
 */
export interface NetClearancePolicy {
  // ─────────────────────────────────────────────────────────────
  // ASSIGNMENT COSTS
  // ─────────────────────────────────────────────────────────────
  /** Flat assignment fee (title/escrow for assignment) */
  assignmentFeeFlat: number;
  /** Assignment fee as percentage of spread (if percentage-based) */
  assignmentFeePct: number;
  /** Whether to use percentage-based assignment fee */
  assignmentUsePct: boolean;

  // ─────────────────────────────────────────────────────────────
  // DOUBLE CLOSE COSTS
  // ─────────────────────────────────────────────────────────────
  /** Transactional funding fee (percentage of purchase) */
  dcFundingFeePct: number;
  /** Title/escrow on buy side */
  dcBuySideClosingCost: number;
  /** Title/escrow on sell side */
  dcSellSideClosingCost: number;
  /** Holding cost per day during double close */
  dcHoldingCostPerDay: number;
  /** Expected days between buy and sell close */
  dcExpectedHoldDays: number;
  /** Additional buffer/contingency */
  dcContingencyFlat: number;

  // ─────────────────────────────────────────────────────────────
  // WHOLETAIL COSTS
  // ─────────────────────────────────────────────────────────────
  /** Light rehab budget (cosmetic only) */
  wholetailRehabBudget: number;
  /** Listing agent commission percentage */
  wholetailListingCommissionPct: number;
  /** Buyer agent commission percentage */
  wholetailBuyerCommissionPct: number;
  /** Closing costs on sale */
  wholetailClosingCosts: number;
  /** Expected holding months for wholetail */
  wholetailHoldMonths: number;
  /** Monthly holding cost (taxes, insurance, utilities) */
  wholetailHoldingCostPerMonth: number;
  /** Staging/marketing budget */
  wholetailStagingMarketing: number;

  // ─────────────────────────────────────────────────────────────
  // THRESHOLDS
  // ─────────────────────────────────────────────────────────────
  /** Minimum ARV for wholetail to be viable */
  wholetailMinArv: number;
  /** Minimum margin percentage for wholetail recommendation */
  wholetailMinMarginPct: number;
  /** Margin threshold to prefer DC over assignment */
  dcPreferenceMarginThreshold: number;
}

/**
 * Default policy values for net clearance computation.
 * Based on Central Florida market conditions (2024-2025).
 */
export const DEFAULT_NET_CLEARANCE_POLICY: NetClearancePolicy = {
  // Assignment
  assignmentFeeFlat: 500,
  assignmentFeePct: 0,
  assignmentUsePct: false,

  // Double Close
  dcFundingFeePct: 0.02, // 2% transactional funding
  dcBuySideClosingCost: 1500,
  dcSellSideClosingCost: 2000,
  dcHoldingCostPerDay: 100,
  dcExpectedHoldDays: 7,
  dcContingencyFlat: 500,

  // Wholetail
  wholetailRehabBudget: 15000,
  wholetailListingCommissionPct: 0.03, // 3%
  wholetailBuyerCommissionPct: 0.025, // 2.5%
  wholetailClosingCosts: 3000,
  wholetailHoldMonths: 3,
  wholetailHoldingCostPerMonth: 1500,
  wholetailStagingMarketing: 2000,

  // Thresholds
  wholetailMinArv: 200000,
  wholetailMinMarginPct: 10,
  dcPreferenceMarginThreshold: 5000,
};

// ═══════════════════════════════════════════════════════════════════════════
// INPUT INTERFACE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Input parameters for net clearance computation.
 */
export interface NetClearanceInput {
  /** Purchase price (what we pay seller) */
  purchasePrice: number;
  /** MAO for wholesale exit */
  maoWholesale: number | null;
  /** MAO for flip exit (used as basis for DC resale) */
  maoFlip: number | null;
  /** MAO for wholetail exit */
  maoWholetail: number | null;
  /** ARV for percentage calculations */
  arv: number;
  /** Whether wholetail is viable for this property */
  wholetailViable: boolean;
}

/**
 * Result of net clearance computation with trace data.
 */
export interface NetClearanceResult {
  /** Computed net clearance */
  netClearance: NetClearance;
  /** Trace entry for audit trail */
  traceEntry: TraceEntry;
}

// ═══════════════════════════════════════════════════════════════════════════
// INTERNAL HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Rounds a number to 2 decimal places for currency display.
 */
function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Determines the recommended exit strategy based on net profit comparison.
 */
function determineRecommendation(
  assignment: ClearanceBreakdown,
  doubleClose: ClearanceBreakdown,
  wholetail: ClearanceBreakdown | null,
  policy: NetClearancePolicy
): {
  recommendedExit: ExitStrategyType;
  recommendationReason: string;
  netAdvantage: number;
} {
  // Build comparison array
  const strategies: { exit: ExitStrategyType; net: number }[] = [
    { exit: "assignment", net: assignment.net },
    { exit: "double_close", net: doubleClose.net },
  ];

  if (wholetail !== null) {
    strategies.push({ exit: "wholetail", net: wholetail.net });
  }

  // Sort by net descending
  strategies.sort((a, b) => b.net - a.net);

  const best = strategies[0];
  const secondBest = strategies[1];
  const netAdvantage = best.net - (secondBest?.net ?? 0);

  // Determine reason
  let reason: string;

  if (best.exit === "assignment") {
    if (
      doubleClose.net > 0 &&
      doubleClose.net - assignment.net < policy.dcPreferenceMarginThreshold &&
      doubleClose.net > assignment.net
    ) {
      reason =
        "Assignment preferred: DC advantage below threshold, simpler execution";
    } else {
      reason = `Highest net profit: $${best.net.toLocaleString()}`;
    }
  } else if (best.exit === "double_close") {
    reason = `DC nets $${netAdvantage.toLocaleString()} more than assignment`;
  } else {
    reason = `Wholetail nets $${netAdvantage.toLocaleString()} more, worth extended timeline`;
  }

  return {
    recommendedExit: best.exit,
    recommendationReason: reason,
    netAdvantage: roundCurrency(netAdvantage),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Computes net clearance (profit to wholesaler) for each exit strategy.
 *
 * Exit Strategies:
 *
 * 1. **Assignment** (simplest):
 *    - Gross = MAO_wholesale - purchase_price
 *    - Costs = assignment fee only
 *    - Net = Gross - Costs
 *
 * 2. **Double Close** (buy then resell):
 *    - Gross = MAO_flip - purchase_price
 *    - Costs = funding fee + buy closing + sell closing + holding + contingency
 *    - Net = Gross - Costs
 *
 * 3. **Wholetail** (light rehab + retail):
 *    - Gross = MAO_wholetail - purchase_price
 *    - Costs = rehab + commissions + closing + holding + staging
 *    - Net = Gross - Costs
 *
 * @param input - Net clearance input parameters
 * @param policy - Policy tokens for cost calculations
 * @returns Net clearance result with trace entry
 *
 * @example
 * ```typescript
 * const result = computeNetClearance({
 *   purchasePrice: 150000,
 *   maoWholesale: 175000,
 *   maoFlip: 185000,
 *   maoWholetail: 210000,
 *   arv: 250000,
 *   wholetailViable: true
 * });
 * // result.netClearance.assignment.net = ~24500
 * // result.netClearance.double_close.net = ~28000
 * // result.netClearance.recommended_exit = 'double_close'
 * ```
 */
export function computeNetClearance(
  input: NetClearanceInput,
  policy: NetClearancePolicy = DEFAULT_NET_CLEARANCE_POLICY
): NetClearanceResult {
  const {
    purchasePrice,
    maoWholesale,
    maoFlip,
    maoWholetail,
    arv,
    wholetailViable,
  } = input;

  // ═══════════════════════════════════════════════════════════════
  // ASSIGNMENT CLEARANCE
  // ═══════════════════════════════════════════════════════════════

  const assignmentGross = (maoWholesale ?? 0) - purchasePrice;
  const assignmentFee = policy.assignmentUsePct
    ? assignmentGross * policy.assignmentFeePct
    : policy.assignmentFeeFlat;
  const assignmentCosts = assignmentFee;
  const assignmentNet = Math.max(0, assignmentGross - assignmentCosts);
  const assignmentMarginPct =
    assignmentGross > 0
      ? Number(((assignmentNet / assignmentGross) * 100).toFixed(2))
      : 0;

  const assignment: ClearanceBreakdown = {
    gross: roundCurrency(assignmentGross),
    costs: roundCurrency(assignmentCosts),
    net: roundCurrency(assignmentNet),
    margin_pct: assignmentMarginPct,
    cost_breakdown: {
      title_fees: roundCurrency(assignmentFee),
      closing_costs: null,
      transfer_tax: null,
      carry_costs: null,
      other: null,
    },
  };

  // ═══════════════════════════════════════════════════════════════
  // DOUBLE CLOSE CLEARANCE
  // ═══════════════════════════════════════════════════════════════

  const dcGross = (maoFlip ?? 0) - purchasePrice;

  // Calculate DC costs
  const dcFundingFee = purchasePrice * policy.dcFundingFeePct;
  const dcBuyClosing = policy.dcBuySideClosingCost;
  const dcSellClosing = policy.dcSellSideClosingCost;
  const dcHoldingCost = policy.dcHoldingCostPerDay * policy.dcExpectedHoldDays;
  const dcContingency = policy.dcContingencyFlat;

  const dcTotalCosts =
    dcFundingFee + dcBuyClosing + dcSellClosing + dcHoldingCost + dcContingency;
  const dcNet = Math.max(0, dcGross - dcTotalCosts);
  const dcMarginPct =
    dcGross > 0 ? Number(((dcNet / dcGross) * 100).toFixed(2)) : 0;

  const doubleClose: ClearanceBreakdown = {
    gross: roundCurrency(dcGross),
    costs: roundCurrency(dcTotalCosts),
    net: roundCurrency(dcNet),
    margin_pct: dcMarginPct,
    cost_breakdown: {
      title_fees: roundCurrency(dcBuyClosing + dcSellClosing),
      closing_costs: roundCurrency(dcFundingFee),
      transfer_tax: null,
      carry_costs: roundCurrency(dcHoldingCost),
      other: roundCurrency(dcContingency),
    },
  };

  // ═══════════════════════════════════════════════════════════════
  // WHOLETAIL CLEARANCE
  // ═══════════════════════════════════════════════════════════════

  let wholetail: ClearanceBreakdown | null = null;

  const shouldComputeWholetail =
    wholetailViable && maoWholetail !== null && arv >= policy.wholetailMinArv;

  if (shouldComputeWholetail && maoWholetail !== null) {
    const wtGross = maoWholetail - purchasePrice;

    // Calculate wholetail costs
    const wtRehab = policy.wholetailRehabBudget;
    const wtListingCommission =
      maoWholetail * policy.wholetailListingCommissionPct;
    const wtBuyerCommission =
      maoWholetail * policy.wholetailBuyerCommissionPct;
    const wtClosingCosts = policy.wholetailClosingCosts;
    const wtHoldingCost =
      policy.wholetailHoldingCostPerMonth * policy.wholetailHoldMonths;
    const wtStagingMarketing = policy.wholetailStagingMarketing;

    const wtTotalCosts =
      wtRehab +
      wtListingCommission +
      wtBuyerCommission +
      wtClosingCosts +
      wtHoldingCost +
      wtStagingMarketing;
    const wtNet = Math.max(0, wtGross - wtTotalCosts);
    const wtMarginPct =
      wtGross > 0 ? Number(((wtNet / wtGross) * 100).toFixed(2)) : 0;

    // Only include wholetail if margin meets minimum threshold
    if (wtMarginPct >= policy.wholetailMinMarginPct) {
      wholetail = {
        gross: roundCurrency(wtGross),
        costs: roundCurrency(wtTotalCosts),
        net: roundCurrency(wtNet),
        margin_pct: wtMarginPct,
        cost_breakdown: {
          title_fees: roundCurrency(wtClosingCosts),
          closing_costs: roundCurrency(wtListingCommission + wtBuyerCommission),
          transfer_tax: null,
          carry_costs: roundCurrency(wtHoldingCost),
          other: roundCurrency(wtRehab + wtStagingMarketing),
        },
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // DETERMINE RECOMMENDATION
  // ═══════════════════════════════════════════════════════════════

  const { recommendedExit, recommendationReason, netAdvantage } =
    determineRecommendation(assignment, doubleClose, wholetail, policy);

  // ═══════════════════════════════════════════════════════════════
  // BUILD RESULT
  // ═══════════════════════════════════════════════════════════════

  const netClearance: NetClearance = {
    assignment,
    double_close: doubleClose,
    wholetail,
    recommended_exit: recommendedExit,
    recommendation_reason: recommendationReason,
    wholetail_viable: wholetailViable,
    min_spread_threshold: policy.dcPreferenceMarginThreshold,
  };

  // ═══════════════════════════════════════════════════════════════
  // TRACE ENTRY
  // ═══════════════════════════════════════════════════════════════

  const traceEntry: TraceEntry = {
    rule: "NET_CLEARANCE",
    used: [
      "inputs.purchase_price",
      "outputs.mao_wholesale",
      "outputs.mao_flip",
      "outputs.mao_wholetail",
      "outputs.arv",
      "policy.disposition",
    ],
    details: {
      inputs: {
        purchase_price: purchasePrice,
        mao_wholesale: maoWholesale,
        mao_flip: maoFlip,
        mao_wholetail: maoWholetail,
        arv,
        wholetail_viable: wholetailViable,
      },
      assignment: {
        gross: assignment.gross,
        costs_breakdown: {
          assignment_fee: roundCurrency(assignmentFee),
        },
        total_costs: assignment.costs,
        net: assignment.net,
        margin_pct: assignment.margin_pct,
      },
      double_close: {
        gross: doubleClose.gross,
        costs_breakdown: {
          funding_fee: roundCurrency(dcFundingFee),
          buy_side_closing: roundCurrency(dcBuyClosing),
          sell_side_closing: roundCurrency(dcSellClosing),
          holding_cost: roundCurrency(dcHoldingCost),
          contingency: roundCurrency(dcContingency),
        },
        total_costs: doubleClose.costs,
        net: doubleClose.net,
        margin_pct: doubleClose.margin_pct,
      },
      wholetail: {
        computed: wholetail !== null,
        gross: wholetail?.gross ?? null,
        total_costs: wholetail?.costs ?? null,
        net: wholetail?.net ?? null,
        margin_pct: wholetail?.margin_pct ?? null,
      },
      recommendation: {
        exit: recommendedExit,
        reason: recommendationReason,
        net_advantage: netAdvantage,
      },
      policy: {
        assignment_fee_flat: policy.assignmentFeeFlat,
        dc_funding_fee_pct: policy.dcFundingFeePct,
        dc_expected_hold_days: policy.dcExpectedHoldDays,
        wholetail_hold_months: policy.wholetailHoldMonths,
        wholetail_min_arv: policy.wholetailMinArv,
        wholetail_min_margin_pct: policy.wholetailMinMarginPct,
        dc_preference_margin_threshold: policy.dcPreferenceMarginThreshold,
      },
    },
  };

  return {
    netClearance,
    traceEntry,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// INPUT VALIDATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Validates net clearance input for sanity.
 * Returns array of validation error messages (empty if valid).
 *
 * @param input - Net clearance input to validate
 * @returns Array of validation error messages
 */
export function validateNetClearanceInput(input: NetClearanceInput): string[] {
  const errors: string[] = [];

  if (input.purchasePrice < 0) {
    errors.push("purchasePrice cannot be negative");
  }
  if (input.arv < 0) {
    errors.push("arv cannot be negative");
  }
  if (input.maoWholesale !== null && input.maoWholesale < 0) {
    errors.push("maoWholesale cannot be negative");
  }
  if (input.maoFlip !== null && input.maoFlip < 0) {
    errors.push("maoFlip cannot be negative");
  }
  if (input.maoWholetail !== null && input.maoWholetail < 0) {
    errors.push("maoWholetail cannot be negative");
  }

  return errors;
}

// ═══════════════════════════════════════════════════════════════════════════
// BREAK-EVEN CALCULATOR
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calculates the break-even point for each exit strategy.
 * Useful for negotiation guidance.
 *
 * @param policy - Cost policy
 * @param maoWholesale - Wholesale MAO
 * @param maoFlip - Flip MAO
 * @returns Break-even purchase prices per strategy
 */
export function calculateBreakEvenPrices(
  policy: NetClearancePolicy,
  maoWholesale: number,
  maoFlip: number
): { assignment: number; doubleClose: number } {
  // Assignment break-even: MAO - fee = purchase price
  const assignmentBreakEven = maoWholesale - policy.assignmentFeeFlat;

  // DC break-even: need to account for percentage-based costs
  // MAO - (purchase * funding%) - fixed costs = purchase
  // Solve for purchase: purchase = (MAO - fixed) / (1 + funding%)
  const dcFixedCosts =
    policy.dcBuySideClosingCost +
    policy.dcSellSideClosingCost +
    policy.dcHoldingCostPerDay * policy.dcExpectedHoldDays +
    policy.dcContingencyFlat;
  const dcBreakEven = (maoFlip - dcFixedCosts) / (1 + policy.dcFundingFeePct);

  return {
    assignment: roundCurrency(assignmentBreakEven),
    doubleClose: roundCurrency(dcBreakEven),
  };
}
