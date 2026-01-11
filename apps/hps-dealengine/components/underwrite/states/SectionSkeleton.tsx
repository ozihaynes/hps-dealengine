/**
 * SectionSkeleton - Loading placeholder for accordion sections
 * @module components/underwrite/states/SectionSkeleton
 *
 * Matches SectionAccordion visual structure for seamless loading UX.
 * Displays during hydration to prevent layout shift.
 *
 * Accessibility (WCAG 2.1 AA):
 * - aria-busy="true" during loading
 * - aria-label for screen readers
 * - Respects prefers-reduced-motion
 */

'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { cn, card, useMotion } from '../utils';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface SectionSkeletonProps {
  /** Section label for accessibility */
  label: string;
  /** Optional className */
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SHIMMER COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

interface ShimmerProps {
  className?: string;
  isReduced: boolean;
}

function Shimmer({ className, isReduced }: ShimmerProps): React.JSX.Element {
  if (isReduced) {
    return (
      <div
        className={cn('bg-slate-700/50 rounded', className)}
        aria-hidden="true"
      />
    );
  }

  return (
    <motion.div
      className={cn(
        'bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800',
        'bg-[length:200%_100%] rounded',
        className
      )}
      animate={{
        backgroundPosition: ['200% 0', '-200% 0'],
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: 'linear',
      }}
      aria-hidden="true"
    />
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function SectionSkeleton({
  label,
  className,
}: SectionSkeletonProps): React.JSX.Element {
  const { isReduced } = useMotion();

  return (
    <div
      aria-busy="true"
      aria-label={`Loading ${label}...`}
      className={cn(card.base, className)}
    >
      {/* Match SectionAccordion header structure */}
      <div className="flex items-center justify-between px-4 py-3">
        {/* Left side: Icon + Title placeholders */}
        <div className="flex items-center gap-3">
          <Shimmer className="w-5 h-5 rounded" isReduced={isReduced} />
          <Shimmer className="h-5 w-32" isReduced={isReduced} />
        </div>

        {/* Right side: Badge + Chevron placeholders */}
        <div className="flex items-center gap-3">
          <Shimmer className="h-5 w-12 rounded-full" isReduced={isReduced} />
          <Shimmer className="w-5 h-5 rounded" isReduced={isReduced} />
        </div>
      </div>
    </div>
  );
}

SectionSkeleton.displayName = 'SectionSkeleton';
