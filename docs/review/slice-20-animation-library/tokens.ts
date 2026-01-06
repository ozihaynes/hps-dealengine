/**
 * Animation Tokens — Design System Foundation
 *
 * Comprehensive animation timing, easing, and spring configurations
 * for consistent motion throughout the application.
 *
 * @module lib/animations/tokens
 * @version 2.0.0 (Slice 20 - Animation Library Enhancement)
 */

// =============================================================================
// DURATION TOKENS
// =============================================================================

/**
 * Duration tokens in seconds
 *
 * Calibrated for perceived performance:
 * - instant: Hover states, immediate feedback
 * - fast/quick: Button clicks, small transitions
 * - normal/standard: Standard UI transitions
 * - slow/deliberate: Important reveals, modals
 * - slower/dramatic: Celebration moments, page transitions
 */
export const DURATION = {
  // Primary names
  instant: 0.1,   // 100ms - hover states, micro-interactions
  fast: 0.2,      // 200ms - button feedback, small transitions
  normal: 0.3,    // 300ms - drawer open/close, standard UI
  slow: 0.5,      // 500ms - verdict reveal, important moments
  slower: 0.8,    // 800ms - celebration, dramatic reveals

  // Legacy aliases for backward compatibility
  quick: 0.2,     // Alias for fast
  standard: 0.3,  // Alias for normal
  deliberate: 0.5, // Alias for slow
  dramatic: 0.8,  // Alias for slower
} as const;

/**
 * Legacy timing alias for backward compatibility
 * @deprecated Use DURATION instead
 */
export const TIMING = DURATION;

// =============================================================================
// EASING TOKENS
// =============================================================================

/**
 * Easing functions as cubic-bezier arrays
 *
 * Based on Material Design motion principles:
 * - standard: Most transitions, balanced in/out
 * - decelerate: Elements entering (ease-out)
 * - accelerate: Elements exiting (ease-in)
 * - sharp: Quick, snappy actions
 * - bounce: Playful, elastic moments
 */
export const EASING = {
  // Standard - balanced ease for most transitions
  standard: [0.4, 0, 0.2, 1] as const,

  // Decelerate - elements entering (ease-out)
  decelerate: [0, 0, 0.2, 1] as const,

  // Accelerate - elements exiting (ease-in)
  accelerate: [0.4, 0, 1, 1] as const,

  // Sharp - quick, snappy actions
  sharp: [0.25, 0.1, 0.25, 1] as const,

  // Bounce - playful, elastic moments
  bounce: [0.34, 1.56, 0.64, 1] as const,

  // Legacy aliases for backward compatibility
  snap: [0.25, 0.1, 0.25, 1] as const,
  smooth: [0.4, 0, 0.2, 1] as const,
} as const;

// =============================================================================
// SPRING TOKENS
// =============================================================================

/**
 * Spring physics configurations for Framer Motion
 *
 * Spring animations feel more natural than duration-based ones
 * for interactive elements.
 */
export const SPRING = {
  // Gentle - subtle, non-distracting
  gentle: {
    type: 'spring' as const,
    stiffness: 120,
    damping: 20,
    mass: 1,
  },

  // Default - balanced, natural feel
  default: {
    type: 'spring' as const,
    stiffness: 200,
    damping: 24,
    mass: 1,
  },

  // Snappy - quick, responsive
  snappy: {
    type: 'spring' as const,
    stiffness: 400,
    damping: 30,
    mass: 1,
  },

  // Bouncy - playful, elastic
  bouncy: {
    type: 'spring' as const,
    stiffness: 300,
    damping: 15,
    mass: 0.8,
  },

  // Stiff - minimal overshoot
  stiff: {
    type: 'spring' as const,
    stiffness: 500,
    damping: 40,
    mass: 1,
  },
} as const;

// =============================================================================
// STAGGER TOKENS
// =============================================================================

/**
 * Stagger delay configurations for list animations
 *
 * Used with staggerChildren in container variants
 */
export const STAGGER = {
  fast: 0.03,     // 30ms - rapid sequence
  default: 0.05,  // 50ms - standard list items
  slow: 0.1,      // 100ms - deliberate reveal
  slower: 0.15,   // 150ms - dramatic emphasis
} as const;

// =============================================================================
// DISTANCE TOKENS
// =============================================================================

/**
 * Animation distance/offset values in pixels
 *
 * Consistent distances for translate animations
 */
export const DISTANCE = {
  subtle: 4,      // Micro-movements
  small: 8,       // Small shifts
  medium: 16,     // Standard slide
  large: 24,      // Prominent movement
  xlarge: 40,     // Major transitions
} as const;

// =============================================================================
// SCALE TOKENS
// =============================================================================

/**
 * Scale transform values
 *
 * For zoom/scale animations
 */
export const SCALE = {
  pressed: 0.95,  // Button press
  subtle: 0.98,   // Subtle shrink
  none: 1,        // No scale
  hover: 1.02,    // Subtle grow
  emphasis: 1.05, // Attention
  pop: 1.1,       // Celebration
} as const;

// =============================================================================
// TRANSITION PRESETS
// =============================================================================

/**
 * Pre-configured transition objects for common patterns
 */
export const TRANSITIONS = {
  // Instant feedback
  instant: {
    duration: DURATION.instant,
    ease: EASING.sharp,
  },

  // Fast UI feedback
  fast: {
    duration: DURATION.fast,
    ease: EASING.standard,
  },

  // Standard UI transitions
  standard: {
    duration: DURATION.normal,
    ease: EASING.standard,
  },

  // Elements entering
  enter: {
    duration: DURATION.normal,
    ease: EASING.decelerate,
  },

  // Elements exiting
  exit: {
    duration: DURATION.fast,
    ease: EASING.accelerate,
  },

  // Important reveals
  reveal: {
    duration: DURATION.slow,
    ease: EASING.decelerate,
  },

  // Celebration/success
  celebrate: {
    duration: DURATION.slower,
    ease: EASING.bounce,
  },
} as const;

// =============================================================================
// REDUCED MOTION SUPPORT
// =============================================================================

/**
 * Check if user prefers reduced motion
 * Safe for SSR (returns false on server)
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Get duration respecting reduced motion preference
 * Returns 0 if reduced motion is preferred
 */
export function getReducedMotionDuration(duration: number): number {
  return prefersReducedMotion() ? 0 : duration;
}

/**
 * Get transition respecting reduced motion preference
 * Returns instant transition if reduced motion is preferred
 */
export function getReducedMotionTransition(
  transition: { duration: number; ease: readonly number[] }
): { duration: number; ease: readonly number[] } {
  if (prefersReducedMotion()) {
    return { duration: 0, ease: EASING.standard };
  }
  return transition;
}

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type DurationKey = keyof typeof DURATION;
export type EasingKey = keyof typeof EASING;
export type SpringKey = keyof typeof SPRING;
export type StaggerKey = keyof typeof STAGGER;
export type DistanceKey = keyof typeof DISTANCE;
export type ScaleKey = keyof typeof SCALE;
export type TransitionKey = keyof typeof TRANSITIONS;
