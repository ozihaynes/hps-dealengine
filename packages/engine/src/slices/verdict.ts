/**
 * Deal Verdict Derivation — V2.5 Wholesaler Dashboard
 *
 * Derives the deal verdict (pursue / needs_evidence / pass) based on:
 * - Workflow state
 * - Risk gate status
 * - Spread viability
 * - Price geometry (ZOPA existence)
 * - Confidence grade
 *
 * The verdict is the PRIMARY decision signal shown in the Trading Strip.
 *
 * Note: Named `deriveDealVerdict` to avoid conflict with existing `deriveVerdict`
 * in snapshot_computations.ts (Command Center V2.1).
 *
 * @module slices/verdict
 * @trace DEAL_VERDICT
 */

import type {
  DealVerdict,
  DealVerdictRecommendation,
  PriceGeometry,
} from "@hps-internal/contracts";
import type { TraceEntry } from "../types";

// ═══════════════════════════════════════════════════════════════════════════
// POLICY INTERFACE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Policy tokens for verdict derivation.
 * These control the thresholds that determine verdict outcomes.
 */
export interface DealVerdictPolicy {
  /** Minimum spread (dollars) required for pursue */
  minSpreadForPursue: number;
  /** Minimum spread (dollars) for needs_evidence (below this = pass) */
  minSpreadForEvidence: number;
  /** Minimum ZOPA percentage of ARV for pursue */
  minZopaPctForPursue: number;
  /** Confidence grade that triggers needs_evidence */
  lowConfidenceGrade: "A" | "B" | "C";
  /** Whether to block on any risk STOP */
  blockOnAnyRiskStop: boolean;
  /** Specific risk gates that are deal-killers */
  dealKillerGates: string[];
}

/**
 * Default policy values for verdict derivation.
 * Can be overridden via sandbox settings.
 */
export const DEFAULT_DEAL_VERDICT_POLICY: DealVerdictPolicy = {
  minSpreadForPursue: 15000, // $15k minimum spread for pursue
  minSpreadForEvidence: 5000, // $5k minimum for needs_evidence
  minZopaPctForPursue: 3.0, // 3% of ARV minimum ZOPA
  lowConfidenceGrade: "C", // Grade C triggers needs_evidence
  blockOnAnyRiskStop: true, // Any STOP gate = pass
  dealKillerGates: [
    // These gates are absolute deal-killers
    "title",
    "bankruptcy",
    "compliance",
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// INPUT INTERFACES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Risk summary input for verdict derivation.
 */
export interface RiskSummaryInput {
  /** Overall risk status */
  overall: "GO" | "WATCH" | "STOP" | "UNKNOWN";
  /** Whether any gate is blocking */
  any_blocking?: boolean;
  /** Individual gate statuses */
  gates?: Record<
    string,
    { status: "GO" | "WATCH" | "STOP" | "UNKNOWN"; reason?: string }
  >;
}

/**
 * Evidence summary input for verdict derivation.
 */
export interface EvidenceSummaryInput {
  /** Whether any evidence is blocking */
  any_blocking?: boolean;
  /** List of missing critical evidence */
  missing_critical?: string[];
}

/**
 * Input parameters for verdict derivation.
 */
export interface DealVerdictInput {
  /** Current workflow state */
  workflowState: "NeedsInfo" | "NeedsReview" | "ReadyForOffer" | null;
  /** Risk summary from risk gates evaluation */
  riskSummary: RiskSummaryInput | null;
  /** Evidence summary from freshness evaluation */
  evidenceSummary: EvidenceSummaryInput | null;
  /** Cash spread in dollars */
  spreadCash: number | null;
  /** Confidence grade (A/B/C) */
  confidenceGrade: "A" | "B" | "C" | null;
  /** Price geometry with ZOPA */
  priceGeometry: PriceGeometry | null;
}

/**
 * Result of verdict derivation with trace data.
 */
export interface DealVerdictResult {
  /** Computed deal verdict */
  verdict: DealVerdict;
  /** Trace entry for audit trail */
  traceEntry: TraceEntry;
}

// ═══════════════════════════════════════════════════════════════════════════
// INTERNAL HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Grade ranking for threshold comparisons.
 * Higher rank = worse confidence.
 */
const GRADE_RANK: Record<"A" | "B" | "C", number> = {
  A: 1,
  B: 2,
  C: 3,
};

/**
 * Checks if confidence grade meets or exceeds (is at or below) the threshold.
 * Grade C is worse than B, which is worse than A.
 *
 * @example
 * isGradeAtOrBelowThreshold("C", "B") // true - C is worse than B
 * isGradeAtOrBelowThreshold("A", "B") // false - A is better than B
 * isGradeAtOrBelowThreshold("B", "B") // true - exact match
 */
function isGradeAtOrBelowThreshold(
  grade: "A" | "B" | "C" | null,
  threshold: "A" | "B" | "C"
): boolean {
  if (grade === null) return false;
  return GRADE_RANK[grade] >= GRADE_RANK[threshold];
}

/**
 * Calculates confidence percentage for needs_evidence verdict.
 */
function calculateEvidenceConfidence(
  reasonCount: number,
  confidenceGrade: "A" | "B" | "C" | null
): number {
  let base = 60;

  // More reasons = lower confidence
  base -= Math.min(20, reasonCount * 5);

  // Adjust based on grade
  if (confidenceGrade === "B") base += 10;
  if (confidenceGrade === "C") base -= 10;

  return Math.max(30, Math.min(75, base));
}

/**
 * Calculates confidence percentage for pursue verdict.
 */
function calculatePursueConfidence(
  confidenceGrade: "A" | "B" | "C" | null,
  priceGeometry: PriceGeometry | null
): number {
  let base = 80;

  // Grade A = higher confidence
  if (confidenceGrade === "A") base = 92;
  if (confidenceGrade === "B") base = 80;

  // Wide ZOPA = higher confidence
  if (priceGeometry?.zopa_pct_of_arv && priceGeometry.zopa_pct_of_arv > 10) {
    base += 5;
  }

  return Math.min(98, base);
}

/**
 * Builds a human-readable rationale for pursue verdict.
 */
function buildPursueRationale(
  spreadCash: number | null,
  priceGeometry: PriceGeometry | null,
  confidenceGrade: "A" | "B" | "C" | null
): string {
  const parts: string[] = [];

  if (spreadCash !== null) {
    parts.push(`$${spreadCash.toLocaleString()} spread`);
  }

  if (priceGeometry?.zopa_pct_of_arv) {
    parts.push(`${priceGeometry.zopa_pct_of_arv.toFixed(1)}% ZOPA`);
  }

  if (confidenceGrade) {
    parts.push(`Grade ${confidenceGrade}`);
  }

  if (parts.length === 0) {
    return "All gates pass, deal is viable";
  }

  return `Viable deal: ${parts.join(", ")}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Derives the deal verdict based on multiple decision factors.
 *
 * Decision Hierarchy (evaluated in order):
 *
 * 1. PASS conditions (deal-killers):
 *    - Any risk gate STOP (if blockOnAnyRiskStop)
 *    - Deal-killer gates (title, bankruptcy, compliance)
 *    - No ZOPA exists
 *    - Spread below minimum threshold
 *
 * 2. NEEDS_EVIDENCE conditions:
 *    - Workflow state is NeedsInfo
 *    - Confidence grade is C
 *    - Missing critical evidence
 *    - Workflow state is NeedsReview
 *
 * 3. PURSUE (all conditions met):
 *    - No blocking factors
 *    - ZOPA exists with sufficient percentage
 *    - Spread meets threshold
 *    - Confidence grade A or B
 *
 * @param input - Verdict input parameters
 * @param policy - Policy tokens for thresholds
 * @returns Deal verdict with trace entry
 *
 * @example
 * ```typescript
 * const result = deriveDealVerdict({
 *   workflowState: 'ReadyForOffer',
 *   riskSummary: { overall: 'GO', any_blocking: false },
 *   evidenceSummary: { any_blocking: false, missing_critical: [] },
 *   spreadCash: 25000,
 *   confidenceGrade: 'A',
 *   priceGeometry: { zopa_exists: true, zopa_pct_of_arv: 8 }
 * });
 * // result.verdict.recommendation = 'pursue'
 * ```
 */
export function deriveDealVerdict(
  input: DealVerdictInput,
  policy: DealVerdictPolicy = DEFAULT_DEAL_VERDICT_POLICY
): DealVerdictResult {
  const {
    workflowState,
    riskSummary,
    evidenceSummary,
    spreadCash,
    confidenceGrade,
    priceGeometry,
  } = input;

  // Collect blocking factors and reasons
  const passReasons: string[] = [];
  const needsEvidenceReasons: string[] = [];

  // ═══════════════════════════════════════════════════════════════
  // PHASE 1: EVALUATE PASS CONDITIONS (DEAL-KILLERS)
  // ═══════════════════════════════════════════════════════════════

  // 1a. Check for risk gate STOP
  if (riskSummary) {
    if (policy.blockOnAnyRiskStop && riskSummary.any_blocking) {
      passReasons.push("Risk gate STOP detected");
    }

    if (riskSummary.overall === "STOP") {
      passReasons.push("Overall risk status is STOP");
    }

    // Check deal-killer gates specifically
    if (riskSummary.gates) {
      for (const gateKey of policy.dealKillerGates) {
        const gate = riskSummary.gates[gateKey];
        if (gate && gate.status === "STOP") {
          passReasons.push(
            `Deal-killer gate "${gateKey}" is STOP: ${gate.reason || "No reason provided"}`
          );
        }
      }
    }
  }

  // 1b. Check ZOPA existence
  if (priceGeometry && !priceGeometry.zopa_exists) {
    passReasons.push("No ZOPA exists (ceiling <= floor)");
  }

  // 1c. Check ZOPA percentage threshold
  if (
    priceGeometry &&
    priceGeometry.zopa_exists &&
    priceGeometry.zopa_pct_of_arv !== null
  ) {
    if (priceGeometry.zopa_pct_of_arv < policy.minZopaPctForPursue) {
      passReasons.push(
        `ZOPA ${priceGeometry.zopa_pct_of_arv.toFixed(1)}% below minimum ${policy.minZopaPctForPursue}%`
      );
    }
  }

  // 1d. Check spread threshold for PASS
  if (spreadCash !== null && spreadCash < policy.minSpreadForEvidence) {
    passReasons.push(
      `Spread $${spreadCash.toLocaleString()} below minimum $${policy.minSpreadForEvidence.toLocaleString()}`
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // PHASE 2: EVALUATE NEEDS_EVIDENCE CONDITIONS
  // ═══════════════════════════════════════════════════════════════

  // 2a. Workflow state NeedsInfo
  if (workflowState === "NeedsInfo") {
    needsEvidenceReasons.push("Workflow state is NeedsInfo");
  }

  // 2b. Low confidence grade (at or below threshold)
  // Grade C is worse than B, which is worse than A.
  // If threshold is "B", both B and C trigger needs_evidence.
  if (isGradeAtOrBelowThreshold(confidenceGrade, policy.lowConfidenceGrade)) {
    needsEvidenceReasons.push(
      `Confidence grade ${confidenceGrade} is at or below threshold ${policy.lowConfidenceGrade}`
    );
  }

  // 2c. Missing critical evidence
  if (
    evidenceSummary?.missing_critical &&
    evidenceSummary.missing_critical.length > 0
  ) {
    needsEvidenceReasons.push(
      `Missing critical evidence: ${evidenceSummary.missing_critical.join(", ")}`
    );
  }

  // 2d. Evidence blocking
  if (evidenceSummary?.any_blocking) {
    needsEvidenceReasons.push("Evidence freshness is blocking");
  }

  // 2e. Workflow state NeedsReview
  if (workflowState === "NeedsReview") {
    needsEvidenceReasons.push("Workflow state is NeedsReview");
  }

  // 2f. Spread below PURSUE threshold but above PASS threshold
  if (
    spreadCash !== null &&
    spreadCash >= policy.minSpreadForEvidence &&
    spreadCash < policy.minSpreadForPursue
  ) {
    needsEvidenceReasons.push(
      `Spread $${spreadCash.toLocaleString()} below PURSUE threshold $${policy.minSpreadForPursue.toLocaleString()}`
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // PHASE 3: DETERMINE FINAL VERDICT
  // ═══════════════════════════════════════════════════════════════

  let recommendation: DealVerdictRecommendation;
  let rationale: string;
  let confidencePct: number;
  const blockingFactors = [...passReasons];

  // Derive additional status flags
  const spreadAdequate =
    spreadCash !== null && spreadCash >= policy.minSpreadForPursue;
  const evidenceComplete =
    !evidenceSummary?.any_blocking &&
    (!evidenceSummary?.missing_critical ||
      evidenceSummary.missing_critical.length === 0);
  const riskAcceptable =
    !riskSummary?.any_blocking && riskSummary?.overall !== "STOP";

  if (passReasons.length > 0) {
    // PASS: Deal has fatal blockers
    recommendation = "pass";
    rationale = `Deal blocked: ${passReasons[0]}${passReasons.length > 1 ? ` (+${passReasons.length - 1} more)` : ""}`;
    confidencePct = 95; // High confidence this is a pass
  } else if (needsEvidenceReasons.length > 0) {
    // NEEDS_EVIDENCE: Deal has issues but not fatal
    recommendation = "needs_evidence";
    rationale = `Evidence needed: ${needsEvidenceReasons[0]}${needsEvidenceReasons.length > 1 ? ` (+${needsEvidenceReasons.length - 1} more)` : ""}`;
    confidencePct = calculateEvidenceConfidence(
      needsEvidenceReasons.length,
      confidenceGrade
    );
  } else {
    // PURSUE: All conditions met
    recommendation = "pursue";
    rationale = buildPursueRationale(spreadCash, priceGeometry, confidenceGrade);
    confidencePct = calculatePursueConfidence(confidenceGrade, priceGeometry);
  }

  // Determine primary reason code (case-insensitive matching)
  let primaryReasonCode: string | null = null;
  if (passReasons.length > 0) {
    const firstReason = passReasons[0].toLowerCase();
    if (firstReason.includes("risk")) primaryReasonCode = "RISK_BLOCK";
    else if (firstReason.includes("zopa")) primaryReasonCode = "NO_ZOPA";
    else if (firstReason.includes("spread")) primaryReasonCode = "LOW_SPREAD";
    else primaryReasonCode = "DEAL_KILLER";
  } else if (needsEvidenceReasons.length > 0) {
    const firstReason = needsEvidenceReasons[0].toLowerCase();
    if (firstReason.includes("workflow"))
      primaryReasonCode = "WORKFLOW_INCOMPLETE";
    else if (firstReason.includes("evidence"))
      primaryReasonCode = "MISSING_EVIDENCE";
    else if (firstReason.includes("confidence"))
      primaryReasonCode = "LOW_CONFIDENCE";
    else primaryReasonCode = "EVIDENCE_NEEDED";
  } else {
    primaryReasonCode = "ALL_CLEAR";
  }

  // ═══════════════════════════════════════════════════════════════
  // BUILD RESULT
  // ═══════════════════════════════════════════════════════════════

  const verdict: DealVerdict = {
    recommendation,
    rationale,
    blocking_factors: blockingFactors,
    confidence_pct: confidencePct,
    primary_reason_code: primaryReasonCode,
    spread_adequate: spreadAdequate,
    evidence_complete: evidenceComplete,
    risk_acceptable: riskAcceptable,
  };

  // ═══════════════════════════════════════════════════════════════
  // TRACE ENTRY
  // ═══════════════════════════════════════════════════════════════

  const traceEntry: TraceEntry = {
    rule: "DEAL_VERDICT",
    used: [
      "outputs.workflow_state",
      "outputs.risk_summary",
      "outputs.evidence_summary",
      "outputs.spread_cash",
      "outputs.confidence_grade",
      "outputs.price_geometry",
    ],
    details: {
      inputs: {
        workflow_state: workflowState,
        risk_overall: riskSummary?.overall ?? null,
        risk_any_blocking: riskSummary?.any_blocking ?? false,
        evidence_any_blocking: evidenceSummary?.any_blocking ?? false,
        missing_critical_count: evidenceSummary?.missing_critical?.length ?? 0,
        spread_cash: spreadCash,
        confidence_grade: confidenceGrade,
        zopa_exists: priceGeometry?.zopa_exists ?? false,
        zopa_pct_of_arv: priceGeometry?.zopa_pct_of_arv ?? null,
      },
      evaluation: {
        pass_reasons: passReasons,
        needs_evidence_reasons: needsEvidenceReasons,
        pursue_eligible:
          passReasons.length === 0 && needsEvidenceReasons.length === 0,
      },
      result: {
        recommendation,
        confidence_pct: confidencePct,
        blocking_factors_count: blockingFactors.length,
        primary_reason_code: primaryReasonCode,
      },
      status_flags: {
        spread_adequate: spreadAdequate,
        evidence_complete: evidenceComplete,
        risk_acceptable: riskAcceptable,
      },
      policy: {
        min_spread_for_pursue: policy.minSpreadForPursue,
        min_spread_for_evidence: policy.minSpreadForEvidence,
        min_zopa_pct_for_pursue: policy.minZopaPctForPursue,
        low_confidence_grade: policy.lowConfidenceGrade,
        block_on_any_risk_stop: policy.blockOnAnyRiskStop,
        deal_killer_gates: policy.dealKillerGates,
      },
    },
  };

  return {
    verdict,
    traceEntry,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// INPUT VALIDATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Validates verdict input for sanity.
 * Returns array of validation error messages (empty if valid).
 *
 * @param input - Verdict input to validate
 * @returns Array of validation error messages
 */
export function validateDealVerdictInput(input: DealVerdictInput): string[] {
  const errors: string[] = [];

  if (input.spreadCash !== null && input.spreadCash < 0) {
    errors.push("spreadCash cannot be negative");
  }

  if (
    input.confidenceGrade !== null &&
    !["A", "B", "C"].includes(input.confidenceGrade)
  ) {
    errors.push("confidenceGrade must be A, B, or C");
  }

  if (
    input.workflowState !== null &&
    !["NeedsInfo", "NeedsReview", "ReadyForOffer"].includes(input.workflowState)
  ) {
    errors.push("workflowState must be NeedsInfo, NeedsReview, or ReadyForOffer");
  }

  if (
    input.riskSummary?.overall &&
    !["GO", "WATCH", "STOP", "UNKNOWN"].includes(input.riskSummary.overall)
  ) {
    errors.push("riskSummary.overall must be GO, WATCH, STOP, or UNKNOWN");
  }

  return errors;
}
