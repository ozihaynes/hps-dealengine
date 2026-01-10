/**
 * SystemRULBar - Remaining Useful Life progress bar
 * @module components/underwrite/visualizations/SystemRULBar
 * @slice 22 of 22
 *
 * Visual progress bar showing remaining useful life for a property system.
 * Displays condition badge, years remaining, and installation info.
 *
 * Accessibility (WCAG 2.1 AA):
 * - role="progressbar" with aria-valuenow, valuemin, valuemax
 * - aria-label with descriptive text
 * - Color not sole indicator (text labels included)
 * - Respects prefers-reduced-motion
 *
 * Principles Applied:
 * - Visual Hierarchy: Condition badge prominent
 * - Motion: Framer Motion animation (GPU-safe)
 * - Defensive: NaN/null guards
 */

'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { cn, colors, useMotion } from '../utils';
import type { SystemScore, SystemCondition } from '@hps-internal/contracts';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface SystemRULBarProps {
  /** System name for display (e.g., "Roof", "HVAC") */
  name: string;
  /** System score data from engine */
  score: SystemScore;
  /** Optional className */
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONDITION COLORS
// ═══════════════════════════════════════════════════════════════════════════════

interface ConditionStyle {
  bar: string;
  text: string;
  badge: string;
}

const CONDITION_STYLES: Record<SystemCondition, ConditionStyle> = {
  good: {
    bar: 'bg-emerald-500',
    text: 'text-emerald-400',
    badge: 'bg-emerald-500/20 text-emerald-400',
  },
  fair: {
    bar: 'bg-blue-500',
    text: 'text-blue-400',
    badge: 'bg-blue-500/20 text-blue-400',
  },
  poor: {
    bar: 'bg-amber-500',
    text: 'text-amber-400',
    badge: 'bg-amber-500/20 text-amber-400',
  },
  critical: {
    bar: 'bg-red-500',
    text: 'text-red-400',
    badge: 'bg-red-500/20 text-red-400',
  },
} as const;

// Default styles for unknown condition
const DEFAULT_CONDITION_STYLE: ConditionStyle = {
  bar: 'bg-slate-500',
  text: 'text-slate-400',
  badge: 'bg-slate-500/20 text-slate-400',
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function SystemRULBar({
  name,
  score,
  className,
}: SystemRULBarProps): React.JSX.Element {
  const { isReduced } = useMotion();

  // ─────────────────────────────────────────────────────────────────────────────
  // UNKNOWN STATE
  // ─────────────────────────────────────────────────────────────────────────────

  // Handle null/unknown values
  if (score.remaining_years === null || score.condition === null) {
    return (
      <div
        className={cn('space-y-2', className)}
        role="progressbar"
        aria-valuenow={0}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${name}: Unknown status`}
      >
        <div className="flex items-center justify-between">
          <span className={cn('text-sm font-medium', colors.text.secondary)}>
            {name}
          </span>
          <span className={cn('text-xs', colors.text.muted)}>Unknown</span>
        </div>
        <div className="h-2 bg-slate-800 rounded-full" aria-hidden="true" />
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // EXTRACT VALUES WITH SAFE DEFAULTS
  // ─────────────────────────────────────────────────────────────────────────────

  const {
    remaining_years,
    expected_life,
    condition,
    age,
    needs_replacement,
    year_installed,
  } = score;

  // Safe numbers (guard NaN/Infinity)
  const safeRemaining = Number.isFinite(remaining_years) ? remaining_years : 0;
  const safeExpectedLife =
    Number.isFinite(expected_life) && expected_life > 0 ? expected_life : 1;
  const safeAge = age !== null && Number.isFinite(age) ? age : null;

  // Condition with fallback
  const isValidCondition = (c: string): c is SystemCondition =>
    c === 'good' || c === 'fair' || c === 'poor' || c === 'critical';

  const conditionStyle = isValidCondition(condition)
    ? CONDITION_STYLES[condition]
    : DEFAULT_CONDITION_STYLE;

  // Calculate percentage (0-100)
  const percentage = Math.min(
    100,
    Math.max(0, (safeRemaining / safeExpectedLife) * 100)
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // ANIMATION CONFIG
  // ─────────────────────────────────────────────────────────────────────────────

  const animationDuration = isReduced ? 0 : 0.5;

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div
      role="progressbar"
      aria-valuenow={safeRemaining}
      aria-valuemin={0}
      aria-valuemax={safeExpectedLife}
      aria-label={`${name}: ${safeRemaining} years remaining of ${safeExpectedLife} year expected life, condition ${condition}`}
      className={cn('space-y-2', className)}
    >
      {/* ───────────────────────────────────────────────────────────────────────
          HEADER
      ─────────────────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={cn('text-sm font-medium', colors.text.secondary)}>
            {name}
          </span>
          <span
            className={cn(
              'px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider',
              conditionStyle.badge
            )}
          >
            {condition}
          </span>
        </div>
        <div className="text-right">
          <span
            className={cn(
              'text-sm font-medium tabular-nums',
              conditionStyle.text
            )}
          >
            {safeRemaining} yr
          </span>
          <span className={cn('text-xs ml-1', colors.text.muted)}>
            / {safeExpectedLife} yr
          </span>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────────────────
          PROGRESS BAR
      ─────────────────────────────────────────────────────────────────────── */}
      <div
        className="relative h-2 bg-slate-800 rounded-full overflow-hidden"
        aria-hidden="true"
      >
        <motion.div
          className={cn(
            'absolute inset-y-0 left-0 rounded-full',
            conditionStyle.bar
          )}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{
            duration: animationDuration,
            ease: 'easeOut',
          }}
        />
      </div>

      {/* ───────────────────────────────────────────────────────────────────────
          DETAILS
      ─────────────────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <span className={cn('text-xs', colors.text.muted)}>
          {year_installed !== null
            ? `Installed ${year_installed}`
            : 'Install date unknown'}
          {safeAge !== null && ` (${safeAge} years old)`}
        </span>
        {needs_replacement && (
          <span className={cn('text-xs font-medium', colors.text.error)}>
            Needs replacement
          </span>
        )}
      </div>
    </div>
  );
}

SystemRULBar.displayName = 'SystemRULBar';
