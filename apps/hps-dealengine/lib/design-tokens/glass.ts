/**
 * Apple Liquid Glass Design Tokens
 *
 * Implements Apple's iOS 26 / macOS Tahoe Liquid Glass design language
 * for HPS DealEngine's dark mode dashboard.
 *
 * Based on:
 * - Apple WWDC 2025 Liquid Glass announcement
 * - Apple Human Interface Guidelines (Materials)
 * - Gestalt principles for visual grouping
 * - Miller's Law for cognitive load management
 *
 * @module lib/design-tokens/glass
 * @version 2.0.0 (Slice 24 Phase 2 - 101/100)
 */

// =============================================================================
// BANNED PATTERNS - NEVER USE THESE
// =============================================================================

/**
 * BANNED: Patterns that break the glass design system.
 * Grep for these and eliminate ALL instances.
 */
export const BANNED_PATTERNS = [
  'zinc-',           // WRONG: Use slate- (navy-tinted, not gray)
  'bg-gray-',        // WRONG: Use slate-
  'border-zinc-',    // WRONG: Use slate- or white/X
] as const;

// =============================================================================
// GLASS FOUNDATION COLORS
// =============================================================================

/**
 * Foundation colors for dark mode glass.
 *
 * CRITICAL: Use SLATE (navy-tinted) not ZINC (pure gray).
 * Slate creates a premium, professional appearance.
 * Zinc looks flat and lifeless.
 */
export const GLASS_FOUNDATION = {
  // Page backgrounds (darkest to lightest)
  page: 'bg-slate-950',           // #020617 - deepest navy
  surface: 'bg-slate-900',        // #0f172a - primary surface
  elevated: 'bg-slate-800',       // #1e293b - elevated surface

  // Glass card backgrounds (theme-aware via CSS custom properties)
  card: 'bg-[var(--card-bg)]',           // 60% - standard glass
  cardHover: 'bg-[var(--card-bg-hover)]', // 70% - hover state
  cardActive: 'bg-[var(--card-bg-active)]', // 80% - active/pressed

  // Hero/overlay backgrounds (theme-aware)
  hero: 'bg-[var(--card-bg-hero)]',      // 50% - hero sections (more see-through)
  overlay: 'bg-[var(--card-bg-overlay)]', // 90% - modals, drawers (more opaque)

  // Text colors on glass
  textPrimary: 'text-white',
  textSecondary: 'text-slate-300',
  textTertiary: 'text-slate-400',
  textMuted: 'text-slate-500',
} as const;

// =============================================================================
// GLASS BLUR LEVELS
// =============================================================================

/**
 * Backdrop blur intensity levels.
 *
 * Higher blur = more glass effect, more GPU usage.
 * Use appropriate level for element importance.
 */
export const GLASS_BLUR = {
  // Named levels
  none: '',
  subtle: 'backdrop-blur-md',      // 12px - very light glass
  standard: 'backdrop-blur-lg',    // 16px - standard glass
  strong: 'backdrop-blur-xl',      // 24px - prominent glass
  maximum: 'backdrop-blur-2xl',    // 40px - overlays, modals

  // Saturation boost (makes colors richer through glass)
  saturated: 'saturate-150',

  // Recommended combinations by use case
  card: 'backdrop-blur-xl',                    // Standard cards
  panel: 'backdrop-blur-xl saturate-150',      // Important panels
  hero: 'backdrop-blur-xl saturate-150',       // Hero sections
  overlay: 'backdrop-blur-2xl saturate-150',   // Modals, drawers
  metric: 'backdrop-blur-lg',                  // Small metric boxes
} as const;

// =============================================================================
// GLASS BORDERS
// =============================================================================

/**
 * Glass border styles.
 *
 * Key principle: White borders with low opacity catch light,
 * creating the glass edge effect. Slate borders are more subtle.
 */
export const GLASS_BORDER = {
  // Light-catching borders (primary glass effect)
  glass: 'border border-white/10',
  glassHover: 'border border-white/15',
  glassActive: 'border border-white/20',

  // Subtle borders (secondary elements)
  subtle: 'border border-slate-700/50',
  subtleHover: 'border border-slate-600/60',

  // Verdict accent borders (left edge indicators)
  accentGo: 'border-l-4 border-l-emerald-500',
  accentCaution: 'border-l-4 border-l-amber-500',
  accentHold: 'border-l-4 border-l-red-500',
  accentPass: 'border-l-4 border-l-slate-500',

  // Semantic borders
  emerald: 'border border-emerald-500/30',
  amber: 'border border-amber-500/30',
  red: 'border border-red-500/30',
} as const;

// =============================================================================
// GLASS SHADOWS
// =============================================================================

/**
 * Shadow system for glass elevation and luminosity.
 *
 * Combines:
 * 1. Outer shadow (elevation, depth)
 * 2. Inner highlight (top edge light catch)
 */
export const GLASS_SHADOW = {
  // Outer shadows (elevation)
  sm: 'shadow-sm shadow-black/10',
  md: 'shadow-md shadow-black/15',
  lg: 'shadow-lg shadow-black/20',
  xl: 'shadow-xl shadow-black/25',
  '2xl': 'shadow-2xl shadow-black/40',

  // Inner highlights (glass luminosity) - THE SECRET SAUCE
  innerSm: 'shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)]',
  innerMd: 'shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]',
  innerLg: 'shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]',
  innerXl: 'shadow-[inset_0_2px_0_0_rgba(255,255,255,0.1)]',

  // Verdict glows
  glowGo: 'shadow-[0_0_40px_-10px_rgba(16,185,129,0.4)]',
  glowCaution: 'shadow-[0_0_40px_-10px_rgba(245,158,11,0.4)]',
  glowHold: 'shadow-[0_0_40px_-10px_rgba(239,68,68,0.4)]',
  glowPass: 'shadow-[0_0_30px_-10px_rgba(100,116,139,0.3)]',

  // Inner verdict highlights
  innerGo: 'shadow-[inset_0_1px_0_0_rgba(16,185,129,0.15)]',
  innerCaution: 'shadow-[inset_0_1px_0_0_rgba(245,158,11,0.15)]',
  innerHold: 'shadow-[inset_0_1px_0_0_rgba(239,68,68,0.15)]',
  innerPass: 'shadow-[inset_0_1px_0_0_rgba(100,116,139,0.1)]',
} as const;

// =============================================================================
// GLASS ROUNDED CORNERS
// =============================================================================

/**
 * Border radius standards.
 *
 * Apple Liquid Glass uses softer, more generous rounding.
 */
export const GLASS_ROUNDED = {
  sm: 'rounded-lg',      // 8px - only for tiny elements
  md: 'rounded-xl',      // 12px - standard cards
  lg: 'rounded-2xl',     // 16px - hero sections, panels
  xl: 'rounded-3xl',     // 24px - overlays, modals
  full: 'rounded-full',  // pills, avatars
} as const;

// =============================================================================
// COMPLETE GLASS PRESETS
// =============================================================================

/**
 * Ready-to-use glass presets.
 * Use these instead of building from scratch.
 */
export const GLASS_PRESETS = {
  // HERO: Maximum prominence, decision zone (theme-aware)
  hero: [
    'rounded-2xl',
    'bg-[var(--card-bg-hero)]',
    'backdrop-blur-xl saturate-150',
    'border border-white/10',
    'shadow-xl shadow-black/25',
    'shadow-[inset_0_2px_0_0_rgba(255,255,255,0.08)]',
  ].join(' '),

  // CARD: Standard dashboard cards (theme-aware)
  card: [
    'rounded-xl',
    'bg-[var(--card-bg)]',
    'backdrop-blur-xl',
    'border border-white/10',
    'shadow-lg shadow-black/20',
    'shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]',
  ].join(' '),

  // CARD INTERACTIVE: Cards with hover states (theme-aware)
  cardInteractive: [
    'rounded-xl',
    'bg-[var(--card-bg)]',
    'backdrop-blur-xl',
    'border border-white/10',
    'shadow-lg shadow-black/20',
    'shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]',
    'transition-all duration-200 ease-out',
    'hover:bg-[var(--card-bg-hover)]',
    'hover:border-white/15',
    'hover:shadow-xl',
    'cursor-pointer',
  ].join(' '),

  // PANEL: Larger container sections (theme-aware)
  panel: [
    'rounded-2xl',
    'bg-[var(--card-bg-solid)]',
    'backdrop-blur-xl saturate-150',
    'border border-white/10',
    'shadow-xl shadow-black/25',
    'shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]',
  ].join(' '),

  // METRIC: Small inline metric boxes (theme-aware)
  metric: [
    'rounded-lg',
    'bg-[var(--card-bg)]',
    'backdrop-blur-lg',
    'border border-white/10',
  ].join(' '),

  // VERDICT: Cards with colored accent border (theme-aware)
  verdict: [
    'rounded-xl',
    'bg-[var(--card-bg)]',
    'backdrop-blur-xl',
    'border border-white/10',
    'border-l-4',
    'shadow-lg shadow-black/20',
    'shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]',
  ].join(' '),

  // OVERLAY: Modals, drawers, popovers (theme-aware)
  overlay: [
    'rounded-2xl',
    'bg-[var(--card-bg-overlay)]',
    'backdrop-blur-2xl saturate-150',
    'border border-white/10',
    'shadow-2xl shadow-black/40',
    'shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]',
  ].join(' '),

  // STRIP: Horizontal strips (risk gates, evidence health) (theme-aware)
  strip: [
    'rounded-xl',
    'bg-[var(--card-bg-hero)]',
    'backdrop-blur-lg',
    'border border-white/8',
    'shadow-md shadow-black/15',
  ].join(' '),
} as const;

// =============================================================================
// VERDICT PRESETS
// =============================================================================

/**
 * Verdict color configurations for hero/card styling.
 */
export const VERDICT_COLORS = {
  pursue: {
    border: 'border-emerald-500/40',
    borderAccent: 'border-l-emerald-500',
    bg: 'bg-slate-900/95',
    glow: 'shadow-[0_0_60px_-15px_rgba(16,185,129,0.4)]',
    innerGlow: 'shadow-[inset_0_1px_0_0_rgba(16,185,129,0.15)]',
    gradient: 'from-emerald-500/20 via-emerald-500/5 to-transparent',
    pulse: 'rgba(16, 185, 129, 0.4)',
    text: 'text-emerald-400',
  },
  needs_evidence: {
    border: 'border-amber-500/40',
    borderAccent: 'border-l-amber-500',
    bg: 'bg-slate-900/95',
    glow: 'shadow-[0_0_40px_-15px_rgba(245,158,11,0.3)]',
    innerGlow: 'shadow-[inset_0_1px_0_0_rgba(245,158,11,0.15)]',
    gradient: 'from-amber-500/20 via-amber-500/5 to-transparent',
    pulse: 'rgba(245, 158, 11, 0.3)',
    text: 'text-amber-400',
  },
  pass: {
    border: 'border-slate-600/50',
    borderAccent: 'border-l-slate-500',
    bg: 'bg-slate-900/90',
    glow: 'shadow-lg',
    innerGlow: 'shadow-[inset_0_1px_0_0_rgba(100,116,139,0.1)]',
    gradient: 'from-slate-500/10 via-transparent to-transparent',
    pulse: 'rgba(100, 116, 139, 0.2)',
    text: 'text-slate-400',
  },
  unknown: {
    border: 'border-slate-700',
    borderAccent: 'border-l-slate-600',
    bg: 'bg-slate-900/80',
    glow: '',
    innerGlow: '',
    gradient: 'from-slate-700/20 via-transparent to-transparent',
    pulse: 'rgba(100, 116, 139, 0.1)',
    text: 'text-slate-500',
  },
} as const;

export type VerdictType = keyof typeof VERDICT_COLORS;

// =============================================================================
// INTERACTIVE STATES
// =============================================================================

/**
 * Consistent interactive state tokens.
 */
export const GLASS_INTERACTIVE = {
  // Transition timing
  transition: 'transition-all duration-200 ease-out',
  transitionFast: 'transition-all duration-150 ease-out',
  transitionSlow: 'transition-all duration-300 ease-out',

  // Hover effects (theme-aware)
  hoverBg: 'hover:bg-[var(--card-bg-hover)]',
  hoverBorder: 'hover:border-white/15',
  hoverShadow: 'hover:shadow-xl hover:shadow-black/25',
  hoverScale: 'hover:scale-[1.01]',
  hoverLift: 'hover:-translate-y-1',

  // Focus effects (accessibility)
  focus: [
    'focus-visible:outline-none',
    'focus-visible:ring-2',
    'focus-visible:ring-blue-500/50',
    'focus-visible:ring-offset-2',
    'focus-visible:ring-offset-slate-900',
  ].join(' '),

  // Active/pressed effects (theme-aware)
  active: 'active:bg-[var(--card-bg-active)] active:scale-[0.99]',

  // Cursor
  pointer: 'cursor-pointer',
} as const;

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get glass preset by name
 */
export function getGlassPreset(preset: keyof typeof GLASS_PRESETS): string {
  return GLASS_PRESETS[preset];
}

/**
 * Get verdict colors by verdict type
 */
export function getVerdictColors(verdict: VerdictType) {
  return VERDICT_COLORS[verdict] || VERDICT_COLORS.unknown;
}

/**
 * Build interactive glass card classes
 */
export function buildInteractiveGlass(options?: {
  preset?: keyof typeof GLASS_PRESETS;
  withScale?: boolean;
  withLift?: boolean;
}): string {
  const { preset = 'card', withScale = false, withLift = true } = options || {};

  return [
    GLASS_PRESETS[preset],
    GLASS_INTERACTIVE.transition,
    GLASS_INTERACTIVE.hoverBg,
    GLASS_INTERACTIVE.hoverBorder,
    GLASS_INTERACTIVE.hoverShadow,
    GLASS_INTERACTIVE.focus,
    GLASS_INTERACTIVE.pointer,
    withScale ? GLASS_INTERACTIVE.hoverScale : '',
    withLift ? GLASS_INTERACTIVE.hoverLift : '',
  ].filter(Boolean).join(' ');
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  BANNED_PATTERNS,
  GLASS_FOUNDATION,
  GLASS_BLUR,
  GLASS_BORDER,
  GLASS_SHADOW,
  GLASS_ROUNDED,
  GLASS_PRESETS,
  VERDICT_COLORS,
  GLASS_INTERACTIVE,
  getGlassPreset,
  getVerdictColors,
  buildInteractiveGlass,
};
