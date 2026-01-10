/**
 * Underwrite Types Barrel Export
 * @module @hps-internal/contracts/underwrite
 * @slice 02 of 22
 */

// ═══════════════════════════════════════════════════════════════════════════════
// ENUMS (Type exports)
// ═══════════════════════════════════════════════════════════════════════════════

export type {
  ReasonForSelling,
  SellerTimeline,
  DecisionMakerStatus,
  ForeclosureStatus,
  LienStatus,
  TaxStatus,
  PropertyCondition,
  DeferredMaintenance,
  TimelinePosition,
  UrgencyLevel,
  RiskLevel,
  MotivationLevel,
  ConfidenceLevel,
  SystemCondition,
} from './enums';

// ═══════════════════════════════════════════════════════════════════════════════
// ENUM OPTIONS (Value exports)
// ═══════════════════════════════════════════════════════════════════════════════

export {
  REASON_FOR_SELLING_OPTIONS,
  SELLER_TIMELINE_OPTIONS,
  DECISION_MAKER_OPTIONS,
  FORECLOSURE_STATUS_OPTIONS,
  FL_TIMELINE_STAGES,
  LIEN_STATUS_OPTIONS,
  TAX_STATUS_OPTIONS,
  PROPERTY_CONDITION_OPTIONS,
  DEFERRED_MAINTENANCE_OPTIONS,
} from './enums';

// ═══════════════════════════════════════════════════════════════════════════════
// INPUT TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type {
  MotivationScoreInput,
  ForeclosureTimelineInput,
  LienRiskInput,
  SystemsStatusInput,
} from './inputs';

// ═══════════════════════════════════════════════════════════════════════════════
// OUTPUT TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type {
  MotivationScoreOutput,
  ForeclosureTimelineOutput,
  LienRiskOutput,
  SystemScore,
  SystemsStatusOutput,
  UnderwriteRiskGateType,
  UnderwriteRiskGateResult,
  UnderwriteRiskGatesOutput,
} from './outputs';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

export {
  // Motivation thresholds
  MOTIVATION_LOW_MIN,
  MOTIVATION_MEDIUM_MIN,
  MOTIVATION_HIGH_MIN,
  MOTIVATION_CRITICAL_MIN,
  // Foreclosure urgency
  URGENCY_CRITICAL_DAYS,
  URGENCY_HIGH_DAYS,
  URGENCY_MEDIUM_DAYS,
  // Foreclosure boosts
  FORECLOSURE_BOOST_CRITICAL,
  FORECLOSURE_BOOST_HIGH,
  FORECLOSURE_BOOST_MEDIUM,
  FORECLOSURE_BOOST_LOW,
  // Lien thresholds
  LIEN_BLOCKING_THRESHOLD,
  LIEN_LOW_THRESHOLD,
  LIEN_MEDIUM_THRESHOLD,
  LIEN_HIGH_THRESHOLD,
  // System expected life
  ROOF_EXPECTED_LIFE,
  HVAC_EXPECTED_LIFE,
  WATER_HEATER_EXPECTED_LIFE,
  // System costs
  ROOF_REPLACEMENT_COST,
  HVAC_REPLACEMENT_COST,
  WATER_HEATER_REPLACEMENT_COST,
  // Reference
  REFERENCE_YEAR,
} from './constants';
