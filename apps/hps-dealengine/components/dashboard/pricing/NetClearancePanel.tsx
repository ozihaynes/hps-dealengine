/**
 * NetClearancePanel — Sub-Slice 9.4
 *
 * 3-column comparison panel showing profit breakdown for exit strategies:
 * - Assignment (fastest, lowest net)
 * - Double Close (balanced)
 * - Wholetail (highest net, most work)
 *
 * All values from engine outputs via props — zero calculations.
 *
 * @defensive Handles null/undefined, null wholetail exit
 * @traced data-testid for debugging and test selection
 */

import { memo } from "react";
import {
  type NetClearance,
  type ClearanceBreakdown,
  type ExitStrategyType,
} from "@hps-internal/contracts";
import { cn } from "@/components/ui";

// ─────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────

export interface NetClearancePanelProps {
  /** Net clearance from engine. Null → empty state */
  netClearance: NetClearance | null | undefined;
  /** Show recommendation reason text */
  showReason?: boolean;
  /** Compact mode reduces padding */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ─────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────

const EXIT_LABELS: Record<ExitStrategyType, string> = {
  assignment: "Assignment",
  double_close: "Double Close",
  wholetail: "Wholetail",
} as const;

const EXIT_DESCRIPTIONS: Record<ExitStrategyType, string> = {
  assignment: "Fastest exit, assign contract to buyer",
  double_close: "Buy then sell, more control",
  wholetail: "Light rehab, retail buyer, highest net",
} as const;

// UNIFIED GLASS STYLE - Matches Decision Hero Zone background
// All exit cards use the same slate-900/95 appearance
// Only "BEST" badge uses emerald color
const EXIT_CARD_STYLES = {
  // Default glass style for all cards
  default: {
    border: "border-white/10",
    bg: "bg-blue-500/10",
    text: "text-slate-200",
  },
  // Recommended card gets subtle emerald treatment
  recommended: {
    border: "border-emerald-500/40",
    bg: "bg-blue-500/10",
    text: "text-slate-200",
  },
} as const;

const RECOMMENDED_BADGE_STYLES =
  "bg-emerald-500/20 text-emerald-400 border-emerald-500/40";

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

function formatCurrency(value: number | null | undefined, showSign = false): string {
  const safe = safeNumber(value);
  if (safe === null) return "—";

  const absValue = Math.abs(safe);
  const sign = safe < 0 ? "-" : showSign && safe > 0 ? "+" : "";

  if (absValue >= 1_000_000) {
    return `${sign}$${(absValue / 1_000_000).toFixed(2)}M`;
  }
  // Use M format at 999,500+ to avoid "$1000.0K" display
  if (absValue >= 999_500) {
    return `${sign}$${(absValue / 1_000_000).toFixed(2)}M`;
  }
  if (absValue >= 1_000) {
    return `${sign}$${(absValue / 1_000).toFixed(1)}K`;
  }
  return `${sign}$${absValue.toFixed(0)}`;
}

function formatPercent(value: number | null | undefined): string {
  const safe = safeNumber(value);
  if (safe === null) return "—";
  return `${safe.toFixed(1)}%`;
}

// ─────────────────────────────────────────────────────────────────────
// SUB-COMPONENT: Exit Strategy Card
// ─────────────────────────────────────────────────────────────────────

interface ExitCardProps {
  exitKey: ExitStrategyType;
  breakdown: ClearanceBreakdown | null;
  isRecommended: boolean;
  compact: boolean;
}

function ExitCard({
  exitKey,
  breakdown,
  isRecommended,
  compact,
}: ExitCardProps): JSX.Element {
  const label = EXIT_LABELS[exitKey];
  const description = EXIT_DESCRIPTIONS[exitKey];
  // Use unified glass style - no colored backgrounds per exit type
  const styles = isRecommended ? EXIT_CARD_STYLES.recommended : EXIT_CARD_STYLES.default;

  // DEFENSIVE: Handle null breakdown (wholetail not available)
  if (!breakdown) {
    return (
      <div
        data-testid={`exit-card-${exitKey}`}
        data-available="false"
        className={cn(
          // Matches Decision Hero Zone background
          "rounded-lg border border-white/10 bg-blue-500/10 backdrop-blur-xl",
          compact ? "p-3" : "p-4",
          "flex flex-col"
        )}
      >
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-slate-500">{label}</h4>
        </div>
        <p className="text-xs text-slate-600 mb-3">{description}</p>
        <div className="flex-1 flex items-center justify-center">
          <span className="text-sm text-slate-600 italic">Not Available</span>
        </div>
      </div>
    );
  }

  const { gross, costs, net, margin_pct } = breakdown;

  return (
    <div
      data-testid={`exit-card-${exitKey}`}
      data-available="true"
      data-recommended={isRecommended}
      className={cn(
        // UNIFIED GLASS STYLE - matches Decision Hero Zone
        "rounded-lg border backdrop-blur-xl",
        styles.border,
        styles.bg,
        compact ? "p-3" : "p-4",
        "flex flex-col"
      )}
    >
      {/* Header - UNIFIED text color (no colored headers) */}
      <div className="flex items-center justify-between mb-2">
        <h4 className={cn("text-sm font-medium", styles.text)}>
          {label}
        </h4>
        {isRecommended && (
          <span
            className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-500/20 px-1.5 py-0.5 rounded flex items-center gap-1"
            data-testid={`exit-card-${exitKey}-recommended`}
          >
            <span aria-hidden="true">*</span> BEST
          </span>
        )}
      </div>

      {/* Description */}
      <p className="text-xs text-slate-400 mb-3">{description}</p>

      {/* Profit Breakdown */}
      <div className="space-y-1.5 flex-1">
        {/* Gross */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">Gross</span>
          <span className="font-medium text-slate-100 tabular-nums">
            {formatCurrency(gross)}
          </span>
        </div>

        {/* Costs - always show as negative/red */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">Costs</span>
          <span className="font-medium text-red-400 tabular-nums">
            {formatCurrency(-Math.abs(costs), true)}
          </span>
        </div>

        {/* Divider */}
        <div className="border-t border-white/10 my-1.5" />

        {/* Net - emerald if positive, red if negative */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-300 font-medium">Net</span>
          <span
            className={cn(
              "font-semibold tabular-nums",
              net >= 0 ? "text-emerald-400" : "text-red-400"
            )}
            data-testid={`exit-card-${exitKey}-net`}
          >
            {formatCurrency(net)}
          </span>
        </div>

        {/* Margin */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">Margin</span>
          <span className="font-medium text-slate-300 tabular-nums">
            {formatPercent(margin_pct)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────

export const NetClearancePanel = memo(function NetClearancePanel({
  netClearance,
  showReason = true,
  compact = false,
  className,
}: NetClearancePanelProps): JSX.Element {
  // ─────────────────────────────────────────────────────────────────
  // DEFENSIVE: Handle null/undefined net clearance
  // ─────────────────────────────────────────────────────────────────

  if (!netClearance) {
    return (
      <div
        data-testid="net-clearance-panel"
        data-state="empty"
        className={cn(
          // Matches Decision Hero Zone background
          "rounded-xl border border-white/10 bg-blue-500/10 backdrop-blur-xl p-4",
          className
        )}
      >
        <h3 className="text-sm font-medium text-slate-300 mb-2">
          Net Clearance by Exit
        </h3>
        <p className="text-sm text-slate-500 italic text-center py-4">
          Net clearance not yet calculated
        </p>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────
  // EXTRACT (all from engine, no calculations)
  // ─────────────────────────────────────────────────────────────────

  const {
    assignment,
    double_close,
    wholetail,
    recommended_exit,
    recommendation_reason,
  } = netClearance;

  // DEFENSIVE: Validate recommended_exit is valid
  const validExits: ExitStrategyType[] = [
    "assignment",
    "double_close",
    "wholetail",
  ];
  const safeRecommendedExit: ExitStrategyType = validExits.includes(
    recommended_exit
  )
    ? recommended_exit
    : "assignment";

  // Get the recommended exit's breakdown
  const exitBreakdowns: Record<ExitStrategyType, ClearanceBreakdown | null> = {
    assignment,
    double_close,
    wholetail,
  };
  const recommendedBreakdown = exitBreakdowns[safeRecommendedExit];

  // Use recommended exit's net (or 0 if not available)
  const recommendedNet = recommendedBreakdown?.net ?? 0;

  // ─────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────

  return (
    <div
      data-testid="net-clearance-panel"
      data-state="loaded"
      data-recommended={safeRecommendedExit}
      className={cn(
        // Matches Decision Hero Zone background
        "rounded-xl border border-white/10 bg-blue-500/10 backdrop-blur-xl",
        compact ? "p-3" : "p-4",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-slate-300">
          Net Clearance by Exit
        </h3>
        <span
          className="text-xs font-medium text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full"
          data-testid="net-clearance-best-label"
        >
          Best: {EXIT_LABELS[safeRecommendedExit]} ({formatCurrency(recommendedNet)})
        </span>
      </div>

      {/* 3-Column Grid */}
      <div
        className="grid grid-cols-1 md:grid-cols-3 gap-3"
        data-testid="net-clearance-grid"
      >
        <ExitCard
          exitKey="assignment"
          breakdown={assignment}
          isRecommended={safeRecommendedExit === "assignment"}
          compact={compact}
        />
        <ExitCard
          exitKey="double_close"
          breakdown={double_close}
          isRecommended={safeRecommendedExit === "double_close"}
          compact={compact}
        />
        <ExitCard
          exitKey="wholetail"
          breakdown={wholetail}
          isRecommended={safeRecommendedExit === "wholetail"}
          compact={compact}
        />
      </div>

      {/* Recommendation Reason */}
      {showReason && recommendation_reason && (
        <div
          className="mt-3 pt-3 border-t border-white/10"
          data-testid="net-clearance-reason"
        >
          <p className="text-xs text-slate-500">
            <span className="font-medium text-slate-400">Recommendation:</span>{" "}
            {recommendation_reason}
          </p>
        </div>
      )}
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────

export default NetClearancePanel;

// Re-export for testing
export {
  safeNumber,
  formatCurrency,
  formatPercent,
  EXIT_LABELS,
  EXIT_DESCRIPTIONS,
  EXIT_CARD_STYLES,
};
