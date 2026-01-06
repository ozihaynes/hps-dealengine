/**
 * Animation Library — Barrel Exports
 *
 * Comprehensive animation system for HPS DealEngine.
 * Includes tokens, variants, hooks, and utilities.
 *
 * @module lib/animations
 * @version 2.0.0 (Slice 20 - Animation Library Enhancement)
 */

// =============================================================================
// TOKENS
// =============================================================================

export {
  // Duration tokens
  DURATION,
  TIMING, // Legacy alias

  // Easing tokens
  EASING,

  // Spring physics
  SPRING,

  // Stagger delays
  STAGGER,

  // Distance values
  DISTANCE,

  // Scale values
  SCALE,

  // Transition presets
  TRANSITIONS,

  // Reduced motion utilities
  prefersReducedMotion,
  getReducedMotionDuration,
  getReducedMotionTransition,

  // Type exports
  type DurationKey,
  type EasingKey,
  type SpringKey,
  type StaggerKey,
  type DistanceKey,
  type ScaleKey,
  type TransitionKey,
} from './tokens';

// =============================================================================
// VARIANTS
// =============================================================================

export {
  // Card animations
  cardLift,
  cardEnter,

  // Fade animations
  fade,
  fadeInUp,
  fadeInDown,
  fadeInScale,

  // List animations
  staggerContainer,
  staggerContainerFast,
  staggerContainerSlow,
  listItem,
  gridItem,

  // Drawer & panel animations
  drawerSlide,
  slideInRight,
  slideInLeft,

  // Verdict & status animations
  verdictReveal,
  successPulse,
  warningPulse,

  // Loading animations
  shimmer,
  skeletonPulse,
  spinnerRotate,

  // Number animations
  numberReveal,
  numberChange,

  // Micro-interactions
  buttonPress,
  iconBounce,
  checkMark,

  // Modal animations
  modalBackdrop,
  modalContent,

  // Helpers
  getSpringTransition,
  createSpringTransition,
} from './variants';

// =============================================================================
// HOOKS
// =============================================================================

export {
  useCountUp,
  useCurrencyCountUp,
  usePercentageCountUp,
  type UseCountUpOptions,
  type UseCountUpReturn,
} from './useCountUp';
