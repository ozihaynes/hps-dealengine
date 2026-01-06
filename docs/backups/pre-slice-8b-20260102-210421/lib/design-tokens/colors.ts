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

export const colors = {
  verdict: verdictColors,
  urgency: urgencyColors,
  signal: signalColors,
  surface: surfaceColors,
  text: textColors,
  border: borderColors,
  brand: brandColors,
} as const;

export type Colors = typeof colors;
