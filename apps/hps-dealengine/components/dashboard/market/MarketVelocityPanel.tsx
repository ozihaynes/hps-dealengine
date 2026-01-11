/**
 * MarketVelocityPanel — Sub-Slice 9.6
 *
 * Panel displaying market velocity metrics:
 * - Days on Market (DOM) for ZIP
 * - Months of Inventory (MOI)
 * - Absorption rate (sales per month)
 * - Sale-to-list ratio percentage
 * - Velocity band indicator (hot/warm/balanced/cool/cold)
 *
 * All values from engine outputs via props — zero calculations.
 *
 * @defensive Handles null/undefined, NaN values, negative values, invalid enums
 * @traced data-testid for debugging and test selection
 */

import { memo } from "react";
import {
  type MarketVelocity,
  type VelocityBand,
} from "@hps-internal/contracts";
import { cn } from "@/components/ui";

// ─────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────

export interface MarketVelocityPanelProps {
  /** Market velocity from engine. Null → empty state */
  marketVelocity: MarketVelocity | null | undefined;
  /** Show liquidity score */
  showLiquidity?: boolean;
  /** Compact mode reduces padding */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ─────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────

type BandKey = VelocityBand | "unknown";

const BAND_CONFIG: Record<
  BandKey,
  {
    label: string;
    icon: string;
    color: string;
    bgColor: string;
    borderColor: string;
    description: string;
  }
> = {
  hot: {
    label: "Hot",
    icon: "🔥",
    color: "text-red-400",
    bgColor: "bg-red-500/20",
    borderColor: "border-red-500/40",
    description: "Market is moving quickly — expect competitive offers",
  },
  warm: {
    label: "Warm",
    icon: "☀️",
    color: "text-orange-400",
    bgColor: "bg-orange-500/20",
    borderColor: "border-orange-500/40",
    description: "Market has strong activity — moderate competition expected",
  },
  balanced: {
    label: "Balanced",
    icon: "⚖️",
    color: "text-amber-400",
    bgColor: "bg-amber-500/20",
    borderColor: "border-amber-500/40",
    description: "Market has normal activity — standard negotiation expected",
  },
  cool: {
    label: "Cool",
    icon: "🌙",
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/20",
    borderColor: "border-cyan-500/40",
    description: "Market is slowing — some negotiating leverage available",
  },
  cold: {
    label: "Cold",
    icon: "❄️",
    color: "text-blue-400",
    bgColor: "bg-blue-500/20",
    borderColor: "border-blue-500/40",
    description: "Market is slow — more negotiating leverage available",
  },
  unknown: {
    label: "Unknown",
    icon: "—",
    color: "text-slate-400",
    bgColor: "bg-slate-500/20",
    borderColor: "border-slate-500/40",
    description: "Insufficient data to determine market velocity",
  },
} as const;

const VALID_BANDS: VelocityBand[] = ["hot", "warm", "balanced", "cool", "cold"];

// ─────────────────────────────────────────────────────────────────────
// HELPER: Safe number display with NaN/Infinity guard
// ─────────────────────────────────────────────────────────────────────

function safeNumber(value: number | null | undefined): number | null {
  if (value == null) return null;
  if (!Number.isFinite(value)) return null; // Guards NaN and ±Infinity
  return value;
}

/**
 * Format DOM (Days on Market) - integer, non-negative
 */
function formatDOM(dom: number | null | undefined): string {
  const safe = safeNumber(dom);
  if (safe === null) return "—";
  if (safe < 0) return "—"; // Negative DOM invalid
  return `${Math.round(safe)}`;
}

/**
 * Format MOI (Months of Inventory) - 1 decimal, non-negative
 */
function formatMOI(moi: number | null | undefined): string {
  const safe = safeNumber(moi);
  if (safe === null) return "—";
  if (safe < 0) return "—"; // Negative MOI invalid
  return safe.toFixed(1);
}

/**
 * Format absorption rate (sales per month) - 1 decimal, can be 0
 */
function formatAbsorption(rate: number | null | undefined): string {
  const safe = safeNumber(rate);
  if (safe === null) return "—";
  if (safe < 0) return "—"; // Negative absorption invalid
  return safe.toFixed(1);
}

/**
 * Format sale-to-list ratio - percentage with 1 decimal
 * Note: Can exceed 100% (over asking sales)
 */
function formatRatio(ratio: number | null | undefined): string {
  const safe = safeNumber(ratio);
  if (safe === null) return "—";
  if (safe < 0) return "—"; // Negative ratio invalid
  return `${safe.toFixed(1)}%`;
}

/**
 * Format liquidity score (0-100)
 */
function formatLiquidity(score: number | null | undefined): string {
  const safe = safeNumber(score);
  if (safe === null) return "—";
  if (safe < 0) return "—"; // Negative liquidity invalid (consistent with other formatters)
  return `${Math.round(safe)}`;
}

// ─────────────────────────────────────────────────────────────────────
// HELPER: Get safe band (with fallback for invalid values)
// ─────────────────────────────────────────────────────────────────────

function getSafeBand(band: string | null | undefined): BandKey {
  if (!band) return "unknown";
  const lower = band.trim().toLowerCase();
  if (VALID_BANDS.includes(lower as VelocityBand)) {
    return lower as VelocityBand;
  }
  return "unknown";
}

// ─────────────────────────────────────────────────────────────────────
// SUB-COMPONENT: Metric Card
// ─────────────────────────────────────────────────────────────────────

interface MetricCardProps {
  value: string;
  label: string;
  sublabel?: string;
  /** For ratio: true if > 100% (over asking) */
  isOverAsking?: boolean;
  testId: string;
}

function MetricCard({
  value,
  label,
  sublabel,
  isOverAsking = false,
  testId,
}: MetricCardProps): JSX.Element {
  const isPlaceholder = value === "—";

  return (
    <div
      className={cn(
        "flex flex-col items-center p-3 rounded-lg bg-slate-800/40 border border-white/5",
        isPlaceholder && "opacity-60"
      )}
      data-testid={testId}
    >
      {/* Value */}
      <span
        className={cn(
          "text-xl font-bold tabular-nums",
          isPlaceholder ? "text-slate-500" : "text-slate-200",
          isOverAsking && "text-emerald-400"
        )}
      >
        {value}
      </span>

      {/* Label */}
      <span className="text-xs text-slate-400 font-medium mt-1">{label}</span>

      {/* Sublabel */}
      {sublabel && (
        <span className="text-[10px] text-slate-500">{sublabel}</span>
      )}

      {/* Over asking indicator */}
      {isOverAsking && (
        <span className="text-[10px] text-emerald-400 mt-0.5">Over asking</span>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// HELPER: Check if we have sufficient data
// ─────────────────────────────────────────────────────────────────────

function hasInsufficientData(velocity: MarketVelocity): boolean {
  const domValid =
    safeNumber(velocity.dom_zip_days) !== null && velocity.dom_zip_days >= 0;
  const moiValid =
    safeNumber(velocity.moi_zip_months) !== null &&
    velocity.moi_zip_months >= 0;

  // If both primary metrics are invalid, show insufficient data state
  return !domValid && !moiValid;
}

// ─────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────

export const MarketVelocityPanel = memo(function MarketVelocityPanel({
  marketVelocity,
  showLiquidity = true,
  compact = false,
  className,
}: MarketVelocityPanelProps): JSX.Element {
  // ─────────────────────────────────────────────────────────────────
  // DEFENSIVE: Handle null/undefined market velocity
  // ─────────────────────────────────────────────────────────────────

  if (!marketVelocity) {
    return (
      <div
        data-testid="market-velocity-panel"
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
        <h3 className="text-sm font-medium text-slate-300 mb-2">
          Market Velocity
        </h3>
        <p className="text-sm text-slate-500 italic text-center py-4">
          Market velocity not yet calculated
        </p>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────
  // DEFENSIVE: Check for insufficient data
  // ─────────────────────────────────────────────────────────────────

  if (hasInsufficientData(marketVelocity)) {
    return (
      <div
        data-testid="market-velocity-panel"
        data-state="insufficient"
        className={cn(
          "rounded-lg border border-amber-700/50 bg-amber-900/10",
          compact ? "p-3" : "p-4",
          className
        )}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-slate-300">Market Velocity</h3>
          <span className="text-xs font-medium text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded-full">
            Limited Data
          </span>
        </div>
        <p className="text-sm text-amber-400/80 text-center py-2">
          Insufficient market data available for velocity analysis
        </p>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────
  // EXTRACT (all from engine, no calculations)
  // ─────────────────────────────────────────────────────────────────

  const {
    dom_zip_days,
    moi_zip_months,
    absorption_rate,
    sale_to_list_pct,
    velocity_band,
    liquidity_score,
  } = marketVelocity;

  // ─────────────────────────────────────────────────────────────────
  // PROCESS VALUES (with defensive guards)
  // ─────────────────────────────────────────────────────────────────

  const safeBand = getSafeBand(velocity_band);
  const bandConfig = BAND_CONFIG[safeBand];

  // Check if ratio is over 100% (over asking)
  const safeRatio = safeNumber(sale_to_list_pct);
  const isOverAsking = safeRatio !== null && safeRatio > 100;

  // ─────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────

  return (
    <div
      data-testid="market-velocity-panel"
      data-state="loaded"
      data-band={safeBand}
      className={cn(
        "rounded-xl border border-white/10 backdrop-blur-xl",
        "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]",
        // min-h ensures alignment in 3-column grid with ArvBandWidget and CompQualityCard
        "min-h-[280px]",
        compact ? "p-3" : "p-4",
        className
      )}
      style={{
        backgroundColor: "color-mix(in srgb, var(--bg-primary, #000) 80%, black 20%)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-slate-300">Market Velocity</h3>
        <span
          className={cn(
            "text-xs font-medium px-2 py-0.5 rounded-full border flex items-center gap-1",
            bandConfig.color,
            bandConfig.bgColor,
            bandConfig.borderColor
          )}
          data-testid="market-velocity-band"
        >
          <span aria-hidden="true">{bandConfig.icon}</span>
          {bandConfig.label}
        </span>
      </div>

      {/* Metrics Grid */}
      <div
        className="grid grid-cols-2 md:grid-cols-4 gap-2"
        data-testid="market-velocity-metrics"
      >
        <MetricCard
          value={formatDOM(dom_zip_days)}
          label="Days on Market"
          sublabel="(DOM)"
          testId="market-velocity-dom"
        />
        <MetricCard
          value={formatMOI(moi_zip_months)}
          label="Months Inventory"
          sublabel="(MOI)"
          testId="market-velocity-moi"
        />
        <MetricCard
          value={formatAbsorption(absorption_rate)}
          label="Absorption"
          sublabel="Sales/Month"
          testId="market-velocity-absorption"
        />
        <MetricCard
          value={formatRatio(sale_to_list_pct)}
          label="Sale/List"
          sublabel="Ratio"
          isOverAsking={isOverAsking}
          testId="market-velocity-ratio"
        />
      </div>

      {/* Liquidity Score + Description */}
      <div
        className="mt-3 pt-3 border-t border-white/10"
        data-testid="market-velocity-footer"
      >
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500 flex-1">
            {bandConfig.description}
          </p>
          {showLiquidity && (
            <div
              className="flex items-center gap-2 ml-4"
              data-testid="market-velocity-liquidity"
            >
              <span className="text-[10px] text-slate-500 uppercase tracking-wide">
                Liquidity
              </span>
              <span
                className={cn(
                  "text-sm font-semibold tabular-nums",
                  (safeNumber(liquidity_score) ?? 0) >= 70
                    ? "text-emerald-400"
                    : (safeNumber(liquidity_score) ?? 0) >= 40
                      ? "text-amber-400"
                      : "text-red-400"
                )}
              >
                {formatLiquidity(liquidity_score)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────

export default MarketVelocityPanel;

// Re-export for testing
export {
  safeNumber,
  formatDOM,
  formatMOI,
  formatAbsorption,
  formatRatio,
  formatLiquidity,
  getSafeBand,
  hasInsufficientData,
  BAND_CONFIG,
  VALID_BANDS,
};
