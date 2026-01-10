/**
 * AnimatedValue - Animate numeric value changes with spring physics
 * @module components/underwrite/motion/AnimatedValue
 * @slice 19 of 22
 *
 * Smoothly animates between number values using spring physics.
 * Respects prefers-reduced-motion via useMotion hook.
 *
 * Accessibility (WCAG 2.1 AA):
 * - Respects prefers-reduced-motion
 * - Tabular nums for stable layout
 * - aria-live for screen reader updates
 *
 * Principles Applied:
 * - Motion: Spring physics for natural feel
 * - Performance: GPU-accelerated opacity
 * - Accessibility: Reduced motion support
 */

'use client';

import * as React from 'react';
import { motion, useSpring, AnimatePresence } from 'framer-motion';
import { cn, useMotion } from '../utils';
import { valueChangeVariants } from './animations';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface AnimatedValueProps {
  /** Current numeric value */
  value: number;
  /** Format function (default: toLocaleString) */
  format?: (value: number) => string;
  /** Prefix (e.g., "$") */
  prefix?: string;
  /** Suffix (e.g., "%") */
  suffix?: string;
  /** Spring stiffness (default: 100) */
  stiffness?: number;
  /** Spring damping (default: 30) */
  damping?: number;
  /** Optional className */
  className?: string;
  /** aria-live behavior for screen readers */
  ariaLive?: 'polite' | 'assertive' | 'off';
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function AnimatedValue({
  value,
  format = (v) => v.toLocaleString(),
  prefix = '',
  suffix = '',
  stiffness = 100,
  damping = 30,
  className,
  ariaLive = 'polite',
}: AnimatedValueProps): React.JSX.Element {
  const { isReduced } = useMotion();
  const [displayValue, setDisplayValue] = React.useState(value);

  // Spring-animated motion value
  const springValue = useSpring(value, {
    stiffness,
    damping,
  });

  // Update display value when spring changes
  React.useEffect(() => {
    // Instant update for reduced motion
    if (isReduced) {
      setDisplayValue(value);
      return;
    }

    // Animate spring to new value
    springValue.set(value);

    // Subscribe to spring changes
    const unsubscribe = springValue.on('change', (latest) => {
      // Round to avoid flickering decimals
      setDisplayValue(Math.round(latest));
    });

    return unsubscribe;
  }, [value, isReduced, springValue]);

  // Format the display value
  const formattedValue = React.useMemo(() => {
    // Guard against NaN/Infinity
    if (!Number.isFinite(displayValue)) {
      return format(0);
    }
    return format(displayValue);
  }, [displayValue, format]);

  // ─────────────────────────────────────────────────────────────────────────────
  // REDUCED MOTION: Instant update, no animation
  // ─────────────────────────────────────────────────────────────────────────────

  if (isReduced) {
    return (
      <span className={cn('tabular-nums', className)} aria-live={ariaLive}>
        {prefix}
        {formattedValue}
        {suffix}
      </span>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // ANIMATED: Spring physics + fade transition
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <span className={cn('tabular-nums inline-flex', className)} aria-live={ariaLive}>
      {prefix && <span>{prefix}</span>}
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={displayValue}
          variants={valueChangeVariants}
          initial="initial"
          animate="enter"
          exit="exit"
        >
          {formattedValue}
        </motion.span>
      </AnimatePresence>
      {suffix && <span>{suffix}</span>}
    </span>
  );
}

AnimatedValue.displayName = 'AnimatedValue';
