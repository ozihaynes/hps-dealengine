/**
 * Engine Functions Barrel Export
 * @module lib/engine
 *
 * Pure, deterministic functions for underwriting calculations.
 * These functions have no side effects and always return the same output for the same input.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// MOTIVATION SCORE ENGINE (Slice 07)
// ═══════════════════════════════════════════════════════════════════════════════

export {
  computeMotivationScore,
  REASON_SCORES,
  TIMELINE_MULTIPLIERS,
  DECISION_MAKER_FACTORS,
  DEFAULT_BASE_SCORE,
  DISTRESS_BONUS,
  MAX_FORECLOSURE_BOOST,
} from './computeMotivationScore';

// ═══════════════════════════════════════════════════════════════════════════════
// PORTFOLIO UTILS
// ═══════════════════════════════════════════════════════════════════════════════

export {
  deriveVerdict,
  computeMetrics,
  groupByVerdict,
  formatCurrency,
  formatPercent,
  formatTimeAgo,
  clampScore,
  extractNumber,
  DEFAULT_METRICS,
} from './portfolio-utils';

export type {
  VerdictType,
  DealStatus,
  DealSummary,
  VerdictGroup,
  PortfolioMetrics,
} from './portfolio-utils';

// ═══════════════════════════════════════════════════════════════════════════════
// FORECLOSURE TIMELINE ENGINE (Slice 08)
// ═══════════════════════════════════════════════════════════════════════════════

export {
  computeForeclosureTimeline,
  FL_FORECLOSURE_STAGES,
  URGENCY_THRESHOLDS,
  URGENCY_MOTIVATION_BOOST,
} from './computeForeclosureTimeline';

export type {
  ForeclosureStatusExtended,
  AuctionDateSource,
  ForeclosureTimelineInput,
  ForeclosureKeyDates,
  ForeclosureTimelineOutput,
} from './computeForeclosureTimeline';

// ═══════════════════════════════════════════════════════════════════════════════
// LIEN RISK ENGINE (Slice 09)
// ═══════════════════════════════════════════════════════════════════════════════

export {
  computeLienRisk,
  LIEN_THRESHOLDS,
  LIEN_BLOCKING_THRESHOLD,
} from './computeLienRisk';

export type {
  LienAccountStatus,
  LienRiskLevel,
  LienRiskInput,
  LienBreakdown,
  LienRiskOutput,
} from './computeLienRisk';

// ═══════════════════════════════════════════════════════════════════════════════
// SYSTEMS STATUS ENGINE (Slice 10)
// ═══════════════════════════════════════════════════════════════════════════════

export {
  computeSystemsStatus,
  SYSTEM_EXPECTED_LIFE,
  SYSTEM_REPLACEMENT_COST,
  CONDITION_THRESHOLDS,
} from './computeSystemsStatus';

export type { SystemType } from './computeSystemsStatus';

// ═══════════════════════════════════════════════════════════════════════════════
// RISK GATES ENGINE (Slice 11)
// ═══════════════════════════════════════════════════════════════════════════════

export {
  evaluateEnhancedRiskGates,
  RISK_GATES,
  MOTIVATION_LOW_THRESHOLD,
  FORECLOSURE_IMMINENT_THRESHOLD,
} from './evaluateEnhancedRiskGates';

export type {
  RiskGateType,
  RiskGateDefinition,
  RiskGateResult,
  RiskGateSummary,
  MotivationOutputForGates,
  ForeclosureOutputForGates,
  LienOutputForGates,
  EnhancedGateInput,
} from './evaluateEnhancedRiskGates';
