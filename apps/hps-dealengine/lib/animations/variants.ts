/**
 * Animation Variants — Framer Motion Presets
 *
 * Reusable animation variants for consistent motion patterns.
 * All variants use GPU-accelerated properties (transform, opacity).
 *
 * @module lib/animations/variants
 * @version 2.0.0 (Slice 20 - Animation Library Enhancement)
 */

import type { Variants, Transition } from 'framer-motion';
import {
  DURATION,
  EASING,
  SPRING,
  STAGGER,
  DISTANCE,
  SCALE,
} from './tokens';

// =============================================================================
// CARD ANIMATIONS
// =============================================================================

/**
 * Card hover lift animation
 *
 * Subtle lift effect for interactive cards
 * GPU-accelerated: uses transform and box-shadow
 */
export const cardLift: Variants = {
  rest: {
    y: 0,
    scale: SCALE.none,
    boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
    transition: {
      duration: DURATION.fast,
      ease: EASING.standard,
    },
  },
  hover: {
    y: -2,
    scale: SCALE.hover,
    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
    transition: {
      duration: DURATION.instant,
      ease: EASING.sharp,
    },
  },
  tap: {
    y: 0,
    scale: SCALE.pressed,
    transition: {
      duration: DURATION.instant,
      ease: EASING.sharp,
    },
  },
};

/**
 * Card enter animation
 *
 * For cards appearing in lists/grids
 */
export const cardEnter: Variants = {
  hidden: {
    opacity: 0,
    y: DISTANCE.medium,
    scale: SCALE.subtle,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: SCALE.none,
    transition: {
      duration: DURATION.normal,
      ease: EASING.decelerate,
    },
  },
  exit: {
    opacity: 0,
    y: -DISTANCE.small,
    scale: SCALE.subtle,
    transition: {
      duration: DURATION.fast,
      ease: EASING.accelerate,
    },
  },
};

// =============================================================================
// FADE ANIMATIONS
// =============================================================================

/**
 * Simple fade in/out
 */
export const fade: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: DURATION.normal,
      ease: EASING.standard,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: DURATION.fast,
      ease: EASING.standard,
    },
  },
};

/**
 * Fade in with slide up
 *
 * Standard enter animation for content
 */
export const fadeInUp: Variants = {
  hidden: {
    opacity: 0,
    y: DISTANCE.large,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: DURATION.normal,
      ease: EASING.decelerate,
    },
  },
  exit: {
    opacity: 0,
    y: -DISTANCE.small,
    transition: {
      duration: DURATION.fast,
      ease: EASING.accelerate,
    },
  },
};

/**
 * Fade in with slide down
 *
 * For dropdown menus, tooltips appearing from above
 */
export const fadeInDown: Variants = {
  hidden: {
    opacity: 0,
    y: -DISTANCE.medium,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: DURATION.normal,
      ease: EASING.decelerate,
    },
  },
  exit: {
    opacity: 0,
    y: -DISTANCE.small,
    transition: {
      duration: DURATION.fast,
      ease: EASING.accelerate,
    },
  },
};

/**
 * Fade in with scale
 *
 * For modals, popovers, important reveals
 */
export const fadeInScale: Variants = {
  hidden: {
    opacity: 0,
    scale: SCALE.subtle,
  },
  visible: {
    opacity: 1,
    scale: SCALE.none,
    transition: {
      duration: DURATION.normal,
      ease: EASING.decelerate,
    },
  },
  exit: {
    opacity: 0,
    scale: SCALE.subtle,
    transition: {
      duration: DURATION.fast,
      ease: EASING.accelerate,
    },
  },
};

// =============================================================================
// LIST ANIMATIONS
// =============================================================================

/**
 * Stagger children animation
 *
 * For lists and grids - children animate in sequence
 */
export const staggerContainer: Variants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: STAGGER.default,
      delayChildren: STAGGER.fast,
    },
  },
};

/**
 * Fast stagger for quick lists
 */
export const staggerContainerFast: Variants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: STAGGER.fast,
      delayChildren: 0,
    },
  },
};

/**
 * Slow stagger for dramatic lists
 */
export const staggerContainerSlow: Variants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: STAGGER.slow,
      delayChildren: STAGGER.default,
    },
  },
};

/**
 * List item animation
 *
 * Use as child of staggerContainer
 */
export const listItem: Variants = {
  hidden: {
    opacity: 0,
    x: -DISTANCE.medium,
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: DURATION.normal,
      ease: EASING.decelerate,
    },
  },
  exit: {
    opacity: 0,
    x: DISTANCE.medium,
    transition: {
      duration: DURATION.fast,
      ease: EASING.accelerate,
    },
  },
};

/**
 * Grid item animation
 *
 * Fade + scale for grid layouts
 */
export const gridItem: Variants = {
  hidden: {
    opacity: 0,
    scale: SCALE.subtle,
  },
  visible: {
    opacity: 1,
    scale: SCALE.none,
    transition: {
      duration: DURATION.normal,
      ease: EASING.decelerate,
    },
  },
  exit: {
    opacity: 0,
    scale: SCALE.subtle,
    transition: {
      duration: DURATION.fast,
      ease: EASING.accelerate,
    },
  },
};

// =============================================================================
// DRAWER & PANEL ANIMATIONS
// =============================================================================

/**
 * Drawer slide animation (vertical)
 *
 * For expandable sections, accordions
 */
export const drawerSlide: Variants = {
  hidden: {
    height: 0,
    opacity: 0,
    overflow: 'hidden',
  },
  visible: {
    height: 'auto',
    opacity: 1,
    overflow: 'hidden',
    transition: {
      height: {
        duration: DURATION.normal,
        ease: EASING.standard,
      },
      opacity: {
        duration: DURATION.fast,
        delay: DURATION.instant,
      },
    },
  },
  exit: {
    height: 0,
    opacity: 0,
    overflow: 'hidden',
    transition: {
      height: {
        duration: DURATION.fast,
        ease: EASING.accelerate,
      },
      opacity: {
        duration: DURATION.instant,
      },
    },
  },
};

/**
 * Slide in from right
 *
 * For side panels, slide-overs
 */
export const slideInRight: Variants = {
  hidden: {
    x: '100%',
    opacity: 0,
  },
  visible: {
    x: 0,
    opacity: 1,
    transition: {
      duration: DURATION.normal,
      ease: EASING.decelerate,
    },
  },
  exit: {
    x: '100%',
    opacity: 0,
    transition: {
      duration: DURATION.fast,
      ease: EASING.accelerate,
    },
  },
};

/**
 * Slide in from left
 *
 * For navigation drawers
 */
export const slideInLeft: Variants = {
  hidden: {
    x: '-100%',
    opacity: 0,
  },
  visible: {
    x: 0,
    opacity: 1,
    transition: {
      duration: DURATION.normal,
      ease: EASING.decelerate,
    },
  },
  exit: {
    x: '-100%',
    opacity: 0,
    transition: {
      duration: DURATION.fast,
      ease: EASING.accelerate,
    },
  },
};

// =============================================================================
// VERDICT & STATUS ANIMATIONS
// =============================================================================

/**
 * Verdict reveal animation
 *
 * Used for the Decision Hero zone verdict display
 * Builds anticipation with blur -> sharp focus
 */
export const verdictReveal: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.9,
    filter: 'blur(8px)',
  },
  visible: {
    opacity: 1,
    scale: 1,
    filter: 'blur(0px)',
    transition: {
      duration: DURATION.slow,
      ease: EASING.standard,
    },
  },
};

/**
 * Success pulse animation
 *
 * Subtle glow pulse for PURSUE verdict and success states
 */
export const successPulse: Variants = {
  idle: {
    boxShadow: '0 0 0 0 rgba(16, 185, 129, 0)',
  },
  pulse: {
    boxShadow: [
      '0 0 0 0 rgba(16, 185, 129, 0)',
      '0 0 0 8px rgba(16, 185, 129, 0.15)',
      '0 0 0 0 rgba(16, 185, 129, 0)',
    ],
    transition: {
      duration: 2,
      repeat: Infinity,
      repeatDelay: 3,
    },
  },
};

/**
 * Warning pulse animation
 *
 * For attention-needed states
 */
export const warningPulse: Variants = {
  idle: {
    boxShadow: '0 0 0 0 rgba(245, 158, 11, 0)',
  },
  pulse: {
    boxShadow: [
      '0 0 0 0 rgba(245, 158, 11, 0)',
      '0 0 0 8px rgba(245, 158, 11, 0.15)',
      '0 0 0 0 rgba(245, 158, 11, 0)',
    ],
    transition: {
      duration: 2,
      repeat: Infinity,
      repeatDelay: 3,
    },
  },
};

// =============================================================================
// LOADING ANIMATIONS
// =============================================================================

/**
 * Shimmer loading animation
 *
 * For skeleton loading states
 */
export const shimmer: Variants = {
  initial: {
    backgroundPosition: '200% 0',
  },
  animate: {
    backgroundPosition: ['200% 0', '-200% 0'],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'linear',
    },
  },
};

/**
 * Skeleton pulse animation
 *
 * Subtle opacity pulse for loading states
 */
export const skeletonPulse: Variants = {
  animate: {
    opacity: [0.4, 0.7, 0.4],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'linear',
    },
  },
};

/**
 * Spinner rotation
 *
 * For loading spinners
 */
export const spinnerRotate: Variants = {
  animate: {
    rotate: 360,
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: 'linear',
    },
  },
};

// =============================================================================
// NUMBER ANIMATIONS
// =============================================================================

/**
 * Number reveal animation
 *
 * For count-up displays and metrics
 */
export const numberReveal: Variants = {
  hidden: {
    opacity: 0,
    y: DISTANCE.small,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: DURATION.normal,
      ease: EASING.decelerate,
    },
  },
};

/**
 * Number change animation
 *
 * For values that update in place
 */
export const numberChange: Variants = {
  initial: {
    opacity: 1,
    y: 0,
  },
  exit: {
    opacity: 0,
    y: -DISTANCE.small,
    transition: {
      duration: DURATION.instant,
    },
  },
  enter: {
    opacity: 0,
    y: DISTANCE.small,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: DURATION.fast,
      ease: EASING.decelerate,
    },
  },
};

// =============================================================================
// MICRO-INTERACTIONS
// =============================================================================

/**
 * Button press feedback
 */
export const buttonPress: Variants = {
  rest: {
    scale: SCALE.none,
  },
  hover: {
    scale: SCALE.hover,
    transition: SPRING.snappy,
  },
  tap: {
    scale: SCALE.pressed,
    transition: SPRING.stiff,
  },
};

/**
 * Icon bounce
 *
 * For icon-only buttons, toggles
 */
export const iconBounce: Variants = {
  rest: {
    scale: SCALE.none,
    rotate: 0,
  },
  hover: {
    scale: SCALE.emphasis,
    transition: SPRING.bouncy,
  },
  tap: {
    scale: SCALE.pressed,
    rotate: -10,
    transition: SPRING.stiff,
  },
};

/**
 * Check mark animation
 *
 * For success checkmarks
 */
export const checkMark: Variants = {
  hidden: {
    pathLength: 0,
    opacity: 0,
  },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: {
      pathLength: {
        duration: DURATION.normal,
        ease: EASING.decelerate,
      },
      opacity: {
        duration: DURATION.instant,
      },
    },
  },
};

// =============================================================================
// MODAL ANIMATIONS
// =============================================================================

/**
 * Modal backdrop
 */
export const modalBackdrop: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: DURATION.fast,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: DURATION.fast,
      delay: DURATION.instant,
    },
  },
};

/**
 * Modal content
 */
export const modalContent: Variants = {
  hidden: {
    opacity: 0,
    scale: SCALE.subtle,
    y: DISTANCE.medium,
  },
  visible: {
    opacity: 1,
    scale: SCALE.none,
    y: 0,
    transition: {
      duration: DURATION.normal,
      ease: EASING.decelerate,
    },
  },
  exit: {
    opacity: 0,
    scale: SCALE.subtle,
    y: DISTANCE.small,
    transition: {
      duration: DURATION.fast,
      ease: EASING.accelerate,
    },
  },
};

// =============================================================================
// SPRING TRANSITION HELPERS
// =============================================================================

/**
 * Get spring transition by key
 */
export function getSpringTransition(
  key: keyof typeof SPRING
): Transition {
  return SPRING[key];
}

/**
 * Create custom spring transition
 */
export function createSpringTransition(
  stiffness: number,
  damping: number,
  mass = 1
): Transition {
  return {
    type: 'spring',
    stiffness,
    damping,
    mass,
  };
}
