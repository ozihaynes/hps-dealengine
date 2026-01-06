/**
 * Command Center V2.1 - Shadow & Elevation Token System
 *
 * Layered depth system for visual hierarchy.
 * Includes shadows, radii, and z-index scale.
 *
 * @module shadows
 * @version 1.0.0
 */

// ============================================================================
// BOX SHADOWS
// ============================================================================

export const boxShadow = {
  none: 'none',

  // Subtle — Form inputs, minimal separation
  xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',

  // Cards — Default elevated containers
  sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',

  // Hovered cards — Interactive feedback
  DEFAULT: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',

  // Popovers, dropdowns
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',

  // Modals, drawers
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',

  // Top-level overlays
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',

  // Inner shadow (for inset areas)
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',

  // Focus ring
  focus: '0 0 0 3px rgba(59, 130, 246, 0.5)',
  focusError: '0 0 0 3px rgba(220, 38, 38, 0.5)',
  focusSuccess: '0 0 0 3px rgba(16, 185, 129, 0.5)',
} as const;

// ============================================================================
// VERDICT GLOWS (for dramatic effect on verdict badges)
// ============================================================================

export const glowShadow = {
  go: '0 0 20px rgba(16, 185, 129, 0.35), 0 0 40px rgba(16, 185, 129, 0.15)',
  proceedWithCaution: '0 0 20px rgba(245, 158, 11, 0.35), 0 0 40px rgba(245, 158, 11, 0.15)',
  hold: '0 0 20px rgba(99, 102, 241, 0.35), 0 0 40px rgba(99, 102, 241, 0.15)',
  pass: '0 0 15px rgba(100, 116, 139, 0.20)',
  // Urgency
  emergency: '0 0 20px rgba(220, 38, 38, 0.35), 0 0 40px rgba(220, 38, 38, 0.15)',
  critical: '0 0 20px rgba(234, 88, 12, 0.35), 0 0 40px rgba(234, 88, 12, 0.15)',
} as const;

// ============================================================================
// BORDER RADIUS
// ============================================================================

export const borderRadius = {
  none: '0',
  sm: '0.25rem',     // 4px — Buttons, badges
  DEFAULT: '0.375rem', // 6px — Inputs, small cards
  md: '0.375rem',    // 6px
  lg: '0.5rem',      // 8px — Cards
  xl: '0.75rem',     // 12px — Large cards, modals
  '2xl': '1rem',     // 16px — Hero elements
  '3xl': '1.5rem',   // 24px — Very large
  full: '9999px',    // Circular elements, pills
} as const;

// ============================================================================
// Z-INDEX SCALE
// ============================================================================

export const zIndex = {
  hide: '-1',
  base: '0',
  raised: '10',        // Cards, elevated content
  dropdown: '100',     // Dropdowns, popovers
  sticky: '200',       // Sticky headers
  banner: '250',       // Banners, alerts
  drawer: '300',       // Side drawers
  modal: '400',        // Modal dialogs
  popover: '500',      // Popovers on modals
  toast: '600',        // Toast notifications
  tooltip: '700',      // Tooltips (highest)
  max: '9999',         // For edge cases
} as const;

// ============================================================================
// COMBINED EXPORT
// ============================================================================

export const shadows = {
  boxShadow,
  glowShadow,
  borderRadius,
  zIndex,
} as const;

export type Shadows = typeof shadows;
