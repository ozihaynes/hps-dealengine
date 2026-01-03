/**
 * Market Velocity Metrics — V2.5 Wholesaler Dashboard
 *
 * Calculates local market speed indicators:
 * - DOM (Days on Market) for ZIP
 * - MOI (Months of Inventory) for ZIP
 * - Absorption Rate (sales per month)
 * - Sale-to-List Ratio
 * - Cash Buyer Share
 *
 * Produces a velocity band (hot/warm/balanced/cool/cold) and liquidity score.
 * These drive carry assumptions and urgency signals in the UI.
 *
 * @module slices/marketVelocity
 * @trace MARKET_VELOCITY
 */

import type { MarketVelocity, VelocityBand } from "@hps-internal/contracts";
import type { TraceEntry } from "../types";

// ═══════════════════════════════════════════════════════════════════════════
// POLICY INTERFACE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Policy tokens for market velocity computation.
 * These define the thresholds for velocity band classification.
 */
export interface MarketVelocityPolicy {
  // ─────────────────────────────────────────────────────────────
  // VELOCITY BAND THRESHOLDS (DOM-based)
  // ─────────────────────────────────────────────────────────────
  /** Max DOM for "hot" market */
  hotMaxDom: number;
  /** Max DOM for "warm" market */
  warmMaxDom: number;
  /** Max DOM for "balanced" market */
  balancedMaxDom: number;
  /** Max DOM for "cool" market */
  coolMaxDom: number;
  // Above coolMaxDom = "cold"

  // ─────────────────────────────────────────────────────────────
  // VELOCITY BAND THRESHOLDS (MOI-based)
  // ─────────────────────────────────────────────────────────────
  /** Max MOI for "hot" market */
  hotMaxMoi: number;
  /** Max MOI for "warm" market */
  warmMaxMoi: number;
  /** Max MOI for "balanced" market */
  balancedMaxMoi: number;
  /** Max MOI for "cool" market */
  coolMaxMoi: number;
  // Above coolMaxMoi = "cold"

  // ─────────────────────────────────────────────────────────────
  // LIQUIDITY SCORE WEIGHTS
  // ─────────────────────────────────────────────────────────────
  /** Weight for DOM in liquidity score (0-1) */
  liquidityDomWeight: number;
  /** Weight for MOI in liquidity score (0-1) */
  liquidityMoiWeight: number;
  /** Weight for cash buyer share in liquidity score (0-1) */
  liquidityCashBuyerWeight: number;
  /** Ideal DOM for max liquidity score */
  liquidityIdealDom: number;
  /** Ideal MOI for max liquidity score */
  liquidityIdealMoi: number;
  /** Ideal cash buyer share for max liquidity score */
  liquidityIdealCashBuyerPct: number;

  // ─────────────────────────────────────────────────────────────
  // SALE-TO-LIST THRESHOLDS
  // ─────────────────────────────────────────────────────────────
  /** Sale-to-list ratio indicating seller's market */
  sellerMarketSaleToListPct: number;
  /** Sale-to-list ratio indicating buyer's market */
  buyerMarketSaleToListPct: number;
}

/**
 * Default policy values based on Central Florida market conditions.
 */
export const DEFAULT_MARKET_VELOCITY_POLICY: MarketVelocityPolicy = {
  // DOM thresholds (in days)
  hotMaxDom: 14,
  warmMaxDom: 30,
  balancedMaxDom: 60,
  coolMaxDom: 90,

  // MOI thresholds (in months)
  hotMaxMoi: 2,
  warmMaxMoi: 4,
  balancedMaxMoi: 6,
  coolMaxMoi: 9,

  // Liquidity score weights (must sum to 1.0)
  liquidityDomWeight: 0.4,
  liquidityMoiWeight: 0.4,
  liquidityCashBuyerWeight: 0.2,
  liquidityIdealDom: 14,
  liquidityIdealMoi: 2,
  liquidityIdealCashBuyerPct: 30,

  // Sale-to-list thresholds
  sellerMarketSaleToListPct: 100,
  buyerMarketSaleToListPct: 95,
};

// ═══════════════════════════════════════════════════════════════════════════
// INPUT/OUTPUT TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Input parameters for market velocity computation.
 */
export interface MarketVelocityInput {
  /** Days on Market for ZIP code */
  domZipDays: number;
  /** Months of Inventory for ZIP code */
  moiZipMonths: number;
  /** Absorption rate (sales per month) — nullable if unavailable */
  absorptionRate: number | null;
  /** Sale-to-list price ratio as percentage — nullable if unavailable */
  saleToListPct: number | null;
  /** Cash buyer share in ZIP as percentage — nullable if unavailable */
  cashBuyerSharePct: number | null;
}

/**
 * Market condition classification for additional context.
 */
export type MarketCondition =
  | "sellers_market"
  | "balanced_market"
  | "buyers_market"
  | "unknown";

/**
 * Result of market velocity computation with trace data.
 */
export interface MarketVelocityResult {
  /** Computed market velocity */
  marketVelocity: MarketVelocity;
  /** Trace entry for audit trail */
  traceEntry: TraceEntry;
  /** Market condition based on sale-to-list ratio */
  marketCondition: MarketCondition;
  /** Estimated hold time impact (multiplier) */
  holdTimeMultiplier: number;
  /** Urgency signal for UI */
  urgencySignal: "high" | "medium" | "low";
}

// ═══════════════════════════════════════════════════════════════════════════
// INTERNAL HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Rounds to 2 decimal places.
 */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Clamps a value between min and max.
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Classifies DOM into velocity band.
 */
function classifyDomBand(
  dom: number,
  policy: MarketVelocityPolicy
): VelocityBand {
  if (dom <= policy.hotMaxDom) return "hot";
  if (dom <= policy.warmMaxDom) return "warm";
  if (dom <= policy.balancedMaxDom) return "balanced";
  if (dom <= policy.coolMaxDom) return "cool";
  return "cold";
}

/**
 * Classifies MOI into velocity band.
 */
function classifyMoiBand(
  moi: number,
  policy: MarketVelocityPolicy
): VelocityBand {
  if (moi <= policy.hotMaxMoi) return "hot";
  if (moi <= policy.warmMaxMoi) return "warm";
  if (moi <= policy.balancedMaxMoi) return "balanced";
  if (moi <= policy.coolMaxMoi) return "cool";
  return "cold";
}

/**
 * Combines DOM and MOI bands, taking the more conservative one.
 */
function combineVelocityBands(
  domBand: VelocityBand,
  moiBand: VelocityBand,
  dom: number,
  moi: number
): { combinedBand: VelocityBand; reason: string } {
  const bandOrder: VelocityBand[] = ["hot", "warm", "balanced", "cool", "cold"];
  const domIndex = bandOrder.indexOf(domBand);
  const moiIndex = bandOrder.indexOf(moiBand);

  if (domIndex === moiIndex) {
    return {
      combinedBand: domBand,
      reason: `Both DOM (${dom}d) and MOI (${moi}mo) indicate ${domBand} market`,
    };
  }

  // Take the more conservative (higher index = slower market)
  if (domIndex > moiIndex) {
    return {
      combinedBand: domBand,
      reason: `DOM (${dom}d -> ${domBand}) is slower than MOI (${moi}mo -> ${moiBand})`,
    };
  } else {
    return {
      combinedBand: moiBand,
      reason: `MOI (${moi}mo -> ${moiBand}) is slower than DOM (${dom}d -> ${domBand})`,
    };
  }
}

/**
 * Calculates DOM component of liquidity score.
 * Score of 100 at ideal, decreasing as DOM increases.
 */
function calculateDomLiquidityComponent(
  dom: number,
  policy: MarketVelocityPolicy
): number {
  if (dom <= policy.liquidityIdealDom) return 100;

  // Linear decrease: lose 1 point per day over ideal, floor at 0
  const daysOver = dom - policy.liquidityIdealDom;
  const penalty = daysOver * 1.0; // 1 point per day
  return Math.max(0, 100 - penalty);
}

/**
 * Calculates MOI component of liquidity score.
 * Score of 100 at ideal, decreasing as MOI increases.
 */
function calculateMoiLiquidityComponent(
  moi: number,
  policy: MarketVelocityPolicy
): number {
  if (moi <= policy.liquidityIdealMoi) return 100;

  // Linear decrease: lose 10 points per month over ideal, floor at 0
  const monthsOver = moi - policy.liquidityIdealMoi;
  const penalty = monthsOver * 10; // 10 points per month
  return Math.max(0, 100 - penalty);
}

/**
 * Calculates cash buyer component of liquidity score.
 * Higher cash buyer share = higher liquidity.
 */
function calculateCashBuyerLiquidityComponent(
  cashBuyerPct: number | null,
  policy: MarketVelocityPolicy
): number {
  if (cashBuyerPct === null) return 50; // Default to neutral if unknown

  if (cashBuyerPct >= policy.liquidityIdealCashBuyerPct) return 100;

  // Linear scale: 0% cash buyers = 0 score, ideal% = 100
  return (cashBuyerPct / policy.liquidityIdealCashBuyerPct) * 100;
}

/**
 * Classifies market condition based on sale-to-list ratio.
 */
function classifyMarketCondition(
  saleToListPct: number | null,
  policy: MarketVelocityPolicy
): { marketCondition: MarketCondition; saleToListAssessment: string } {
  if (saleToListPct === null) {
    return {
      marketCondition: "unknown",
      saleToListAssessment: "Sale-to-list ratio unavailable",
    };
  }

  if (saleToListPct >= policy.sellerMarketSaleToListPct) {
    return {
      marketCondition: "sellers_market",
      saleToListAssessment: `${saleToListPct}% indicates seller's market (>=${policy.sellerMarketSaleToListPct}%)`,
    };
  }

  if (saleToListPct < policy.buyerMarketSaleToListPct) {
    return {
      marketCondition: "buyers_market",
      saleToListAssessment: `${saleToListPct}% indicates buyer's market (<${policy.buyerMarketSaleToListPct}%)`,
    };
  }

  return {
    marketCondition: "balanced_market",
    saleToListAssessment: `${saleToListPct}% indicates balanced market`,
  };
}

/**
 * Calculates hold time multiplier based on velocity band.
 * Used to adjust carry cost assumptions.
 */
function calculateHoldTimeMultiplier(band: VelocityBand): number {
  switch (band) {
    case "hot":
      return 0.75; // 25% faster than baseline
    case "warm":
      return 1.0; // Baseline
    case "balanced":
      return 1.25; // 25% slower
    case "cool":
      return 1.5; // 50% slower
    case "cold":
      return 2.0; // 100% slower (double hold time)
  }
}

/**
 * Determines urgency signal for UI display.
 */
function determineUrgencySignal(
  band: VelocityBand,
  liquidityScore: number
): "high" | "medium" | "low" {
  // High urgency: hot market OR very high liquidity
  if (band === "hot" || liquidityScore >= 80) return "high";

  // Low urgency: cold/cool market AND low liquidity
  if ((band === "cold" || band === "cool") && liquidityScore < 50) return "low";

  // Medium urgency: everything else
  return "medium";
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Computes market velocity metrics and liquidity score.
 *
 * Velocity Band Logic:
 * - Uses both DOM and MOI to determine band
 * - Takes the MORE CONSERVATIVE (slower) of the two assessments
 * - Example: DOM=20 (warm) + MOI=5 (balanced) -> "balanced"
 *
 * Liquidity Score Logic (0-100):
 * - DOM component: 40% weight, ideal at 14 days
 * - MOI component: 40% weight, ideal at 2 months
 * - Cash buyer component: 20% weight, ideal at 30%
 * - Score decreases as metrics move away from ideal
 *
 * @param input - Market velocity input parameters
 * @param policy - Policy tokens for thresholds
 * @returns Market velocity result with trace entry
 *
 * @example
 * ```typescript
 * const result = computeMarketVelocity({
 *   domZipDays: 21,
 *   moiZipMonths: 3.5,
 *   absorptionRate: 45,
 *   saleToListPct: 98.5,
 *   cashBuyerSharePct: 25
 * });
 * // result.marketVelocity.velocity_band = 'warm'
 * // result.marketVelocity.liquidity_score = 72
 * ```
 */
export function computeMarketVelocity(
  input: MarketVelocityInput,
  policy: MarketVelocityPolicy = DEFAULT_MARKET_VELOCITY_POLICY
): MarketVelocityResult {
  const {
    domZipDays,
    moiZipMonths,
    absorptionRate,
    saleToListPct,
    cashBuyerSharePct,
  } = input;

  // ═══════════════════════════════════════════════════════════════
  // DETERMINE VELOCITY BAND
  // ═══════════════════════════════════════════════════════════════

  const domBand = classifyDomBand(domZipDays, policy);
  const moiBand = classifyMoiBand(moiZipMonths, policy);

  // Take the more conservative (slower) band
  const { combinedBand, reason } = combineVelocityBands(
    domBand,
    moiBand,
    domZipDays,
    moiZipMonths
  );

  // ═══════════════════════════════════════════════════════════════
  // CALCULATE LIQUIDITY SCORE
  // ═══════════════════════════════════════════════════════════════

  const domScoreComponent = calculateDomLiquidityComponent(domZipDays, policy);
  const moiScoreComponent = calculateMoiLiquidityComponent(moiZipMonths, policy);
  const cashBuyerScoreComponent = calculateCashBuyerLiquidityComponent(
    cashBuyerSharePct,
    policy
  );

  const rawScore =
    domScoreComponent * policy.liquidityDomWeight +
    moiScoreComponent * policy.liquidityMoiWeight +
    cashBuyerScoreComponent * policy.liquidityCashBuyerWeight;

  const liquidityScore = Math.round(clamp(rawScore, 0, 100));

  // ═══════════════════════════════════════════════════════════════
  // DETERMINE MARKET CONDITION
  // ═══════════════════════════════════════════════════════════════

  const { marketCondition, saleToListAssessment } = classifyMarketCondition(
    saleToListPct,
    policy
  );

  // ═══════════════════════════════════════════════════════════════
  // CALCULATE DERIVED METRICS
  // ═══════════════════════════════════════════════════════════════

  const holdTimeMultiplier = calculateHoldTimeMultiplier(combinedBand);
  const urgencySignal = determineUrgencySignal(combinedBand, liquidityScore);

  // ═══════════════════════════════════════════════════════════════
  // BUILD RESULT
  // ═══════════════════════════════════════════════════════════════

  const marketVelocity: MarketVelocity = {
    dom_zip_days: domZipDays,
    moi_zip_months: moiZipMonths,
    absorption_rate: absorptionRate,
    sale_to_list_pct: saleToListPct,
    velocity_band: combinedBand,
    liquidity_score: liquidityScore,
    cash_buyer_share_pct: cashBuyerSharePct,
  };

  // ═══════════════════════════════════════════════════════════════
  // TRACE ENTRY
  // ═══════════════════════════════════════════════════════════════

  const traceEntry: TraceEntry = {
    rule: "MARKET_VELOCITY",
    used: [
      "inputs.dom_zip_days",
      "inputs.moi_zip_months",
      "inputs.absorption_rate",
      "inputs.sale_to_list_pct",
      "inputs.cash_buyer_share_pct",
      "policy.velocity_thresholds",
      "policy.liquidity_weights",
    ],
    details: {
      inputs: {
        dom_zip_days: domZipDays,
        moi_zip_months: moiZipMonths,
        absorption_rate: absorptionRate,
        sale_to_list_pct: saleToListPct,
        cash_buyer_share_pct: cashBuyerSharePct,
      },
      velocity_evaluation: {
        dom_band: domBand,
        moi_band: moiBand,
        combined_band: combinedBand,
        band_selection_reason: reason,
      },
      liquidity_calculation: {
        dom_score_component: round2(domScoreComponent),
        moi_score_component: round2(moiScoreComponent),
        cash_buyer_score_component: round2(cashBuyerScoreComponent),
        raw_score: round2(rawScore),
        final_score: liquidityScore,
      },
      market_condition: {
        condition: marketCondition,
        sale_to_list_assessment: saleToListAssessment,
      },
      result: {
        velocity_band: combinedBand,
        liquidity_score: liquidityScore,
        hold_time_multiplier: holdTimeMultiplier,
        urgency_signal: urgencySignal,
      },
      policy: {
        hot_max_dom: policy.hotMaxDom,
        warm_max_dom: policy.warmMaxDom,
        balanced_max_dom: policy.balancedMaxDom,
        cool_max_dom: policy.coolMaxDom,
        hot_max_moi: policy.hotMaxMoi,
        warm_max_moi: policy.warmMaxMoi,
        balanced_max_moi: policy.balancedMaxMoi,
        cool_max_moi: policy.coolMaxMoi,
        liquidity_weights: {
          dom: policy.liquidityDomWeight,
          moi: policy.liquidityMoiWeight,
          cash_buyer: policy.liquidityCashBuyerWeight,
        },
        liquidity_ideals: {
          dom: policy.liquidityIdealDom,
          moi: policy.liquidityIdealMoi,
          cash_buyer_pct: policy.liquidityIdealCashBuyerPct,
        },
      },
    },
  };

  return {
    marketVelocity,
    traceEntry,
    marketCondition,
    holdTimeMultiplier,
    urgencySignal,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// INPUT VALIDATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Validates market velocity input for sanity.
 * Returns array of validation error messages (empty if valid).
 *
 * @param input - Market velocity input to validate
 * @returns Array of validation error messages
 */
export function validateMarketVelocityInput(
  input: MarketVelocityInput
): string[] {
  const errors: string[] = [];

  if (input.domZipDays < 0) {
    errors.push("domZipDays cannot be negative");
  }
  if (input.moiZipMonths < 0) {
    errors.push("moiZipMonths cannot be negative");
  }
  if (input.absorptionRate !== null && input.absorptionRate < 0) {
    errors.push("absorptionRate cannot be negative");
  }
  if (input.saleToListPct !== null && input.saleToListPct < 0) {
    errors.push("saleToListPct cannot be negative");
  }
  if (
    input.cashBuyerSharePct !== null &&
    (input.cashBuyerSharePct < 0 || input.cashBuyerSharePct > 100)
  ) {
    errors.push("cashBuyerSharePct must be between 0 and 100");
  }

  return errors;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Estimates expected days to sell based on velocity band.
 * Useful for carry cost projections.
 *
 * @param band - Velocity band
 * @param baselineDays - Baseline expectation (default 30)
 * @returns Estimated days to sell
 */
export function estimateDaysToSell(
  band: VelocityBand,
  baselineDays: number = 30
): number {
  const multiplier = calculateHoldTimeMultiplier(band);
  return Math.round(baselineDays * multiplier);
}

/**
 * Determines if market conditions favor quick wholesale exit.
 *
 * @param result - Market velocity result
 * @returns Whether to favor quick exit
 */
export function shouldFavorQuickExit(result: MarketVelocityResult): boolean {
  // Favor quick exit in hot/warm markets with high liquidity
  return (
    (result.marketVelocity.velocity_band === "hot" ||
      result.marketVelocity.velocity_band === "warm") &&
    result.marketVelocity.liquidity_score >= 60
  );
}

/**
 * Calculates suggested carry months based on velocity band.
 *
 * @param band - Velocity band
 * @param baselineMonths - Baseline carry months (default 3)
 * @returns Suggested carry months
 */
export function suggestCarryMonths(
  band: VelocityBand,
  baselineMonths: number = 3
): number {
  const multiplier = calculateHoldTimeMultiplier(band);
  return Math.ceil(baselineMonths * multiplier);
}

/**
 * Determines recommended disposition strategy based on velocity.
 *
 * @param result - Market velocity result
 * @returns Recommended disposition strategy
 */
export function recommendDispositionStrategy(
  result: MarketVelocityResult
): "assignment" | "double_close" | "hold_for_appreciation" {
  const { velocity_band, liquidity_score } = result.marketVelocity;

  // Hot market with high liquidity = assignment (fastest)
  if (velocity_band === "hot" && liquidity_score >= 70) {
    return "assignment";
  }

  // Warm/balanced market or moderate liquidity = double close
  if (
    velocity_band === "warm" ||
    velocity_band === "balanced" ||
    liquidity_score >= 50
  ) {
    return "double_close";
  }

  // Cold/cool market with low liquidity = hold (may need time)
  return "hold_for_appreciation";
}
