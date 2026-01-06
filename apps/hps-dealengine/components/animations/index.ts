/**
 * Animation Components — Barrel Exports
 *
 * Reusable animation components for the HPS DealEngine application.
 *
 * @module components/animations
 * @version 1.0.0 (Slice 20 - Animation Library Enhancement)
 */

// =============================================================================
// ANIMATED NUMBER
// =============================================================================

export {
  AnimatedNumber,
  AnimatedCurrency,
  AnimatedPercentage,
  type AnimatedNumberProps,
  type AnimatedCurrencyProps,
  type AnimatedPercentageProps,
} from './AnimatedNumber';

// =============================================================================
// ANIMATED LIST
// =============================================================================

export {
  AnimatedList,
  AnimatedGrid,
  AnimatedUnorderedList,
  AnimatedOrderedList,
  type AnimatedListProps,
  type AnimatedGridProps,
} from './AnimatedList';

// =============================================================================
// SUCCESS PULSE
// =============================================================================

export {
  SuccessPulse,
  WarningPulse,
  InfoPulse,
  PulseRing,
  type SuccessPulseProps,
  type WarningPulseProps,
  type InfoPulseProps,
  type PulseRingProps,
  type PulseColor,
} from './SuccessPulse';

// =============================================================================
// SHIMMER OVERLAY
// =============================================================================

export {
  ShimmerOverlay,
  SkeletonText,
  SkeletonParagraph,
  SkeletonAvatar,
  SkeletonButton,
  SkeletonCard,
  SkeletonTable,
  type ShimmerOverlayProps,
  type SkeletonTextProps,
  type SkeletonParagraphProps,
  type SkeletonAvatarProps,
  type SkeletonButtonProps,
  type SkeletonCardProps,
  type SkeletonTableProps,
} from './ShimmerOverlay';
