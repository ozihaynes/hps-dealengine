/**
 * Command Center V2.1 - Design Token System
 *
 * Central export for all design tokens.
 *
 * @module tokens
 * @version 1.0.0
 */

// Color system
export {
  colors,
  verdictColors,
  urgencyColors,
  signalColors,
  surfaceColors,
  textColors,
  borderColors,
  brandColors,
  type Colors,
} from './colors';

// Typography system
export {
  typography,
  fontFamily,
  fontFamilyString,
  fontSize,
  fontWeight,
  letterSpacing,
  lineHeight,
  typographyPresets,
  type Typography,
} from './typography';

// Spacing system
export {
  spacing,
  layout,
  type Spacing,
  type Layout,
} from './spacing';

// Motion system
export {
  motion,
  duration,
  easing,
  transitionProperty,
  keyframes,
  animation,
  stagger,
  type Motion,
} from './motion';

// Shadows & elevation
export {
  shadows,
  boxShadow,
  glowShadow,
  borderRadius,
  zIndex,
  type Shadows,
} from './shadows';

// ============================================================================
// FULL TOKEN BUNDLE
// ============================================================================

import { colors } from './colors';
import { typography } from './typography';
import { spacing, layout } from './spacing';
import { motion } from './motion';
import { shadows } from './shadows';

export const tokens = {
  colors,
  typography,
  spacing,
  layout,
  motion,
  shadows,
} as const;

export type Tokens = typeof tokens;
