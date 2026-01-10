/**
 * HeroPlaceholder - Shown before analysis runs
 * @module components/underwrite/hero/HeroPlaceholder
 * @slice 05 of 22
 *
 * Principles Applied:
 * - Accessibility: role="status" for screen reader announcements
 * - Motion: Respects prefers-reduced-motion
 * - Design: Matches glassmorphic card style from design tokens
 */

'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { Calculator } from 'lucide-react';
import { cn, card, useMotion } from '../utils';

export interface HeroPlaceholderProps {
  /** Optional className for customization */
  className?: string;
}

/**
 * Placeholder component shown before analysis completes.
 * Provides visual feedback that the hero area is ready for results.
 */
export function HeroPlaceholder({
  className,
}: HeroPlaceholderProps): React.JSX.Element {
  const { isReduced, getDurationSeconds } = useMotion();

  return (
    <motion.div
      role="status"
      aria-label="Awaiting analysis"
      aria-live="polite"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: getDurationSeconds(200) }}
      data-testid="hero-placeholder"
      className={cn(
        card.base,
        'p-8',
        'flex flex-col items-center justify-center',
        'min-h-[200px]',
        className
      )}
    >
      {/* Icon container */}
      <div
        className={cn(
          'flex items-center justify-center',
          'w-16 h-16 rounded-full',
          'bg-slate-800/50',
          'mb-4'
        )}
      >
        <Calculator
          className="w-8 h-8 text-slate-400"
          aria-hidden="true"
        />
      </div>

      {/* Title */}
      <h2 className="text-lg font-semibold text-white mb-2">
        Ready to Analyze
      </h2>

      {/* Description */}
      <p className="text-sm text-slate-400 text-center max-w-md">
        Complete the form sections below to generate underwriting outputs.
        Results will appear here automatically.
      </p>

      {/* Subtle loading indicator */}
      {!isReduced && (
        <div className="mt-6 flex space-x-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full bg-slate-600"
              animate={{
                opacity: [0.3, 1, 0.3],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.2,
              }}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}

HeroPlaceholder.displayName = 'HeroPlaceholder';
