/**
 * Price Geometry Computation — V2.5 Wholesaler Dashboard
 *
 * Computes ZOPA (Zone of Possible Agreement), entry point,
 * and dominant floor for negotiation leverage visualization.
 *
 * @module slices/priceGeometry
 * @trace PRICE_GEOMETRY
 */

import type {
  PriceGeometry,
  DominantFloorType,
} from "@hps-internal/contracts";
import type { Posture } from "@hps-internal/contracts";
import type { TraceEntry } from "../types";

/**
 * Policy tokens for price geometry computation.
 * These control posture-based entry point positioning.
 */
export interface PriceGeometryPolicy {
  /** Entry point percentage into ZOPA for conservative posture (0-1) */
  entryPointPctConservative: number;
  /** Entry point percentage into ZOPA for base/balanced posture (0-1) */
  entryPointPctBase: number;
  /** Entry point percentage into ZOPA for aggressive posture (0-1) */
  entryPointPctAggressive: number;
  /** Minimum ZOPA dollars required to consider deal viable */
  minZopaThreshold: number;
  /** Minimum ZOPA as percentage of ARV to consider viable */
  minZopaPctOfArv: number;
}

/**
 * Default policy values for price geometry.
 * Can be overridden via sandbox settings.
 */
export const DEFAULT_PRICE_GEOMETRY_POLICY: PriceGeometryPolicy = {
  entryPointPctConservative: 0.25, // 25% into ZOPA from floor
  entryPointPctBase: 0.5, // 50% into ZOPA (midpoint)
  entryPointPctAggressive: 0.75, // 75% into ZOPA (closer to ceiling)
  minZopaThreshold: 5000, // Minimum $5k ZOPA
  minZopaPctOfArv: 2.0, // Minimum 2% of ARV
};

/**
 * Input parameters for price geometry computation.
 */
export interface PriceGeometryInput {
  /** Respect floor (max of investor/payoff floors) */
  respectFloor: number;
  /** Which floor type is dominant */
  dominantFloor: DominantFloorType;
  /** Investor floor component (AIV * discount) */
  floorInvestor: number | null;
  /** Payoff floor component (payoff + essentials) */
  floorPayoff: number | null;
  /** Buyer ceiling (max price buyer can pay) */
  buyerCeiling: number;
  /** Seller's asking/strike price (null if unknown) */
  sellerStrike: number | null;
  /** After Repair Value for percentage calculations */
  arv: number;
  /** Current posture setting */
  posture: Posture;
}

/**
 * Result of price geometry computation with trace data.
 */
export interface PriceGeometryResult {
  /** Computed price geometry */
  priceGeometry: PriceGeometry;
  /** Trace entry for audit trail */
  traceEntry: TraceEntry;
}

/**
 * Gets the entry point percentage based on posture.
 *
 * @param posture - Current analysis posture
 * @param policy - Policy tokens
 * @returns Entry point percentage (0-1)
 */
function getEntryPointPct(
  posture: Posture,
  policy: PriceGeometryPolicy
): number {
  switch (posture) {
    case "conservative":
      return policy.entryPointPctConservative;
    case "aggressive":
      return policy.entryPointPctAggressive;
    case "base":
    default:
      return policy.entryPointPctBase;
  }
}

/**
 * Classifies ZOPA width into bands.
 *
 * @param zopa - ZOPA in dollars (null if none)
 * @param arv - ARV for percentage calculation
 * @returns ZOPA band classification
 */
function classifyZopaBand(
  zopa: number | null,
  arv: number
): "wide" | "moderate" | "narrow" | "none" {
  if (zopa === null || zopa <= 0) return "none";
  if (arv <= 0) return "none";

  const zopaPct = (zopa / arv) * 100;

  if (zopaPct >= 10) return "wide"; // 10%+ of ARV
  if (zopaPct >= 5) return "moderate"; // 5-10% of ARV
  if (zopaPct > 0) return "narrow"; // <5% of ARV
  return "none";
}

/**
 * Computes price geometry including ZOPA and entry point.
 *
 * ZOPA Logic:
 * - If seller strike is known: ZOPA = ceiling - strike (if positive)
 * - If seller strike unknown: ZOPA = ceiling - floor
 * - ZOPA must be positive for deal to be viable
 *
 * Entry Point Logic:
 * - Conservative: 25% into ZOPA from floor (safer offer)
 * - Base: 50% into ZOPA (midpoint)
 * - Aggressive: 75% into ZOPA (closer to ceiling)
 *
 * @param input - Price geometry input parameters
 * @param policy - Policy tokens for computation
 * @returns Computed price geometry with trace entry
 *
 * @example
 * ```typescript
 * const result = computePriceGeometry({
 *   respectFloor: 150000,
 *   dominantFloor: 'investor',
 *   floorInvestor: 150000,
 *   floorPayoff: 140000,
 *   buyerCeiling: 200000,
 *   sellerStrike: 175000,
 *   arv: 250000,
 *   posture: 'base'
 * }, policy);
 * // result.priceGeometry.zopa = 25000 (ceiling - strike)
 * // result.priceGeometry.entry_point = 162500 (floor + 50% of ZOPA)
 * ```
 */
export function computePriceGeometry(
  input: PriceGeometryInput,
  policy: PriceGeometryPolicy = DEFAULT_PRICE_GEOMETRY_POLICY
): PriceGeometryResult {
  const {
    respectFloor,
    dominantFloor,
    floorInvestor,
    floorPayoff,
    buyerCeiling,
    sellerStrike,
    arv,
    posture,
  } = input;

  // ═══════════════════════════════════════════════════════════════
  // ZOPA CALCULATION
  // ═══════════════════════════════════════════════════════════════

  // Determine the effective floor for ZOPA calculation
  const effectiveFloor =
    sellerStrike !== null
      ? Math.max(sellerStrike, respectFloor) // Use higher of strike or floor
      : respectFloor;

  // ZOPA = negotiation room between ceiling and effective floor
  const zopaRaw = buyerCeiling - effectiveFloor;
  const zopa = zopaRaw > 0 ? zopaRaw : null;
  const zopaExists = zopa !== null && zopa >= policy.minZopaThreshold;

  // ZOPA as percentage of ARV
  const zopaPctOfArv =
    zopa !== null && arv > 0
      ? Number(((zopa / arv) * 100).toFixed(2))
      : null;

  // ZOPA band classification
  const zopaBand = classifyZopaBand(zopa, arv);

  // ═══════════════════════════════════════════════════════════════
  // ENTRY POINT CALCULATION
  // ═══════════════════════════════════════════════════════════════

  // Get posture-specific entry point percentage
  const entryPointPct = getEntryPointPct(posture, policy);

  // Calculate entry point within ZOPA
  // Entry point = floor + (ZOPA * posture percentage)
  // NOTE: Entry point may be BELOW seller's strike price. This is intentional.
  // It represents the OPENING OFFER for negotiations, not the expected
  // agreement point. Starting below the seller's minimum is a standard
  // negotiation tactic to maximize buyer leverage.
  const entryPoint =
    zopaExists && zopa !== null
      ? respectFloor + zopa * entryPointPct
      : respectFloor; // Fall back to floor if no ZOPA

  // Entry point position as percentage (0-100)
  const entryPointPctOfZopa = entryPointPct * 100;

  // Map posture to entry posture enum
  const entryPosture =
    posture === "conservative"
      ? "conservative"
      : posture === "aggressive"
        ? "aggressive"
        : "balanced";

  // ═══════════════════════════════════════════════════════════════
  // BUILD RESULT
  // ═══════════════════════════════════════════════════════════════

  const priceGeometry: PriceGeometry = {
    respect_floor: respectFloor,
    dominant_floor: dominantFloor,
    floor_investor: floorInvestor,
    floor_payoff: floorPayoff,
    buyer_ceiling: buyerCeiling,
    seller_strike: sellerStrike,
    zopa,
    zopa_pct_of_arv: zopaPctOfArv,
    zopa_exists: zopaExists,
    zopa_band: zopaBand,
    entry_point: Number(entryPoint.toFixed(2)),
    entry_point_pct_of_zopa: entryPointPctOfZopa,
    entry_posture: entryPosture,
  };

  // ═══════════════════════════════════════════════════════════════
  // TRACE ENTRY
  // ═══════════════════════════════════════════════════════════════

  const traceEntry: TraceEntry = {
    rule: "PRICE_GEOMETRY",
    used: [
      "outputs.respect_floor",
      "outputs.buyer_ceiling",
      "outputs.floor_investor",
      "outputs.payoff_plus_essentials",
      "deal.seller_strike",
      "outputs.arv",
      "policy.posture",
    ],
    details: {
      inputs: {
        respect_floor: respectFloor,
        dominant_floor: dominantFloor,
        floor_investor: floorInvestor,
        floor_payoff: floorPayoff,
        buyer_ceiling: buyerCeiling,
        seller_strike: sellerStrike,
        arv,
        posture,
      },
      computation: {
        effective_floor: effectiveFloor,
        zopa_raw: zopaRaw,
        zopa_exists: zopaExists,
        entry_point_pct: entryPointPct,
      },
      outputs: {
        zopa,
        zopa_pct_of_arv: zopaPctOfArv,
        zopa_band: zopaBand,
        entry_point: priceGeometry.entry_point,
        entry_posture: entryPosture,
      },
      policy: {
        min_zopa_threshold: policy.minZopaThreshold,
        min_zopa_pct_of_arv: policy.minZopaPctOfArv,
        entry_point_pct_conservative: policy.entryPointPctConservative,
        entry_point_pct_base: policy.entryPointPctBase,
        entry_point_pct_aggressive: policy.entryPointPctAggressive,
        entry_point_pct_used: entryPointPct,
      },
    },
  };

  return {
    priceGeometry,
    traceEntry,
  };
}

/**
 * Validates price geometry inputs for sanity.
 * Returns array of validation error messages (empty if valid).
 *
 * @param input - Price geometry input to validate
 * @returns Array of validation error messages
 */
export function validatePriceGeometryInput(
  input: PriceGeometryInput
): string[] {
  const errors: string[] = [];

  if (input.respectFloor < 0) {
    errors.push("respectFloor cannot be negative");
  }
  if (input.buyerCeiling < 0) {
    errors.push("buyerCeiling cannot be negative");
  }
  if (input.arv < 0) {
    errors.push("arv cannot be negative");
  }
  if (input.sellerStrike !== null && input.sellerStrike < 0) {
    errors.push("sellerStrike cannot be negative");
  }
  if (input.floorInvestor !== null && input.floorInvestor < 0) {
    errors.push("floorInvestor cannot be negative");
  }
  if (input.floorPayoff !== null && input.floorPayoff < 0) {
    errors.push("floorPayoff cannot be negative");
  }

  return errors;
}
