import { useReducedMotion } from 'framer-motion';

// ============================================================================
// REPAIRS DESIGN TOKENS
// ============================================================================
// Principles Applied:
// - 8pt Grid System (spacing)
// - WCAG AA Compliance (contrast, touch targets)
// - Consistent Category Color Coding (13 distinct colors)
// - Framer Motion Standards (150-300ms durations)
// ============================================================================

/**
 * Spacing tokens (8pt grid)
 */
export const spacing = {
  xs: '4px', // 0.5 unit
  sm: '8px', // 1 unit
  md: '16px', // 2 units
  lg: '24px', // 3 units
  xl: '32px', // 4 units
  '2xl': '48px', // 6 units
} as const;

/**
 * Category color palette
 * Designed for visual distinction + WCAG AA contrast on dark backgrounds
 * Each category has: bg (10% opacity), border, text, accent
 */
export const categoryColors = {
  demolition: {
    bg: 'rgba(239, 68, 68, 0.1)',
    border: '#ef4444',
    text: '#fca5a5',
    accent: '#dc2626',
  },
  roofing: {
    bg: 'rgba(249, 115, 22, 0.1)',
    border: '#f97316',
    text: '#fdba74',
    accent: '#ea580c',
  },
  exterior: {
    bg: 'rgba(234, 179, 8, 0.1)',
    border: '#eab308',
    text: '#fde047',
    accent: '#ca8a04',
  },
  windowsDoors: {
    bg: 'rgba(132, 204, 22, 0.1)',
    border: '#84cc16',
    text: '#bef264',
    accent: '#65a30d',
  },
  foundation: {
    bg: 'rgba(34, 197, 94, 0.1)',
    border: '#22c55e',
    text: '#86efac',
    accent: '#16a34a',
  },
  plumbing: {
    bg: 'rgba(20, 184, 166, 0.1)',
    border: '#14b8a6',
    text: '#5eead4',
    accent: '#0d9488',
  },
  electrical: {
    bg: 'rgba(6, 182, 212, 0.1)',
    border: '#06b6d4',
    text: '#67e8f9',
    accent: '#0891b2',
  },
  hvac: {
    bg: 'rgba(59, 130, 246, 0.1)',
    border: '#3b82f6',
    text: '#93c5fd',
    accent: '#2563eb',
  },
  interior: {
    bg: 'rgba(99, 102, 241, 0.1)',
    border: '#6366f1',
    text: '#a5b4fc',
    accent: '#4f46e5',
  },
  flooring: {
    bg: 'rgba(139, 92, 246, 0.1)',
    border: '#8b5cf6',
    text: '#c4b5fd',
    accent: '#7c3aed',
  },
  kitchen: {
    bg: 'rgba(168, 85, 247, 0.1)',
    border: '#a855f7',
    text: '#d8b4fe',
    accent: '#9333ea',
  },
  bathrooms: {
    bg: 'rgba(236, 72, 153, 0.1)',
    border: '#ec4899',
    text: '#f9a8d4',
    accent: '#db2777',
  },
  permits: {
    bg: 'rgba(107, 114, 128, 0.1)',
    border: '#6b7280',
    text: '#d1d5db',
    accent: '#4b5563',
  },
} as const;

export type CategoryColorKey = keyof typeof categoryColors;

/**
 * Get category colors with fallback to permits (neutral gray)
 */
export function getCategoryColors(categoryKey: string): {
  bg: string;
  border: string;
  text: string;
  accent: string;
} {
  return (
    categoryColors[categoryKey as CategoryColorKey] ?? categoryColors.permits
  );
}

/**
 * Typography tokens
 */
export const typography = {
  sectionTitle: {
    fontSize: '14px',
    fontWeight: 600,
    lineHeight: '1.4',
    letterSpacing: '0.025em',
  },
  subtotal: {
    fontSize: '16px',
    fontWeight: 700,
    lineHeight: '1.2',
    fontVariantNumeric: 'tabular-nums',
  },
  lineItemLabel: {
    fontSize: '14px',
    fontWeight: 400,
    lineHeight: '1.5',
  },
  currency: {
    fontSize: '14px',
    fontWeight: 500,
    fontVariantNumeric: 'tabular-nums',
  },
  grandTotal: {
    fontSize: '24px',
    fontWeight: 700,
    lineHeight: '1.2',
    fontVariantNumeric: 'tabular-nums',
  },
} as const;

/**
 * Animation variants for Framer Motion
 * Duration: 150-300ms per motion-choreographer skill
 * Note: Using type assertions for Framer Motion compatibility
 */
export const animations = {
  // Subtotal pulse on value change (200ms)
  subtotalUpdate: {
    initial: { scale: 1 },
    animate: { scale: [1, 1.05, 1] as number[] },
    transition: { duration: 0.2, ease: 'easeOut' as const },
  },

  // Category expand/collapse (150ms)
  categoryExpand: {
    initial: { opacity: 0, height: 0 },
    animate: { opacity: 1, height: 'auto' as const },
    exit: { opacity: 0, height: 0 },
    transition: { duration: 0.15, ease: 'easeOut' as const },
  },

  // Fade in for new elements (200ms)
  fadeIn: {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.2, ease: 'easeOut' as const },
  },

  // Card hover lift (150ms)
  cardHover: {
    whileHover: { y: -2, transition: { duration: 0.15 } },
    whileTap: { scale: 0.98 },
  },
};

/**
 * Touch targets (WCAG AA compliance - 44px minimum)
 */
export const touchTargets = {
  min: '44px',
  comfortable: '48px',
} as const;

/**
 * Focus styles (WCAG AA - 2px emerald ring)
 */
export const focus = {
  ring: '2px solid #10b981',
  offset: '2px',
  className:
    'focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-900',
} as const;

/**
 * Glassmorphic card styles (dark mode)
 */
export const card = {
  base: 'bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-xl',
  hover:
    'hover:border-slate-700 hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-200',
  padding: 'p-6',
} as const;

/**
 * Status colors (for estimate requests)
 */
export const statusColors = {
  pending: {
    bg: 'rgba(251, 191, 36, 0.1)',
    border: '#fbbf24',
    text: '#fde047',
  },
  sent: { bg: 'rgba(59, 130, 246, 0.1)', border: '#3b82f6', text: '#93c5fd' },
  viewed: {
    bg: 'rgba(168, 85, 247, 0.1)',
    border: '#a855f7',
    text: '#d8b4fe',
  },
  submitted: {
    bg: 'rgba(34, 197, 94, 0.1)',
    border: '#22c55e',
    text: '#86efac',
  },
  expired: {
    bg: 'rgba(239, 68, 68, 0.1)',
    border: '#ef4444',
    text: '#fca5a5',
  },
  cancelled: {
    bg: 'rgba(107, 114, 128, 0.1)',
    border: '#6b7280',
    text: '#9ca3af',
  },
} as const;

/**
 * Motion Variants for Framer Motion
 * Used by Slices 2-4 for choreographed animations
 * Respects reduced motion via useMotion() hook
 */
export const motionVariants = {
  // Page section enter
  section: {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.25, ease: [0, 0, 0.2, 1] },
  },

  // Card enter
  card: {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.2, ease: [0, 0, 0.2, 1] },
  },

  // Item enter (for staggered lists)
  item: {
    initial: { opacity: 0, x: -8 },
    animate: { opacity: 1, x: 0 },
    transition: { duration: 0.15, ease: [0, 0, 0.2, 1] },
  },

  // Modal animations
  modal: {
    overlay: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: { duration: 0.2 },
    },
    content: {
      initial: { opacity: 0, scale: 0.95, y: 20 },
      animate: { opacity: 1, scale: 1, y: 0 },
      exit: { opacity: 0, scale: 0.95, y: 20 },
      transition: { duration: 0.2, ease: [0, 0, 0.2, 1] },
    },
  },

  // Stagger container for lists
  stagger: {
    container: {
      hidden: { opacity: 0 },
      show: {
        opacity: 1,
        transition: { staggerChildren: 0.05 },
      },
    },
    item: {
      hidden: { opacity: 0, y: 8 },
      show: { opacity: 1, y: 0 },
    },
  },

  // Value update pulse
  pulse: {
    animate: { scale: [1, 1.03, 1] },
    transition: { duration: 0.3 },
  },

  // Badge count spring
  badgeSpring: {
    initial: { scale: 0.8, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    transition: { type: 'spring', stiffness: 500, damping: 25 },
  },

  // Skeleton shimmer
  shimmer: {
    animate: { x: ['-100%', '100%'] },
    transition: { duration: 1.5, repeat: Infinity, ease: 'linear' },
  },
} as const;

/** Type for motionVariants - use for prop typing in components */
export type MotionVariantKey = keyof typeof motionVariants;

/**
 * Glow Effects
 * Tailwind drop-shadow classes for hero elements
 * Used by EstimateSummaryCard for budget prominence
 */
export const glowEffects = {
  emerald: {
    sm: 'drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]',
    md: 'drop-shadow-[0_0_12px_rgba(16,185,129,0.4)]',
    lg: 'drop-shadow-[0_0_20px_rgba(16,185,129,0.5)]',
    animationSteps: {
      subtle: [
        'drop-shadow(0 0 8px rgba(16,185,129,0.3))',
        'drop-shadow(0 0 16px rgba(16,185,129,0.5))',
        'drop-shadow(0 0 8px rgba(16,185,129,0.3))',
      ],
    },
  },
  amber: {
    sm: 'drop-shadow-[0_0_8px_rgba(251,191,36,0.3)]',
    md: 'drop-shadow-[0_0_12px_rgba(251,191,36,0.4)]',
  },
  red: {
    sm: 'drop-shadow-[0_0_8px_rgba(239,68,68,0.3)]',
    md: 'drop-shadow-[0_0_12px_rgba(239,68,68,0.4)]',
  },
} as const;

/**
 * Hero Typography
 * Styling for prominent budget numbers
 * 48px desktop, 36px mobile with tabular nums
 */
export const heroTypography = {
  budget: {
    className: 'text-4xl md:text-5xl tabular-nums font-bold tracking-tight',
    fontFeatureSettings: "'tnum' on, 'lnum' on",
  },
  context: {
    className: 'text-sm text-slate-400',
  },
  label: {
    className: 'text-xs text-slate-500 uppercase tracking-wider',
  },
} as const;

/**
 * Confidence Badge Tokens
 * Trust indicators for estimate sources
 * GC-Verified (green) vs Auto-Generated (amber)
 */
export const confidenceBadge = {
  verified: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    text: 'text-emerald-400',
    label: 'GC-Verified',
    icon: 'CheckCircle',
  },
  auto: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    text: 'text-amber-400',
    label: 'Auto-Generated',
    icon: 'Sparkles',
  },
  error: {
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    text: 'text-red-400',
    label: 'Error',
    icon: 'AlertCircle',
  },
} as const;

/** Valid icon names for confidence badges */
export type ConfidenceBadgeIcon =
  (typeof confidenceBadge)[keyof typeof confidenceBadge]['icon'];

/** Return type for useMotion hook */
interface UseMotionReturn {
  getVariant: <T extends Record<string, unknown>>(
    variant: T
  ) => T | Record<string, never>;
  getDuration: (duration: number) => number;
  isReduced: boolean;
}

/**
 * Reduced Motion Hook
 * WCAG 2.1 Success Criterion 2.3.3 compliance
 * Respects prefers-reduced-motion media query
 *
 * @returns Object with getVariant, getDuration, and isReduced
 * @example
 * const { isReduced, getVariant } = useMotion();
 * <motion.div {...getVariant(motionVariants.card)}>
 */
export function useMotion(): UseMotionReturn {
  const prefersReducedMotion = useReducedMotion();

  return {
    /** Returns empty object if user prefers reduced motion */
    getVariant: <T extends Record<string, unknown>>(
      variant: T
    ): T | Record<string, never> => (prefersReducedMotion ? {} : variant),

    /** Returns 0 if user prefers reduced motion */
    getDuration: (duration: number): number =>
      prefersReducedMotion ? 0 : duration,

    /** Whether reduced motion is preferred */
    isReduced: prefersReducedMotion ?? false,
  };
}

/**
 * Combined design tokens export
 */
export const repairsDesignTokens = {
  spacing,
  categoryColors,
  getCategoryColors,
  typography,
  animations,
  touchTargets,
  focus,
  card,
  statusColors,
  motionVariants,
  glowEffects,
  heroTypography,
  confidenceBadge,
} as const;

export default repairsDesignTokens;
