/**
 * V2.5 Dashboard Components — Slice 13 + 13.2
 *
 * Feature-flagged V2.5 dashboard experience with:
 * - V25Dashboard: Main orchestrator (legacy replacement mode)
 * - V25EnhancementsZone: Enhancement zone (Slice 13.2 - enhancement mode)
 * - V25DashboardSkeleton: Loading state
 * - V25DashboardEmpty: Empty state
 *
 * Architecture (Slice 13.2):
 * - V25EnhancementsZone ENHANCES CommandCenter (recommended)
 * - V25DashboardSection replaces CommandCenter (deprecated)
 *
 * @module v25
 */

export {
  V25Dashboard,
  type V25DashboardProps,
  VerdictHero,
  StatusStrip,
  KeyMetricsGrid,
  mapVerdictToChipRecommendation,
  getRiskStatusColor,
  getEvidenceStatusColor,
  getVelocityBandInfo,
} from './V25Dashboard';

export {
  V25DashboardSkeleton,
  type V25DashboardSkeletonProps,
} from './V25DashboardSkeleton';

export {
  V25DashboardEmpty,
  type V25DashboardEmptyProps,
} from './V25DashboardEmpty';

export {
  V25DashboardSection,
  type V25DashboardSectionProps,
} from './V25DashboardSection';

// Slice 13.2: Enhancement Mode (recommended)
export {
  V25EnhancementsZone,
  type V25EnhancementsZoneProps,
} from './V25EnhancementsZone';
