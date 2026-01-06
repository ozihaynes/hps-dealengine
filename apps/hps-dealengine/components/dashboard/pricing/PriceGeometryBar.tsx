/**
 * PriceGeometryBar — Sub-Slice 9.3
 *
 * Visual horizontal bar showing Floor→Ceiling price range with:
 * - ZOPA highlight zone (green)
 * - Entry point marker
 * - Seller strike marker (if present)
 *
 * All values from engine outputs via props — zero calculations.
 *
 * @defensive Handles null/undefined, division by zero, missing ZOPA
 * @traced data-testid for debugging and test selection
 */

import { memo } from "react";
import { type PriceGeometry } from "@hps-internal/contracts";
import { cn } from "@/components/ui";

// ─────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────

export interface PriceGeometryBarProps {
  /** Price geometry from engine. Null → empty state */
  priceGeometry: PriceGeometry | null | undefined;
  /** ARV for reference line (optional) */
  arv?: number | null;
  /** Show numeric labels */
  showLabels?: boolean;
  /** Show legend below bar */
  showLegend?: boolean;
  /** Compact height variant */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ─────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────

const COLORS = {
  floor: "bg-amber-500",
  ceiling: "bg-blue-500",
  zopa: "bg-emerald-500/40",
  zopaEdge: "border-emerald-500",
  entryPoint: "bg-emerald-400",
  sellerStrike: "bg-purple-500",
  arv: "bg-slate-400",
  track: "bg-slate-700",
  noZopa: "bg-red-500/20",
} as const;

const MARKER_LABELS = {
  floor: "Floor",
  ceiling: "Ceiling",
  entryPoint: "Entry",
  sellerStrike: "Seller",
  arv: "ARV",
} as const;

// ─────────────────────────────────────────────────────────────────────
// HELPER: Safe number with NaN/Infinity guard
// ─────────────────────────────────────────────────────────────────────

function safeNumber(value: number | null | undefined): number | null {
  if (value == null) return null;
  if (!Number.isFinite(value)) return null;
  return value;
}

// ─────────────────────────────────────────────────────────────────────
// HELPER: Format currency for display
// ─────────────────────────────────────────────────────────────────────

function formatCurrency(value: number | null | undefined): string {
  const safe = safeNumber(value);
  if (safe === null) return "—";

  const absValue = Math.abs(safe);
  const sign = safe < 0 ? "-" : "";

  if (absValue >= 1_000_000) {
    return `${sign}$${(absValue / 1_000_000).toFixed(2)}M`;
  }
  // Use M format at 999,500+ to avoid "$1000K" display
  if (absValue >= 999_500) {
    return `${sign}$${(absValue / 1_000_000).toFixed(2)}M`;
  }
  if (absValue >= 1_000) {
    return `${sign}$${(absValue / 1_000).toFixed(0)}K`;
  }
  return `${sign}$${absValue.toFixed(0)}`;
}

// ─────────────────────────────────────────────────────────────────────
// HELPER: Calculate position percentage (with safety guards)
// ─────────────────────────────────────────────────────────────────────

function calcPositionPct(
  value: number | null | undefined,
  floor: number,
  ceiling: number
): number {
  // DEFENSIVE: Handle NaN/null/undefined value
  const safeValue = safeNumber(value);
  if (safeValue === null) return 0;

  const range = ceiling - floor;
  // DEFENSIVE: Prevent division by zero or invalid range
  if (range <= 0 || !Number.isFinite(range)) return 0;

  const pct = ((safeValue - floor) / range) * 100;

  // DEFENSIVE: Final NaN check before clamping (in case floor/ceiling are NaN)
  if (!Number.isFinite(pct)) return 0;

  return Math.max(0, Math.min(100, pct));
}

// ─────────────────────────────────────────────────────────────────────
// SUB-COMPONENT: Marker
// ─────────────────────────────────────────────────────────────────────

interface MarkerProps {
  positionPct: number;
  color: string;
  label: string;
  value: number;
  showLabel: boolean;
  testId: string;
  position?: "top" | "bottom";
}

function Marker({
  positionPct,
  color,
  label,
  value,
  showLabel,
  testId,
  position = "top",
}: MarkerProps): JSX.Element {
  const isTop = position === "top";

  return (
    <div
      className="absolute flex flex-col items-center"
      style={{ left: `${positionPct}%`, transform: "translateX(-50%)" }}
      data-testid={testId}
      data-position-pct={positionPct.toFixed(1)}
    >
      {/* Label above/below */}
      {showLabel && (
        <div
          className={cn(
            "text-[10px] font-medium whitespace-nowrap",
            isTop ? "order-first mb-1" : "order-last mt-1",
            "text-slate-400"
          )}
        >
          <span className="block text-center">{label}</span>
          <span className="block text-center text-slate-500">
            {formatCurrency(value)}
          </span>
        </div>
      )}
      {/* Marker dot */}
      <div
        className={cn(
          "w-3 h-3 rounded-full border-2 border-slate-900 shadow-sm",
          color
        )}
        aria-label={`${label}: ${formatCurrency(value)}`}
      />
      {/* Tick line */}
      <div
        className={cn(
          "w-0.5 bg-slate-600",
          isTop ? "h-2 -mt-0.5" : "h-2 -mb-0.5 order-first"
        )}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────

export const PriceGeometryBar = memo(function PriceGeometryBar({
  priceGeometry,
  arv,
  showLabels = true,
  showLegend = true,
  compact = false,
  className,
}: PriceGeometryBarProps): JSX.Element {
  // ─────────────────────────────────────────────────────────────────
  // DEFENSIVE: Handle null/undefined price geometry
  // ─────────────────────────────────────────────────────────────────

  if (!priceGeometry) {
    return (
      <div
        data-testid="price-geometry-bar"
        data-state="empty"
        className={cn(
          "rounded-xl border border-white/10 bg-blue-500/10 backdrop-blur-xl p-4",
          "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]",
          className
        )}
      >
        <p className="text-sm text-slate-500 italic text-center">
          Price geometry not yet calculated
        </p>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────
  // EXTRACT & VALIDATE (all from engine, no calculations)
  // ─────────────────────────────────────────────────────────────────

  const {
    respect_floor,
    buyer_ceiling,
    zopa,
    zopa_exists,
    entry_point,
    seller_strike,
    dominant_floor,
  } = priceGeometry;

  // DEFENSIVE: Validate floor < ceiling
  const isValidRange = buyer_ceiling > respect_floor;

  if (!isValidRange) {
    return (
      <div
        data-testid="price-geometry-bar"
        data-state="invalid"
        className={cn(
          "rounded-lg border border-red-700/50 bg-red-900/20 p-4",
          className
        )}
      >
        <p className="text-sm text-red-400 text-center">
          Invalid price range: Floor ($
          {respect_floor.toLocaleString()}) ≥ Ceiling ($
          {buyer_ceiling.toLocaleString()})
        </p>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────
  // CALCULATE POSITIONS (percentage-based for CSS)
  // ─────────────────────────────────────────────────────────────────

  const entryPointPct = calcPositionPct(
    entry_point,
    respect_floor,
    buyer_ceiling
  );
  const sellerStrikePct =
    seller_strike != null
      ? calcPositionPct(seller_strike, respect_floor, buyer_ceiling)
      : null;
  const arvPct =
    arv != null ? calcPositionPct(arv, respect_floor, buyer_ceiling) : null;

  // ZOPA zone positioning
  const zopaStartPct =
    seller_strike != null
      ? calcPositionPct(seller_strike, respect_floor, buyer_ceiling)
      : 0; // ZOPA starts at floor if no seller strike
  const zopaEndPct = 100; // ZOPA ends at ceiling
  const zopaWidthPct =
    zopa_exists && zopa != null && zopa > 0 ? zopaEndPct - zopaStartPct : 0;

  // ─────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────

  return (
    <div
      data-testid="price-geometry-bar"
      data-state={zopa_exists ? "has-zopa" : "no-zopa"}
      data-dominant-floor={dominant_floor}
      className={cn(
        "rounded-xl border border-white/10 bg-blue-500/10 backdrop-blur-xl",
        "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]",
        compact ? "p-3" : "p-4",
        className
      )}
    >
      {/* Title Row */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-slate-300">Price Geometry</h3>
        {zopa_exists && zopa != null ? (
          <span className="text-xs font-medium text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full">
            ZOPA: {formatCurrency(zopa)}
          </span>
        ) : (
          <span className="text-xs font-medium text-red-400 bg-red-500/20 px-2 py-0.5 rounded-full">
            No ZOPA
          </span>
        )}
      </div>

      {/* Bar Container */}
      <div
        className={cn(
          "relative",
          compact ? "h-16" : "h-20",
          showLabels && "mt-8 mb-6"
        )}
      >
        {/* Track Background */}
        <div
          className={cn(
            "absolute left-0 right-0 top-1/2 -translate-y-1/2 h-2 rounded-full",
            COLORS.track
          )}
          data-testid="price-geometry-track"
        />

        {/* ZOPA Highlight Zone */}
        {zopa_exists && zopaWidthPct > 0 && (
          <div
            className={cn(
              "absolute top-1/2 -translate-y-1/2 h-4 rounded",
              COLORS.zopa,
              "border-l-2 border-r-2",
              COLORS.zopaEdge
            )}
            style={{
              left: `${zopaStartPct}%`,
              width: `${zopaWidthPct}%`,
            }}
            data-testid="price-geometry-zopa"
            aria-label={`ZOPA zone from ${formatCurrency(seller_strike ?? respect_floor)} to ${formatCurrency(buyer_ceiling)}`}
          />
        )}

        {/* No ZOPA Indicator */}
        {!zopa_exists && (
          <div
            className={cn(
              "absolute left-0 right-0 top-1/2 -translate-y-1/2 h-4 rounded",
              COLORS.noZopa
            )}
            data-testid="price-geometry-no-zopa"
          />
        )}

        {/* Floor Marker (left edge) */}
        <Marker
          positionPct={0}
          color={COLORS.floor}
          label={`${MARKER_LABELS.floor} (${dominant_floor})`}
          value={respect_floor}
          showLabel={showLabels}
          testId="price-geometry-floor"
          position="bottom"
        />

        {/* Ceiling Marker (right edge) */}
        <Marker
          positionPct={100}
          color={COLORS.ceiling}
          label={MARKER_LABELS.ceiling}
          value={buyer_ceiling}
          showLabel={showLabels}
          testId="price-geometry-ceiling"
          position="bottom"
        />

        {/* Entry Point Marker */}
        <Marker
          positionPct={entryPointPct}
          color={COLORS.entryPoint}
          label={MARKER_LABELS.entryPoint}
          value={entry_point}
          showLabel={showLabels}
          testId="price-geometry-entry"
          position="top"
        />

        {/* Seller Strike Marker (if present) */}
        {sellerStrikePct != null && seller_strike != null && (
          <Marker
            positionPct={sellerStrikePct}
            color={COLORS.sellerStrike}
            label={MARKER_LABELS.sellerStrike}
            value={seller_strike}
            showLabel={showLabels}
            testId="price-geometry-seller"
            position="top"
          />
        )}

        {/* ARV Reference Line (if present and in range) */}
        {arvPct != null && arv != null && arvPct >= 0 && arvPct <= 100 && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-slate-400/50 border-dashed"
            style={{ left: `${arvPct}%` }}
            data-testid="price-geometry-arv"
            aria-label={`ARV: ${formatCurrency(arv)}`}
          >
            {showLabels && (
              <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] text-slate-500">
                ARV
              </span>
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      {showLegend && (
        <div
          className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-[10px] text-slate-500"
          data-testid="price-geometry-legend"
        >
          <span className="flex items-center gap-1">
            <span className={cn("w-2 h-2 rounded-full", COLORS.floor)} />
            Floor
          </span>
          <span className="flex items-center gap-1">
            <span className={cn("w-2 h-2 rounded-full", COLORS.ceiling)} />
            Ceiling
          </span>
          <span className="flex items-center gap-1">
            <span className={cn("w-2 h-2 rounded-full", COLORS.entryPoint)} />
            Entry Point
          </span>
          {seller_strike != null && (
            <span className="flex items-center gap-1">
              <span
                className={cn("w-2 h-2 rounded-full", COLORS.sellerStrike)}
              />
              Seller Strike
            </span>
          )}
          <span className="flex items-center gap-1">
            <span className={cn("w-3 h-2 rounded", COLORS.zopa)} />
            ZOPA
          </span>
        </div>
      )}
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────

export default PriceGeometryBar;

// Re-export for testing
export { safeNumber, formatCurrency, calcPositionPct, COLORS, MARKER_LABELS };
