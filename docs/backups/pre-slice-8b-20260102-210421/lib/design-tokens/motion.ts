/**
 * Command Center V2.1 - Motion Token System
 *
 * Animation timing, easing, and preset animations.
 * Purposeful choreography that guides attention.
 *
 * @module motion
 * @version 1.0.0
 */

// ============================================================================
// DURATIONS
// ============================================================================

export const duration = {
  instant: '0ms',
  fastest: '50ms',
  fast: '100ms',
  normal: '200ms',
  slow: '300ms',
  slower: '400ms',
  slowest: '500ms',
  // Semantic
  micro: '100ms',       // Hover states, small feedback
  standard: '200ms',    // Most transitions
  complex: '300ms',     // Multi-element, page transitions
  dramatic: '500ms',    // Hero animations, reveals
  // Number counting
  countUp: '800ms',     // Score number animations
} as const;

// ============================================================================
// EASINGS
// ============================================================================

export const easing = {
  // Standard — Most UI interactions
  default: 'cubic-bezier(0.4, 0, 0.2, 1)',
  linear: 'linear',

  // Entrances — Elements appearing
  easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
  easeIn: 'cubic-bezier(0.4, 0, 1, 1)',

  // Premium feel
  smooth: 'cubic-bezier(0.16, 1, 0.3, 1)',

  // Playful
  bounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)',

  // Spring-like
  spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
} as const;

// ============================================================================
// TRANSITION PRESETS (for Tailwind extend)
// ============================================================================

export const transitionProperty = {
  none: 'none',
  all: 'all',
  DEFAULT: 'color, background-color, border-color, text-decoration-color, fill, stroke, opacity, box-shadow, transform, filter, backdrop-filter',
  colors: 'color, background-color, border-color, text-decoration-color, fill, stroke',
  opacity: 'opacity',
  shadow: 'box-shadow',
  transform: 'transform',
} as const;

// ============================================================================
// KEYFRAME ANIMATIONS (CSS keyframe definitions)
// ============================================================================

export const keyframes = {
  // Fade in
  fadeIn: {
    from: { opacity: '0' },
    to: { opacity: '1' },
  },

  // Fade out
  fadeOut: {
    from: { opacity: '1' },
    to: { opacity: '0' },
  },

  // Slide up (cards, toasts)
  slideUp: {
    from: { opacity: '0', transform: 'translateY(8px)' },
    to: { opacity: '1', transform: 'translateY(0)' },
  },

  // Slide down
  slideDown: {
    from: { opacity: '0', transform: 'translateY(-8px)' },
    to: { opacity: '1', transform: 'translateY(0)' },
  },

  // Slide in from right (drawers)
  slideInRight: {
    from: { transform: 'translateX(100%)' },
    to: { transform: 'translateX(0)' },
  },

  // Slide out to right
  slideOutRight: {
    from: { transform: 'translateX(0)' },
    to: { transform: 'translateX(100%)' },
  },

  // Scale in (modals, popovers)
  scaleIn: {
    from: { opacity: '0', transform: 'scale(0.95)' },
    to: { opacity: '1', transform: 'scale(1)' },
  },

  // Scale out
  scaleOut: {
    from: { opacity: '1', transform: 'scale(1)' },
    to: { opacity: '0', transform: 'scale(0.95)' },
  },

  // Pulse (urgency indicator)
  pulse: {
    '0%, 100%': { opacity: '1' },
    '50%': { opacity: '0.5' },
  },

  // Shimmer (loading states)
  shimmer: {
    '0%': { backgroundPosition: '-200% 0' },
    '100%': { backgroundPosition: '200% 0' },
  },

  // Spin
  spin: {
    from: { transform: 'rotate(0deg)' },
    to: { transform: 'rotate(360deg)' },
  },

  // Bounce subtle
  bounceSoft: {
    '0%, 100%': { transform: 'translateY(0)' },
    '50%': { transform: 'translateY(-4px)' },
  },

  // Count up (for number animations via CSS)
  countUp: {
    from: { opacity: '0', transform: 'translateY(10px)' },
    to: { opacity: '1', transform: 'translateY(0)' },
  },

  // Pulse ring (for urgency indicators)
  pulseRing: {
    '0%': { boxShadow: '0 0 0 0 rgba(220, 38, 38, 0.4)' },
    '70%': { boxShadow: '0 0 0 10px rgba(220, 38, 38, 0)' },
    '100%': { boxShadow: '0 0 0 0 rgba(220, 38, 38, 0)' },
  },
} as const;

// ============================================================================
// ANIMATION PRESETS (for Tailwind extend)
// ============================================================================

export const animation = {
  none: 'none',
  fadeIn: 'fadeIn 200ms cubic-bezier(0, 0, 0.2, 1) forwards',
  fadeOut: 'fadeOut 150ms cubic-bezier(0.4, 0, 1, 1) forwards',
  slideUp: 'slideUp 300ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
  slideDown: 'slideDown 300ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
  slideInRight: 'slideInRight 300ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
  slideOutRight: 'slideOutRight 200ms cubic-bezier(0.4, 0, 1, 1) forwards',
  scaleIn: 'scaleIn 200ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
  scaleOut: 'scaleOut 150ms cubic-bezier(0.4, 0, 1, 1) forwards',
  pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
  shimmer: 'shimmer 1.5s linear infinite',
  spin: 'spin 1s linear infinite',
  bounceSoft: 'bounceSoft 1s ease-in-out infinite',
  countUp: 'countUp 800ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
  pulseRing: 'pulseRing 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
} as const;

// ============================================================================
// STAGGER DELAYS (for sequential reveals)
// ============================================================================

export const stagger = {
  fast: 50,     // 50ms between items
  normal: 75,   // 75ms between items
  slow: 100,    // 100ms between items
} as const;

// ============================================================================
// COMBINED EXPORT
// ============================================================================

export const motion = {
  duration,
  easing,
  transitionProperty,
  keyframes,
  animation,
  stagger,
} as const;

export type Motion = typeof motion;
