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
