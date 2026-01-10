/**
 * MotivationScoreGauge - Semi-circular gauge for motivation score
 * @module components/underwrite/visualizations/MotivationScoreGauge
 * @slice 15 of 22
 *
 * A visually appealing SVG-based gauge that displays the seller's
 * motivation score from 0-100 with animated fill and color-coded levels.
 *
 * Accessibility (WCAG 2.1 AA):
 * - role="meter" for semantic meter element
 * - aria-valuenow, valuemin, valuemax for screen readers
 * - aria-label with descriptive text
 * - Respects prefers-reduced-motion
 *
 * Principles Applied:
 * - Motion: Framer Motion spring animation (GPU-safe)
 * - Accessibility: POUR principles, meter semantics
 * - Design Tokens: Semantic colors for levels
 */

'use client';

import * as React from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';
import type { MotivationScoreOutput } from '@hps-internal/contracts';
import { cn, useMotion } from '../utils';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface MotivationScoreGaugeProps {
  /** Motivation score output from engine */
  output: MotivationScoreOutput | null;
  /** Size of the gauge (width = size, height = size/2 + padding) */
  size?: number;
  /** Show confidence indicator */
  showConfidence?: boolean;
  /** Optional className */
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LEVEL COLOR MAPPING
// ═══════════════════════════════════════════════════════════════════════════════

type MotivationLevel = 'low' | 'medium' | 'high' | 'critical';

interface LevelColors {
  stroke: string;
  text: string;
  bg: string;
}

const LEVEL_COLORS: Record<MotivationLevel, LevelColors> = {
  critical: {
    stroke: '#ef4444', // red-500
    text: 'text-red-400',
    bg: 'bg-red-500/20',
  },
  high: {
    stroke: '#f59e0b', // amber-500
    text: 'text-amber-400',
    bg: 'bg-amber-500/20',
  },
  medium: {
    stroke: '#3b82f6', // blue-500
    text: 'text-blue-400',
    bg: 'bg-blue-500/20',
  },
  low: {
    stroke: '#64748b', // slate-500
    text: 'text-slate-400',
    bg: 'bg-slate-500/20',
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// SVG ARC HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Convert polar coordinates to Cartesian.
 * @param cx - Center X coordinate
 * @param cy - Center Y coordinate
 * @param radius - Arc radius
 * @param angleInDegrees - Angle in degrees (0-180 for semi-circle)
 * @returns Cartesian coordinates {x, y}
 */
function polarToCartesian(
  cx: number,
  cy: number,
  radius: number,
  angleInDegrees: number
): { x: number; y: number } {
  const angleInRadians = ((angleInDegrees - 180) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians),
  };
}

/**
 * Create SVG arc path for semi-circle.
 * @param cx - Center X coordinate
 * @param cy - Center Y coordinate
 * @param radius - Arc radius
 * @param startAngle - Start angle in degrees (0-180)
 * @param endAngle - End angle in degrees (0-180)
 * @returns SVG path data string
 */
function createArcPath(
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number
): string {
  // Clamp angles to valid range
  const clampedStart = Math.max(0, Math.min(180, startAngle));
  const clampedEnd = Math.max(0, Math.min(180, endAngle));

  if (clampedEnd <= clampedStart) {
    return ''; // Empty path for invalid range
  }

  const start = polarToCartesian(cx, cy, radius, clampedEnd);
  const end = polarToCartesian(cx, cy, radius, clampedStart);
  const largeArcFlag = clampedEnd - clampedStart > 180 ? 1 : 0;

  return [
    'M',
    start.x,
    start.y,
    'A',
    radius,
    radius,
    0,
    largeArcFlag,
    0,
    end.x,
    end.y,
  ].join(' ');
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function MotivationScoreGauge({
  output,
  size = 200,
  showConfidence = true,
  className,
}: MotivationScoreGaugeProps): React.JSX.Element {
  const { isReduced } = useMotion();

  // Extract values with safe defaults
  const rawScore = output?.motivation_score ?? 0;
  const level: MotivationLevel = output?.motivation_level ?? 'low';
  const confidence = output?.confidence ?? 'low';

  // Guard against NaN/Infinity (defensive programming)
  const safeScore = Number.isFinite(rawScore) ? rawScore : 0;

  // Clamp score to 0-100
  const clampedScore = Math.max(0, Math.min(100, safeScore));

  // Get level colors with fallback for unexpected values
  const levelColors = LEVEL_COLORS[level] ?? LEVEL_COLORS.low;

  // ─────────────────────────────────────────────────────────────────────────────
  // DIMENSIONS
  // ─────────────────────────────────────────────────────────────────────────────

  const width = size;
  const height = size / 2 + 40; // Extra space for labels and badge
  const cx = width / 2;
  const cy = size / 2;
  const radius = size / 2 - 24; // Padding for stroke width
  const strokeWidth = 14;

  // ─────────────────────────────────────────────────────────────────────────────
  // ANIMATION
  // ─────────────────────────────────────────────────────────────────────────────

  const springConfig = { stiffness: 80, damping: 25, mass: 1 };
  const animatedScore = useSpring(0, springConfig);
  const pathLength = useTransform(animatedScore, [0, 100], [0, 1]);

  // Animate score on change (unless reduced motion)
  React.useEffect(() => {
    if (!isReduced) {
      animatedScore.set(clampedScore);
    }
  }, [clampedScore, isReduced, animatedScore]);

  // ─────────────────────────────────────────────────────────────────────────────
  // SVG PATHS
  // ─────────────────────────────────────────────────────────────────────────────

  // Background arc (full semi-circle)
  const bgArcPath = createArcPath(cx, cy, radius, 0, 180);

  // Static foreground arc (for reduced motion)
  const fgArcAngle = (clampedScore / 100) * 180;
  const staticFgArcPath = createArcPath(cx, cy, radius, 0, fgArcAngle);

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div
      role="meter"
      aria-valuenow={clampedScore}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Motivation score: ${clampedScore} out of 100, ${level} level`}
      className={cn('relative flex flex-col items-center', className)}
    >
      <svg
        width={width}
        height={height - 24}
        viewBox={`0 0 ${width} ${height - 24}`}
        className="overflow-visible"
        aria-hidden="true"
      >
        {/* Background arc (track) */}
        <path
          d={bgArcPath}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className="text-slate-800"
        />

        {/* Foreground arc (animated or static based on reduced motion) */}
        {!isReduced && bgArcPath ? (
          <motion.path
            d={bgArcPath}
            fill="none"
            stroke={levelColors.stroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            style={{ pathLength }}
            initial={{ pathLength: 0 }}
          />
        ) : (
          staticFgArcPath && (
            <path
              d={staticFgArcPath}
              fill="none"
              stroke={levelColors.stroke}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />
          )
        )}

        {/* Score text (large number) */}
        <text
          x={cx}
          y={cy - 8}
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-white font-bold"
          style={{ fontSize: size * 0.22 }}
        >
          {clampedScore}
        </text>

        {/* "out of 100" label */}
        <text
          x={cx}
          y={cy + size * 0.12}
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-slate-500"
          style={{ fontSize: size * 0.07 }}
        >
          out of 100
        </text>

        {/* Min label (0) */}
        <text
          x={24}
          y={cy + 8}
          textAnchor="start"
          className="fill-slate-600"
          style={{ fontSize: size * 0.055 }}
        >
          0
        </text>

        {/* Max label (100) */}
        <text
          x={width - 24}
          y={cy + 8}
          textAnchor="end"
          className="fill-slate-600"
          style={{ fontSize: size * 0.055 }}
        >
          100
        </text>
      </svg>

      {/* Level badge */}
      <div className="flex items-center gap-2 mt-1">
        <span
          className={cn(
            'px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider',
            levelColors.bg,
            levelColors.text
          )}
        >
          {level}
        </span>

        {/* Confidence indicator (optional) */}
        {showConfidence && (
          <span
            className={cn(
              'px-2 py-0.5 rounded text-xs',
              'bg-slate-800 text-slate-400'
            )}
          >
            {confidence} confidence
          </span>
        )}
      </div>
    </div>
  );
}

MotivationScoreGauge.displayName = 'MotivationScoreGauge';
