/**
 * CompQualityCard — Sub-Slice 9.5
 *
 * Card displaying comp quality score with gauge visualization,
 * quality band badge, and Fannie Mae scoring breakdown metrics.
 *
 * All values from engine outputs via props — zero calculations.
 *
 * @defensive Handles null/undefined, NaN values, 0 comps, out-of-range scores
 * @traced data-testid for debugging and test selection
 */

import { memo } from "react";
import {
  type CompQuality,
  type CompQualityBand,
} from "@hps-internal/contracts";
import { cn } from "@/components/ui";

// ─────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────

export interface CompQualityCardProps {
  /** Comp quality from engine. Null → empty state */
  compQuality: CompQuality | null | undefined;
  /** Show scoring method badge */
  showMethod?: boolean;
  /** Compact mode reduces padding */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ─────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────

type BandKey = CompQualityBand | "unknown";

// SEMANTIC COLOR MAPPING for comp quality bands
// No blue - use emerald/amber/red semantic colors only
const BAND_CONFIG: Record<
  BandKey,
  { label: string; color: string; bgColor: string; borderColor: string }
> = {
  excellent: {
    label: "Excellent",
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/20",
    borderColor: "border-emerald-500/40",
  },
  good: {
    // CHANGED: Was blue, now emerald (good is still positive)
    label: "Good",
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/15",
    borderColor: "border-emerald-500/30",
  },
  fair: {
    label: "Fair",
    color: "text-amber-400",
    bgColor: "bg-amber-500/20",
    borderColor: "border-amber-500/40",
  },
  poor: {
    label: "Poor",
    color: "text-red-400",
    bgColor: "bg-red-500/20",
    borderColor: "border-red-500/40",
  },
  unknown: {
    label: "Unknown",
    color: "text-slate-400",
    bgColor: "bg-slate-700",
    borderColor: "border-slate-600",
  },
} as const;

// Gauge colors - SOLID COLORS ONLY, NO GRADIENTS
const GAUGE_COLORS: Record<BandKey, string> = {
  excellent: "bg-emerald-500",
  good: "bg-emerald-500", // CHANGED: Was blue, now emerald
  fair: "bg-amber-500",
  poor: "bg-red-500",
  unknown: "bg-slate-500",
} as const;

const VALID_BANDS: CompQualityBand[] = ["excellent", "good", "fair", "poor"];

// ─────────────────────────────────────────────────────────────────────
// HELPER: Safe number display with NaN/Infinity guard
// ─────────────────────────────────────────────────────────────────────

function safeNumber(value: number | null | undefined): number | null {
  if (value == null) return null;
  if (!Number.isFinite(value)) return null; // Guards NaN and ±Infinity
  return value;
}

function formatDistance(miles: number | null | undefined): string {
  const safe = safeNumber(miles);
  if (safe === null) return "—";
  if (safe < 0) return "—"; // Negative distance invalid
  if (safe < 0.1) return "<0.1 mi";
  return `${safe.toFixed(1)} mi`;
}

function formatDays(days: number | null | undefined): string {
  const safe = safeNumber(days);
  if (safe === null) return "—";
  if (safe < 0) return "—"; // Negative days invalid
  const rounded = Math.round(safe);
  return `${rounded} day${rounded !== 1 ? "s" : ""}`;
}

function formatPercent(pct: number | null | undefined): string {
  const safe = safeNumber(pct);
  if (safe === null) return "—";
  if (safe < 0) return "—"; // Negative variance invalid
  return `${safe.toFixed(1)}%`;
}

function formatScore(score: number | null | undefined): string {
  const safe = safeNumber(score);
  if (safe === null) return "—";
  // Clamp for display but don't hide out-of-range values entirely
  const display = Math.round(safe);
  return `${display}`;
}

// ─────────────────────────────────────────────────────────────────────
// HELPER: Get safe band (with fallback for invalid values)
// ─────────────────────────────────────────────────────────────────────

function getSafeBand(band: string | null | undefined): BandKey {
  if (!band) return "unknown";
  const lower = band.trim().toLowerCase();
  if (VALID_BANDS.includes(lower as CompQualityBand)) {
    return lower as CompQualityBand;
  }
  return "unknown";
}

// ─────────────────────────────────────────────────────────────────────
// HELPER: Clamp score for gauge width (0-100)
// ─────────────────────────────────────────────────────────────────────

function clampScoreForGauge(score: number | null | undefined): number {
  const safe = safeNumber(score);
  if (safe === null) return 0;
  return Math.max(0, Math.min(100, safe));
}

// ─────────────────────────────────────────────────────────────────────
// SUB-COMPONENT: Metric Box
// ─────────────────────────────────────────────────────────────────────

interface MetricBoxProps {
  value: string;
  label: string;
  testId: string;
}

function MetricBox({ value, label, testId }: MetricBoxProps): JSX.Element {
  return (
    <div
      className="flex flex-col items-center p-2 rounded-lg bg-slate-800/40 border border-white/5"
      data-testid={testId}
    >
      <span className="text-sm font-semibold text-slate-200">{value}</span>
      <span className="text-[10px] text-slate-500 uppercase tracking-wider">
        {label}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────

export const CompQualityCard = memo(function CompQualityCard({
  compQuality,
  showMethod = true,
  compact = false,
  className,
}: CompQualityCardProps): JSX.Element {
  // ─────────────────────────────────────────────────────────────────
  // DEFENSIVE: Handle null/undefined comp quality
  // ─────────────────────────────────────────────────────────────────

  if (!compQuality) {
    return (
      <div
        data-testid="comp-quality-card"
        data-state="empty"
        className={cn(
          "rounded-xl border border-white/10 bg-blue-500/10 backdrop-blur-xl",
          "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]",
          compact ? "p-3" : "p-4",
          className
        )}
      >
        <h3 className="text-sm font-medium text-slate-300 mb-2">Comp Quality</h3>
        <p className="text-sm text-slate-500 italic text-center py-4">
          Comp quality not yet calculated
        </p>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────
  // EXTRACT (all from engine, no calculations)
  // ─────────────────────────────────────────────────────────────────

  const {
    comp_count,
    avg_distance_miles,
    avg_age_days,
    sqft_variance_pct,
    quality_score,
    quality_band,
    scoring_method,
  } = compQuality;

  // ─────────────────────────────────────────────────────────────────
  // DEFENSIVE: Handle 0 comps (special state)
  // ─────────────────────────────────────────────────────────────────

  const safeCompCount = safeNumber(comp_count);
  const hasNoComps = safeCompCount === null || safeCompCount === 0;

  if (hasNoComps) {
    return (
      <div
        data-testid="comp-quality-card"
        data-state="no-comps"
        className={cn(
          "rounded-xl border border-red-700/50 bg-red-900/10 backdrop-blur-xl",
          compact ? "p-3" : "p-4",
          className
        )}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-slate-300">Comp Quality</h3>
          <span className="text-xs font-medium text-red-400 bg-red-500/20 px-2 py-0.5 rounded-full">
            No Comps
          </span>
        </div>
        <p className="text-sm text-red-400/80 text-center py-2">
          No comparable sales available for quality assessment
        </p>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────
  // PROCESS VALUES (with defensive guards)
  // ─────────────────────────────────────────────────────────────────

  const safeBand = getSafeBand(quality_band);
  const bandConfig = BAND_CONFIG[safeBand];
  const gaugeColor = GAUGE_COLORS[safeBand];
  const gaugeWidth = clampScoreForGauge(quality_score);
  const displayScore = formatScore(quality_score);

  // Flag if score is out of expected 0-100 range (anomaly)
  const safeScore = safeNumber(quality_score);
  const isScoreAnomaly =
    safeScore !== null && (safeScore < 0 || safeScore > 100);

  // ─────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────

  return (
    <div
      data-testid="comp-quality-card"
      data-state="loaded"
      data-band={safeBand}
      data-score={safeScore ?? "null"}
      data-anomaly={isScoreAnomaly}
      className={cn(
        "rounded-xl border border-white/10 bg-blue-500/10 backdrop-blur-xl",
        "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]",
        compact ? "p-3" : "p-4",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-slate-300">Comp Quality</h3>
        <div className="flex items-center gap-2">
          {showMethod && scoring_method && (
            <span
              className="text-[10px] text-slate-500 bg-slate-700/50 px-1.5 py-0.5 rounded"
              data-testid="comp-quality-method"
            >
              {scoring_method}
            </span>
          )}
          <span
            className={cn(
              "text-xs font-medium px-2 py-0.5 rounded-full border",
              bandConfig.color,
              bandConfig.bgColor,
              bandConfig.borderColor
            )}
            data-testid="comp-quality-band"
          >
            {bandConfig.label}
          </span>
        </div>
      </div>

      {/* Score Gauge */}
      <div className="mb-4" data-testid="comp-quality-gauge">
        {/* Score Display */}
        <div className="flex items-end justify-between mb-1.5">
          <span
            className={cn(
              "text-2xl font-bold tabular-nums",
              bandConfig.color,
              isScoreAnomaly && "underline decoration-wavy decoration-red-500"
            )}
            data-testid="comp-quality-score"
          >
            {displayScore}
          </span>
          <span className="text-sm text-slate-500">/100</span>
        </div>

        {/* Progress Bar */}
        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-300",
              gaugeColor
            )}
            style={{ width: `${gaugeWidth}%` }}
            role="progressbar"
            aria-valuenow={safeScore ?? 0}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Comp quality score: ${displayScore} out of 100`}
          />
        </div>

        {/* Anomaly Warning */}
        {isScoreAnomaly && (
          <p
            className="text-[10px] text-red-400 mt-1"
            data-testid="comp-quality-anomaly"
          >
            Warning: Score outside expected 0-100 range
          </p>
        )}
      </div>

      {/* Metrics Grid */}
      <div
        className="grid grid-cols-4 gap-2"
        data-testid="comp-quality-metrics"
      >
        <MetricBox
          value={safeCompCount?.toString() ?? "—"}
          label="Comps"
          testId="comp-quality-count"
        />
        <MetricBox
          value={formatDistance(avg_distance_miles)}
          label="Avg Dist"
          testId="comp-quality-distance"
        />
        <MetricBox
          value={formatDays(avg_age_days)}
          label="Avg Age"
          testId="comp-quality-age"
        />
        <MetricBox
          value={formatPercent(sqft_variance_pct)}
          label="Sqft Var"
          testId="comp-quality-variance"
        />
      </div>
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────

export default CompQualityCard;

// Re-export for testing
export {
  safeNumber,
  formatDistance,
  formatDays,
  formatPercent,
  formatScore,
  getSafeBand,
  clampScoreForGauge,
  BAND_CONFIG,
  GAUGE_COLORS,
  VALID_BANDS,
};
