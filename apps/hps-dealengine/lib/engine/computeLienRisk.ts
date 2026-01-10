/**
 * computeLienRisk - Calculate total lien exposure and risk level
 * @module lib/engine/computeLienRisk
 * @slice 09 of 22
 *
 * Florida Statutes Referenced:
 * - FL 720.3085: HOA/CDD joint and several liability
 *   Buyer becomes jointly liable for unpaid assessments at closing
 *
 * Principles Applied:
 * - DETERMINISM: Same input → Same output, always
 * - PURITY: No side effects, no API calls
 * - MONEY MATH: Safe number handling, no NaN, no floating point errors
 * - AUDITABILITY: Breakdown by lien category
 * - DEFENSIVE: Handle null, undefined, NaN, negative values
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Status of HOA/CDD/Tax accounts.
 */
export type LienAccountStatus = 'current' | 'delinquent' | 'unknown' | 'not_applicable';

/**
 * Risk level for lien exposure.
 */
export type LienRiskLevel = 'low' | 'medium' | 'high' | 'critical';

// ═══════════════════════════════════════════════════════════════════════════════
// POLICY-DRIVEN CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Lien thresholds for risk level derivation.
 * These are policy-backed constants - changes require approval.
 */
export const LIEN_THRESHOLDS = {
  /** Below this = low risk */
  WARNING: 2500,
  /** Above WARNING, below HIGH = medium risk */
  HIGH: 5000,
  /** Above HIGH, at or below BLOCKING = high risk */
  BLOCKING: 10000,
  /** Above BLOCKING = critical risk, triggers blocking gate */
} as const;

/**
 * Blocking threshold - deals with liens above this need manual review.
 */
export const LIEN_BLOCKING_THRESHOLD = LIEN_THRESHOLDS.BLOCKING;

// ═══════════════════════════════════════════════════════════════════════════════
// INPUT/OUTPUT INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Input for lien risk calculation.
 */
export interface LienRiskInput {
  /** HOA account status */
  hoa_status: LienAccountStatus;
  /** HOA arrears amount in dollars */
  hoa_arrears_amount: number | null;
  /** Monthly HOA assessment (for projection) */
  hoa_monthly_assessment: number | null;

  /** CDD (Community Development District) status */
  cdd_status: LienAccountStatus;
  /** CDD arrears amount in dollars */
  cdd_arrears_amount: number | null;

  /** Property tax status */
  property_tax_status: LienAccountStatus;
  /** Property tax arrears in dollars */
  property_tax_arrears: number | null;

  /** Are there municipal liens (code violations, etc)? */
  municipal_liens_present: boolean;
  /** Municipal lien amount in dollars */
  municipal_lien_amount: number | null;

  /** Has title search been completed? */
  title_search_completed: boolean;
  /** Notes from title search */
  title_issues_notes: string | null;
}

/**
 * Breakdown of liens by category.
 */
export interface LienBreakdown {
  hoa: number;
  cdd: number;
  property_tax: number;
  municipal: number;
}

/**
 * Output of lien risk calculation.
 */
export interface LienRiskOutput {
  /** Total surviving liens (sum of all categories) */
  total_surviving_liens: number;
  /** Risk level based on total */
  risk_level: LienRiskLevel;
  /** FL 720.3085 joint liability warning (HOA/CDD) */
  joint_liability_warning: boolean;
  /** FL statute reference for joint liability */
  joint_liability_statute: string | null;
  /** Is blocking gate triggered (> $10,000)? */
  blocking_gate_triggered: boolean;
  /** Adjustment to net clearance (negative of total liens) */
  net_clearance_adjustment: number;
  /** List of evidence still needed */
  evidence_needed: string[];
  /** Breakdown by category */
  breakdown: LienBreakdown;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SAFE NUMBER UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Safely parse a number, returning 0 for null/undefined/NaN/negative.
 * Liens cannot be negative amounts.
 */
function safeNumber(value: number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const num = Number(value);
  if (Number.isNaN(num) || !Number.isFinite(num)) return 0;
  return Math.max(0, num); // Ensure non-negative
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compute lien risk from input data.
 *
 * This is a PURE function - no side effects, deterministic output.
 *
 * @param input - Lien data (HOA, CDD, tax, municipal)
 * @returns Lien risk assessment with breakdown
 *
 * @example
 * ```ts
 * const result = computeLienRisk({
 *   hoa_status: 'delinquent',
 *   hoa_arrears_amount: 5000,
 *   hoa_monthly_assessment: 250,
 *   cdd_status: 'current',
 *   cdd_arrears_amount: 0,
 *   property_tax_status: 'delinquent',
 *   property_tax_arrears: 3000,
 *   municipal_liens_present: false,
 *   municipal_lien_amount: 0,
 *   title_search_completed: true,
 *   title_issues_notes: null,
 * });
 * // result.total_surviving_liens = 8000
 * // result.risk_level = 'high'
 * // result.joint_liability_warning = true (HOA arrears)
 * ```
 */
export function computeLienRisk(input: LienRiskInput): LienRiskOutput {
  // === STEP 1: Extract and sanitize amounts ===
  const hoa = safeNumber(input.hoa_arrears_amount);
  const cdd = safeNumber(input.cdd_arrears_amount);
  const property_tax = safeNumber(input.property_tax_arrears);
  const municipal = safeNumber(input.municipal_lien_amount);

  // === STEP 2: Calculate total surviving liens ===
  const total_surviving_liens = hoa + cdd + property_tax + municipal;

  // === STEP 3: Determine risk level ===
  const risk_level = deriveRiskLevel(total_surviving_liens);

  // === STEP 4: Check FL 720.3085 joint liability ===
  const { joint_liability_warning, joint_liability_statute } =
    checkJointLiability(hoa, cdd);

  // === STEP 5: Check blocking gate ===
  const blocking_gate_triggered = total_surviving_liens > LIEN_BLOCKING_THRESHOLD;

  // === STEP 6: Calculate net clearance adjustment ===
  // Liens reduce net proceeds - should be subtracted from clearance
  // Use || 0 to convert -0 to +0 (JavaScript -0 !== +0 with Object.is)
  const net_clearance_adjustment = -total_surviving_liens || 0;

  // === STEP 7: Identify evidence needed ===
  const evidence_needed = identifyEvidenceNeeded(input);

  // === STEP 8: Build breakdown ===
  const breakdown: LienBreakdown = {
    hoa,
    cdd,
    property_tax,
    municipal,
  };

  // === RETURN: Full output ===
  return {
    total_surviving_liens,
    risk_level,
    joint_liability_warning,
    joint_liability_statute,
    blocking_gate_triggered,
    net_clearance_adjustment,
    evidence_needed,
    breakdown,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS (Pure, deterministic)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Derive risk level from total liens.
 */
function deriveRiskLevel(totalLiens: number): LienRiskLevel {
  if (totalLiens > LIEN_THRESHOLDS.BLOCKING) return 'critical';
  if (totalLiens > LIEN_THRESHOLDS.HIGH) return 'high';
  if (totalLiens > LIEN_THRESHOLDS.WARNING) return 'medium';
  return 'low';
}

/**
 * Check for FL 720.3085 joint and several liability.
 *
 * Under FL 720.3085, a buyer becomes jointly liable for unpaid HOA/CDD
 * assessments at closing. This is a significant risk factor.
 */
function checkJointLiability(
  hoaArrears: number,
  cddArrears: number
): { joint_liability_warning: boolean; joint_liability_statute: string | null } {
  const hasJointLiability = hoaArrears > 0 || cddArrears > 0;

  return {
    joint_liability_warning: hasJointLiability,
    joint_liability_statute: hasJointLiability ? 'FL 720.3085' : null,
  };
}

/**
 * Identify what evidence is still needed.
 */
function identifyEvidenceNeeded(input: LienRiskInput): string[] {
  const needed: string[] = [];

  // Title search is critical
  if (!input.title_search_completed) {
    needed.push('Title search');
  }

  // Check for unknown statuses that need verification
  if (input.hoa_status === 'unknown') {
    needed.push('HOA status verification');
  }
  if (input.cdd_status === 'unknown') {
    needed.push('CDD status verification');
  }
  if (input.property_tax_status === 'unknown') {
    needed.push('Property tax status verification');
  }

  // If municipal liens present but amount unknown
  if (input.municipal_liens_present && input.municipal_lien_amount === null) {
    needed.push('Municipal lien amount verification');
  }

  return needed;
}
