/**
 * Design Tokens - Underwrite Page
 * @module components/underwrite/utils/tokens
 * @slice 03 of 22
 *
 * Principles Applied:
 * - Design System: Semantic naming, token taxonomy
 * - Accessibility: WCAG AA contrast ratios (4.5:1 minimum)
 * - Motion: prefers-reduced-motion support
 * - Grid: 8pt spacing system
 *
 * Reference: Repairs page (established design)
 */

'use client';

import * as React from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// COLOR TOKENS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Semantic color tokens matching repairs page palette.
 * All colors pass WCAG AA contrast requirements.
 */
export const colors = {
  // Backgrounds
  bg: {
    /** Page background - darkest */
    page: 'bg-slate-950',
    /** Card background with transparency */
    card: 'bg-slate-900/80',
    /** Card hover state */
    cardHover: 'bg-slate-900/90',
    /** Card elevated (modal, dropdown) */
    cardElevated: 'bg-slate-900',
    /** Input background */
    input: 'bg-slate-800',
    /** Input hover */
    inputHover: 'bg-slate-750',
    /** Overlay background */
    overlay: 'bg-black/60',
  },

  // Borders
  border: {
    /** Default border */
    default: 'border-slate-800',
    /** Subtle border (less prominent) */
    subtle: 'border-slate-700',
    /** Focus state border */
    focus: 'border-emerald-500',
    /** Error state border */
    error: 'border-red-500',
    /** Warning state border */
    warning: 'border-amber-500',
    /** Success state border */
    success: 'border-emerald-500',
  },

  // Text
  text: {
    /** Primary text - highest contrast */
    primary: 'text-white',
    /** Secondary text - slightly muted */
    secondary: 'text-slate-300',
    /** Muted text - labels, captions */
    muted: 'text-slate-400',
    /** Subtle text - hints, placeholders */
    subtle: 'text-slate-500',
    /** Disabled text */
    disabled: 'text-slate-600',
    /** Error text */
    error: 'text-red-400',
    /** Warning text */
    warning: 'text-amber-400',
    /** Success text */
    success: 'text-emerald-400',
    /** Info text */
    info: 'text-blue-400',
  },

  // Status colors (for badges, indicators)
  status: {
    /** Critical - blocking issues */
    critical: 'text-red-400 bg-red-500/20 border-red-500/30',
    /** High - urgent attention */
    high: 'text-amber-400 bg-amber-500/20 border-amber-500/30',
    /** Medium - standard priority */
    medium: 'text-blue-400 bg-blue-500/20 border-blue-500/30',
    /** Low - informational */
    low: 'text-slate-400 bg-slate-500/20 border-slate-500/30',
    /** Success - positive outcome */
    success: 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30',
  },

  // Interactive states
  interactive: {
    /** Primary button/action */
    primary: 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700',
    /** Secondary button/action */
    secondary: 'bg-slate-700 hover:bg-slate-600 active:bg-slate-800',
    /** Ghost button (no background) */
    ghost: 'hover:bg-slate-800 active:bg-slate-700',
    /** Danger button */
    danger: 'bg-red-600 hover:bg-red-500 active:bg-red-700',
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// TYPOGRAPHY TOKENS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Typography scale with consistent hierarchy.
 * Base: 16px (1rem)
 */
export const typography = {
  // Headings
  /** Page title - 30px */
  h1: 'text-3xl font-bold tracking-tight',
  /** Section title - 24px */
  h2: 'text-2xl font-semibold tracking-tight',
  /** Card title - 20px */
  h3: 'text-xl font-semibold',
  /** Subsection title - 18px */
  h4: 'text-lg font-medium',
  /** Group title - 16px */
  h5: 'text-base font-medium',

  // Body
  /** Standard body text - 16px */
  body: 'text-base',
  /** Small body text - 14px */
  bodySmall: 'text-sm',

  // Labels
  /** Form label - 14px medium */
  label: 'text-sm font-medium',
  /** Muted label - 14px */
  labelMuted: 'text-sm text-slate-400',

  // Special
  /** Monospace (numbers, code) - 14px */
  mono: 'font-mono text-sm',
  /** Caption text - 12px */
  caption: 'text-xs text-slate-500',
  /** Badge text - 12px medium */
  badge: 'text-xs font-medium',
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// SPACING TOKENS (8pt Grid)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Spacing tokens based on 8pt grid.
 * Use these for consistent margins and padding.
 */
export const spacing = {
  // Gap utilities
  /** 4px - minimal spacing */
  xs: 'gap-1',
  /** 8px - tight spacing */
  sm: 'gap-2',
  /** 16px - default spacing */
  md: 'gap-4',
  /** 24px - comfortable spacing */
  lg: 'gap-6',
  /** 32px - spacious spacing */
  xl: 'gap-8',
  /** 48px - section spacing */
  '2xl': 'gap-12',

  // Padding presets
  /** Card padding - 24px */
  card: 'p-6',
  /** Section padding - 16px */
  section: 'p-4',
  /** Input padding - 12px x 8px */
  input: 'px-3 py-2',
  /** Compact padding - 8px */
  compact: 'p-2',

  // Margin presets
  /** Stack items vertically - 16px */
  stack: 'space-y-4',
  /** Stack items tightly - 8px */
  stackTight: 'space-y-2',
  /** Inline items - 8px */
  inline: 'space-x-2',
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// CARD TOKENS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Card component tokens matching repairs page glassmorphic style.
 */
export const card = {
  /** Base card styles */
  base: [
    'rounded-xl',
    'bg-slate-900/80',
    'backdrop-blur-sm',
    'border border-slate-800',
  ].join(' '),

  /** Interactive card (hover state) */
  interactive: [
    'rounded-xl',
    'bg-slate-900/80',
    'backdrop-blur-sm',
    'border border-slate-800',
    'transition-all duration-200',
    'hover:bg-slate-900/90',
    'hover:border-slate-700',
    'cursor-pointer',
  ].join(' '),

  /** Elevated card (modals, popovers) */
  elevated: [
    'rounded-xl',
    'bg-slate-900',
    'border border-slate-700',
    'shadow-xl shadow-black/50',
  ].join(' '),

  /** Card header */
  header: 'px-6 py-4 border-b border-slate-800',

  /** Card body */
  body: 'p-6',

  /** Card footer */
  footer: 'px-6 py-4 border-t border-slate-800 bg-slate-900/50',

  /** Input field styling */
  input: [
    'h-11',
    'rounded-lg',
    'bg-slate-800',
    'border border-slate-700',
    'text-white placeholder:text-slate-500',
    'transition-colors duration-150',
    'hover:border-slate-600',
    'disabled:opacity-50 disabled:cursor-not-allowed',
  ].join(' '),

  /** Select field styling */
  select: [
    'h-11',
    'rounded-lg',
    'bg-slate-800',
    'border border-slate-700',
    'text-white',
    'transition-colors duration-150',
    'hover:border-slate-600',
    'disabled:opacity-50 disabled:cursor-not-allowed',
  ].join(' '),

  /** Textarea styling */
  textarea: [
    'min-h-[88px]',
    'rounded-lg',
    'bg-slate-800',
    'border border-slate-700',
    'text-white placeholder:text-slate-500',
    'transition-colors duration-150',
    'hover:border-slate-600',
    'resize-y',
    'disabled:opacity-50 disabled:cursor-not-allowed',
  ].join(' '),
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// FOCUS TOKENS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Focus indicator tokens for accessibility.
 * Provides visible focus for keyboard navigation.
 * Meets WCAG 2.4.7 Focus Visible requirement.
 */
export const focus = {
  /** Ring style focus (buttons, cards) */
  ring: 'focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-900',

  /** Border style focus (inputs) */
  border: 'focus:outline-none focus:border-emerald-500',

  /** Combined focus with ring */
  default: 'focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-900',

  /** Focus visible only (keyboard navigation) */
  visible:
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900',

  /** Input focus (border + subtle glow) */
  input: 'focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20',

  /** Error state focus (red border + glow) */
  error: 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// TOUCH TARGET TOKENS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Touch target tokens for WCAG 2.5.5 compliance.
 * Minimum 44x44px for interactive elements.
 */
export const touchTargets = {
  /** Minimum touch target (44px) */
  min: 'min-h-[44px] min-w-[44px]',

  /** Standard button size (44px height) */
  button: 'h-11 px-4',

  /** Large button (48px height) */
  buttonLarge: 'h-12 px-6',

  /** Small button (36px - use sparingly) */
  buttonSmall: 'h-9 px-3 text-sm',

  /** Icon button (44x44px) */
  iconButton: 'h-11 w-11 flex items-center justify-center',

  /** Checkbox/radio wrapper */
  control: 'min-h-[44px] flex items-center',
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// MOTION TOKENS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Motion duration tokens in milliseconds.
 * All animations respect prefers-reduced-motion.
 */
export const motion = {
  /** Micro interactions (hover, focus) - 150ms */
  fast: 150,
  /** Standard transitions (expand, fade) - 200ms */
  normal: 200,
  /** Emphasis/attention (modal, drawer) - 300ms */
  slow: 300,
  /** Layout changes (accordion, reorder) - 500ms */
  layout: 500,
} as const;

/**
 * Framer Motion spring presets
 */
export const springs = {
  /** Snappy spring for micro interactions */
  snappy: { type: 'spring' as const, stiffness: 400, damping: 30 },
  /** Gentle spring for larger animations */
  gentle: { type: 'spring' as const, stiffness: 200, damping: 25 },
  /** Bouncy spring for playful interactions */
  bouncy: { type: 'spring' as const, stiffness: 300, damping: 20 },
} as const;

/**
 * Hook to check for reduced motion preference.
 * @returns Object with motion utilities
 *
 * @example
 * const { isReduced, getDuration, durations } = useMotion();
 * <motion.div animate={{ opacity: 1 }} transition={{ duration: getDuration(200) / 1000 }} />
 */
export function useMotion(): {
  isReduced: boolean;
  getDuration: (duration: number) => number;
  getDurationSeconds: (duration: number) => number;
  durations: typeof motion | { fast: 0; normal: 0; slow: 0; layout: 0 };
  springs:
    | typeof springs
    | {
        snappy: { type: 'tween'; duration: 0 };
        gentle: { type: 'tween'; duration: 0 };
        bouncy: { type: 'tween'; duration: 0 };
      };
} {
  const [isReduced, setIsReduced] = React.useState(false);

  React.useEffect(() => {
    // Check initial preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setIsReduced(mediaQuery.matches);

    // Listen for changes
    const handler = (e: MediaQueryListEvent) => setIsReduced(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return {
    /** Whether reduced motion is preferred */
    isReduced,
    /** Get duration in ms (0 if reduced motion) */
    getDuration: (duration: number) => (isReduced ? 0 : duration),
    /** Get duration in seconds for Framer Motion */
    getDurationSeconds: (duration: number) => (isReduced ? 0 : duration / 1000),
    /** Motion constants (all 0 if reduced) */
    durations: isReduced ? { fast: 0, normal: 0, slow: 0, layout: 0 } : motion,
    /** Springs (instant if reduced) */
    springs: isReduced
      ? {
          snappy: { type: 'tween' as const, duration: 0 },
          gentle: { type: 'tween' as const, duration: 0 },
          bouncy: { type: 'tween' as const, duration: 0 },
        }
      : springs,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// GRADIENT TOKENS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Gradient tokens for backgrounds and accents.
 * Matches repairs page aesthetic.
 */
export const gradients = {
  /** Page background gradient */
  pageBg: 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950',

  /** Card shine effect (subtle) */
  cardShine: 'bg-gradient-to-br from-slate-800/50 via-slate-900/80 to-slate-900/90',

  /** Header gradient */
  header: 'bg-gradient-to-r from-slate-900 to-slate-900/95',

  /** Success gradient (buttons, badges) */
  success: 'bg-gradient-to-r from-emerald-600 to-emerald-500',

  /** Warning gradient */
  warning: 'bg-gradient-to-r from-amber-600 to-amber-500',

  /** Error gradient */
  error: 'bg-gradient-to-r from-red-600 to-red-500',

  /** Info gradient */
  info: 'bg-gradient-to-r from-blue-600 to-blue-500',

  /** Skeleton loading gradient */
  skeleton: 'bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800',
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// SHADOW TOKENS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Shadow tokens for elevation.
 */
export const shadows = {
  /** Subtle shadow (cards) */
  sm: 'shadow-sm shadow-black/20',

  /** Default shadow (dropdowns) */
  md: 'shadow-md shadow-black/30',

  /** Elevated shadow (modals) */
  lg: 'shadow-lg shadow-black/40',

  /** Maximum shadow (overlays) */
  xl: 'shadow-xl shadow-black/50',

  /** Glow effect (success/primary) */
  glow: 'shadow-lg shadow-emerald-500/20',

  /** Error glow */
  glowError: 'shadow-lg shadow-red-500/20',

  /** Warning glow */
  glowWarning: 'shadow-lg shadow-amber-500/20',

  /** Inset shadow (pressed states) */
  inset: 'shadow-inner shadow-black/20',
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// Z-INDEX TOKENS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Z-index scale for layering.
 */
export const zIndex = {
  /** Base layer */
  base: 0,
  /** Raised elements (cards) */
  raised: 1,
  /** Dropdown menus */
  dropdown: 10,
  /** Sticky headers */
  sticky: 20,
  /** Modals and dialogs */
  modal: 30,
  /** Popovers and tooltips */
  popover: 40,
  /** Toast notifications */
  toast: 50,
  /** Maximum (dev tools, etc) */
  max: 9999,
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Combine multiple class strings, filtering out falsy values.
 * @param classes - Class strings to combine
 * @returns Combined class string
 *
 * @example
 * cn('base-class', isActive && 'active', error && 'error')
 */
export function cn(
  ...classes: (string | boolean | undefined | null)[]
): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * Get status color tokens based on level
 * @param level - Status level
 * @returns Color token string
 */
export function getStatusColor(
  level: 'critical' | 'high' | 'medium' | 'low' | 'success'
): string {
  return colors.status[level];
}

/**
 * Get motivation level color based on score
 * @param score - Motivation score 0-100
 * @returns Status level key
 */
export function getMotivationStatus(score: number): keyof typeof colors.status {
  if (score >= 85) return 'critical';
  if (score >= 65) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}

/**
 * Get urgency color based on days until sale
 * @param days - Days until sale
 * @returns Status level key
 */
export function getUrgencyStatus(
  days: number | null
): keyof typeof colors.status {
  if (days === null) return 'low';
  if (days <= 30) return 'critical';
  if (days <= 60) return 'high';
  if (days <= 120) return 'medium';
  return 'low';
}

/**
 * Get risk level color
 * @param level - Risk level
 * @returns Status level key
 */
export function getRiskStatus(
  level: 'low' | 'medium' | 'high' | 'critical'
): keyof typeof colors.status {
  return level;
}
