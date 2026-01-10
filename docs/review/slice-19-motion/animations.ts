/**
 * Animation Variants - Consistent motion patterns
 * @module components/underwrite/motion/animations
 * @slice 19 of 22
 *
 * NOTE: Duration constants (motion) and spring presets (springs)
 * already exist in utils/tokens.ts — this file adds:
 * - EASE constants (cubic bezier curves)
 * - Reusable animation variants for Framer Motion
 * - Stagger helpers
 *
 * Principles Applied:
 * - Disney: Anticipation, follow-through, secondary action
 * - Performance: Only transform/opacity (GPU-accelerated)
 * - Timing: 150-300ms micro, 300-500ms layout
 */

import type { Variants } from 'framer-motion';

// ═══════════════════════════════════════════════════════════════════════════════
// EASE CONSTANTS (Cubic Bezier Arrays)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Easing curves for Framer Motion transitions.
 * Use with `transition: { ease: EASE.easeOut }`
 */
export const EASE = {
  /** Linear motion (constant speed) */
  linear: [0, 0, 1, 1] as const,
  /** Slow start, fast end */
  easeIn: [0.4, 0, 1, 1] as const,
  /** Fast start, slow end (most natural) */
  easeOut: [0, 0, 0.2, 1] as const,
  /** Slow start and end */
  easeInOut: [0.4, 0, 0.2, 1] as const,
  /** Slight pullback before motion (anticipation) */
  anticipate: [0.36, 0, 0.66, -0.56] as const,
  /** Overshoot target then settle */
  overshoot: [0.34, 1.56, 0.64, 1] as const,
  /** Bouncy feel */
  bounce: [0.68, -0.55, 0.265, 1.55] as const,
} as const;

export type EaseType = keyof typeof EASE;

// ═══════════════════════════════════════════════════════════════════════════════
// DURATION HELPERS (Convert ms to seconds for Framer Motion)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Duration in seconds (Framer Motion uses seconds).
 * Based on existing motion constants: fast=150, normal=200, slow=300, layout=500
 */
export const DURATION_SEC = {
  instant: 0,
  micro: 0.1, // 100ms - hover effects
  fast: 0.15, // 150ms - matches motion.fast
  normal: 0.2, // 200ms - matches motion.normal
  slow: 0.3, // 300ms - matches motion.slow
  layout: 0.5, // 500ms - matches motion.layout
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE TRANSITION VARIANTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Page enter/exit animation.
 * Use with AnimatePresence + motion.div
 */
export const pageVariants: Variants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  enter: {
    opacity: 1,
    y: 0,
    transition: {
      duration: DURATION_SEC.normal,
      ease: EASE.easeOut,
      when: 'beforeChildren',
      staggerChildren: 0.1,
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: {
      duration: DURATION_SEC.fast,
      ease: EASE.easeIn,
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION ACCORDION VARIANTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Accordion expand/collapse animation.
 * Note: height animation requires overflow: hidden on parent
 */
export const sectionVariants: Variants = {
  collapsed: {
    height: 0,
    opacity: 0,
    transition: {
      height: {
        duration: DURATION_SEC.normal,
        ease: EASE.easeIn,
      },
      opacity: {
        duration: DURATION_SEC.fast,
      },
    },
  },
  expanded: {
    height: 'auto',
    opacity: 1,
    transition: {
      height: {
        duration: DURATION_SEC.normal,
        ease: EASE.easeOut,
      },
      opacity: {
        duration: DURATION_SEC.fast,
        delay: 0.1,
      },
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// CARD VARIANTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Card enter + hover/tap states.
 * GPU-safe: only uses transform (y, scale) and opacity
 */
export const cardVariants: Variants = {
  initial: {
    opacity: 0,
    y: 10,
    scale: 0.98,
  },
  enter: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: DURATION_SEC.fast,
      ease: EASE.easeOut,
    },
  },
  hover: {
    y: -2,
    transition: {
      duration: DURATION_SEC.micro,
      ease: EASE.easeOut,
    },
  },
  tap: {
    scale: 0.99,
    transition: {
      duration: DURATION_SEC.micro,
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// VALUE CHANGE VARIANTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Animate value changes (numbers, text).
 * Use with AnimatePresence mode="wait"
 */
export const valueChangeVariants: Variants = {
  initial: {
    opacity: 0,
    y: -5,
  },
  enter: {
    opacity: 1,
    y: 0,
    transition: {
      duration: DURATION_SEC.fast,
      ease: EASE.easeOut,
    },
  },
  exit: {
    opacity: 0,
    y: 5,
    transition: {
      duration: DURATION_SEC.micro,
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// LOADING/PULSE VARIANTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Pulsing animation for loading states.
 */
export const pulseVariants: Variants = {
  initial: {
    opacity: 0.5,
  },
  pulse: {
    opacity: [0.5, 1, 0.5],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

/**
 * Spinning animation for loaders.
 */
export const spinVariants: Variants = {
  initial: {
    rotate: 0,
  },
  spin: {
    rotate: 360,
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: 'linear',
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// FADE VARIANTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Simple fade in/out.
 */
export const fadeVariants: Variants = {
  initial: {
    opacity: 0,
  },
  enter: {
    opacity: 1,
    transition: {
      duration: DURATION_SEC.fast,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: DURATION_SEC.fast,
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// STAGGER HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Container variants for staggered children.
 * @param staggerDelay - Delay between each child (seconds)
 */
export function staggerContainer(staggerDelay = 0.1): Variants {
  return {
    initial: {},
    enter: {
      transition: {
        staggerChildren: staggerDelay,
        when: 'beforeChildren',
      },
    },
    exit: {
      transition: {
        staggerChildren: staggerDelay / 2,
        staggerDirection: -1,
        when: 'afterChildren',
      },
    },
  };
}

/**
 * Child item variants for staggered animation.
 * @param delay - Additional delay for this item (seconds)
 */
export function staggerItem(delay = 0): Variants {
  return {
    initial: {
      opacity: 0,
      y: 10,
    },
    enter: {
      opacity: 1,
      y: 0,
      transition: {
        duration: DURATION_SEC.fast,
        ease: EASE.easeOut,
        delay,
      },
    },
    exit: {
      opacity: 0,
      y: -5,
      transition: {
        duration: DURATION_SEC.micro,
      },
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCALE VARIANTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Scale in/out animation (for modals, popovers).
 */
export const scaleVariants: Variants = {
  initial: {
    opacity: 0,
    scale: 0.95,
  },
  enter: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: DURATION_SEC.fast,
      ease: EASE.easeOut,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: {
      duration: DURATION_SEC.micro,
      ease: EASE.easeIn,
    },
  },
};
