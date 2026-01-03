export * from './types';
export { computeUnderwriting } from './compute_underwriting';
export type { UnderwritingPolicy } from './compute_underwriting';
export * from './slices/aiv';

export * from './slices/carry';

// V2.5 Wholesaler Dashboard - Price Geometry Slice
export {
  computePriceGeometry,
  validatePriceGeometryInput,
  DEFAULT_PRICE_GEOMETRY_POLICY,
  type PriceGeometryPolicy,
  type PriceGeometryInput,
  type PriceGeometryResult,
} from './slices/priceGeometry';

// V2.5 Wholesaler Dashboard - Deal Verdict Slice
export {
  deriveDealVerdict,
  validateDealVerdictInput,
  DEFAULT_DEAL_VERDICT_POLICY,
  type DealVerdictPolicy,
  type DealVerdictInput,
  type DealVerdictResult,
  type RiskSummaryInput,
  type EvidenceSummaryInput,
} from './slices/verdict';

// V2.5 Wholesaler Dashboard - Net Clearance Calculator Slice
export {
  computeNetClearance,
  validateNetClearanceInput,
  calculateBreakEvenPrices,
  DEFAULT_NET_CLEARANCE_POLICY,
  type NetClearancePolicy,
  type NetClearanceInput,
  type NetClearanceResult,
} from './slices/netClearance';

// V2.5 Wholesaler Dashboard - Comp Quality Scorer Slice
export {
  computeCompQuality,
  validateCompQualityInput,
  calculateIdealCompCharacteristics,
  areCompsSufficient,
  DEFAULT_COMP_QUALITY_POLICY,
  type CompQualityPolicy,
  type CompQualityInput,
  type CompQualityResult,
  type CompForScoring,
} from './slices/compQuality';

// V2.5 Wholesaler Dashboard - Market Velocity Metrics Slice
export {
  computeMarketVelocity,
  validateMarketVelocityInput,
  validateMarketVelocityPolicy,
  estimateDaysToSell,
  shouldFavorQuickExit,
  suggestCarryMonths,
  recommendDispositionStrategy,
  DEFAULT_MARKET_VELOCITY_POLICY,
  type MarketVelocityPolicy,
  type MarketVelocityInput,
  type MarketVelocityResult,
  type MarketCondition,
} from './slices/marketVelocity';

// V2.5 Wholesaler Dashboard - Evidence Health Slice
export {
  computeEvidenceHealth,
  validateEvidenceHealthInput,
  validateEvidenceHealthPolicy,
  isEvidenceSufficient,
  getEvidenceNeedingAttention,
  getDaysUntilSoonestExpiration,
  DEFAULT_EVIDENCE_HEALTH_POLICY,
  type EvidenceHealthPolicy,
  type EvidenceHealthInput,
  type EvidenceHealthResult,
  type EvidenceInput,
} from './slices/evidenceHealth';

// V2.5 Wholesaler Dashboard - Risk Gates Slice
export {
  computeRiskGates,
  validateRiskGatesInput,
  validateRiskGatesPolicy,
  createAllPassInput,
  createAllUnknownInput,
  getGatesRequiringAttention,
  isGateBlocking,
  countGatesAtSeverity,
  hasAnyCritical,
  allGatesPass,
  isAtLeastAsSevere,
  SEVERITY_RANK,
  DEFAULT_RISK_GATES_POLICY,
  type RiskGatesPolicy,
  type RiskGatesComputationResult,
} from './slices/riskGates';

// Command Center V2.1 - L2 Snapshot Computations
export {
  computeCloseabilityIndex,
  computeUrgencyScore,
  computeRiskAdjustedSpread,
  computeBuyerDemandIndex,
  deriveVerdict,
  deriveGateHealthBand,
  derivePayoffBufferBand,
  computeFullSnapshot,
  SNAPSHOT_POLICY_DEFAULTS,
  mergeWithDefaults,
  type CloseabilityResult,
  type UrgencyResult,
  type RiskAdjustedSpreadResult,
  type BuyerDemandResult,
  type VerdictResult,
  type ComputeSnapshotResult,
  type SnapshotPolicyDefaults,
} from "./snapshot_computations";

// ============================================================================
// Command Center V2.1 - Signal Generation
// ============================================================================

export {
  generateActiveSignals,
  countSignalsBySeverity,
  getTopSignals,
  groupSignalsByCategory,
} from "./signal_generator";
