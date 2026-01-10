/**
 * CompletionBadge - Shows X/Y fields completed with status indicators
 * @module components/underwrite/accordion/CompletionBadge
 * @slice 06 of 22
 *
 * Displays:
 * - Completion fraction (e.g., "3/5")
 * - Visual status (complete, warning, error)
 * - Icon indicator
 */

'use client';

import * as React from 'react';
import { Check, AlertTriangle } from 'lucide-react';
import { cn } from '../utils';

export interface CompletionBadgeProps {
  /** Number of fields completed */
  completed: number;
  /** Total number of fields */
  total: number;
  /** Whether section has errors */
  hasError?: boolean;
  /** Whether section has warnings */
  hasWarning?: boolean;
  /** Optional className */
  className?: string;
}

/**
 * Badge showing completion progress with visual status.
 *
 * @example
 * ```tsx
 * <CompletionBadge completed={3} total={5} />
 * <CompletionBadge completed={5} total={5} /> // Shows checkmark
 * <CompletionBadge completed={2} total={5} hasError /> // Red with warning icon
 * ```
 */
export function CompletionBadge({
  completed,
  total,
  hasError = false,
  hasWarning = false,
  className,
}: CompletionBadgeProps): React.JSX.Element {
  const isComplete = completed === total && total > 0;

  // Determine badge styling based on status
  let badgeClasses = 'bg-slate-700 text-slate-300';
  let IconComponent: typeof Check | typeof AlertTriangle | null = null;

  if (hasError) {
    badgeClasses = 'bg-red-500/20 text-red-400 border border-red-500/30';
    IconComponent = AlertTriangle;
  } else if (hasWarning) {
    badgeClasses = 'bg-amber-500/20 text-amber-400 border border-amber-500/30';
    IconComponent = AlertTriangle;
  } else if (isComplete) {
    badgeClasses = 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
    IconComponent = Check;
  }

  // Build aria-label for screen readers
  const ariaLabel = [
    `${completed} of ${total} fields completed`,
    hasError ? ', has errors' : '',
    hasWarning ? ', has warnings' : '',
    isComplete && !hasError && !hasWarning ? ', section complete' : '',
  ].join('');

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5',
        'px-2 py-0.5 rounded-full',
        'text-xs font-medium',
        badgeClasses,
        className
      )}
      aria-label={ariaLabel}
      role="status"
    >
      {IconComponent && (
        <IconComponent className="w-3 h-3" aria-hidden="true" />
      )}
      <span>
        {completed}/{total}
      </span>
    </div>
  );
}

CompletionBadge.displayName = 'CompletionBadge';
