/**
 * ForeclosureTimelineViz - Horizontal FL foreclosure timeline
 * @module components/underwrite/visualizations/ForeclosureTimelineViz
 * @slice 16 of 22
 *
 * Visual timeline showing the current position in Florida's foreclosure process.
 * Uses FL statute references for each stage.
 *
 * Florida Statutes Referenced:
 * - FL 702.10: Lis Pendens (notice of pending litigation)
 * - FL 45.031: Judicial Sale Requirements
 * - FL 45.0315: Right of Redemption
 *
 * Accessibility (WCAG 2.1 AA):
 * - role="progressbar" for semantic progress element
 * - aria-valuenow, valuemin, valuemax for screen readers
 * - aria-label with descriptive text
 * - Respects prefers-reduced-motion
 *
 * Principles Applied:
 * - Motion: Framer Motion animation (GPU-safe)
 * - Accessibility: POUR principles
 * - FL Law: Statute references on stages
 */

'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Clock, CheckCircle2, Home } from 'lucide-react';
import { cn, card, colors, typography, useMotion } from '../utils';
import type { ForeclosureTimelineOutput } from '@/lib/engine';
import type { TimelinePosition, UrgencyLevel } from '@hps-internal/contracts';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface ForeclosureTimelineVizProps {
  /** Output from computeForeclosureTimeline engine function */
  output: ForeclosureTimelineOutput | null;
  /** Optional className */
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STAGE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

interface TimelineStage {
  id: TimelinePosition;
  label: string;
  shortLabel: string;
  statuteRef: string;
  description: string;
}

/**
 * FL Foreclosure stages with statute references.
 * Order matches the legal progression of foreclosure in Florida.
 * Uses TimelinePosition from contracts (7 stages total).
 */
const STAGES: TimelineStage[] = [
  {
    id: 'not_in_foreclosure',
    label: 'Not in Foreclosure',
    shortLabel: 'OK',
    statuteRef: '',
    description: 'Property is current on payments',
  },
  {
    id: 'pre_foreclosure',
    label: 'Pre-Foreclosure',
    shortLabel: 'Pre',
    statuteRef: 'FL 702.10(1)',
    description: 'Missed payments, demand letter sent',
  },
  {
    id: 'lis_pendens',
    label: 'Lis Pendens Filed',
    shortLabel: 'LP',
    statuteRef: 'FL 702.10(2)',
    description: 'Lawsuit filed, notice recorded',
  },
  {
    id: 'judgment',
    label: 'Judgment Entered',
    shortLabel: 'Judg',
    statuteRef: 'FL 45.031',
    description: 'Court has ruled for foreclosure',
  },
  {
    id: 'sale_scheduled',
    label: 'Sale Scheduled',
    shortLabel: 'Sale',
    statuteRef: 'FL 45.031(1)',
    description: 'Auction date has been set',
  },
  {
    id: 'redemption_period',
    label: 'Redemption Period',
    shortLabel: 'Redm',
    statuteRef: 'FL 45.0315',
    description: 'Post-sale right of redemption (10 days)',
  },
  {
    id: 'reo_bank_owned',
    label: 'REO Bank Owned',
    shortLabel: 'REO',
    statuteRef: '',
    description: 'Bank has taken ownership',
  },
] as const;

// ═══════════════════════════════════════════════════════════════════════════════
// URGENCY COLORS
// ═══════════════════════════════════════════════════════════════════════════════

interface UrgencyStyle {
  bg: string;
  text: string;
  fill: string;
}

const URGENCY_STYLES: Record<UrgencyLevel, UrgencyStyle> = {
  none: {
    bg: 'bg-emerald-500/20',
    text: 'text-emerald-400',
    fill: 'bg-emerald-500',
  },
  low: {
    bg: 'bg-slate-500/20',
    text: 'text-slate-400',
    fill: 'bg-slate-500',
  },
  medium: {
    bg: 'bg-blue-500/20',
    text: 'text-blue-400',
    fill: 'bg-blue-500',
  },
  high: {
    bg: 'bg-amber-500/20',
    text: 'text-amber-400',
    fill: 'bg-amber-500',
  },
  critical: {
    bg: 'bg-red-500/20',
    text: 'text-red-400',
    fill: 'bg-red-500',
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function ForeclosureTimelineViz({
  output,
  className,
}: ForeclosureTimelineVizProps): React.JSX.Element {
  const { isReduced } = useMotion();

  // ─────────────────────────────────────────────────────────────────────────────
  // EXTRACT VALUES WITH SAFE DEFAULTS
  // ─────────────────────────────────────────────────────────────────────────────

  // Map the engine's timeline_position to our stage index
  const currentPosition = output?.timeline_position ?? 'not_in_foreclosure';
  const currentIndex = STAGES.findIndex((s) => s.id === currentPosition);
  const safeIndex = currentIndex >= 0 ? currentIndex : 0;

  // Urgency level with fallback
  const rawUrgency = output?.urgency_level ?? 'none';
  const urgencyLevel: UrgencyLevel =
    rawUrgency in URGENCY_STYLES ? rawUrgency : 'none';
  const urgencyStyle = URGENCY_STYLES[urgencyLevel];

  // Days until sale (guard against NaN/undefined)
  const rawDays = output?.days_until_estimated_sale;
  const daysUntilSale =
    rawDays !== null && rawDays !== undefined && Number.isFinite(rawDays)
      ? rawDays
      : null;

  // Calculate progress percentage (0-100)
  const totalStages = STAGES.length;
  const progressPercent =
    totalStages > 1 ? (safeIndex / (totalStages - 1)) * 100 : 0;

  // Current stage info
  const currentStage = STAGES[safeIndex];

  // Statute reference (prefer from output, fallback to stage definition)
  const statuteRef = output?.statute_reference ?? currentStage.statuteRef;

  // ─────────────────────────────────────────────────────────────────────────────
  // ANIMATION CONFIG
  // ─────────────────────────────────────────────────────────────────────────────

  const animationDuration = isReduced ? 0 : 0.5;
  const pulseAnimation = isReduced
    ? {}
    : {
        scale: [1, 1.15, 1],
        transition: {
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeInOut' as const,
        },
      };

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div
      role="progressbar"
      aria-valuenow={safeIndex + 1}
      aria-valuemin={1}
      aria-valuemax={totalStages}
      aria-label={`Foreclosure timeline: ${currentStage.label}, stage ${safeIndex + 1} of ${totalStages}`}
      className={cn(card.base, 'p-6', className)}
    >
      {/* ───────────────────────────────────────────────────────────────────────
          HEADER
      ─────────────────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <h3 className={cn(typography.h4, colors.text.primary)}>
          Foreclosure Timeline
        </h3>

        {/* Days until sale badge */}
        {daysUntilSale !== null && (
          <div
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-full',
              urgencyStyle.bg,
              urgencyStyle.text
            )}
          >
            {urgencyLevel === 'critical' ? (
              <AlertTriangle className="w-4 h-4" aria-hidden="true" />
            ) : (
              <Clock className="w-4 h-4" aria-hidden="true" />
            )}
            <span className="text-sm font-medium tabular-nums">
              {daysUntilSale >= 0
                ? `${daysUntilSale} days until sale`
                : `${Math.abs(daysUntilSale)} days past sale`}
            </span>
          </div>
        )}
      </div>

      {/* ───────────────────────────────────────────────────────────────────────
          TIMELINE TRACK
      ─────────────────────────────────────────────────────────────────────── */}
      <div className="relative">
        {/* Background track */}
        <div
          className="absolute top-4 left-0 right-0 h-1 bg-slate-700 rounded-full"
          aria-hidden="true"
        />

        {/* Progress fill (animated) */}
        <motion.div
          className={cn(
            'absolute top-4 left-0 h-1 rounded-full origin-left',
            urgencyStyle.fill
          )}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: progressPercent / 100 }}
          transition={{
            duration: animationDuration,
            ease: 'easeOut',
          }}
          style={{ width: '100%' }}
          aria-hidden="true"
        />

        {/* Stage markers */}
        <div className="relative flex justify-between">
          {STAGES.map((stage, index) => {
            const isPast = index < safeIndex;
            const isCurrent = index === safeIndex;
            const isFuture = index > safeIndex;
            const isReo = stage.id === 'reo_bank_owned';

            return (
              <div
                key={stage.id}
                className="flex flex-col items-center"
                style={{ width: `${100 / totalStages}%` }}
              >
                {/* Marker dot */}
                <motion.div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center',
                    'border-2 z-10',
                    isPast && 'bg-emerald-500 border-emerald-500',
                    isCurrent && cn(urgencyStyle.fill, 'border-white'),
                    isFuture && 'bg-slate-800 border-slate-600'
                  )}
                  animate={isCurrent ? pulseAnimation : {}}
                >
                  {isPast && (
                    <CheckCircle2
                      className="w-4 h-4 text-white"
                      aria-hidden="true"
                    />
                  )}
                  {isCurrent && !isReo && (
                    <span className="text-xs font-bold text-white">
                      {index + 1}
                    </span>
                  )}
                  {isCurrent && isReo && (
                    <Home className="w-4 h-4 text-white" aria-hidden="true" />
                  )}
                  {isFuture && !isReo && (
                    <span className="text-xs text-slate-500">{index + 1}</span>
                  )}
                  {isFuture && isReo && (
                    <Home className="w-4 h-4 text-slate-500" aria-hidden="true" />
                  )}
                </motion.div>

                {/* Label */}
                <div className="mt-3 text-center">
                  <span
                    className={cn(
                      'block text-xs font-medium',
                      isPast && colors.text.success,
                      isCurrent && colors.text.primary,
                      isFuture && colors.text.muted
                    )}
                  >
                    {stage.shortLabel}
                  </span>
                  {stage.statuteRef && (
                    <span
                      className={cn(
                        'block text-[10px] mt-0.5',
                        colors.text.muted
                      )}
                    >
                      {stage.statuteRef}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────────────────
          CURRENT STAGE DETAIL
      ─────────────────────────────────────────────────────────────────────── */}
      <div className="mt-6 pt-4 border-t border-slate-700/50">
        <div className="flex items-center justify-between">
          <div>
            <span className={cn('text-sm', colors.text.muted)}>
              Current Stage:{' '}
            </span>
            <span className={cn('text-sm font-medium', colors.text.primary)}>
              {currentStage.label}
            </span>
          </div>
          {statuteRef && (
            <span className={cn('text-xs', colors.text.muted)}>
              {statuteRef}
            </span>
          )}
        </div>

        {/* Description */}
        <p className={cn('text-xs mt-1', colors.text.secondary)}>
          {currentStage.description}
        </p>

        {/* Auction date source (if available) */}
        {output?.auction_date_source &&
          output.auction_date_source !== 'unknown' && (
            <p className={cn('text-xs mt-2', colors.text.muted)}>
              Auction date source:{' '}
              {output.auction_date_source.replace(/_/g, ' ')}
            </p>
          )}
      </div>
    </div>
  );
}

ForeclosureTimelineViz.displayName = 'ForeclosureTimelineViz';
