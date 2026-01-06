/**
 * Command Center V2.1 - Spacing Token System
 *
 * Consistent spacing scale for rhythmic, breathable layouts.
 * Base unit: 4px
 *
 * @module spacing
 * @version 1.0.0
 */

// ============================================================================
// SPACING SCALE
// ============================================================================

export const spacing = {
  'px': '1px',
  '0': '0',
  '0.5': '0.125rem',   // 2px
  '1': '0.25rem',      // 4px
  '1.5': '0.375rem',   // 6px
  '2': '0.5rem',       // 8px
  '2.5': '0.625rem',   // 10px
  '3': '0.75rem',      // 12px
  '3.5': '0.875rem',   // 14px
  '4': '1rem',         // 16px
  '5': '1.25rem',      // 20px
  '6': '1.5rem',       // 24px
  '7': '1.75rem',      // 28px
  '8': '2rem',         // 32px
  '9': '2.25rem',      // 36px
  '10': '2.5rem',      // 40px
  '11': '2.75rem',     // 44px
  '12': '3rem',        // 48px
  '14': '3.5rem',      // 56px
  '16': '4rem',        // 64px
  '20': '5rem',        // 80px
  '24': '6rem',        // 96px
  '28': '7rem',        // 112px
  '32': '8rem',        // 128px
  '36': '9rem',        // 144px
  '40': '10rem',       // 160px
  '44': '11rem',       // 176px
  '48': '12rem',       // 192px
  '52': '13rem',       // 208px
  '56': '14rem',       // 224px
  '60': '15rem',       // 240px
  '64': '16rem',       // 256px
  '72': '18rem',       // 288px
  '80': '20rem',       // 320px
  '96': '24rem',       // 384px
} as const;

// ============================================================================
// SEMANTIC LAYOUT SPACING
// ============================================================================

export const layout = {
  // Page-level
  pageInsetX: spacing['6'],           // 24px — Horizontal page padding
  pageInsetY: spacing['8'],           // 32px — Vertical page padding
  sectionGap: spacing['10'],          // 40px — Between major sections

  // Card-level
  cardPadding: spacing['5'],          // 20px — Inside cards
  cardPaddingLg: spacing['6'],        // 24px — Large cards
  cardGap: spacing['4'],              // 16px — Between cards in a grid

  // Component-level
  componentGap: spacing['3'],         // 12px — Between related items
  componentGapSm: spacing['2'],       // 8px — Tight spacing
  inlineGap: spacing['2'],            // 8px — Between inline elements
  inlineGapSm: spacing['1.5'],        // 6px — Tight inline

  // Form-level
  fieldGap: spacing['4'],             // 16px — Between form fields
  labelGap: spacing['1.5'],           // 6px — Label to input
  inputPaddingX: spacing['3'],        // 12px — Input horizontal padding
  inputPaddingY: spacing['2'],        // 8px — Input vertical padding

  // Button
  buttonPaddingX: spacing['4'],       // 16px
  buttonPaddingY: spacing['2'],       // 8px
  buttonPaddingXSm: spacing['3'],     // 12px
  buttonPaddingYSm: spacing['1.5'],   // 6px
} as const;

// ============================================================================
// TYPES
// ============================================================================

export type Spacing = typeof spacing;
export type Layout = typeof layout;
