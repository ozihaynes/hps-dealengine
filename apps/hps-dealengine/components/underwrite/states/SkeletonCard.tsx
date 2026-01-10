/**
 * SkeletonCard - Loading placeholder with shimmer animation
 * @module components/underwrite/states/SkeletonCard
 * @slice 20 of 22
 *
 * Card-shaped skeleton loader with animated shimmer effect.
 * Respects prefers-reduced-motion via useMotion hook.
 *
 * Accessibility (WCAG 2.1 AA):
 * - aria-busy="true" during loading
 * - aria-label for screen readers
 * - Respects prefers-reduced-motion
 *
 * Principles Applied:
 * - Loading UX: Visual feedback during async operations
 * - Motion: GPU-safe background animation
 * - Accessibility: Reduced motion support
 */

'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { cn, card, useMotion } from '../utils';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface SkeletonCardProps {
  /** Number of content lines to show (default: 3) */
  lines?: number;
  /** Show header with avatar placeholder (default: true) */
  showHeader?: boolean;
  /** Show action button placeholder (default: false) */
  showAction?: boolean;
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
    // Static placeholder for reduced motion
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

export function SkeletonCard({
  lines = 3,
  showHeader = true,
  showAction = false,
  className,
}: SkeletonCardProps): React.JSX.Element {
  const { isReduced } = useMotion();

  // Clamp lines to reasonable range
  const safeLines = Math.max(1, Math.min(10, lines));

  return (
    <div
      aria-busy="true"
      aria-label="Loading content..."
      className={cn(card.base, 'p-6', className)}
    >
      {/* Header placeholder */}
      {showHeader && (
        <div className="flex items-center gap-3 mb-4">
          <Shimmer className="w-10 h-10 rounded-full" isReduced={isReduced} />
          <div className="flex-1 space-y-2">
            <Shimmer className="h-4 w-32" isReduced={isReduced} />
            <Shimmer className="h-3 w-24" isReduced={isReduced} />
          </div>
        </div>
      )}

      {/* Content lines */}
      <div className="space-y-3">
        {Array.from({ length: safeLines }).map((_, index) => (
          <Shimmer
            key={index}
            className={cn(
              'h-4',
              // Last line is shorter for natural appearance
              index === safeLines - 1 ? 'w-2/3' : 'w-full'
            )}
            isReduced={isReduced}
          />
        ))}
      </div>

      {/* Action placeholder */}
      {showAction && (
        <div className="mt-4 pt-4 border-t border-slate-700/50">
          <Shimmer className="h-10 w-28 rounded-lg" isReduced={isReduced} />
        </div>
      )}
    </div>
  );
}

SkeletonCard.displayName = 'SkeletonCard';
