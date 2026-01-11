// ============================================================================
// REPAIRS COMPONENTS — Barrel Export
// ============================================================================

// Bidding Cockpit Components (Slice G)
export { BiddingCockpit } from './BiddingCockpit';
export { EstimateSummaryCard } from './EstimateSummaryCard';
export { RepairVelocityCard } from './RepairVelocityCard';
export { GCEstimatesPanel } from './GCEstimatesPanel';
export { GCEstimateCard } from './GCEstimateCard';
export { EnhancedBreakdownPanel } from './EnhancedBreakdownPanel';
export { CategoryRow } from './CategoryRow';
export { StatusBadge } from './StatusBadge';
export type { EstimateStatus } from './StatusBadge';
export { ProgressBar, MultiProgressBar } from './ProgressBar';
export { SkeletonCockpit } from './SkeletonCockpit';
export { EmptyCockpit } from './EmptyCockpit';

// Legacy Components
export { CategorySubtotal } from './CategorySubtotal';
export { EnhancedLineItemRow } from './EnhancedLineItemRow';
export { RepairsSummary } from './RepairsSummary';
export { EnhancedRepairsSection } from './EnhancedRepairsSection';

// Modals (Slice D-F)
export { RequestEstimateModal } from './RequestEstimateModal';
export { ManualUploadModal } from './ManualUploadModal';

// Design Tokens
export {
  repairsDesignTokens,
  getCategoryColors,
  spacing,
  categoryColors,
  typography,
  animations,
  touchTargets,
  focus,
  card,
  statusColors,
} from './designTokens';

// Types
export type { CategoryColorKey } from './designTokens';
export type {
  LineItem,
  CategoryBreakdown,
  EstimateRequest,
  EstimateData,
  VelocityCounts,
} from './types';
