/**
 * LoadingSpinner - Animated loading indicator
 * @module components/underwrite/states/LoadingSpinner
 * @slice 20 of 22
 *
 * Spinner with optional label for loading states.
 * Respects prefers-reduced-motion via useMotion hook.
 *
 * Accessibility (WCAG 2.1 AA):
 * - role="status" for loading semantics
 * - aria-label for screen readers
 * - sr-only text for screen readers
 * - Respects prefers-reduced-motion
 *
 * Principles Applied:
 * - Loading UX: Visual and text feedback
 * - Motion: GPU-safe rotation
 * - Accessibility: Reduced motion support
 */

'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { cn, colors, useMotion } from '../utils';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface LoadingSpinnerProps {
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Loading text (shown visually) */
  label?: string;
  /** Optional className */
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SIZE CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

const SIZE_STYLES = {
  sm: {
    icon: 'w-4 h-4',
    text: 'text-xs',
  },
  md: {
    icon: 'w-6 h-6',
    text: 'text-sm',
  },
  lg: {
    icon: 'w-8 h-8',
    text: 'text-base',
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function LoadingSpinner({
  size = 'md',
  label,
  className,
}: LoadingSpinnerProps): React.JSX.Element {
  const { isReduced } = useMotion();
  const styles = SIZE_STYLES[size];
  const ariaLabel = label ?? 'Loading';

  return (
    <div
      role="status"
      aria-label={ariaLabel}
      className={cn('inline-flex items-center gap-2', className)}
    >
      {/* Spinner icon */}
      {isReduced ? (
        // Static icon for reduced motion
        <Loader2
          className={cn(styles.icon, 'text-emerald-500')}
          aria-hidden="true"
        />
      ) : (
        // Animated spinner
        <motion.div
          animate={{ rotate: 360 }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: 'linear',
          }}
        >
          <Loader2
            className={cn(styles.icon, 'text-emerald-500')}
            aria-hidden="true"
          />
        </motion.div>
      )}

      {/* Visible label */}
      {label && (
        <span className={cn(styles.text, colors.text.muted)}>{label}</span>
      )}

      {/* Screen reader text (always present) */}
      <span className="sr-only">{ariaLabel}</span>
    </div>
  );
}

LoadingSpinner.displayName = 'LoadingSpinner';
