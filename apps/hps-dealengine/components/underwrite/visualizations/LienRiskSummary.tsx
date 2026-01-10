/**
 * LienRiskSummary - Visual summary of lien exposure
 * @module components/underwrite/visualizations/LienRiskSummary
 * @slice 17 of 22
 *
 * Visual card showing lien exposure with stacked bar visualization,
 * blocking threshold indicator, and FL joint liability warnings.
 *
 * Florida Statutes Referenced:
 * - FL 720.3085: Joint liability for HOA/CDD assessments
 *
 * Accessibility (WCAG 2.1 AA):
 * - Semantic structure with headings
 * - aria-hidden on decorative icons
 * - Color not sole indicator (text labels included)
 * - Respects prefers-reduced-motion
 *
 * Principles Applied:
 * - Visual Hierarchy: Total prominent, breakdown secondary
 * - Motion: Framer Motion animation (GPU-safe)
 * - FL Law: Joint liability warning
 */

'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Shield, DollarSign } from 'lucide-react';
import { cn, card, colors, typography, useMotion } from '../utils';
import {
  LIEN_BLOCKING_THRESHOLD,
  type LienRiskOutput,
  type LienRiskLevel,
  type LienBreakdown,
} from '@/lib/engine';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface LienRiskSummaryProps {
  /** Output from computeLienRisk engine function */
  output: LienRiskOutput | null;
  /** Optional className */
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CATEGORY COLORS - Keys match LienBreakdown interface exactly
// ═══════════════════════════════════════════════════════════════════════════════

interface CategoryStyle {
  bg: string;
  text: string;
  label: string;
}

const CATEGORY_STYLES: Record<keyof LienBreakdown, CategoryStyle> = {
  hoa: {
    bg: 'bg-purple-500',
    text: 'text-purple-400',
    label: 'HOA',
  },
  cdd: {
    bg: 'bg-blue-500',
    text: 'text-blue-400',
    label: 'CDD',
  },
  property_tax: {
    bg: 'bg-amber-500',
    text: 'text-amber-400',
    label: 'Tax',
  },
  municipal: {
    bg: 'bg-red-500',
    text: 'text-red-400',
    label: 'Municipal',
  },
} as const;

// Order for stacking (consistent display)
const CATEGORY_ORDER: (keyof LienBreakdown)[] = [
  'hoa',
  'cdd',
  'property_tax',
  'municipal',
];

// ═══════════════════════════════════════════════════════════════════════════════
// RISK LEVEL COLORS
// ═══════════════════════════════════════════════════════════════════════════════

interface RiskStyle {
  border: string;
  text: string;
  bg: string;
}

const RISK_STYLES: Record<LienRiskLevel, RiskStyle> = {
  low: {
    border: 'border-emerald-500',
    text: 'text-emerald-400',
    bg: 'bg-emerald-500/20',
  },
  medium: {
    border: 'border-blue-500',
    text: 'text-blue-400',
    bg: 'bg-blue-500/20',
  },
  high: {
    border: 'border-amber-500',
    text: 'text-amber-400',
    bg: 'bg-amber-500/20',
  },
  critical: {
    border: 'border-red-500',
    text: 'text-red-400',
    bg: 'bg-red-500/20',
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function LienRiskSummary({
  output,
  className,
}: LienRiskSummaryProps): React.JSX.Element {
  const { isReduced } = useMotion();

  // ─────────────────────────────────────────────────────────────────────────────
  // EMPTY STATE
  // ─────────────────────────────────────────────────────────────────────────────

  if (!output) {
    return (
      <div
        className={cn(card.base, 'p-6', className)}
        role="region"
        aria-label="Lien risk summary - no data available"
      >
        <div className="text-center">
          <DollarSign
            className={cn('w-8 h-8 mx-auto mb-2', colors.text.muted)}
            aria-hidden="true"
          />
          <p className={cn('text-sm', colors.text.muted)}>
            No lien data available
          </p>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // EXTRACT VALUES WITH SAFE DEFAULTS
  // ─────────────────────────────────────────────────────────────────────────────

  const {
    total_surviving_liens,
    risk_level,
    breakdown,
    joint_liability_warning,
    blocking_gate_triggered,
    evidence_needed,
  } = output;

  // Safe total (guard NaN/Infinity)
  const safeTotal = Number.isFinite(total_surviving_liens)
    ? total_surviving_liens
    : 0;

  // Risk level with fallback
  const safeRiskLevel: LienRiskLevel =
    risk_level in RISK_STYLES ? risk_level : 'low';
  const riskStyle = RISK_STYLES[safeRiskLevel];

  // ─────────────────────────────────────────────────────────────────────────────
  // BAR CALCULATIONS
  // ─────────────────────────────────────────────────────────────────────────────

  // Max display value (at least 2x threshold for good visualization)
  const maxDisplay = Math.max(safeTotal, LIEN_BLOCKING_THRESHOLD * 2);

  // Blocking threshold position (percentage)
  const blockingPosition =
    maxDisplay > 0 ? (LIEN_BLOCKING_THRESHOLD / maxDisplay) * 100 : 50;

  // Build stacked segments from breakdown in consistent order
  const segments = CATEGORY_ORDER.map((key) => {
    const value = breakdown[key];
    const safeValue = Number.isFinite(value) && value > 0 ? value : 0;
    const categoryStyle = CATEGORY_STYLES[key];
    return {
      key,
      value: safeValue,
      width: maxDisplay > 0 ? (safeValue / maxDisplay) * 100 : 0,
      ...categoryStyle,
    };
  }).filter((segment) => segment.value > 0);

  // ─────────────────────────────────────────────────────────────────────────────
  // ANIMATION CONFIG
  // ─────────────────────────────────────────────────────────────────────────────

  const animationDuration = isReduced ? 0 : 0.5;

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div
      className={cn(card.base, 'p-6', className)}
      role="region"
      aria-label={`Lien risk summary: $${safeTotal.toLocaleString()} total, ${safeRiskLevel} risk`}
    >
      {/* ───────────────────────────────────────────────────────────────────────
          HEADER
      ─────────────────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <h3
          className={cn(
            typography.h4,
            colors.text.primary,
            'flex items-center gap-2'
          )}
        >
          <DollarSign className="w-5 h-5" aria-hidden="true" />
          Lien Exposure
        </h3>
        <span
          className={cn(
            'px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider',
            riskStyle.bg,
            riskStyle.text
          )}
        >
          {safeRiskLevel} Risk
        </span>
      </div>

      {/* ───────────────────────────────────────────────────────────────────────
          TOTAL AMOUNT
      ─────────────────────────────────────────────────────────────────────── */}
      <div className="mb-4">
        <span
          className={cn(
            'text-3xl font-bold tabular-nums',
            blocking_gate_triggered ? colors.text.error : riskStyle.text
          )}
        >
          ${safeTotal.toLocaleString()}
        </span>
        <span className={cn('ml-2 text-sm', colors.text.muted)}>
          total liens
        </span>
      </div>

      {/* ───────────────────────────────────────────────────────────────────────
          STACKED BAR
      ─────────────────────────────────────────────────────────────────────── */}
      <div className="relative h-8 bg-slate-800 rounded-lg overflow-hidden mb-2">
        {/* Stacked segments */}
        <div className="absolute inset-0 flex" aria-hidden="true">
          {segments.map((segment, index) => (
            <motion.div
              key={segment.key}
              className={cn(segment.bg, 'h-full')}
              initial={{ width: 0 }}
              animate={{ width: `${segment.width}%` }}
              transition={{
                duration: animationDuration,
                delay: isReduced ? 0 : index * 0.1,
                ease: 'easeOut',
              }}
            />
          ))}
        </div>

        {/* Blocking threshold line */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white/60 z-10"
          style={{ left: `${blockingPosition}%` }}
          aria-hidden="true"
        >
          <div className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap">
            <span className={cn('text-[10px]', colors.text.muted)}>
              ${(LIEN_BLOCKING_THRESHOLD / 1000).toFixed(0)}K threshold
            </span>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────────────────
          LEGEND
      ─────────────────────────────────────────────────────────────────────── */}
      {segments.length > 0 && (
        <div className="flex flex-wrap gap-3 mb-4">
          {segments.map((segment) => (
            <div key={segment.key} className="flex items-center gap-1.5">
              <div
                className={cn('w-3 h-3 rounded', segment.bg)}
                aria-hidden="true"
              />
              <span className={cn('text-xs', colors.text.secondary)}>
                {segment.label}: ${segment.value.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────
          WARNINGS
      ─────────────────────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        {/* Joint Liability Warning */}
        {joint_liability_warning && (
          <div
            className={cn(
              'flex items-start gap-2 p-3 rounded-lg',
              'bg-amber-500/10 border border-amber-500/30'
            )}
            role="alert"
          >
            <AlertTriangle
              className={cn('w-4 h-4 mt-0.5 shrink-0', colors.text.warning)}
              aria-hidden="true"
            />
            <div>
              <span className={cn('text-sm font-medium', colors.text.warning)}>
                FL 720.3085 Joint Liability
              </span>
              <p className={cn('text-xs mt-0.5', 'text-amber-400/80')}>
                Buyer becomes jointly liable for unpaid HOA/CDD assessments at
                closing
              </p>
            </div>
          </div>
        )}

        {/* Blocking Gate Alert */}
        {blocking_gate_triggered && (
          <div
            className={cn(
              'flex items-start gap-2 p-3 rounded-lg',
              'bg-red-500/10 border border-red-500/30'
            )}
            role="alert"
          >
            <Shield
              className={cn('w-4 h-4 mt-0.5 shrink-0', colors.text.error)}
              aria-hidden="true"
            />
            <div>
              <span className={cn('text-sm font-medium', colors.text.error)}>
                Blocking Gate Triggered
              </span>
              <p className={cn('text-xs mt-0.5', 'text-red-400/80')}>
                Total liens exceed ${LIEN_BLOCKING_THRESHOLD.toLocaleString()}{' '}
                threshold. Deal requires lien negotiation or increased discount.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ───────────────────────────────────────────────────────────────────────
          EVIDENCE NEEDED
      ─────────────────────────────────────────────────────────────────────── */}
      {evidence_needed && evidence_needed.length > 0 && (
        <div className="mt-4 pt-3 border-t border-slate-700/50">
          <p className={cn('text-xs', colors.text.muted)}>
            <span className="font-medium">Evidence needed: </span>
            {evidence_needed.join(', ')}
          </p>
        </div>
      )}
    </div>
  );
}

LienRiskSummary.displayName = 'LienRiskSummary';
