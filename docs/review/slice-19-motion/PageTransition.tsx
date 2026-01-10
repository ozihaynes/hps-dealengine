/**
 * PageTransition - Animate page/section enter and exit
 * @module components/underwrite/motion/PageTransition
 * @slice 19 of 22
 *
 * Wrapper component that animates children on mount/unmount.
 * Respects prefers-reduced-motion via useMotion hook.
 *
 * Accessibility (WCAG 2.1 AA):
 * - Respects prefers-reduced-motion
 * - No flash of unstyled content
 *
 * Principles Applied:
 * - Motion: Page transitions feel intentional
 * - Performance: GPU-accelerated transforms
 * - Accessibility: Reduced motion support
 */

'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMotion } from '../utils';
import { pageVariants, fadeVariants } from './animations';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface PageTransitionProps {
  /** Unique key for AnimatePresence (triggers animation on change) */
  pageKey?: string;
  /** Content to animate */
  children: React.ReactNode;
  /** Variant to use: 'page' (default) or 'fade' */
  variant?: 'page' | 'fade';
  /** Optional className */
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// VARIANT MAP
// ═══════════════════════════════════════════════════════════════════════════════

const VARIANT_MAP = {
  page: pageVariants,
  fade: fadeVariants,
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function PageTransition({
  pageKey,
  children,
  variant = 'page',
  className,
}: PageTransitionProps): React.JSX.Element {
  const { isReduced } = useMotion();

  // ─────────────────────────────────────────────────────────────────────────────
  // REDUCED MOTION: No animation, render immediately
  // ─────────────────────────────────────────────────────────────────────────────

  if (isReduced) {
    return <div className={className}>{children}</div>;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // ANIMATED: Page enter/exit
  // ─────────────────────────────────────────────────────────────────────────────

  const variants = VARIANT_MAP[variant];

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pageKey}
        variants={variants}
        initial="initial"
        animate="enter"
        exit="exit"
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

PageTransition.displayName = 'PageTransition';
