/**
 * SystemsStatusCard - Property systems overview card
 * @module components/underwrite/visualizations/SystemsStatusCard
 * @slice 22 of 22
 *
 * Card showing property systems status with RUL progress bars,
 * urgent replacements alert, and total replacement cost.
 *
 * Uses existing SystemRULBar component for individual system displays.
 *
 * Accessibility (WCAG 2.1 AA):
 * - role="region" on container with aria-label
 * - role="alert" on urgent replacements section
 * - aria-hidden on decorative icons
 * - Respects prefers-reduced-motion via SystemRULBar
 *
 * Principles Applied:
 * - Visual Hierarchy: Urgent items highlighted
 * - FL Context: Central Florida replacement costs
 * - Defensive: NaN/null guards, array guards
 */

'use client';

import * as React from 'react';
import { Wrench, AlertTriangle, DollarSign, CheckCircle2 } from 'lucide-react';
import { cn, card, colors, typography } from '../utils';
import { SystemRULBar } from './SystemRULBar';
import type { SystemsStatusOutput } from '@hps-internal/contracts';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface SystemsStatusCardProps {
  /** Output from computeSystemsStatus engine function */
  output: SystemsStatusOutput | null;
  /** Optional className */
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function SystemsStatusCard({
  output,
  className,
}: SystemsStatusCardProps): React.JSX.Element {
  // ─────────────────────────────────────────────────────────────────────────────
  // EMPTY STATE
  // ─────────────────────────────────────────────────────────────────────────────

  if (!output) {
    return (
      <div
        className={cn(card.base, 'p-6', className)}
        role="region"
        aria-label="Property systems - no data available"
      >
        <div className="text-center">
          <Wrench
            className={cn('w-8 h-8 mx-auto mb-2', colors.text.muted)}
            aria-hidden="true"
          />
          <p className={cn('text-sm', colors.text.muted)}>
            No systems data available
          </p>
          <p className={cn('text-xs mt-1', colors.text.muted)}>
            Enter system installation years to see status
          </p>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // EXTRACT VALUES WITH SAFE DEFAULTS
  // ─────────────────────────────────────────────────────────────────────────────

  const { system_scores, urgent_replacements, total_replacement_cost } = output;

  // Safe replacement cost (guard NaN/Infinity)
  const safeTotalCost = Number.isFinite(total_replacement_cost)
    ? total_replacement_cost
    : 0;

  // Safe urgent replacements array
  const safeUrgentReplacements = Array.isArray(urgent_replacements)
    ? urgent_replacements
    : [];

  const hasUrgentReplacements = safeUrgentReplacements.length > 0;

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div
      className={cn(card.base, 'p-6', className)}
      role="region"
      aria-label={`Property systems: ${hasUrgentReplacements ? `${safeUrgentReplacements.length} urgent replacements needed` : 'All systems within expected life'}`}
    >
      {/* ───────────────────────────────────────────────────────────────────────
          HEADER
      ─────────────────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <h3
          className={cn(
            typography.h4,
            colors.text.primary,
            'flex items-center gap-2'
          )}
        >
          <Wrench className="w-5 h-5" aria-hidden="true" />
          Property Systems
        </h3>
        {hasUrgentReplacements && (
          <span
            className={cn(
              'inline-flex items-center gap-1 px-2 py-1 rounded-full',
              'bg-red-500/20 text-red-400 text-xs font-medium'
            )}
          >
            <AlertTriangle className="w-3 h-3" aria-hidden="true" />
            {safeUrgentReplacements.length} urgent
          </span>
        )}
      </div>

      {/* ───────────────────────────────────────────────────────────────────────
          SYSTEM BARS (using existing SystemRULBar component)
      ─────────────────────────────────────────────────────────────────────── */}
      <div className="space-y-6">
        <SystemRULBar name="Roof" score={system_scores.roof} />
        <SystemRULBar name="HVAC" score={system_scores.hvac} />
        <SystemRULBar name="Water Heater" score={system_scores.water_heater} />
      </div>

      {/* ───────────────────────────────────────────────────────────────────────
          URGENT REPLACEMENTS ALERT
      ─────────────────────────────────────────────────────────────────────── */}
      {hasUrgentReplacements && (
        <div
          className={cn(
            'mt-6 p-4 rounded-lg',
            'bg-red-500/10 border border-red-500/30'
          )}
          role="alert"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle
              className={cn('w-5 h-5 shrink-0', colors.text.error)}
              aria-hidden="true"
            />
            <div>
              <h4 className={cn('text-sm font-medium mb-1', colors.text.error)}>
                Urgent Replacements Needed
              </h4>
              <ul className="text-sm text-red-300/80 list-disc list-inside space-y-0.5">
                {safeUrgentReplacements.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────
          ALL SYSTEMS HEALTHY
      ─────────────────────────────────────────────────────────────────────── */}
      {!hasUrgentReplacements && (
        <div
          className={cn(
            'mt-6 p-4 rounded-lg',
            'bg-emerald-500/10 border border-emerald-500/30'
          )}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2
              className={cn('w-5 h-5', colors.text.success)}
              aria-hidden="true"
            />
            <span className={cn('text-sm', colors.text.success)}>
              All major systems within expected life
            </span>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────
          TOTAL REPLACEMENT COST
      ─────────────────────────────────────────────────────────────────────── */}
      {safeTotalCost > 0 && (
        <div className="mt-6 pt-4 border-t border-slate-700/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign
                className={cn('w-4 h-4', colors.text.muted)}
                aria-hidden="true"
              />
              <span className={cn('text-sm', colors.text.muted)}>
                Estimated Replacement Cost
              </span>
            </div>
            <span
              className={cn('text-lg font-bold tabular-nums', colors.text.warning)}
            >
              ${safeTotalCost.toLocaleString()}
            </span>
          </div>
          <p className={cn('text-xs mt-1', colors.text.muted)}>
            Based on average Central Florida replacement costs
          </p>
        </div>
      )}
    </div>
  );
}

SystemsStatusCard.displayName = 'SystemsStatusCard';
