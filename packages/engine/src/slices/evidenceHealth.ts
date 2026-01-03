/**
 * Evidence Health Calculator — V2.5 Wholesaler Dashboard
 *
 * Computes freshness status for 5 PRD-defined evidence types:
 * 1. Payoff Letter (30-day freshness, critical)
 * 2. Title Commitment (60-day freshness, critical)
 * 3. Insurance Quote (30-day freshness, critical)
 * 4. Four-Point Inspection (90-day freshness, non-critical)
 * 5. Repair Estimate (60-day freshness, non-critical)
 *
 * Produces a health score (0-100) and identifies missing/stale evidence.
 *
 * @module slices/evidenceHealth
 * @trace EVIDENCE_HEALTH
 */

import type {
  EvidenceHealth,
  EvidenceItemHealth,
  EvidenceType,
  EvidenceFreshnessStatus,
} from "@hps-internal/contracts";
import type { TraceEntry } from "../types";

// ═══════════════════════════════════════════════════════════════════════════
// POLICY INTERFACE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Policy tokens for evidence health computation.
 * Defines freshness thresholds per evidence type.
 */
export interface EvidenceHealthPolicy {
  // ─────────────────────────────────────────────────────────────
  // FRESHNESS THRESHOLDS (days)
  // ─────────────────────────────────────────────────────────────
  /** Payoff letter freshness threshold */
  payoffLetterFreshnessDays: number;
  /** Title commitment freshness threshold */
  titleCommitmentFreshnessDays: number;
  /** Insurance quote freshness threshold */
  insuranceQuoteFreshnessDays: number;
  /** Four-point inspection freshness threshold */
  fourPointInspectionFreshnessDays: number;
  /** Repair estimate freshness threshold */
  repairEstimateFreshnessDays: number;

  // ─────────────────────────────────────────────────────────────
  // CRITICALITY FLAGS
  // ─────────────────────────────────────────────────────────────
  /** Whether payoff letter is critical */
  payoffLetterCritical: boolean;
  /** Whether title commitment is critical */
  titleCommitmentCritical: boolean;
  /** Whether insurance quote is critical */
  insuranceQuoteCritical: boolean;
  /** Whether four-point inspection is critical */
  fourPointInspectionCritical: boolean;
  /** Whether repair estimate is critical */
  repairEstimateCritical: boolean;

  // ─────────────────────────────────────────────────────────────
  // HEALTH SCORE WEIGHTS
  // ─────────────────────────────────────────────────────────────
  /** Points per fresh item (out of 100 total) */
  pointsPerFreshItem: number;
  /** Penalty per stale item */
  penaltyPerStaleItem: number;
  /** Penalty per missing item */
  penaltyPerMissingItem: number;
  /** Additional penalty per missing CRITICAL item */
  penaltyPerMissingCritical: number;

  // ─────────────────────────────────────────────────────────────
  // HEALTH BAND THRESHOLDS
  // ─────────────────────────────────────────────────────────────
  /** Minimum score for "excellent" band */
  excellentThreshold: number;
  /** Minimum score for "good" band */
  goodThreshold: number;
  /** Minimum score for "fair" band */
  fairThreshold: number;
  // Below fairThreshold = "poor"
}

/**
 * Default policy values based on PRD requirements.
 */
export const DEFAULT_EVIDENCE_HEALTH_POLICY: EvidenceHealthPolicy = {
  // Freshness thresholds (from PRD)
  payoffLetterFreshnessDays: 30,
  titleCommitmentFreshnessDays: 60,
  insuranceQuoteFreshnessDays: 30,
  fourPointInspectionFreshnessDays: 90,
  repairEstimateFreshnessDays: 60,

  // Criticality (first 3 are critical per PRD)
  payoffLetterCritical: true,
  titleCommitmentCritical: true,
  insuranceQuoteCritical: true,
  fourPointInspectionCritical: false,
  repairEstimateCritical: false,

  // Health score weights (5 items, 20 points each = 100 max)
  pointsPerFreshItem: 20,
  penaltyPerStaleItem: 10,
  penaltyPerMissingItem: 20,
  penaltyPerMissingCritical: 10, // Additional penalty on top of base

  // Health band thresholds
  excellentThreshold: 80,
  goodThreshold: 60,
  fairThreshold: 40,
};

// ═══════════════════════════════════════════════════════════════════════════
// INPUT TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Input for a single evidence item.
 * Date should be ISO string or null if not available.
 */
export interface EvidenceInput {
  /** ISO date string when evidence was obtained, null if missing */
  obtainedDate: string | null;
}

/**
 * Input parameters for evidence health computation.
 */
export interface EvidenceHealthInput {
  /** Payoff letter evidence */
  payoffLetter: EvidenceInput;
  /** Title commitment evidence */
  titleCommitment: EvidenceInput;
  /** Insurance quote evidence */
  insuranceQuote: EvidenceInput;
  /** Four-point inspection evidence */
  fourPointInspection: EvidenceInput;
  /** Repair estimate evidence */
  repairEstimate: EvidenceInput;
  /** Reference date for freshness calculation (defaults to now) */
  referenceDate?: string;
}

/**
 * Result of evidence health computation with trace data.
 */
export interface EvidenceHealthResult {
  /** Computed evidence health */
  evidenceHealth: EvidenceHealth;
  /** Trace entry for audit trail */
  traceEntry: TraceEntry;
}

// ═══════════════════════════════════════════════════════════════════════════
// EVIDENCE TYPE CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Configuration for each evidence type.
 * Centralizes the mapping between type enum and policy values.
 */
interface EvidenceTypeConfig {
  type: EvidenceType;
  label: string;
  policyKey: keyof EvidenceHealthInput;
  getFreshnessThreshold: (policy: EvidenceHealthPolicy) => number;
  getIsCritical: (policy: EvidenceHealthPolicy) => boolean;
}

/**
 * Ordered list of evidence types with their configurations.
 * Order matches PRD specification.
 */
const EVIDENCE_TYPE_CONFIGS: EvidenceTypeConfig[] = [
  {
    type: "payoff_letter",
    label: "Payoff Letter",
    policyKey: "payoffLetter",
    getFreshnessThreshold: (p) => p.payoffLetterFreshnessDays,
    getIsCritical: (p) => p.payoffLetterCritical,
  },
  {
    type: "title_commitment",
    label: "Title Commitment",
    policyKey: "titleCommitment",
    getFreshnessThreshold: (p) => p.titleCommitmentFreshnessDays,
    getIsCritical: (p) => p.titleCommitmentCritical,
  },
  {
    type: "insurance_quote",
    label: "Insurance Quote",
    policyKey: "insuranceQuote",
    getFreshnessThreshold: (p) => p.insuranceQuoteFreshnessDays,
    getIsCritical: (p) => p.insuranceQuoteCritical,
  },
  {
    type: "four_point_inspection",
    label: "Four-Point Inspection",
    policyKey: "fourPointInspection",
    getFreshnessThreshold: (p) => p.fourPointInspectionFreshnessDays,
    getIsCritical: (p) => p.fourPointInspectionCritical,
  },
  {
    type: "repair_estimate",
    label: "Repair Estimate",
    policyKey: "repairEstimate",
    getFreshnessThreshold: (p) => p.repairEstimateFreshnessDays,
    getIsCritical: (p) => p.repairEstimateCritical,
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// INTERNAL HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Clamps a value between min and max.
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Calculates age in days from a date string to reference date.
 * Returns null if dateStr is null or invalid.
 */
function calculateAgeDays(
  dateStr: string | null,
  referenceDate: Date
): number | null {
  if (dateStr === null) return null;

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return null;

  const diffMs = referenceDate.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // Age cannot be negative (future dates treated as 0 days old)
  return Math.max(0, diffDays);
}

/**
 * Determines freshness status based on age and threshold.
 *
 * Logic:
 * - null age → "missing" (no date provided)
 * - age <= threshold → "fresh"
 * - age > threshold → "stale"
 *
 * NOTE: Using > (strictly greater) for stale, so exactly at threshold is still fresh.
 * This matches PRD intent: "30-day freshness" means good for 30 days inclusive.
 */
function determineFreshnessStatus(
  ageDays: number | null,
  thresholdDays: number
): EvidenceFreshnessStatus {
  if (ageDays === null) return "missing";
  if (ageDays <= thresholdDays) return "fresh";
  return "stale";
}

/**
 * Calculates days until evidence becomes stale.
 * Returns null if missing, negative if already stale.
 */
function calculateDaysUntilStale(
  ageDays: number | null,
  thresholdDays: number
): number | null {
  if (ageDays === null) return null;
  return thresholdDays - ageDays;
}

/**
 * Evaluates a single evidence item.
 */
function evaluateEvidenceItem(
  config: EvidenceTypeConfig,
  input: EvidenceInput,
  referenceDate: Date,
  policy: EvidenceHealthPolicy
): EvidenceItemHealth {
  const threshold = config.getFreshnessThreshold(policy);
  const isCritical = config.getIsCritical(policy);
  const ageDays = calculateAgeDays(input.obtainedDate, referenceDate);
  const status = determineFreshnessStatus(ageDays, threshold);
  const daysUntilStale = calculateDaysUntilStale(ageDays, threshold);

  return {
    evidence_type: config.type,
    label: config.label,
    status,
    obtained_date: input.obtainedDate,
    age_days: ageDays,
    freshness_threshold_days: threshold,
    days_until_stale: daysUntilStale,
    is_critical: isCritical,
  };
}

/**
 * Determines health band based on score.
 */
function determineHealthBand(
  score: number,
  policy: EvidenceHealthPolicy
): "excellent" | "good" | "fair" | "poor" {
  if (score >= policy.excellentThreshold) return "excellent";
  if (score >= policy.goodThreshold) return "good";
  if (score >= policy.fairThreshold) return "fair";
  return "poor";
}

/**
 * Generates recommended action based on health state.
 */
function generateRecommendedAction(
  missingCritical: EvidenceType[],
  staleCritical: EvidenceType[],
  missingCount: number,
  staleCount: number
): string {
  if (missingCritical.length > 0) {
    const labels = missingCritical.map(
      (t) => EVIDENCE_TYPE_CONFIGS.find((c) => c.type === t)?.label ?? t
    );
    return `Obtain missing critical evidence: ${labels.join(", ")}`;
  }

  if (staleCritical.length > 0) {
    const labels = staleCritical.map(
      (t) => EVIDENCE_TYPE_CONFIGS.find((c) => c.type === t)?.label ?? t
    );
    return `Refresh stale critical evidence: ${labels.join(", ")}`;
  }

  if (missingCount > 0) {
    return `Collect ${missingCount} missing evidence item(s)`;
  }

  if (staleCount > 0) {
    return `Refresh ${staleCount} stale evidence item(s)`;
  }

  return "All evidence current — ready for underwriting";
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Computes evidence health for 5 PRD-defined evidence types.
 *
 * Health Score Logic:
 * - Start at 0, add pointsPerFreshItem for each fresh item
 * - Subtract penaltyPerStaleItem for each stale item
 * - Subtract penaltyPerMissingItem for each missing item
 * - Subtract additional penaltyPerMissingCritical for missing critical items
 * - Clamp result to 0-100
 *
 * @param input - Evidence dates for each type
 * @param policy - Policy tokens for thresholds
 * @returns Evidence health result with trace entry
 *
 * @example
 * ```typescript
 * const result = computeEvidenceHealth({
 *   payoffLetter: { obtainedDate: "2026-01-01" },
 *   titleCommitment: { obtainedDate: "2025-12-15" },
 *   insuranceQuote: { obtainedDate: null }, // missing
 *   fourPointInspection: { obtainedDate: "2025-10-01" }, // stale (>90 days)
 *   repairEstimate: { obtainedDate: "2025-12-20" },
 * });
 * // result.evidenceHealth.health_score = ~50
 * // result.evidenceHealth.any_critical_missing = true
 * ```
 */
export function computeEvidenceHealth(
  input: EvidenceHealthInput,
  policy: EvidenceHealthPolicy = DEFAULT_EVIDENCE_HEALTH_POLICY
): EvidenceHealthResult {
  // Determine reference date (default to now)
  const referenceDate = input.referenceDate
    ? new Date(input.referenceDate)
    : new Date();

  // ═══════════════════════════════════════════════════════════════
  // EVALUATE EACH EVIDENCE ITEM
  // ═══════════════════════════════════════════════════════════════

  const inputMap: Record<string, EvidenceInput> = {
    payoffLetter: input.payoffLetter,
    titleCommitment: input.titleCommitment,
    insuranceQuote: input.insuranceQuote,
    fourPointInspection: input.fourPointInspection,
    repairEstimate: input.repairEstimate,
  };

  const items: EvidenceItemHealth[] = EVIDENCE_TYPE_CONFIGS.map((config) => {
    const evidenceInput = inputMap[config.policyKey];
    return evaluateEvidenceItem(config, evidenceInput, referenceDate, policy);
  });

  // ═══════════════════════════════════════════════════════════════
  // AGGREGATE COUNTS
  // ═══════════════════════════════════════════════════════════════

  const freshCount = items.filter((i) => i.status === "fresh").length;
  const staleCount = items.filter((i) => i.status === "stale").length;
  const missingCount = items.filter((i) => i.status === "missing").length;

  const missingCritical: EvidenceType[] = items
    .filter((i) => i.status === "missing" && i.is_critical)
    .map((i) => i.evidence_type);

  const staleCritical: EvidenceType[] = items
    .filter((i) => i.status === "stale" && i.is_critical)
    .map((i) => i.evidence_type);

  const anyCriticalMissing = missingCritical.length > 0;
  const anyCriticalStale = staleCritical.length > 0;

  // ═══════════════════════════════════════════════════════════════
  // CALCULATE HEALTH SCORE
  // ═══════════════════════════════════════════════════════════════

  let rawScore = 0;

  // Add points for fresh items
  rawScore += freshCount * policy.pointsPerFreshItem;

  // Subtract penalty for stale items
  rawScore -= staleCount * policy.penaltyPerStaleItem;

  // Subtract penalty for missing items
  rawScore -= missingCount * policy.penaltyPerMissingItem;

  // Additional penalty for missing critical items
  rawScore -= missingCritical.length * policy.penaltyPerMissingCritical;

  // Clamp to 0-100
  const healthScore = Math.round(clamp(rawScore, 0, 100));

  // Determine band
  const healthBand = determineHealthBand(healthScore, policy);

  // Generate recommended action
  const recommendedAction = generateRecommendedAction(
    missingCritical,
    staleCritical,
    missingCount,
    staleCount
  );

  // ═══════════════════════════════════════════════════════════════
  // BUILD RESULT
  // ═══════════════════════════════════════════════════════════════

  const evidenceHealth: EvidenceHealth = {
    items,
    fresh_count: freshCount,
    stale_count: staleCount,
    missing_count: missingCount,
    health_score: healthScore,
    health_band: healthBand,
    any_critical_missing: anyCriticalMissing,
    any_critical_stale: anyCriticalStale,
    missing_critical: missingCritical,
    stale_critical: staleCritical,
    recommended_action: recommendedAction,
  };

  // ═══════════════════════════════════════════════════════════════
  // TRACE ENTRY
  // ═══════════════════════════════════════════════════════════════

  const traceEntry: TraceEntry = {
    rule: "EVIDENCE_HEALTH",
    used: [
      "inputs.payoff_letter",
      "inputs.title_commitment",
      "inputs.insurance_quote",
      "inputs.four_point_inspection",
      "inputs.repair_estimate",
      "policy.freshness_thresholds",
      "policy.criticality_flags",
    ],
    details: {
      inputs: {
        reference_date: referenceDate.toISOString(),
        payoff_letter: input.payoffLetter.obtainedDate,
        title_commitment: input.titleCommitment.obtainedDate,
        insurance_quote: input.insuranceQuote.obtainedDate,
        four_point_inspection: input.fourPointInspection.obtainedDate,
        repair_estimate: input.repairEstimate.obtainedDate,
      },
      per_item_evaluation: items.map((item) => ({
        type: item.evidence_type,
        status: item.status,
        age_days: item.age_days,
        threshold_days: item.freshness_threshold_days,
        days_until_stale: item.days_until_stale,
        is_critical: item.is_critical,
      })),
      aggregates: {
        fresh_count: freshCount,
        stale_count: staleCount,
        missing_count: missingCount,
        missing_critical: missingCritical,
        stale_critical: staleCritical,
      },
      score_calculation: {
        points_from_fresh: freshCount * policy.pointsPerFreshItem,
        penalty_from_stale: staleCount * policy.penaltyPerStaleItem,
        penalty_from_missing: missingCount * policy.penaltyPerMissingItem,
        penalty_from_missing_critical:
          missingCritical.length * policy.penaltyPerMissingCritical,
        raw_score: rawScore,
        final_score: healthScore,
      },
      result: {
        health_score: healthScore,
        health_band: healthBand,
        any_critical_missing: anyCriticalMissing,
        any_critical_stale: anyCriticalStale,
        recommended_action: recommendedAction,
      },
      policy: {
        payoff_letter_freshness_days: policy.payoffLetterFreshnessDays,
        title_commitment_freshness_days: policy.titleCommitmentFreshnessDays,
        insurance_quote_freshness_days: policy.insuranceQuoteFreshnessDays,
        four_point_inspection_freshness_days:
          policy.fourPointInspectionFreshnessDays,
        repair_estimate_freshness_days: policy.repairEstimateFreshnessDays,
        points_per_fresh_item: policy.pointsPerFreshItem,
        penalty_per_stale_item: policy.penaltyPerStaleItem,
        penalty_per_missing_item: policy.penaltyPerMissingItem,
        penalty_per_missing_critical: policy.penaltyPerMissingCritical,
        excellent_threshold: policy.excellentThreshold,
        good_threshold: policy.goodThreshold,
        fair_threshold: policy.fairThreshold,
      },
    },
  };

  return {
    evidenceHealth,
    traceEntry,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// INPUT VALIDATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Validates evidence health input for sanity.
 * Returns array of validation error messages (empty if valid).
 *
 * @param input - Evidence health input to validate
 * @returns Array of validation error messages
 */
export function validateEvidenceHealthInput(
  input: EvidenceHealthInput
): string[] {
  const errors: string[] = [];

  // Validate date formats if provided
  const dateFields: [string, string | null][] = [
    ["payoffLetter", input.payoffLetter.obtainedDate],
    ["titleCommitment", input.titleCommitment.obtainedDate],
    ["insuranceQuote", input.insuranceQuote.obtainedDate],
    ["fourPointInspection", input.fourPointInspection.obtainedDate],
    ["repairEstimate", input.repairEstimate.obtainedDate],
  ];

  for (const [fieldName, dateStr] of dateFields) {
    if (dateStr !== null) {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        errors.push(
          `${fieldName}.obtainedDate is not a valid date: ${dateStr}`
        );
      }
    }
  }

  // Validate reference date if provided
  if (input.referenceDate !== undefined) {
    const refDate = new Date(input.referenceDate);
    if (isNaN(refDate.getTime())) {
      errors.push(`referenceDate is not a valid date: ${input.referenceDate}`);
    }
  }

  return errors;
}

// ═══════════════════════════════════════════════════════════════════════════
// POLICY VALIDATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Validates evidence health policy for correctness.
 * Returns array of validation warnings (empty if valid).
 *
 * @param policy - Evidence health policy to validate
 * @returns Array of validation warnings
 */
export function validateEvidenceHealthPolicy(
  policy: EvidenceHealthPolicy
): string[] {
  const warnings: string[] = [];

  // Check all thresholds are positive
  const thresholdFields: [string, number][] = [
    ["payoffLetterFreshnessDays", policy.payoffLetterFreshnessDays],
    ["titleCommitmentFreshnessDays", policy.titleCommitmentFreshnessDays],
    ["insuranceQuoteFreshnessDays", policy.insuranceQuoteFreshnessDays],
    [
      "fourPointInspectionFreshnessDays",
      policy.fourPointInspectionFreshnessDays,
    ],
    ["repairEstimateFreshnessDays", policy.repairEstimateFreshnessDays],
  ];

  for (const [fieldName, value] of thresholdFields) {
    if (value <= 0) {
      warnings.push(`${fieldName} must be positive, got ${value}`);
    }
  }

  // Check score weights are non-negative
  if (policy.pointsPerFreshItem < 0) {
    warnings.push(`pointsPerFreshItem cannot be negative`);
  }
  if (policy.penaltyPerStaleItem < 0) {
    warnings.push(`penaltyPerStaleItem cannot be negative`);
  }
  if (policy.penaltyPerMissingItem < 0) {
    warnings.push(`penaltyPerMissingItem cannot be negative`);
  }
  if (policy.penaltyPerMissingCritical < 0) {
    warnings.push(`penaltyPerMissingCritical cannot be negative`);
  }

  // Check band thresholds are in descending order
  if (
    policy.excellentThreshold <= policy.goodThreshold ||
    policy.goodThreshold <= policy.fairThreshold
  ) {
    warnings.push(
      `Band thresholds must be in descending order: excellent (${policy.excellentThreshold}) > good (${policy.goodThreshold}) > fair (${policy.fairThreshold})`
    );
  }

  // Check that max possible score (5 fresh items) can reach 100
  const maxPossibleScore = 5 * policy.pointsPerFreshItem;
  if (maxPossibleScore < 100) {
    warnings.push(
      `pointsPerFreshItem (${policy.pointsPerFreshItem}) is too low — max possible score is ${maxPossibleScore}, should be at least 100`
    );
  }

  return warnings;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Determines if evidence is sufficient for confident underwriting.
 *
 * @param evidenceHealth - Computed evidence health
 * @param minScore - Minimum required health score (default 60)
 * @returns Whether evidence meets sufficiency criteria
 */
export function isEvidenceSufficient(
  evidenceHealth: EvidenceHealth,
  minScore: number = 60
): boolean {
  // Must have no missing critical evidence AND meet minimum score
  return (
    !evidenceHealth.any_critical_missing &&
    evidenceHealth.health_score >= minScore
  );
}

/**
 * Gets list of evidence items that need attention (missing or stale).
 *
 * @param evidenceHealth - Computed evidence health
 * @returns Items needing attention, sorted by priority (critical first, then by status)
 */
export function getEvidenceNeedingAttention(
  evidenceHealth: EvidenceHealth
): EvidenceItemHealth[] {
  return evidenceHealth.items
    .filter((item) => item.status === "missing" || item.status === "stale")
    .sort((a, b) => {
      // Critical items first
      if (a.is_critical && !b.is_critical) return -1;
      if (!a.is_critical && b.is_critical) return 1;
      // Missing before stale
      if (a.status === "missing" && b.status === "stale") return -1;
      if (a.status === "stale" && b.status === "missing") return 1;
      return 0;
    });
}

/**
 * Calculates how many days until the earliest evidence expires.
 * Returns null if all evidence is missing or already stale.
 *
 * @param evidenceHealth - Computed evidence health
 * @returns Days until soonest expiration, or null
 */
export function getDaysUntilSoonestExpiration(
  evidenceHealth: EvidenceHealth
): number | null {
  const freshItems = evidenceHealth.items.filter(
    (item) => item.status === "fresh" && item.days_until_stale !== null
  );

  if (freshItems.length === 0) return null;

  const soonestExpiration = Math.min(
    ...freshItems.map((item) => item.days_until_stale!)
  );

  return soonestExpiration;
}
