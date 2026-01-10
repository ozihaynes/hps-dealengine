/**
 * Motion Components Barrel Export
 * @module components/underwrite/motion
 * @slice 19 of 22
 *
 * Provides animation variants and motion components.
 * All components respect prefers-reduced-motion via useMotion hook.
 *
 * NOTE: Duration (motion) and spring (springs) constants are in utils/tokens.ts
 * This module adds EASE constants and animation variants.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// ANIMATION CONSTANTS & VARIANTS
// ═══════════════════════════════════════════════════════════════════════════════

export {
  // Constants
  EASE,
  DURATION_SEC,
  // Page/Section variants
  pageVariants,
  sectionVariants,
  fadeVariants,
  scaleVariants,
  // Card variants
  cardVariants,
  // Value variants
  valueChangeVariants,
  // Loading variants
  pulseVariants,
  spinVariants,
  // Stagger helpers
  staggerContainer,
  staggerItem,
} from './animations';

export type { EaseType } from './animations';

// ═══════════════════════════════════════════════════════════════════════════════
// MOTION COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

export { AnimatedValue } from './AnimatedValue';
export type { AnimatedValueProps } from './AnimatedValue';

export { PageTransition } from './PageTransition';
export type { PageTransitionProps } from './PageTransition';

export { StaggerContainer, StaggerItem } from './StaggerContainer';
export type { StaggerContainerProps, StaggerItemProps } from './StaggerContainer';
