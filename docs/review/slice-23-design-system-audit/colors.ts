/**
 * Command Center V2.1 - Color Token System
 *
 * Semantic color palette designed for decision-making interfaces.
 * All colors map to CSS variables for runtime theming support.
 *
 * @module colors
 * @version 1.0.0
 */

// ============================================================================
// VERDICT COLORS — The emotional language of decisions
// ============================================================================

export const verdictColors = {
  go: {
    DEFAULT: '#10B981',
    soft: '#D1FAE5',
    glow: 'rgba(16, 185, 129, 0.20)',
    text: '#065F46',
    border: '#6EE7B7',
  },
  proceedWithCaution: {
    DEFAULT: '#F59E0B',
    soft: '#FEF3C7',
    glow: 'rgba(245, 158, 11, 0.20)',
    text: '#92400E',
    border: '#FCD34D',
  },
  hold: {
    DEFAULT: '#6366F1',
    soft: '#E0E7FF',
    glow: 'rgba(99, 102, 241, 0.20)',
    text: '#3730A3',
    border: '#A5B4FC',
  },
  pass: {
    DEFAULT: '#64748B',
    soft: '#F1F5F9',
    glow: 'rgba(100, 116, 139, 0.15)',
    text: '#334155',
    border: '#CBD5E1',
  },
} as const;

// ============================================================================
// URGENCY COLORS — The tempo of attention
// ============================================================================

export const urgencyColors = {
  emergency: {
    DEFAULT: '#DC2626',
    soft: '#FEE2E2',
    pulse: '#FECACA',
    text: '#991B1B',
    border: '#F87171',
  },
  critical: {
    DEFAULT: '#EA580C',
    soft: '#FFEDD5',
    pulse: '#FED7AA',
    text: '#9A3412',
    border: '#FB923C',
  },
  active: {
    DEFAULT: '#0EA5E9',
    soft: '#E0F2FE',
    pulse: '#BAE6FD',
    text: '#075985',
    border: '#38BDF8',
  },
  steady: {
    DEFAULT: '#22C55E',
    soft: '#DCFCE7',
    pulse: '#BBF7D0',
    text: '#166534',
    border: '#4ADE80',
  },
} as const;

// ============================================================================
// SIGNAL SEVERITY COLORS — Visual weight of alerts
// ============================================================================

export const signalColors = {
  critical: {
    bg: '#FEF2F2',
    border: '#FECACA',
    icon: '#DC2626',
    text: '#991B1B',
    hover: '#FEE2E2',
  },
  warning: {
    bg: '#FFFBEB',
    border: '#FDE68A',
    icon: '#D97706',
    text: '#92400E',
    hover: '#FEF3C7',
  },
  info: {
    bg: '#EFF6FF',
    border: '#BFDBFE',
    icon: '#2563EB',
    text: '#1E40AF',
    hover: '#DBEAFE',
  },
} as const;

// ============================================================================
// SURFACE SYSTEM — Layered depth
// ============================================================================

export const surfaceColors = {
  base: '#FFFFFF',
  raised: '#F8FAFC',
  overlay: '#F1F5F9',
  sunken: '#E2E8F0',
  inverse: '#0F172A',
  backdrop: 'rgba(15, 23, 42, 0.50)',
} as const;

// ============================================================================
// TEXT HIERARCHY
// ============================================================================

export const textColors = {
  primary: '#0F172A',
  secondary: '#475569',
  tertiary: '#94A3B8',
  muted: '#CBD5E1',
  inverse: '#F8FAFC',
  accent: '#3B82F6',
  link: '#2563EB',
  linkHover: '#1D4ED8',
} as const;

// ============================================================================
// BORDER SYSTEM
// ============================================================================

export const borderColors = {
  subtle: '#E2E8F0',
  DEFAULT: '#CBD5E1',
  strong: '#94A3B8',
  focus: '#3B82F6',
  focusRing: 'rgba(59, 130, 246, 0.50)',
} as const;

// ============================================================================
// BRAND ACCENT (for highlights, active states)
// ============================================================================

export const brandColors = {
  primary: '#3B82F6',
  primaryHover: '#2563EB',
  primaryActive: '#1D4ED8',
  primarySoft: '#DBEAFE',
} as const;

// ============================================================================
// COMBINED EXPORT
// ============================================================================

// ============================================================================
// BADGE LOGIC — Context-aware color mapping for metrics
// ============================================================================

/**
 * Badge color logic based on context.
 *
 * CRITICAL: Different metrics have different "good" directions.
 * - HIGH ARV = GOOD = emerald
 * - HIGH DOM = BAD = red
 *
 * This mapping ensures correct color semantics across the dashboard.
 */
export const BADGE_LOGIC = {
  // Metrics where HIGH = GOOD
  highIsGood: ['ARV', 'LIQUIDITY', 'CONFIDENCE', 'COMP_QUALITY', 'NET_PROFIT'] as const,

  // Metrics where LOW = GOOD
  lowIsGood: ['DOM', 'RISK_SCORE', 'VACANCY'] as const,

  // Get color based on metric type and value
  getColor: (metric: string, value: string): 'emerald' | 'amber' | 'red' | 'slate' => {
    const isHighGood = BADGE_LOGIC.highIsGood.includes(metric as typeof BADGE_LOGIC.highIsGood[number]);

    if (isHighGood) {
      if (value === 'HIGH' || value === 'GOOD' || value === 'EXCELLENT') return 'emerald';
      if (value === 'MID' || value === 'MODERATE' || value === 'FAIR') return 'amber';
      if (value === 'LOW' || value === 'POOR') return 'red';
    } else {
      if (value === 'LOW') return 'emerald';
      if (value === 'MODERATE') return 'amber';
      if (value === 'HIGH') return 'red';
    }

    return 'slate';
  },
} as const;

// ============================================================================
// SEMANTIC TAILWIND CLASSES — For dashboard components
// ============================================================================

/**
 * Semantic color classes for dark dashboard.
 * Use these instead of raw Tailwind classes for consistency.
 */
export const semanticClasses = {
  // GO / PURSUE / Positive / High-is-good
  go: {
    text: 'text-emerald-400',
    bg: 'bg-emerald-500/20',
    border: 'border-emerald-500/40',
    solid: 'bg-emerald-500',
  },

  // CAUTION / REVIEW / Moderate / Warm
  caution: {
    text: 'text-amber-400',
    bg: 'bg-amber-500/20',
    border: 'border-amber-500/40',
    solid: 'bg-amber-500',
  },

  // STOP / PASS / Critical / Low-is-bad
  stop: {
    text: 'text-red-400',
    bg: 'bg-red-500/20',
    border: 'border-red-500/40',
    solid: 'bg-red-500',
  },

  // NEUTRAL / Pending / Unknown
  neutral: {
    text: 'text-slate-400',
    bg: 'bg-slate-700',
    border: 'border-slate-600',
    solid: 'bg-slate-500',
  },
} as const;

// ============================================================================
// PROGRESS BAR TOKENS — NO GRADIENTS
// ============================================================================

/**
 * Progress bar color tokens.
 *
 * CRITICAL: No gradients allowed. Use solid colors only.
 * Fill color is determined by threshold-based logic.
 */
export const progressTokens = {
  background: 'bg-slate-700',
  fill: {
    positive: 'bg-emerald-500',
    moderate: 'bg-amber-500',
    negative: 'bg-red-500',
    neutral: 'bg-slate-500',
  },
} as const;

// ============================================================================
// BANNED PATTERNS — DO NOT USE
// ============================================================================

/**
 * These patterns are banned from dashboard components.
 * They create unprofessional, "playful" appearance.
 */
export const BANNED_PATTERNS = [
  'bg-gradient-to-r',
  'bg-gradient-to-l',
  'bg-gradient-to-t',
  'bg-gradient-to-b',
  'from-',
  'via-',
  'to-',
  'bg-clip-text',
  'text-transparent',
] as const;

// ============================================================================
// COMBINED EXPORT
// ============================================================================

export const colors = {
  verdict: verdictColors,
  urgency: urgencyColors,
  signal: signalColors,
  surface: surfaceColors,
  text: textColors,
  border: borderColors,
  brand: brandColors,
  semantic: semanticClasses,
  progress: progressTokens,
  badge: BADGE_LOGIC,
} as const;

export type Colors = typeof colors;
