/**
 * Underwrite Output Types - Engine function outputs
 * @module @hps-internal/contracts/underwrite/outputs
 * @slice 02 of 22
 */

import type {
  TimelinePosition,
  UrgencyLevel,
  RiskLevel,
  MotivationLevel,
  ConfidenceLevel,
  SystemCondition,
} from './enums';

// ═══════════════════════════════════════════════════════════════════════════════
// MOTIVATION SCORE OUTPUT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Output from computeMotivationScore engine function
 */
export interface MotivationScoreOutput {
  /** Computed score 0-100 */
  motivation_score: number;
  /** Categorical level */
  motivation_level: MotivationLevel;
  /** Data completeness confidence */
  confidence: ConfidenceLevel;
  /** Red flags identified */
  red_flags: string[];
  /** Score breakdown for transparency */
  breakdown: {
    base_score: number;
    timeline_multiplier: number;
    decision_maker_factor: number;
    distress_bonus: number;
    foreclosure_boost: number;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// FORECLOSURE TIMELINE OUTPUT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Output from computeForeclosureTimeline engine function
 */
export interface ForeclosureTimelineOutput {
  /** Current position in foreclosure process */
  timeline_position: TimelinePosition;
  /** Days until estimated sale (null if unknown) */
  days_until_estimated_sale: number | null;
  /** Urgency level for deal */
  urgency_level: UrgencyLevel;
  /** Motivation boost to add (0-25) */
  seller_motivation_boost: number;
  /** FL statute reference */
  statute_reference: string;
  /** Source of auction date */
  auction_date_source: 'confirmed' | 'estimated' | 'unknown';
  /** Key dates in timeline */
  key_dates: {
    first_missed_payment: string | null;
    lis_pendens_filed: string | null;
    judgment_entered: string | null;
    auction_scheduled: string | null;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// LIEN RISK OUTPUT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Output from computeLienRisk engine function
 * @see FL 720.3085 for joint liability rules
 */
export interface LienRiskOutput {
  /** Total surviving liens (buyer responsible) in dollars */
  total_surviving_liens: number;
  /** Risk level based on total */
  risk_level: RiskLevel;
  /** FL 720.3085 joint liability warning */
  joint_liability_warning: boolean;
  /** Blocking gate triggered (>$10K) */
  blocking_gate_triggered: boolean;
  /** Net adjustment to clearance calculation in dollars */
  net_clearance_adjustment: number;
  /** Evidence still needed */
  evidence_needed: string[];
  /** Breakdown by category in dollars */
  breakdown: {
    hoa: number;
    cdd: number;
    property_tax: number;
    municipal: number;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SYSTEMS STATUS OUTPUT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * System-specific score for a single system
 */
export interface SystemScore {
  /** System name */
  system: 'roof' | 'hvac' | 'water_heater';
  /** Year installed (from input) */
  year_installed: number | null;
  /** Calculated age in years */
  age: number | null;
  /** Expected useful life in years */
  expected_life: number;
  /** Remaining useful life in years */
  remaining_years: number | null;
  /** Derived condition */
  condition: SystemCondition | null;
  /** Needs immediate replacement */
  needs_replacement: boolean;
  /** Estimated replacement cost in dollars */
  replacement_cost: number;
}

/**
 * Output from computeSystemsStatus engine function
 */
export interface SystemsStatusOutput {
  /** Roof remaining useful life (years) */
  roof_rul: number | null;
  /** HVAC remaining useful life (years) */
  hvac_rul: number | null;
  /** Water heater remaining useful life (years) */
  water_heater_rul: number | null;
  /** Total cost if all urgent systems replaced in dollars */
  total_replacement_cost: number;
  /** Systems needing immediate replacement */
  urgent_replacements: string[];
  /** Full breakdown by system */
  system_scores: {
    roof: SystemScore;
    hvac: SystemScore;
    water_heater: SystemScore;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// UNDERWRITE RISK GATE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/** Underwrite risk gate type classification */
export type UnderwriteRiskGateType = 'blocking' | 'warning' | 'evidence';

/**
 * Result of evaluating a single underwrite risk gate
 * Note: Different from RiskGateResult in riskGates.ts - this is for underwriting-specific gates
 */
export interface UnderwriteRiskGateResult {
  /** Gate identifier */
  gate_id: string;
  /** Gate type */
  type: UnderwriteRiskGateType;
  /** Did the deal pass this gate */
  passed: boolean;
  /** Human-readable message */
  message: string;
  /** Threshold that was evaluated */
  threshold: string | number | null;
  /** Actual value that was evaluated */
  actual_value: string | number | null;
}

/**
 * Aggregated underwrite risk gates output
 */
export interface UnderwriteRiskGatesOutput {
  /** Total number of gates evaluated */
  total_gates: number;
  /** Number of gates passed */
  passed: number;
  /** Number of gates failed */
  failed: number;
  /** Number of blocking failures */
  blocking_failures: number;
  /** Number of warning failures */
  warning_failures: number;
  /** Number of evidence failures */
  evidence_failures: number;
  /** Individual gate results */
  results: UnderwriteRiskGateResult[];
}
