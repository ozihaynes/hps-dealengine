/**
 * CompsEvidencePack
 *
 * Displays comparable sales used for ARV/AIV valuation with:
 * - Summary strip (count, averages, range)
 * - Expandable comp cards with details
 * - Adjustment breakdowns
 * - Provenance footer
 *
 * PRINCIPLES:
 * - Progressive Disclosure: Summary → Card → Adjustments
 * - Miller's Law: 5-7 comps typical, scrollable if more
 * - Gestalt (Proximity): Related info grouped
 * - Accessibility: aria-labels, keyboard nav, focus states, reduced motion
 */

"use client";

import { memo, useState, useMemo, useCallback } from "react";
import {
  HomeIcon,
  MapPinIcon,
  CalendarIcon,
  ChevronDownIcon,
  RefreshCwIcon,
  ImageOffIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  MinusIcon,
  CheckIcon,
} from "lucide-react";
import type {
  CompsEvidencePack as CompsEvidencePackType,
  CompDisplay,
} from "@hps-internal/contracts";

// =============================================================================
// CONSTANTS
// =============================================================================

/** Similarity score thresholds for color coding */
const SIMILARITY_THRESHOLDS = {
  HIGH: 80, // >= 80% = green
  MEDIUM: 60, // >= 60% = amber, < 60% = red
} as const;

// =============================================================================
// TYPES
// =============================================================================

export interface CompsEvidencePackProps {
  /** The comps evidence pack data */
  data: CompsEvidencePackType | null | undefined;
  /** Loading state */
  isLoading?: boolean;
  /** Refresh callback */
  onRefresh?: () => void;
  /** Refreshing state */
  isRefreshing?: boolean;
  /** Initially expanded */
  defaultExpanded?: boolean;
  /** Max comps to show before "show more" */
  initialVisibleCount?: number;
}

// =============================================================================
// HELPERS
// =============================================================================

function safeNumber(val: unknown): number | null {
  if (val == null) return null;
  const n = Number(val);
  if (!Number.isFinite(n)) return null;
  return n;
}

function formatCurrency(val: number | null | undefined): string {
  if (val == null) return "—";
  const n = safeNumber(val);
  if (n == null) return "—";

  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);

  if (abs >= 1_000_000) {
    return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  }
  if (abs >= 1_000) {
    return `${sign}$${Math.round(abs / 1_000)}K`;
  }
  return `${sign}$${abs.toLocaleString()}`;
}

function formatDistance(val: number | null | undefined): string {
  const n = safeNumber(val);
  if (n == null) return "—";
  return `${n.toFixed(1)} mi`;
}

function formatDays(val: number | null | undefined): string {
  const n = safeNumber(val);
  if (n == null) return "—";
  return `${Math.round(n)} days`;
}

function formatPercent(
  val: number | null | undefined,
  showSign = false
): string {
  const n = safeNumber(val);
  if (n == null) return "—";
  const sign = showSign && n > 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}%`;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

/** Format beds/baths for display */
function formatBedsBaths(beds: number | null, baths: number | null): string {
  const bedsStr = beds != null ? `${Math.round(beds)}` : "—";
  const bathsStr =
    baths != null
      ? Number.isInteger(baths)
        ? `${baths}`
        : baths.toFixed(1)
      : "—";
  return `${bedsStr}bd/${bathsStr}ba`;
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/** Similarity score bar with color coding */
function SimilarityBar({ score }: { score: number | null }) {
  const pct = safeNumber(score);
  if (pct == null) return <span className="text-slate-500">—</span>;

  const fillWidth = Math.min(100, Math.max(0, pct));
  const color =
    pct >= SIMILARITY_THRESHOLDS.HIGH
      ? "bg-emerald-500"
      : pct >= SIMILARITY_THRESHOLDS.MEDIUM
        ? "bg-amber-500"
        : "bg-red-500";

  return (
    <div className="flex items-center gap-2">
      <div
        className="h-2 w-20 rounded-full bg-slate-700 overflow-hidden"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Similarity score: ${pct}%`}
      >
        <div
          className={`h-full rounded-full transition-all duration-300 motion-reduce:transition-none ${color}`}
          style={{ width: `${fillWidth}%` }}
        />
      </div>
      <span className="text-sm font-medium text-slate-300">{pct}%</span>
    </div>
  );
}

/** Adjustment chip with direction indicator */
function AdjustmentChip({
  label,
  amount,
  direction,
}: {
  label: string;
  amount: number;
  direction: "up" | "down" | "neutral";
}) {
  const Icon =
    direction === "up"
      ? TrendingUpIcon
      : direction === "down"
        ? TrendingDownIcon
        : MinusIcon;

  const colorClass =
    direction === "up"
      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
      : direction === "down"
        ? "bg-red-500/20 text-red-300 border-red-500/30"
        : "bg-slate-500/20 text-slate-400 border-slate-500/30";

  const sign = direction === "up" ? "+" : "";

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded border ${colorClass}`}
      title={`${label}: ${sign}${formatCurrency(amount)}`}
    >
      <Icon className="w-3 h-3" aria-hidden="true" />
      <span>{label}</span>
      <span className="font-medium">
        {sign}
        {formatCurrency(amount)}
      </span>
    </span>
  );
}

/** Comp kind badge with appropriate styling */
function CompKindBadge({
  kind,
}: {
  kind: "closed_sale" | "sale_listing" | null;
}) {
  if (kind === "closed_sale") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded bg-emerald-500/20 text-emerald-300">
        <CheckIcon className="w-3 h-3" aria-hidden="true" />
        Closed Sale
      </span>
    );
  }
  if (kind === "sale_listing") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded bg-amber-500/20 text-amber-300">
        Active Listing
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded bg-slate-500/20 text-slate-400">
      Unknown
    </span>
  );
}

/** Single comp card - expandable */
function CompCard({
  comp,
  index,
  isExpanded,
  onToggle,
}: {
  comp: CompDisplay;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const hasPhoto = !!comp.photo_url;
  const hasAdjustments = comp.adjustments && comp.adjustments.length > 0;
  const addressDisplay = comp.address || "Address unavailable";

  return (
    <div
      className="rounded-lg border border-slate-700/50 bg-slate-800/30 overflow-hidden hover:border-slate-600/50 transition-colors motion-reduce:transition-none"
      data-testid={`comp-card-${index}`}
    >
      <button
        className="w-full flex items-start gap-4 p-4 text-left focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-inset"
        onClick={onToggle}
        aria-expanded={isExpanded}
        aria-controls={`comp-details-${index}`}
      >
        {/* Photo or placeholder */}
        <div className="w-16 h-16 rounded-md bg-slate-700 flex-shrink-0 overflow-hidden">
          {hasPhoto ? (
            <img
              src={comp.photo_url!}
              alt={`Property at ${addressDisplay}`}
              className="w-full h-full object-cover"
              loading="lazy"
              onError={(e) => {
                // Hide broken image, show placeholder
                e.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageOffIcon
                className="w-6 h-6 text-slate-500"
                aria-hidden="true"
              />
            </div>
          )}
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="text-sm font-medium text-slate-200 truncate">
                {addressDisplay}
              </h4>
              <div className="flex items-center gap-2 mt-1">
                <CompKindBadge kind={comp.comp_kind} />
                {comp.mls_number && (
                  <span className="text-xs text-slate-500">
                    MLS# {comp.mls_number}
                  </span>
                )}
              </div>
            </div>
            <ChevronDownIcon
              className={`w-5 h-5 text-slate-400 transition-transform motion-reduce:transition-none flex-shrink-0 ${
                isExpanded ? "rotate-180" : ""
              }`}
              aria-hidden="true"
            />
          </div>

          {/* Key metrics row */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-sm text-slate-400">
            <span className="font-semibold text-slate-200">
              {formatCurrency(comp.price)}
            </span>
            <span>•</span>
            <span>{formatCurrency(comp.price_per_sqft)}/sqft</span>
            <span>•</span>
            <span>{formatBedsBaths(comp.beds, comp.baths)}</span>
            <span>•</span>
            <span>{comp.sqft?.toLocaleString() ?? "—"} sqft</span>
            {comp.year_built && (
              <>
                <span>•</span>
                <span>{comp.year_built}</span>
              </>
            )}
          </div>
        </div>
      </button>

      {/* Expanded details */}
      {isExpanded && (
        <div
          id={`comp-details-${index}`}
          className="px-4 pb-4 pt-0 border-t border-slate-700/50"
        >
          <div className="pt-4 space-y-4">
            {/* Similarity / Distance / Age */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <div className="text-xs text-slate-500 mb-1">Similarity</div>
                <SimilarityBar score={comp.similarity_score} />
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">Distance</div>
                <div className="flex items-center gap-1 text-sm text-slate-300">
                  <MapPinIcon
                    className="w-4 h-4 text-slate-500"
                    aria-hidden="true"
                  />
                  {formatDistance(comp.distance_miles)}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">Sale Age</div>
                <div className="flex items-center gap-1 text-sm text-slate-300">
                  <CalendarIcon
                    className="w-4 h-4 text-slate-500"
                    aria-hidden="true"
                  />
                  {formatDays(comp.days_old)}
                </div>
              </div>
            </div>

            {/* Adjustments */}
            {hasAdjustments && (
              <div>
                <div className="text-xs text-slate-500 mb-2">Adjustments</div>
                <div className="flex flex-wrap gap-2">
                  {comp.adjustments!.map((adj, i) => (
                    <AdjustmentChip
                      key={`${adj.type}-${i}`}
                      label={adj.label}
                      amount={adj.amount}
                      direction={adj.direction}
                    />
                  ))}
                </div>
                {comp.adjusted_value != null && (
                  <div className="mt-2 text-sm">
                    <span className="text-slate-400">Adjusted Value: </span>
                    <span className="font-semibold text-slate-200">
                      {formatCurrency(comp.adjusted_value)}
                    </span>
                    {comp.net_adjustment_pct != null && (
                      <span
                        className={`ml-1 ${
                          comp.net_adjustment_pct > 0
                            ? "text-emerald-400"
                            : comp.net_adjustment_pct < 0
                              ? "text-red-400"
                              : "text-slate-400"
                        }`}
                      >
                        ({formatPercent(comp.net_adjustment_pct, true)})
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Sale date / DOM / Source */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
              <span>
                {comp.comp_kind === "closed_sale" ? "Sold" : "Listed"}:{" "}
                {formatDate(comp.sale_date)}
              </span>
              {comp.dom != null && <span>DOM: {comp.dom}</span>}
              <span>Source: {comp.source}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// LOADING SKELETON
// =============================================================================

function LoadingSkeleton() {
  return (
    <div
      className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-6"
      data-testid="comps-evidence-pack-loading"
      role="status"
      aria-label="Loading comparable sales"
    >
      <div className="animate-pulse motion-reduce:animate-none space-y-4">
        <div className="h-6 w-48 bg-slate-700 rounded" />
        <div className="h-4 w-full bg-slate-700 rounded" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-slate-700 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// EMPTY STATE
// =============================================================================

function EmptyState({
  onRefresh,
  isRefreshing,
}: {
  onRefresh?: () => void;
  isRefreshing?: boolean;
}) {
  return (
    <div
      className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-6"
      data-testid="comps-evidence-pack-empty"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
          <HomeIcon className="w-5 h-5 text-slate-400" aria-hidden="true" />
          Comparable Sales
        </h3>
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-lg hover:bg-slate-700/50 transition-colors motion-reduce:transition-none disabled:opacity-50"
            aria-label="Refresh comparable sales"
          >
            <RefreshCwIcon
              className={`w-4 h-4 text-slate-400 ${isRefreshing ? "animate-spin motion-reduce:animate-none" : ""}`}
            />
          </button>
        )}
      </div>
      <div className="text-center py-8">
        <HomeIcon
          className="w-12 h-12 text-slate-600 mx-auto mb-3"
          aria-hidden="true"
        />
        <p className="text-slate-400">No comparable sales available</p>
        <p className="text-sm text-slate-500 mt-1">
          Run a valuation to populate comparable sales data.
        </p>
      </div>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const CompsEvidencePack = memo(function CompsEvidencePack({
  data,
  isLoading = false,
  onRefresh,
  isRefreshing = false,
  defaultExpanded = true,
  initialVisibleCount = 5,
}: CompsEvidencePackProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [expandedCards, setExpandedCards] = useState<Set<number>>(
    new Set([0])
  ); // First card expanded by default
  const [showAll, setShowAll] = useState(false);

  // Visible comps (limited initially, show all when expanded)
  const visibleComps = useMemo(() => {
    if (!data?.comps) return [];
    return showAll ? data.comps : data.comps.slice(0, initialVisibleCount);
  }, [data?.comps, showAll, initialVisibleCount]);

  const hiddenCount = (data?.comps?.length ?? 0) - visibleComps.length;

  // Memoized toggle handler to prevent child re-renders
  const toggleCard = useCallback((index: number) => {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  // Memoized show all handler
  const handleShowAll = useCallback(() => {
    setShowAll(true);
  }, []);

  // Loading state
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  // Empty state
  if (!data || data.comp_count === 0) {
    return <EmptyState onRefresh={onRefresh} isRefreshing={isRefreshing} />;
  }

  // Format comp count label based on comp_kind_used
  const compCountLabel = (() => {
    if (data.comp_kind_used === "closed_sale") return "sold";
    if (data.comp_kind_used === "sale_listing") return "listed";
    return "comps";
  })();

  return (
    <div
      className="rounded-xl border border-slate-700/50 bg-slate-800/30"
      data-testid="comps-evidence-pack"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-lg font-semibold text-slate-200 hover:text-white transition-colors motion-reduce:transition-none"
          aria-expanded={isExpanded}
          aria-controls="comps-content"
        >
          <HomeIcon className="w-5 h-5 text-slate-400" aria-hidden="true" />
          Comparable Sales
          <span className="text-sm font-normal text-slate-400">
            ({data.comp_count} {compCountLabel})
          </span>
          <ChevronDownIcon
            className={`w-5 h-5 text-slate-400 transition-transform motion-reduce:transition-none ${
              isExpanded ? "rotate-180" : ""
            }`}
            aria-hidden="true"
          />
        </button>

        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-lg hover:bg-slate-700/50 transition-colors motion-reduce:transition-none disabled:opacity-50"
            aria-label="Refresh comparable sales"
          >
            <RefreshCwIcon
              className={`w-4 h-4 text-slate-400 ${isRefreshing ? "animate-spin motion-reduce:animate-none" : ""}`}
            />
          </button>
        )}
      </div>

      {/* Content */}
      {isExpanded && (
        <div id="comps-content" className="p-4 space-y-4">
          {/* Summary strip */}
          <div
            className="flex flex-wrap items-center gap-x-4 gap-y-2 p-3 rounded-lg bg-slate-900/50 text-sm text-slate-400"
            data-testid="comps-summary"
          >
            <span>
              <span className="text-slate-200 font-medium">
                {data.comp_count}
              </span>{" "}
              Comps
            </span>
            <span className="hidden sm:inline">•</span>
            <span>
              Avg{" "}
              <span className="text-slate-200">
                {formatDistance(data.avg_distance_miles)}
              </span>
            </span>
            <span className="hidden sm:inline">•</span>
            <span>
              Avg{" "}
              <span className="text-slate-200">
                {formatDays(data.avg_days_old)}
              </span>{" "}
              old
            </span>
            <span className="hidden sm:inline">•</span>
            <span>
              <span className="text-slate-200">
                {formatCurrency(data.price_range_low)}–
                {formatCurrency(data.price_range_high)}
              </span>
              {data.price_variance_pct != null && (
                <span className="text-slate-500 ml-1">
                  ({formatPercent(data.price_variance_pct)} range)
                </span>
              )}
            </span>
            {data.avg_similarity_score != null && (
              <>
                <span className="hidden sm:inline">•</span>
                <span>
                  Avg Similarity:{" "}
                  <span className="text-slate-200">
                    {formatPercent(data.avg_similarity_score)}
                  </span>
                </span>
              </>
            )}
          </div>

          {/* Comp cards with aria-live for screen readers */}
          <div className="space-y-3" aria-live="polite" aria-atomic="false">
            {visibleComps.map((comp, index) => (
              <CompCard
                key={comp.id}
                comp={comp}
                index={index}
                isExpanded={expandedCards.has(index)}
                onToggle={() => toggleCard(index)}
              />
            ))}
          </div>

          {/* Show more button */}
          {hiddenCount > 0 && (
            <button
              onClick={handleShowAll}
              className="w-full py-2 text-sm text-blue-400 hover:text-blue-300 transition-colors motion-reduce:transition-none"
            >
              Show {hiddenCount} more comp{hiddenCount !== 1 ? "s" : ""}
            </button>
          )}

          {/* Provenance footer */}
          <div
            className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-3 border-t border-slate-700/50 text-xs text-slate-500"
            data-testid="comps-provenance"
          >
            {data.provider && <span>Provider: {data.provider}</span>}
            {data.snapshot_as_of && (
              <span>As of: {formatDate(data.snapshot_as_of)}</span>
            )}
            {data.selection_version && (
              <span>Selection: {data.selection_version}</span>
            )}
            {data.outliers_removed_count != null &&
              data.outliers_removed_count > 0 && (
                <span>
                  {data.outliers_removed_count} outlier
                  {data.outliers_removed_count !== 1 ? "s" : ""} removed
                </span>
              )}
            {data.valuation_run_id && (
              <span className="font-mono">
                Run: {data.valuation_run_id.slice(0, 8)}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

CompsEvidencePack.displayName = "CompsEvidencePack";

export default CompsEvidencePack;
