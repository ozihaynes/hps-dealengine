/**
 * Risk Gates Schema — V2.5 Wholesaler Dashboard
 *
 * 8-gate taxonomy with severity levels for risk assessment.
 * Computes blocking status, risk score, and recommended actions.
 *
 * PRD Risk Gates:
 * 1. Insurability - Property can be insured at acceptable rates
 * 2. Title - Clean title, no encumbrances
 * 3. Flood - Flood zone status and insurance requirements
 * 4. Bankruptcy - No active bankruptcy proceedings
 * 5. Liens - No outstanding liens or judgments
 * 6. Condition - Property condition acceptable for investment
 * 7. Market - Market conditions support investment thesis
 * 8. Compliance - All regulatory requirements met
 *
 * @module contracts/riskGates
 */

import { z } from "zod";

// Import shared enums from riskGatesEnhanced (already exported from index.ts)
import {
  RiskGateKeySchema,
  RiskGateSeveritySchema,
  type RiskGateKey,
  type RiskGateSeverity,
} from "./riskGatesEnhanced";

/**
 * Gate status indicating current assessment.
 * - pass: Gate passes, no issues
 * - fail: Gate fails with specified severity
 * - unknown: Assessment not yet performed
 */
export const RiskGateStatusSchema = z.enum(["pass", "fail", "unknown"]);
export type RiskGateStatus = z.infer<typeof RiskGateStatusSchema>;

/**
 * Risk band classification based on aggregate score.
 * - low: Minimal risk, proceed confidently (score >= 80)
 * - moderate: Acceptable risk, standard review (score >= 60)
 * - elevated: Notable risk, enhanced review (score >= 40)
 * - high: Significant risk, careful evaluation (score >= 20)
 * - critical: Severe risk, likely decline (score < 20)
 */
export const RiskBandSchema = z.enum([
  "low",
  "moderate",
  "elevated",
  "high",
  "critical",
]);
export type RiskBand = z.infer<typeof RiskBandSchema>;

// ═══════════════════════════════════════════════════════════════════════════
// INPUT SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Input for a single risk gate assessment.
 */
export const RiskGateInputSchema = z.object({
  /** Gate status: pass, fail, or unknown */
  status: RiskGateStatusSchema,
  /** Severity if status is "fail" (null for pass/unknown) */
  severity: RiskGateSeveritySchema.nullable(),
  /** Human-readable reason for status */
  reason: z.string().nullable().optional(),
});
export type RiskGateInput = z.infer<typeof RiskGateInputSchema>;

/**
 * Complete input for risk gates computation.
 * All 8 gates must be provided.
 */
export const RiskGatesInputSchema = z.object({
  insurability: RiskGateInputSchema,
  title: RiskGateInputSchema,
  flood: RiskGateInputSchema,
  bankruptcy: RiskGateInputSchema,
  liens: RiskGateInputSchema,
  condition: RiskGateInputSchema,
  market: RiskGateInputSchema,
  compliance: RiskGateInputSchema,
});
export type RiskGatesInput = z.infer<typeof RiskGatesInputSchema>;

// ═══════════════════════════════════════════════════════════════════════════
// OUTPUT SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Evaluated result for a single risk gate.
 */
export const RiskGateResultSchema = z.object({
  /** Gate key */
  gate: RiskGateKeySchema,
  /** Human-readable label */
  label: z.string(),
  /** Gate status */
  status: RiskGateStatusSchema,
  /** Severity if failed */
  severity: RiskGateSeveritySchema.nullable(),
  /** Whether this gate blocks deal progression */
  is_blocking: z.boolean(),
  /** Reason for status */
  reason: z.string().nullable(),
  /** Score contribution (negative for failures) */
  score_contribution: z.number(),
});
export type RiskGateResult = z.infer<typeof RiskGateResultSchema>;

/**
 * Aggregate risk gates assessment result.
 */
export const RiskGatesResultSchema = z.object({
  /** Results for each of the 8 gates */
  gates: z.array(RiskGateResultSchema),

  /** Whether any gate is blocking */
  any_blocking: z.boolean(),
  /** List of blocking gate keys */
  blocking_gates: z.array(RiskGateKeySchema),

  /** Count of gates at each status */
  pass_count: z.number(),
  fail_count: z.number(),
  unknown_count: z.number(),

  /** Count of gates at each severity (among failed gates) */
  critical_count: z.number(),
  major_count: z.number(),
  minor_count: z.number(),

  /** Highest severity among all gates (null if all pass) */
  max_severity: RiskGateSeveritySchema.nullable(),

  /** Risk score (0-100, higher is better) */
  risk_score: z.number(),
  /** Risk band classification */
  risk_band: RiskBandSchema,

  /** Gates requiring attention (failed or unknown) */
  attention_gates: z.array(RiskGateKeySchema),
  /** Recommended action based on assessment */
  recommended_action: z.string(),
});
export type RiskGatesResult = z.infer<typeof RiskGatesResultSchema>;
