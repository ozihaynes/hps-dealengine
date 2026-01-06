/**
 * Command Center V2.1 - Typography Token System
 *
 * Type scale and presets for confident, clear communication.
 * Uses DM Sans for headlines (geometric, confident) and Inter for body (readable).
 *
 * @module typography
 * @version 1.0.0
 */

// ============================================================================
// FONT FAMILIES
// ============================================================================

export const fontFamily = {
  display: ['DM Sans', 'system-ui', 'sans-serif'],
  body: ['Inter', 'system-ui', 'sans-serif'],
  mono: ['JetBrains Mono', 'Menlo', 'monospace'],
} as const;

// Tailwind-compatible string format
export const fontFamilyString = {
  display: '"DM Sans", system-ui, sans-serif',
  body: '"Inter", system-ui, sans-serif',
  mono: '"JetBrains Mono", Menlo, monospace',
} as const;

// ============================================================================
// TYPE SCALE (Major Third — 1.25 ratio)
// ============================================================================

export const fontSize = {
  '2xs': ['0.625rem', { lineHeight: '1rem' }],      // 10px
  'xs': ['0.75rem', { lineHeight: '1rem' }],        // 12px
  'sm': ['0.875rem', { lineHeight: '1.25rem' }],    // 14px
  'base': ['1rem', { lineHeight: '1.5rem' }],       // 16px
  'lg': ['1.125rem', { lineHeight: '1.75rem' }],    // 18px
  'xl': ['1.25rem', { lineHeight: '1.75rem' }],     // 20px
  '2xl': ['1.5rem', { lineHeight: '2rem' }],        // 24px
  '3xl': ['1.875rem', { lineHeight: '2.25rem' }],   // 30px
  '4xl': ['2.25rem', { lineHeight: '2.5rem' }],     // 36px
  '5xl': ['3rem', { lineHeight: '1' }],             // 48px
  '6xl': ['3.75rem', { lineHeight: '1' }],          // 60px
} as const;

// ============================================================================
// FONT WEIGHTS
// ============================================================================

export const fontWeight = {
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

// ============================================================================
// LETTER SPACING
// ============================================================================

export const letterSpacing = {
  tighter: '-0.05em',
  tight: '-0.025em',
  normal: '0',
  wide: '0.025em',
  wider: '0.05em',
  widest: '0.1em',
} as const;

// ============================================================================
// LINE HEIGHT
// ============================================================================

export const lineHeight = {
  none: '1',
  tight: '1.25',
  snug: '1.375',
  normal: '1.5',
  relaxed: '1.625',
  loose: '2',
} as const;

// ============================================================================
// PRESET STYLES (CSS-in-JS ready)
// ============================================================================

export const typographyPresets = {
  // Hero metric (e.g., "87" closeability score)
  heroMetric: {
    fontFamily: fontFamilyString.display,
    fontSize: '3rem',
    fontWeight: '700',
    lineHeight: '1',
    letterSpacing: '-0.025em',
  },
  // Page title
  pageTitle: {
    fontFamily: fontFamilyString.display,
    fontSize: '1.875rem',
    fontWeight: '600',
    lineHeight: '1.25',
    letterSpacing: '-0.025em',
  },
  // Section header
  sectionHeader: {
    fontFamily: fontFamilyString.display,
    fontSize: '1.25rem',
    fontWeight: '600',
    lineHeight: '1.5',
    letterSpacing: '-0.01em',
  },
  // Card title
  cardTitle: {
    fontFamily: fontFamilyString.display,
    fontSize: '1.125rem',
    fontWeight: '600',
    lineHeight: '1.375',
  },
  // Body text
  body: {
    fontFamily: fontFamilyString.body,
    fontSize: '0.875rem',
    fontWeight: '400',
    lineHeight: '1.5',
  },
  // Body large
  bodyLarge: {
    fontFamily: fontFamilyString.body,
    fontSize: '1rem',
    fontWeight: '400',
    lineHeight: '1.5',
  },
  // Caption/small text
  caption: {
    fontFamily: fontFamilyString.body,
    fontSize: '0.75rem',
    fontWeight: '400',
    lineHeight: '1.5',
  },
  // Label (uppercase)
  label: {
    fontFamily: fontFamilyString.body,
    fontSize: '0.6875rem',
    fontWeight: '600',
    lineHeight: '1',
    letterSpacing: '0.05em',
    textTransform: 'uppercase' as const,
  },
  // Mono data
  data: {
    fontFamily: fontFamilyString.mono,
    fontSize: '0.875rem',
    fontWeight: '500',
    lineHeight: '1.5',
  },
  // Large mono (for prominent numbers)
  dataLarge: {
    fontFamily: fontFamilyString.mono,
    fontSize: '1.5rem',
    fontWeight: '600',
    lineHeight: '1.25',
    letterSpacing: '-0.02em',
  },
} as const;

// ============================================================================
// COMBINED EXPORT
// ============================================================================

export const typography = {
  fontFamily,
  fontFamilyString,
  fontSize,
  fontWeight,
  letterSpacing,
  lineHeight,
  presets: typographyPresets,
} as const;

export type Typography = typeof typography;
