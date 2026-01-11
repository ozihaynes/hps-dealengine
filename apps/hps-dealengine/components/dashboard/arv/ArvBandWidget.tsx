/**
 * ArvBandWidget — Sub-Slice 9.9
 *
 * Widget displaying ARV (After Repair Value) estimate:
 * - Low / Mid / High range with visual bar
 * - Confidence indicator (high/medium/low)
 * - Source attribution (comps/AVM/hybrid)
 * - Spread amount and percentage
 *
 * All values from engine outputs via props — zero calculations.
 *
 * @defensive Handles null/undefined, NaN values, invalid ranges
 * @traced data-testid for debugging and test selection
 */

import { memo } from "react";
import { cn } from "@/components/ui";

// ─────────────────────────────────────────────────────────────────────
// TYPES (inline — no ArvBand schema in contracts)
// ─────────────────────────────────────────────────────────────────────

/**
 * ARV confidence level from engine.
 */
export type ArvConfidence = "high" | "medium" | "low";

/**
 * ARV source from engine.
 */
export type ArvSource = "comps" | "avm" | "hybrid" | "manual";

/**
 * ARV band from engine.
 * Inline type — contracts only have scalar arv field, not band.
 */
export interface ArvBand {
  arv_low: number;
  arv_mid: number;
  arv_high: number;
  confidence: ArvConfidence;
  source: ArvSource;
  spread_amount?: number | null;
  spread_pct?: number | null;
}

export interface ArvBandWidgetProps {
  /** ARV band from engine. Null → empty state */
  arvBand: ArvBand | null | undefined;
  /** Show spread information */
  showSpread?: boolean;
  /** Compact mode reduces padding */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ─────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────

type ConfidenceKey = ArvConfidence | "unknown";

const CONFIDENCE_CONFIG: Record<
  ConfidenceKey,
  { label: string; color: string; bgColor: string; borderColor: string }
> = {
  high: {
    label: "High Confidence",
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/20",
    borderColor: "border-emerald-500/40",
  },
  medium: {
    label: "Medium Confidence",
    color: "text-amber-400",
    bgColor: "bg-amber-500/20",
    borderColor: "border-amber-500/40",
  },
  low: {
    label: "Low Confidence",
    color: "text-red-400",
    bgColor: "bg-red-500/20",
    borderColor: "border-red-500/40",
  },
  unknown: {
    label: "Unknown",
    color: "text-slate-400",
    bgColor: "bg-slate-500/20",
    borderColor: "border-slate-500/40",
  },
} as const;

type SourceKey = ArvSource | "unknown";

const SOURCE_CONFIG: Record<SourceKey, { label: string; icon: string }> = {
  comps: { label: "Comps-Based", icon: "📊" },
  avm: { label: "AVM", icon: "🤖" },
  hybrid: { label: "Hybrid", icon: "🔀" },
  manual: { label: "Manual", icon: "✏️" },
  unknown: { label: "Unknown", icon: "?" },
} as const;

const VALID_CONFIDENCES: ArvConfidence[] = ["high", "medium", "low"];
const VALID_SOURCES: ArvSource[] = ["comps", "avm", "hybrid", "manual"];

// ─────────────────────────────────────────────────────────────────────
// HELPER: Safe number with NaN/Infinity guard
// ─────────────────────────────────────────────────────────────────────

function safeNumber(value: number | null | undefined): number | null {
  if (value == null) return null;
  if (!Number.isFinite(value)) return null;
  return value;
}

// ─────────────────────────────────────────────────────────────────────
// HELPER: Get safe confidence (with fallback)
// ─────────────────────────────────────────────────────────────────────

function getSafeConfidence(
  confidence: string | null | undefined
): ConfidenceKey {
  if (!confidence) return "unknown";
  const lower = confidence.trim().toLowerCase();
  if (VALID_CONFIDENCES.includes(lower as ArvConfidence)) {
    return lower as ArvConfidence;
  }
  return "unknown";
}

// ─────────────────────────────────────────────────────────────────────
// HELPER: Get safe source (with fallback)
// ─────────────────────────────────────────────────────────────────────

function getSafeSource(source: string | null | undefined): SourceKey {
  if (!source) return "unknown";
  const lower = source.trim().toLowerCase();
  if (VALID_SOURCES.includes(lower as ArvSource)) {
    return lower as ArvSource;
  }
  return "unknown";
}

// ─────────────────────────────────────────────────────────────────────
// HELPER: Format currency with compact notation for large values
// ─────────────────────────────────────────────────────────────────────

function formatCurrency(
  value: number | null | undefined,
  compact: boolean = false
): string {
  const safe = safeNumber(value);
  if (safe === null) return "—";
  if (safe < 0) return "—"; // Negative ARV invalid

  if (compact && safe >= 1_000_000) {
    return `$${(safe / 1_000_000).toFixed(1)}M`;
  }
  // Use M format at 999,500+ to avoid "$1000K" display
  if (compact && safe >= 999_500) {
    return `$${(safe / 1_000_000).toFixed(1)}M`;
  }
  if (compact && safe >= 1_000) {
    return `$${Math.round(safe / 1_000)}K`;
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(safe);
}

// ─────────────────────────────────────────────────────────────────────
// HELPER: Format spread percentage
// ─────────────────────────────────────────────────────────────────────

function formatSpreadPct(pct: number | null | undefined): string {
  const safe = safeNumber(pct);
  if (safe === null) return "—";
  if (safe < 0) return "—"; // Negative spread invalid
  return `${safe.toFixed(1)}%`;
}

// ─────────────────────────────────────────────────────────────────────
// HELPER: Calculate mid position percentage on range bar
// ─────────────────────────────────────────────────────────────────────

function calcMidPosition(
  low: number | null,
  mid: number | null,
  high: number | null
): number {
  if (low === null || mid === null || high === null) return 50;
  if (high <= low) return 50; // Invalid range, default center
  const range = high - low;
  const position = ((mid - low) / range) * 100;
  // Clamp to 0-100
  return Math.max(0, Math.min(100, position));
}

// ─────────────────────────────────────────────────────────────────────
// HELPER: Check for range validity issues
// ─────────────────────────────────────────────────────────────────────

interface RangeValidation {
  isValid: boolean;
  hasInvalidOrder: boolean; // low > high
  hasMidOutOfRange: boolean; // mid outside low-high
  hasZeroSpread: boolean; // low === high
}

function validateRange(
  low: number | null,
  mid: number | null,
  high: number | null
): RangeValidation {
  const result: RangeValidation = {
    isValid: true,
    hasInvalidOrder: false,
    hasMidOutOfRange: false,
    hasZeroSpread: false,
  };

  if (low === null || mid === null || high === null) {
    result.isValid = false;
    return result;
  }

  // Check low > high (invalid order)
  if (low > high) {
    result.isValid = false;
    result.hasInvalidOrder = true;
    return result;
  }

  // Check zero spread (valid but notable)
  if (low === high) {
    result.hasZeroSpread = true;
  }

  // Check mid outside range (anomaly)
  if (mid < low || mid > high) {
    result.hasMidOutOfRange = true;
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────

export const ArvBandWidget = memo(function ArvBandWidget({
  arvBand,
  showSpread = true,
  compact = false,
  className,
}: ArvBandWidgetProps): JSX.Element {
  // ─────────────────────────────────────────────────────────────────
  // DEFENSIVE: Handle null/undefined ARV band
  // ─────────────────────────────────────────────────────────────────

  if (!arvBand) {
    return (
      <div
        data-testid="arv-band-widget"
        data-state="empty"
        className={cn(
          "rounded-xl border border-white/10 backdrop-blur-xl",
          "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]",
          compact ? "p-3" : "p-4",
          className
        )}
        style={{
          backgroundColor: "color-mix(in srgb, var(--bg-primary, #000) 80%, black 20%)",
        }}
      >
        <h3 className="text-sm font-medium text-slate-300 mb-2">ARV Estimate</h3>
        <p className="text-sm text-slate-500 italic text-center py-4">
          ARV not yet calculated
        </p>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────
  // PROCESS DATA
  // ─────────────────────────────────────────────────────────────────

  const safeLow = safeNumber(arvBand.arv_low);
  const safeMid = safeNumber(arvBand.arv_mid);
  const safeHigh = safeNumber(arvBand.arv_high);

  const safeConfidence = getSafeConfidence(arvBand.confidence);
  const safeSource = getSafeSource(arvBand.source);

  const confidenceConfig = CONFIDENCE_CONFIG[safeConfidence];
  const sourceConfig = SOURCE_CONFIG[safeSource];

  const rangeValidation = validateRange(safeLow, safeMid, safeHigh);
  const midPosition = calcMidPosition(safeLow, safeMid, safeHigh);

  // ─────────────────────────────────────────────────────────────────
  // HANDLE INVALID RANGE
  // ─────────────────────────────────────────────────────────────────

  if (!rangeValidation.isValid && rangeValidation.hasInvalidOrder) {
    return (
      <div
        data-testid="arv-band-widget"
        data-state="invalid"
        className={cn(
          "rounded-lg border border-red-700/50 bg-red-900/10",
          compact ? "p-3" : "p-4",
          className
        )}
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-slate-300">ARV Estimate</h3>
          <span className="text-xs text-red-400 bg-red-500/20 px-2 py-0.5 rounded-full">
            Invalid Range
          </span>
        </div>
        <p className="text-sm text-red-400/80 text-center py-2">
          ARV range is invalid (low exceeds high)
        </p>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────
  // HANDLE ALL NULLS
  // ─────────────────────────────────────────────────────────────────

  if (safeLow === null && safeMid === null && safeHigh === null) {
    return (
      <div
        data-testid="arv-band-widget"
        data-state="no-data"
        className={cn(
          "rounded-xl border border-white/10 backdrop-blur-xl",
          "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]",
          compact ? "p-3" : "p-4",
          className
        )}
        style={{
          backgroundColor: "color-mix(in srgb, var(--bg-primary, #000) 80%, black 20%)",
        }}
      >
        <h3 className="text-sm font-medium text-slate-300 mb-2">ARV Estimate</h3>
        <p className="text-sm text-slate-500 italic text-center py-4">
          Insufficient data for ARV estimate
        </p>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────

  return (
    <div
      data-testid="arv-band-widget"
      data-state="loaded"
      data-confidence={safeConfidence}
      data-source={safeSource}
      data-low={safeLow ?? "null"}
      data-mid={safeMid ?? "null"}
      data-high={safeHigh ?? "null"}
      className={cn(
        "rounded-xl border border-white/10 backdrop-blur-xl",
        "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]",
        // min-h ensures alignment in 3-column grid with MarketVelocityPanel and CompQualityCard
        "min-h-[280px]",
        compact ? "p-3" : "p-4",
        className
      )}
      style={{
        backgroundColor: "color-mix(in srgb, var(--bg-primary, #000) 80%, black 20%)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-slate-300">ARV Estimate</h3>
        <div className="flex items-center gap-2">
          {/* Source badge */}
          <span
            className="text-[10px] text-slate-400 bg-slate-700/50 px-2 py-0.5 rounded-full flex items-center gap-1"
            data-testid="arv-source-badge"
          >
            <span aria-hidden="true">{sourceConfig.icon}</span>
            {sourceConfig.label}
          </span>
          {/* Confidence badge */}
          <span
            className={cn(
              "text-[10px] font-medium px-2 py-0.5 rounded-full border",
              confidenceConfig.color,
              confidenceConfig.bgColor,
              confidenceConfig.borderColor
            )}
            data-testid="arv-confidence-badge"
          >
            {safeConfidence === "unknown"
              ? "?"
              : safeConfidence.charAt(0).toUpperCase()}
          </span>
        </div>
      </div>

      {/* Primary ARV Value (Mid) */}
      <div className="text-center mb-4">
        <span
          className={cn(
            "font-bold text-white",
            compact ? "text-2xl" : "text-3xl"
          )}
          data-testid="arv-mid-value"
        >
          {formatCurrency(safeMid)}
        </span>
        {rangeValidation.hasMidOutOfRange && (
          <span
            className="block text-[10px] text-amber-400 mt-1"
            data-testid="arv-mid-anomaly"
          >
            ⚠ Mid value outside range
          </span>
        )}
      </div>

      {/* Range Bar */}
      <div className="relative mb-2" data-testid="arv-range-bar">
        {/* Track */}
        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
          {/* Solid fill based on confidence - NO GRADIENT */}
          <div
            className={cn(
              "h-full rounded-full transition-all duration-300",
              safeConfidence === "high"
                ? "bg-emerald-500"
                : safeConfidence === "medium"
                  ? "bg-amber-500"
                  : "bg-red-500"
            )}
            style={{ width: "100%" }}
          />
        </div>

        {/* Mid marker */}
        {safeMid !== null && (
          <div
            className={cn(
              "absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full border-2 shadow-lg",
              safeConfidence === "high"
                ? "border-emerald-500"
                : safeConfidence === "medium"
                  ? "border-amber-500"
                  : "border-red-500"
            )}
            style={{ left: `calc(${midPosition}% - 6px)` }}
            aria-label={`Mid value at ${midPosition.toFixed(0)}% of range`}
            data-testid="arv-mid-marker"
          />
        )}
      </div>

      {/* Range Labels */}
      <div className="flex justify-between text-xs mb-3">
        <div className="text-left">
          <span
            className="block font-medium text-slate-300"
            data-testid="arv-low-value"
          >
            {formatCurrency(safeLow, true)}
          </span>
          <span className="text-[10px] text-slate-500">Low</span>
        </div>
        <div className="text-center">
          <span
            className="block font-medium text-emerald-400"
            data-testid="arv-mid-compact"
          >
            {formatCurrency(safeMid, true)}
          </span>
          <span className="text-[10px] text-slate-500">Mid</span>
        </div>
        <div className="text-right">
          <span
            className="block font-medium text-slate-300"
            data-testid="arv-high-value"
          >
            {formatCurrency(safeHigh, true)}
          </span>
          <span className="text-[10px] text-slate-500">High</span>
        </div>
      </div>

      {/* Spread Info */}
      {showSpread && (
        <div
          className="pt-2 border-t border-white/10 flex items-center justify-between"
          data-testid="arv-spread-info"
        >
          <span className="text-[10px] text-slate-500">
            Range:{" "}
            <span className="text-slate-400">
              {formatCurrency(arvBand.spread_amount)}
            </span>
          </span>
          {arvBand.spread_pct != null && (
            <span className="text-[10px] text-slate-500">
              Spread:{" "}
              <span className="text-slate-400">
                {formatSpreadPct(arvBand.spread_pct)}
              </span>
            </span>
          )}
          {rangeValidation.hasZeroSpread && (
            <span className="text-[10px] text-amber-400">Point estimate</span>
          )}
        </div>
      )}

      {/* Confidence description */}
      <div
        className="mt-2 text-[10px] text-slate-500"
        data-testid="arv-confidence-desc"
      >
        {safeConfidence === "high" && "Based on strong comparable evidence"}
        {safeConfidence === "medium" && "Based on moderate comparable evidence"}
        {safeConfidence === "low" &&
          "Limited comparable data — use with caution"}
        {safeConfidence === "unknown" && "Confidence level not determined"}
      </div>
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────

export default ArvBandWidget;

// Re-export for testing
export {
  safeNumber,
  getSafeConfidence,
  getSafeSource,
  formatCurrency,
  formatSpreadPct,
  calcMidPosition,
  validateRange,
  CONFIDENCE_CONFIG,
  SOURCE_CONFIG,
  VALID_CONFIDENCES,
  VALID_SOURCES,
};
