/**
 * CompsEvidencePack — Sub-Slice 9.10
 *
 * Comprehensive comparable sales evidence display:
 * - Map placeholder zone (future integration)
 * - Scrollable list of comp cards with key metrics
 * - Expandable adjustments breakdown per comp
 * - Summary statistics
 *
 * All values from engine outputs via props — zero calculations.
 *
 * @defensive Handles null/undefined, empty arrays, invalid data
 * @traced data-testid for debugging and test selection
 */

import { memo, useState, useCallback } from "react";
import { cn } from "@/components/ui";
import type {
  CompRecord,
  CompAdjustment,
  CompsPack,
} from "@hps-internal/contracts";

// ─────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────

/**
 * Comps evidence pack with aggregate stats.
 * Wraps CompsPack array with summary fields for display.
 */
export interface CompsEvidencePackData {
  comps: CompsPack;
  subject_address?: string;
  subject_sqft?: number;
  avg_sale_price?: number | null;
  avg_distance_miles?: number | null;
  avg_age_days?: number | null;
  comp_quality_score?: number | null;
}

export interface CompsEvidencePackProps {
  /** Comps evidence from engine. Null → empty state */
  compsPack: CompsEvidencePackData | null | undefined;
  /** Maximum comps to display (default: 6) */
  maxComps?: number;
  /** Show map placeholder */
  showMap?: boolean;
  /** Show summary statistics */
  showSummary?: boolean;
  /** Compact mode reduces padding */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ─────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────

const SIMILARITY_THRESHOLDS = {
  excellent: 90,
  good: 75,
  fair: 60,
  poor: 0,
} as const;

const SIMILARITY_COLORS: Record<string, { color: string; bg: string }> = {
  excellent: { color: "text-emerald-400", bg: "bg-emerald-500/20" },
  good: { color: "text-blue-400", bg: "bg-blue-500/20" },
  fair: { color: "text-amber-400", bg: "bg-amber-500/20" },
  poor: { color: "text-red-400", bg: "bg-red-500/20" },
  unknown: { color: "text-slate-400", bg: "bg-slate-500/20" },
};

// ─────────────────────────────────────────────────────────────────────
// HELPER: Safe number with NaN/Infinity guard
// ─────────────────────────────────────────────────────────────────────

function safeNumber(value: number | null | undefined): number | null {
  if (value == null) return null;
  if (!Number.isFinite(value)) return null;
  return value;
}

// ─────────────────────────────────────────────────────────────────────
// HELPER: Safe positive number (null for zero or negative)
// ─────────────────────────────────────────────────────────────────────

function safePositive(value: number | null | undefined): number | null {
  const safe = safeNumber(value);
  if (safe === null || safe <= 0) return null;
  return safe;
}

// ─────────────────────────────────────────────────────────────────────
// HELPER: Safe non-negative number
// ─────────────────────────────────────────────────────────────────────

function safeNonNegative(value: number | null | undefined): number | null {
  const safe = safeNumber(value);
  if (safe === null || safe < 0) return null;
  return safe;
}

// ─────────────────────────────────────────────────────────────────────
// HELPER: Format currency
// ─────────────────────────────────────────────────────────────────────

function formatCurrency(value: number | null | undefined): string {
  const safe = safePositive(value);
  if (safe === null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(safe);
}

// ─────────────────────────────────────────────────────────────────────
// HELPER: Format compact currency ($285K)
// ─────────────────────────────────────────────────────────────────────

function formatCompactCurrency(value: number | null | undefined): string {
  const safe = safePositive(value);
  if (safe === null) return "—";
  if (safe >= 1_000_000) {
    return `$${(safe / 1_000_000).toFixed(1)}M`;
  }
  if (safe >= 1_000) {
    return `$${Math.round(safe / 1_000)}K`;
  }
  return `$${Math.round(safe)}`;
}

// ─────────────────────────────────────────────────────────────────────
// HELPER: Format distance
// ─────────────────────────────────────────────────────────────────────

function formatDistance(miles: number | null | undefined): string {
  const safe = safeNonNegative(miles);
  if (safe === null) return "— mi";
  if (safe < 0.1) return "<0.1 mi";
  return `${safe.toFixed(1)} mi`;
}

// ─────────────────────────────────────────────────────────────────────
// HELPER: Format age in days
// ─────────────────────────────────────────────────────────────────────

function formatAge(days: number | null | undefined): string {
  const safe = safeNonNegative(days);
  if (safe === null) return "— days ago";

  // Round FIRST to avoid singular/plural mismatch
  const rounded = Math.round(safe);

  if (rounded === 0) return "Today";
  if (rounded === 1) return "1 day ago";
  if (rounded >= 365) {
    const years = Math.floor(rounded / 365);
    return `${years}+ year${years > 1 ? "s" : ""} ago`;
  }
  return `${rounded} days ago`;
}

// ─────────────────────────────────────────────────────────────────────
// HELPER: Format sqft
// ─────────────────────────────────────────────────────────────────────

function formatSqft(sqft: number | null | undefined): string {
  const safe = safePositive(sqft);
  if (safe === null) return "— sqft";
  return `${new Intl.NumberFormat("en-US").format(Math.round(safe))} sqft`;
}

// ─────────────────────────────────────────────────────────────────────
// HELPER: Format beds/baths
// ─────────────────────────────────────────────────────────────────────

function formatBedsBaths(
  beds: number | null | undefined,
  baths: number | null | undefined
): string {
  const safeBeds = safeNonNegative(beds);
  const safeBaths = safeNonNegative(baths);

  if (safeBeds === null && safeBaths === null) return "—/—";

  const bedsStr = safeBeds !== null ? String(Math.round(safeBeds)) : "—";
  const bathsStr = safeBaths !== null ? String(safeBaths) : "—";

  return `${bedsStr}/${bathsStr}`;
}

// ─────────────────────────────────────────────────────────────────────
// HELPER: Get safe address
// ─────────────────────────────────────────────────────────────────────

function getSafeAddress(address: string | null | undefined): string {
  if (!address || address.trim() === "") return "Unknown Address";
  return address.trim();
}

// ─────────────────────────────────────────────────────────────────────
// HELPER: Get similarity band
// ─────────────────────────────────────────────────────────────────────

function getSimilarityBand(score: number | null | undefined): string {
  const safe = safeNumber(score);
  if (safe === null) return "unknown";

  // Clamp to 0-100 for band determination
  const clamped = Math.max(0, Math.min(100, safe));

  if (clamped >= SIMILARITY_THRESHOLDS.excellent) return "excellent";
  if (clamped >= SIMILARITY_THRESHOLDS.good) return "good";
  if (clamped >= SIMILARITY_THRESHOLDS.fair) return "fair";
  return "poor";
}

// ─────────────────────────────────────────────────────────────────────
// HELPER: Format similarity score
// ─────────────────────────────────────────────────────────────────────

function formatSimilarity(score: number | null | undefined): string | null {
  const safe = safeNumber(score);
  if (safe === null) return null;
  // Clamp for display
  const clamped = Math.max(0, Math.min(100, safe));
  return `${Math.round(clamped)}%`;
}

// ─────────────────────────────────────────────────────────────────────
// HELPER: Format adjustment amount
// ─────────────────────────────────────────────────────────────────────

function formatAdjustment(amount: number | null | undefined): string {
  const safe = safeNumber(amount);
  if (safe === null) return "—";

  const absAmount = Math.abs(safe);
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(absAmount);

  return safe >= 0 ? `+${formatted}` : `-${formatted}`;
}

// ─────────────────────────────────────────────────────────────────────
// SUB-COMPONENT: Photo Thumbnail
// ─────────────────────────────────────────────────────────────────────

interface PhotoThumbnailProps {
  url: string | null | undefined;
  address: string;
  compact: boolean;
}

function PhotoThumbnail({
  url,
  address,
  compact,
}: PhotoThumbnailProps): JSX.Element {
  const [hasError, setHasError] = useState(false);

  const handleError = useCallback(() => {
    setHasError(true);
  }, []);

  if (!url || hasError) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-[var(--card-bg-solid)] rounded-lg",
          compact ? "w-16 h-16" : "w-20 h-20"
        )}
        aria-label={`No photo available for ${address}`}
      >
        <span className="text-2xl text-slate-500">🏠</span>
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={`Photo of ${address}`}
      className={cn(
        "object-cover rounded-lg",
        compact ? "w-16 h-16" : "w-20 h-20"
      )}
      onError={handleError}
      loading="lazy"
    />
  );
}

// ─────────────────────────────────────────────────────────────────────
// SUB-COMPONENT: Adjustments Panel
// ─────────────────────────────────────────────────────────────────────

interface AdjustmentsPanelProps {
  adjustments: CompAdjustment[];
  adjustedPrice: number | null | undefined;
  originalPrice: number;
}

function AdjustmentsPanel({
  adjustments,
  adjustedPrice,
  originalPrice,
}: AdjustmentsPanelProps): JSX.Element {
  return (
    <div className="mt-3 pt-3 border-t border-white/10">
      <h5 className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-2">
        Price Adjustments
      </h5>
      <div className="space-y-1">
        {adjustments.map((adj, index) => {
          const safeAmount = safeNumber(adj.amount);
          const isPositive = safeAmount !== null && safeAmount >= 0;

          return (
            <div
              key={`${adj.factor}-${index}`}
              className="flex justify-between text-xs"
            >
              <span className="text-slate-400">{adj.factor || "Unknown"}</span>
              <span className={cn(isPositive ? "text-emerald-400" : "text-red-400")}>
                {formatAdjustment(adj.amount)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Adjusted price summary */}
      <div className="mt-2 pt-2 border-t border-white/10 flex justify-between text-xs">
        <span className="text-slate-300 font-medium">Adjusted Price</span>
        <span className="text-slate-100 font-medium">
          {formatCurrency(adjustedPrice ?? originalPrice)}
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// SUB-COMPONENT: Comp Card
// ─────────────────────────────────────────────────────────────────────

interface CompCardProps {
  comp: CompRecord;
  index: number;
  compact: boolean;
  defaultExpanded?: boolean;
}

function CompCard({
  comp,
  index,
  compact,
  defaultExpanded = false,
}: CompCardProps): JSX.Element {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const safeAddress = getSafeAddress(comp.address);
  const similarityScore = formatSimilarity(comp.similarity_score);
  const similarityBand = getSimilarityBand(comp.similarity_score);
  const similarityColors = SIMILARITY_COLORS[similarityBand];

  const hasAdjustments =
    Array.isArray(comp.adjustments) && comp.adjustments.length > 0;

  const toggleExpanded = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  return (
    <div
      className={cn(
        "rounded-xl border border-white/10 bg-[var(--card-bg)] backdrop-blur-xl",
        compact ? "p-3" : "p-4"
      )}
      data-testid={`comp-card-${index}`}
      data-comp-address={safeAddress}
    >
      <div className="flex gap-3">
        {/* Photo */}
        <PhotoThumbnail
          url={comp.photo_url}
          address={safeAddress}
          compact={compact}
        />

        {/* Details */}
        <div className="flex-1 min-w-0">
          {/* Address */}
          <h4
            className={cn(
              "font-medium text-slate-200 truncate",
              compact ? "text-xs" : "text-sm"
            )}
            title={safeAddress}
          >
            {safeAddress}
          </h4>

          {/* Price and Date */}
          <div
            className={cn(
              "flex items-center gap-2 mt-1",
              compact ? "text-[10px]" : "text-xs"
            )}
          >
            <span className="font-medium text-emerald-400">
              {formatCurrency(comp.sale_price)}
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-400">{formatAge(comp.age_days)}</span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-400">
              {formatDistance(comp.distance_miles)}
            </span>
          </div>

          {/* Property Details */}
          <div
            className={cn(
              "flex items-center gap-2 mt-1",
              compact ? "text-[10px]" : "text-xs"
            )}
          >
            <span className="text-slate-400">{formatSqft(comp.sqft)}</span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-400">
              {formatBedsBaths(comp.beds, comp.baths)}
            </span>
            {similarityScore && (
              <>
                <span className="text-slate-500">•</span>
                <span
                  className={cn(
                    "px-1.5 py-0.5 rounded text-[10px] font-medium",
                    similarityColors.color,
                    similarityColors.bg
                  )}
                >
                  {similarityScore} match
                </span>
              </>
            )}
          </div>

          {/* MLS Number */}
          {comp.mls_number && (
            <div className="mt-1 text-[10px] text-slate-500">
              MLS# {comp.mls_number}
            </div>
          )}
        </div>
      </div>

      {/* Adjustments Toggle */}
      {hasAdjustments && (
        <>
          <button
            type="button"
            onClick={toggleExpanded}
            className={cn(
              "mt-3 flex items-center gap-1 text-[10px] font-medium",
              "text-slate-400 hover:text-slate-300 transition-colors"
            )}
            aria-expanded={isExpanded}
            aria-controls={`adjustments-${index}`}
          >
            <span
              className={cn(
                "transition-transform duration-200",
                isExpanded && "rotate-90"
              )}
            >
              ▶
            </span>
            {isExpanded ? "Hide" : "View"} Adjustments ({comp.adjustments.length})
          </button>

          {isExpanded && (
            <div id={`adjustments-${index}`}>
              <AdjustmentsPanel
                adjustments={comp.adjustments}
                adjustedPrice={comp.adjusted_price}
                originalPrice={comp.sale_price}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// SUB-COMPONENT: Map Placeholder
// ─────────────────────────────────────────────────────────────────────

interface MapPlaceholderProps {
  compCount: number;
  subjectAddress?: string;
}

function MapPlaceholder({
  compCount,
  subjectAddress,
}: MapPlaceholderProps): JSX.Element {
  return (
    <div
      className="relative h-40 rounded-xl bg-[var(--card-bg)] border border-white/10 overflow-hidden backdrop-blur-xl"
      data-testid="comps-map-placeholder"
    >
      {/* Grid pattern background */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: "20px 20px",
        }}
      />

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl mb-2">📍</span>
        <span className="text-sm text-slate-400">
          {compCount} comparable{compCount !== 1 ? "s" : ""} found
        </span>
        {subjectAddress && (
          <span className="text-xs text-slate-500 mt-1 max-w-[80%] text-center truncate">
            Near {subjectAddress}
          </span>
        )}
        <span className="text-[10px] text-slate-500 mt-2">
          Interactive map coming soon
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// SUB-COMPONENT: Summary Bar
// ─────────────────────────────────────────────────────────────────────

interface SummaryBarProps {
  avgPrice: number | null | undefined;
  avgDistance: number | null | undefined;
  avgAge: number | null | undefined;
  qualityScore: number | null | undefined;
}

function SummaryBar({
  avgPrice,
  avgDistance,
  avgAge,
  qualityScore,
}: SummaryBarProps): JSX.Element {
  const safeAvgPrice = safePositive(avgPrice);
  const safeAvgDistance = safeNonNegative(avgDistance);
  const safeAvgAge = safeNonNegative(avgAge);
  const safeQuality = safeNumber(qualityScore);

  // Don't render if no data
  if (
    safeAvgPrice === null &&
    safeAvgDistance === null &&
    safeAvgAge === null &&
    safeQuality === null
  ) {
    return <></>;
  }

  return (
    <div
      className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-slate-500 pt-3 border-t border-white/10"
      data-testid="comps-summary"
    >
      {safeAvgPrice !== null && (
        <span>
          Avg Sale:{" "}
          <span className="text-slate-400">
            {formatCompactCurrency(safeAvgPrice)}
          </span>
        </span>
      )}
      {safeAvgAge !== null && (
        <span>
          Avg Age:{" "}
          <span className="text-slate-400">{Math.round(safeAvgAge)} days</span>
        </span>
      )}
      {safeAvgDistance !== null && (
        <span>
          Avg Dist:{" "}
          <span className="text-slate-400">{safeAvgDistance.toFixed(1)} mi</span>
        </span>
      )}
      {safeQuality !== null && (
        <span>
          Quality:{" "}
          <span className="text-slate-400">{Math.round(safeQuality)}/100</span>
        </span>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────

export const CompsEvidencePack = memo(function CompsEvidencePack({
  compsPack,
  maxComps = 6,
  showMap = true,
  showSummary = true,
  compact = false,
  className,
}: CompsEvidencePackProps): JSX.Element {
  // ─────────────────────────────────────────────────────────────────
  // DEFENSIVE: Handle null/undefined comps pack
  // ─────────────────────────────────────────────────────────────────

  if (!compsPack) {
    return (
      <div
        data-testid="comps-evidence-pack"
        data-state="empty"
        className={cn(
          "rounded-xl border border-white/10 bg-[var(--card-bg)] backdrop-blur-xl",
          compact ? "p-3" : "p-4",
          className
        )}
      >
        <h3 className="text-sm font-medium text-slate-300 mb-2">
          Comparable Sales
        </h3>
        <p className="text-sm text-slate-500 italic text-center py-6">
          Comparable sales not yet retrieved
        </p>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────
  // DEFENSIVE: Handle empty comps array
  // ─────────────────────────────────────────────────────────────────

  if (!Array.isArray(compsPack.comps) || compsPack.comps.length === 0) {
    return (
      <div
        data-testid="comps-evidence-pack"
        data-state="no-comps"
        className={cn(
          "rounded-xl border border-white/10 bg-[var(--card-bg)] backdrop-blur-xl",
          compact ? "p-3" : "p-4",
          className
        )}
      >
        <h3 className="text-sm font-medium text-slate-300 mb-2">
          Comparable Sales
        </h3>
        <div className="text-center py-6">
          <span className="text-3xl mb-2 block">🔍</span>
          <p className="text-sm text-slate-500">
            No comparable sales found in this area
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Try expanding search criteria or checking property details
          </p>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────
  // PROCESS DATA
  // ─────────────────────────────────────────────────────────────────

  const displayComps = compsPack.comps.slice(0, maxComps);
  const totalComps = compsPack.comps.length;
  const hiddenCount = totalComps - displayComps.length;

  // ─────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────

  return (
    <div
      data-testid="comps-evidence-pack"
      data-state="loaded"
      data-comp-count={totalComps}
      className={cn(
        "rounded-xl border border-white/10 bg-[var(--card-bg)] backdrop-blur-xl",
        compact ? "p-3" : "p-4",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-slate-300">Comparable Sales</h3>
        <div className="flex items-center gap-2 text-[10px]">
          <span className="text-slate-400 bg-slate-700/50 px-2 py-0.5 rounded-full">
            {totalComps} comp{totalComps !== 1 ? "s" : ""}
          </span>
          {compsPack.avg_distance_miles != null &&
            safeNonNegative(compsPack.avg_distance_miles) !== null && (
              <span className="text-slate-500">
                Avg: {safeNonNegative(compsPack.avg_distance_miles)!.toFixed(1)}{" "}
                mi
              </span>
            )}
        </div>
      </div>

      {/* Map Placeholder */}
      {showMap && (
        <div className="mb-4">
          <MapPlaceholder
            compCount={totalComps}
            subjectAddress={compsPack.subject_address}
          />
        </div>
      )}

      {/* Comps List */}
      <div
        className={cn("space-y-3", !showMap && "mt-2")}
        data-testid="comps-list"
        role="list"
        aria-label="Comparable sales list"
      >
        {displayComps.map((comp, index) => (
          <CompCard
            key={`comp-${index}-${comp.address}`}
            comp={comp}
            index={index}
            compact={compact}
          />
        ))}
      </div>

      {/* Hidden count indicator */}
      {hiddenCount > 0 && (
        <p
          className="text-center text-xs text-slate-500 mt-3 py-2 bg-[var(--card-bg)] rounded"
          data-testid="comps-hidden-count"
        >
          +{hiddenCount} more comp{hiddenCount !== 1 ? "s" : ""} available
        </p>
      )}

      {/* Summary */}
      {showSummary && (
        <SummaryBar
          avgPrice={compsPack.avg_sale_price}
          avgDistance={compsPack.avg_distance_miles}
          avgAge={compsPack.avg_age_days}
          qualityScore={compsPack.comp_quality_score}
        />
      )}
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────

export default CompsEvidencePack;

// Re-export types from contracts for convenience
export type { CompRecord, CompAdjustment, CompsPack };

// Re-export for testing
export {
  safeNumber,
  safePositive,
  safeNonNegative,
  formatCurrency,
  formatCompactCurrency,
  formatDistance,
  formatAge,
  formatSqft,
  formatBedsBaths,
  getSafeAddress,
  getSimilarityBand,
  formatSimilarity,
  formatAdjustment,
  SIMILARITY_THRESHOLDS,
  SIMILARITY_COLORS,
};
