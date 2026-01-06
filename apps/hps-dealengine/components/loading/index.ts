/**
 * Loading Components — Slice 21
 *
 * Polished loading skeletons with shimmer animations.
 * All components respect reduced motion preferences.
 *
 * @module components/loading
 * @version 1.0.0 (Slice 21 - Loading & Empty States)
 */

// =============================================================================
// SHIMMER EFFECT
// =============================================================================

export {
  ShimmerEffect,
  ShimmerText,
  ShimmerHeading,
  ShimmerAvatar,
  ShimmerButton,
  ShimmerBadge,
  type ShimmerEffectProps,
  type ShimmerTextProps,
  type ShimmerAvatarProps,
  type ShimmerButtonProps,
  type ShimmerBadgeProps,
} from './ShimmerEffect';

// =============================================================================
// CARD SKELETONS
// =============================================================================

export {
  CardSkeleton,
  DealCardSkeleton,
  MetricCardSkeleton,
  StatCardSkeleton,
  type CardSkeletonProps,
  type MetricCardSkeletonProps,
} from './CardSkeleton';

// =============================================================================
// LIST SKELETONS
// =============================================================================

export {
  ListSkeleton,
  DealsListSkeleton,
  MetricsGridSkeleton,
  TableRowsSkeleton,
  CompsListSkeleton,
  type ListSkeletonProps,
  type DealsListSkeletonProps,
  type MetricsGridSkeletonProps,
  type TableRowsSkeletonProps,
} from './ListSkeleton';

// =============================================================================
// DASHBOARD SKELETONS
// =============================================================================

export {
  DashboardSkeleton,
  OverviewSkeleton,
  AnalysisSkeleton,
  PageSkeleton,
  type DashboardSkeletonProps,
  type PageSkeletonProps,
} from './DashboardSkeleton';
