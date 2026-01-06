/**
 * GlassCard — Apple Liquid Glass Card Component
 *
 * The unified card component for the entire HPS DealEngine dashboard.
 * Implements Apple's iOS 26 Liquid Glass design language with
 * psychological design principles for trust and premium perception.
 *
 * Features:
 * - Six glass variants (hero, card, panel, metric, verdict, overlay)
 * - Verdict accent colors (go, caution, hold, pass)
 * - Interactive states (hover, focus, active)
 * - Accessibility (keyboard navigation, focus rings)
 * - Animation (Framer Motion integration)
 *
 * @module components/ui/GlassCard
 * @version 2.0.0 (Slice 24 Phase 2)
 */

'use client';

import React, { forwardRef, memo, type ReactNode } from 'react';
import { motion, type HTMLMotionProps, type Variants } from 'framer-motion';
import { cn } from '@/components/ui';
import {
  GLASS_PRESETS,
  GLASS_INTERACTIVE,
  GLASS_BORDER,
  GLASS_SHADOW,
} from '@/lib/design-tokens/glass';
import { TIMING, EASING } from '@/lib/animations/tokens';

// =============================================================================
// TYPES
// =============================================================================

export type GlassVariant = 'hero' | 'card' | 'panel' | 'metric' | 'verdict' | 'overlay' | 'strip';
export type GlassPadding = 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type VerdictAccent = 'go' | 'caution' | 'hold' | 'pass';

export interface GlassCardProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  /** Glass variant - controls blur, opacity, shadows */
  variant?: GlassVariant;

  /** Verdict accent for verdict cards (adds colored left border + glow) */
  accent?: VerdictAccent;

  /** Enable interactive hover/focus/active states */
  interactive?: boolean;

  /** Selected state (adds ring indicator) */
  selected?: boolean;

  /** Padding size */
  padding?: GlassPadding;

  /** Disable backdrop blur (performance optimization for lists) */
  noBlur?: boolean;

  /** Disable animations */
  noAnimation?: boolean;

  /** Children content */
  children: ReactNode;

  /** Test ID for automated testing */
  testId?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const PADDING_MAP: Record<GlassPadding, string> = {
  none: '',
  xs: 'p-2',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
  xl: 'p-8',
};

const VARIANT_STYLES: Record<GlassVariant, string> = {
  hero: GLASS_PRESETS.hero,
  card: GLASS_PRESETS.card,
  panel: GLASS_PRESETS.panel,
  metric: GLASS_PRESETS.metric,
  verdict: GLASS_PRESETS.verdict,
  overlay: GLASS_PRESETS.overlay,
  strip: GLASS_PRESETS.strip,
};

const ACCENT_BORDER_MAP: Record<VerdictAccent, string> = {
  go: GLASS_BORDER.accentGo,
  caution: GLASS_BORDER.accentCaution,
  hold: GLASS_BORDER.accentHold,
  pass: GLASS_BORDER.accentPass,
};

const ACCENT_GLOW_MAP: Record<VerdictAccent, string> = {
  go: `${GLASS_SHADOW.glowGo} ${GLASS_SHADOW.innerGo}`,
  caution: `${GLASS_SHADOW.glowCaution} ${GLASS_SHADOW.innerCaution}`,
  hold: `${GLASS_SHADOW.glowHold} ${GLASS_SHADOW.innerHold}`,
  pass: `${GLASS_SHADOW.glowPass} ${GLASS_SHADOW.innerPass}`,
};

// =============================================================================
// ANIMATION VARIANTS
// =============================================================================

const cardVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: typeof TIMING?.standard === 'number' ? TIMING.standard : 0.3,
      ease: EASING?.smooth || [0, 0, 0.2, 1]
    },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: 0.2 },
  },
};

const noAnimationVariants: Variants = {
  initial: {},
  animate: {},
  exit: {},
};

// =============================================================================
// COMPONENT
// =============================================================================

export const GlassCard = memo(forwardRef<HTMLDivElement, GlassCardProps>(
  function GlassCard(
    {
      variant = 'card',
      accent,
      interactive = false,
      selected = false,
      padding = 'md',
      noBlur = false,
      noAnimation = false,
      children,
      className,
      testId,
      ...motionProps
    },
    ref
  ) {
    // Build class list
    const classes = cn(
      // Base variant styles
      VARIANT_STYLES[variant],

      // Remove blur if noBlur (for performance in long lists)
      noBlur && 'backdrop-blur-none bg-slate-800/80',

      // Verdict accent (border + glow) - only for verdict variant
      accent && variant === 'verdict' && ACCENT_BORDER_MAP[accent],
      accent && variant === 'verdict' && ACCENT_GLOW_MAP[accent],

      // Interactive states
      interactive && GLASS_INTERACTIVE.transition,
      interactive && GLASS_INTERACTIVE.hoverBg,
      interactive && GLASS_INTERACTIVE.hoverBorder,
      interactive && GLASS_INTERACTIVE.hoverShadow,
      interactive && GLASS_INTERACTIVE.hoverLift,
      interactive && GLASS_INTERACTIVE.focus,
      interactive && GLASS_INTERACTIVE.pointer,

      // Selected state
      selected && 'ring-2 ring-blue-500/50 border-white/20',

      // Padding
      PADDING_MAP[padding],

      // Custom classes (last for overrides)
      className,
    );

    return (
      <motion.div
        ref={ref}
        variants={noAnimation ? noAnimationVariants : cardVariants}
        initial={noAnimation ? false : 'initial'}
        animate="animate"
        exit="exit"
        className={classes}
        data-testid={testId}
        data-variant={variant}
        data-accent={accent}
        data-interactive={interactive}
        role={interactive ? 'button' : undefined}
        tabIndex={interactive ? 0 : undefined}
        {...motionProps}
      >
        {children}
      </motion.div>
    );
  }
));

GlassCard.displayName = 'GlassCard';

// =============================================================================
// SPECIALIZED VARIANTS (Convenience Components)
// =============================================================================

/**
 * GlassHero - Hero section with maximum glass effect
 */
export const GlassHero = memo(forwardRef<HTMLDivElement, Omit<GlassCardProps, 'variant'>>(
  function GlassHero(props, ref) {
    return <GlassCard ref={ref} variant="hero" padding="lg" {...props} />;
  }
));

GlassHero.displayName = 'GlassHero';

/**
 * GlassPanel - Larger container panel
 */
export const GlassPanel = memo(forwardRef<HTMLDivElement, Omit<GlassCardProps, 'variant'>>(
  function GlassPanel(props, ref) {
    return <GlassCard ref={ref} variant="panel" padding="lg" {...props} />;
  }
));

GlassPanel.displayName = 'GlassPanel';

/**
 * GlassMetric - Small metric box with subtle glass
 */
export const GlassMetric = memo(forwardRef<HTMLDivElement, Omit<GlassCardProps, 'variant'>>(
  function GlassMetric(props, ref) {
    return <GlassCard ref={ref} variant="metric" padding="sm" {...props} />;
  }
));

GlassMetric.displayName = 'GlassMetric';

/**
 * GlassStrip - Horizontal strip container
 */
export const GlassStrip = memo(forwardRef<HTMLDivElement, Omit<GlassCardProps, 'variant'>>(
  function GlassStrip(props, ref) {
    return <GlassCard ref={ref} variant="strip" padding="md" {...props} />;
  }
));

GlassStrip.displayName = 'GlassStrip';

/**
 * VerdictCard - Card with verdict accent border and glow
 */
export interface VerdictCardProps extends Omit<GlassCardProps, 'variant'> {
  accent: VerdictAccent;
}

export const VerdictCard = memo(forwardRef<HTMLDivElement, VerdictCardProps>(
  function VerdictCard({ accent, ...props }, ref) {
    return <GlassCard ref={ref} variant="verdict" accent={accent} {...props} />;
  }
));

VerdictCard.displayName = 'VerdictCard';

/**
 * InteractiveCard - Card with hover/focus states
 */
export const InteractiveCard = memo(forwardRef<HTMLDivElement, Omit<GlassCardProps, 'interactive'>>(
  function InteractiveCard(props, ref) {
    return <GlassCard ref={ref} interactive {...props} />;
  }
));

InteractiveCard.displayName = 'InteractiveCard';

/**
 * OverlayPanel - For modals, drawers, popovers
 */
export const OverlayPanel = memo(forwardRef<HTMLDivElement, Omit<GlassCardProps, 'variant'>>(
  function OverlayPanel(props, ref) {
    return <GlassCard ref={ref} variant="overlay" padding="lg" {...props} />;
  }
));

OverlayPanel.displayName = 'OverlayPanel';

// =============================================================================
// EXPORTS
// =============================================================================

export default GlassCard;
