/**
 * TradingStrip — Sub-Slice 9.12 (Hero Component)
 *
 * The "Decision Bar" — answers "Should I pursue this deal?" in 5 seconds.
 * Displays verdict, key metrics, rationale, and primary action.
 *
 * This is the MOST CRITICAL component in the V2.5 Dashboard.
 * All values from engine outputs via props — zero calculations.
 *
 * @defensive Handles null/undefined, NaN, negative values, invalid enums
 * @traced data-testid for debugging and test selection
 * @accessible Full ARIA support for screen readers
 */

import { memo } from "react";
import {
  type DealVerdict,
  type DealVerdictRecommendation,
  type PriceGeometry,
  type NetClearance,
  type EnhancedRiskSummary,
} from "@hps-internal/contracts";
import { cn } from "@/components/ui";

// ─────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────

export interface TradingStripProps {
  /** Deal verdict from engine. Null → loading/empty state */
  verdict: DealVerdict | null | undefined;
  /** Price geometry from engine (for ZOPA display) */
  priceGeometry: PriceGeometry | null | undefined;
  /** Net clearance from engine (for profit display) */
  netClearance: NetClearance | null | undefined;
  /** Risk summary from engine (for gates display) */
  riskSummary: EnhancedRiskSummary | null | undefined;
  /** Callback when user clicks primary action */
  onPrimaryAction?: () => void;
  /** Callback when user clicks secondary action (if applicable) */
  onSecondaryAction?: () => void;
  /** Whether the strip should stick to top on scroll */
  sticky?: boolean;
  /** Compact mode for smaller displays */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ─────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────

type VerdictKey = DealVerdictRecommendation | "unknown";

const VALID_VERDICTS: readonly DealVerdictRecommendation[] = [
  "pursue",
  "needs_evidence",
  "pass",
] as const;

const VERDICT_CONFIG: Record<
  VerdictKey,
  {
    label: string;
    icon: string;
    color: string;
    bgColor: string;
    borderColor: string;
    glowColor: string;
    ctaLabel: string;
    ctaIcon: string;
  }
> = {
  pursue: {
    label: "PURSUE",
    icon: "✓",
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/30",
    glowColor: "shadow-emerald-500/20",
    ctaLabel: "Generate Offer",
    ctaIcon: "→",
  },
  needs_evidence: {
    label: "NEEDS EVIDENCE",
    icon: "?",
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30",
    glowColor: "shadow-amber-500/20",
    ctaLabel: "Request Evidence",
    ctaIcon: "→",
  },
  pass: {
    label: "PASS",
    icon: "✗",
    color: "text-slate-400",
    bgColor: "bg-slate-500/10",
    borderColor: "border-slate-500/30",
    glowColor: "shadow-slate-500/20",
    ctaLabel: "Archive Deal",
    ctaIcon: "↓",
  },
  unknown: {
    label: "ANALYZING",
    icon: "…",
    color: "text-slate-500",
    bgColor: "bg-slate-800/50",
    borderColor: "border-slate-700",
    glowColor: "",
    ctaLabel: "Waiting",
    ctaIcon: "",
  },
} as const;

const EXIT_LABELS: Record<string, string> = {
  assignment: "Assignment",
  double_close: "Double Close",
  wholetail: "Wholetail",
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
// HELPER: Validate and normalize verdict
// ─────────────────────────────────────────────────────────────────────

function getSafeVerdict(
  recommendation: string | null | undefined
): VerdictKey {
  if (!recommendation) return "unknown";
  const lower = recommendation.trim().toLowerCase();
  if (VALID_VERDICTS.includes(lower as DealVerdictRecommendation)) {
    return lower as DealVerdictRecommendation;
  }
  return "unknown";
}

// ─────────────────────────────────────────────────────────────────────
// HELPER: Format currency with K/M suffix and boundary handling
// ─────────────────────────────────────────────────────────────────────

function formatCurrency(value: number | null | undefined): string {
  const safe = safeNumber(value);
  if (safe === null) return "—";

  const absValue = Math.abs(safe);
  const sign = safe < 0 ? "-" : "";

  // Handle millions (>= $999,500 to avoid "$1000K")
  if (absValue >= 999_500) {
    const millions = absValue / 1_000_000;
    return `${sign}$${millions.toFixed(1)}M`;
  }

  // Handle thousands (>= $1,000)
  if (absValue >= 1_000) {
    const thousands = absValue / 1_000;
    // Use 1 decimal for values like $18.5K, no decimal for round numbers
    const formatted =
      thousands % 1 === 0 ? thousands.toFixed(0) : thousands.toFixed(1);
    return `${sign}$${formatted}K`;
  }

  // Handle small values
  return `${sign}$${Math.round(absValue).toLocaleString()}`;
}

// ─────────────────────────────────────────────────────────────────────
// HELPER: Format percentage for display
// ─────────────────────────────────────────────────────────────────────

function formatPercent(pct: number | null | undefined): string {
  const safe = safeNumber(pct);
  if (safe === null) return "—";
  if (safe < 0) return "—";
  return `${safe.toFixed(1)}%`;
}

// ─────────────────────────────────────────────────────────────────────
// HELPER: Get best net from clearance
// ─────────────────────────────────────────────────────────────────────

function getBestNet(
  clearance: NetClearance | null | undefined
): { net: number | null; exit: string } {
  if (!clearance) return { net: null, exit: "unknown" };

  const recommendedExit = clearance.recommended_exit;

  // Get net from recommended exit
  let net: number | null = null;

  if (recommendedExit === "assignment" && clearance.assignment) {
    net = safeNumber(clearance.assignment.net);
  } else if (recommendedExit === "double_close" && clearance.double_close) {
    net = safeNumber(clearance.double_close.net);
  } else if (recommendedExit === "wholetail" && clearance.wholetail) {
    net = safeNumber(clearance.wholetail.net);
  }

  return { net, exit: recommendedExit || "unknown" };
}

// ─────────────────────────────────────────────────────────────────────
// HELPER: Calculate gates summary from EnhancedRiskSummary
// ─────────────────────────────────────────────────────────────────────

function getGatesSummary(
  riskSummary: EnhancedRiskSummary | null | undefined
): { pass: number; total: number; blocking: number } {
  if (!riskSummary) return { pass: 0, total: 0, blocking: 0 };

  // Count gates from the gates object
  const gates = riskSummary.gates;
  if (!gates || typeof gates !== "object") {
    return { pass: 0, total: 0, blocking: 0 };
  }

  const gateEntries = Object.values(gates);
  const total = gateEntries.length;

  // Count passing gates (status === "pass")
  const pass = gateEntries.filter((g) => g?.status === "pass").length;

  // Count blocking gates
  const blocking = gateEntries.filter((g) => g?.is_blocking === true).length;

  return {
    pass: Math.max(0, pass),
    total: Math.max(0, total),
    blocking: Math.max(0, blocking),
  };
}

// ─────────────────────────────────────────────────────────────────────
// HELPER: Get ZOPA display values
// ─────────────────────────────────────────────────────────────────────

function getZopaDisplay(
  geometry: PriceGeometry | null | undefined
): { zopa: string; pctOfArv: string; exists: boolean } {
  if (!geometry) return { zopa: "—", pctOfArv: "—", exists: false };

  const zopaValue = safeNumber(geometry.zopa);
  const zopaPct = safeNumber(geometry.zopa_pct_of_arv);
  const exists =
    geometry.zopa_exists === true && zopaValue !== null && zopaValue > 0;

  return {
    zopa: exists ? formatCurrency(zopaValue) : "No ZOPA",
    pctOfArv: exists && zopaPct !== null ? formatPercent(zopaPct) : "—",
    exists,
  };
}

// ─────────────────────────────────────────────────────────────────────
// SUB-COMPONENT: Metric Card
// ─────────────────────────────────────────────────────────────────────

interface MetricCardProps {
  label: string;
  value: string;
  subValue?: string;
  variant: "positive" | "warning" | "neutral" | "negative";
  testId: string;
}

function MetricCard({
  label,
  value,
  subValue,
  variant,
  testId,
}: MetricCardProps): JSX.Element {
  const variantStyles = {
    positive: "border-emerald-500/30 bg-emerald-500/5",
    warning: "border-amber-500/30 bg-amber-500/5",
    neutral: "border-slate-600 bg-slate-800/50",
    negative: "border-red-500/30 bg-red-500/5",
  };

  const valueStyles = {
    positive: "text-emerald-400",
    warning: "text-amber-400",
    neutral: "text-slate-300",
    negative: "text-red-400",
  };

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-3 rounded-lg border min-w-[100px]",
        variantStyles[variant]
      )}
      data-testid={testId}
    >
      <span
        className={cn("text-xl font-bold", valueStyles[variant])}
        data-testid={`${testId}-value`}
      >
        {value}
      </span>
      <span className="text-xs text-slate-500 mt-0.5">{label}</span>
      {subValue && (
        <span
          className="text-[10px] text-slate-600 mt-0.5"
          data-testid={`${testId}-subvalue`}
        >
          {subValue}
        </span>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// HELPER: Default rationale by verdict
// ─────────────────────────────────────────────────────────────────────

function getDefaultRationale(v: VerdictKey): string {
  switch (v) {
    case "pursue":
      return "Ready to make an offer";
    case "needs_evidence":
      return "Additional information required before proceeding";
    case "pass":
      return "Deal does not meet investment criteria";
    default:
      return "Analyzing deal data...";
  }
}

// ─────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────

export const TradingStrip = memo(function TradingStrip({
  verdict,
  priceGeometry,
  netClearance,
  riskSummary,
  onPrimaryAction,
  onSecondaryAction,
  sticky = false,
  compact = false,
  className,
}: TradingStripProps): JSX.Element {
  // ─────────────────────────────────────────────────────────────────
  // PROCESS VERDICT (with defensive guards)
  // ─────────────────────────────────────────────────────────────────

  const safeVerdict = getSafeVerdict(verdict?.recommendation);
  const config = VERDICT_CONFIG[safeVerdict];
  const isLoading = !verdict;
  const isPursue = safeVerdict === "pursue";
  const isNeedsEvidence = safeVerdict === "needs_evidence";
  const isPass = safeVerdict === "pass";

  // ─────────────────────────────────────────────────────────────────
  // PROCESS METRICS (with defensive guards)
  // ─────────────────────────────────────────────────────────────────

  const { net: bestNet, exit: bestExit } = getBestNet(netClearance);
  const { zopa, pctOfArv, exists: zopaExists } = getZopaDisplay(priceGeometry);
  const {
    pass: gatesPass,
    total: gatesTotal,
    blocking: gatesBlocking,
  } = getGatesSummary(riskSummary);

  // ─────────────────────────────────────────────────────────────────
  // DETERMINE METRIC VARIANTS
  // ─────────────────────────────────────────────────────────────────

  const netVariant: MetricCardProps["variant"] =
    bestNet === null
      ? "neutral"
      : bestNet >= 15_000
        ? "positive"
        : bestNet >= 5_000
          ? "warning"
          : bestNet >= 0
            ? "neutral"
            : "negative";

  const zopaVariant: MetricCardProps["variant"] = !zopaExists
    ? "negative"
    : safeNumber(priceGeometry?.zopa) !== null &&
        safeNumber(priceGeometry?.zopa)! >= 30_000
      ? "positive"
      : "warning";

  const gatesVariant: MetricCardProps["variant"] =
    gatesBlocking > 0
      ? "negative"
      : gatesPass === gatesTotal && gatesTotal > 0
        ? "positive"
        : "warning";

  // ─────────────────────────────────────────────────────────────────
  // RATIONALE TEXT
  // ─────────────────────────────────────────────────────────────────

  const rationale = verdict?.rationale || getDefaultRationale(safeVerdict);

  // ─────────────────────────────────────────────────────────────────
  // BLOCKING FACTORS SUMMARY
  // ─────────────────────────────────────────────────────────────────

  const blockingFactors = Array.isArray(verdict?.blocking_factors)
    ? verdict.blocking_factors.filter((f) => f && typeof f === "string")
    : [];

  // ─────────────────────────────────────────────────────────────────
  // CONFIDENCE VALUE
  // ─────────────────────────────────────────────────────────────────

  const confidencePct = safeNumber(verdict?.confidence_pct);

  // ─────────────────────────────────────────────────────────────────
  // RENDER: Loading State
  // ─────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div
        data-testid="trading-strip"
        data-state="loading"
        className={cn(
          "rounded-xl border border-white/10 bg-slate-800/80 backdrop-blur-xl",
          "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]",
          sticky && "sticky top-0 z-50",
          compact ? "p-4" : "p-6",
          className
        )}
      >
        <div className="animate-pulse">
          {/* Verdict skeleton */}
          <div className="flex justify-center mb-4">
            <div className="h-12 w-48 bg-slate-700 rounded-lg" />
          </div>
          {/* Rationale skeleton */}
          <div className="flex justify-center mb-4">
            <div className="h-4 w-64 bg-slate-700 rounded" />
          </div>
          {/* Metrics skeleton */}
          <div className="flex justify-center gap-4 mb-4">
            <div className="h-20 w-28 bg-slate-700 rounded-lg" />
            <div className="h-20 w-28 bg-slate-700 rounded-lg" />
            <div className="h-20 w-28 bg-slate-700 rounded-lg" />
          </div>
          {/* CTA skeleton */}
          <div className="flex justify-center">
            <div className="h-12 w-48 bg-slate-700 rounded-lg" />
          </div>
        </div>
        <p className="text-center text-sm text-slate-500 mt-2">
          Analyzing deal data...
        </p>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────
  // RENDER: Main Component
  // ─────────────────────────────────────────────────────────────────

  return (
    <div
      data-testid="trading-strip"
      data-state="loaded"
      data-verdict={safeVerdict}
      className={cn(
        "rounded-xl border backdrop-blur-sm transition-all duration-300",
        config.borderColor,
        config.bgColor,
        isPursue && "shadow-lg shadow-emerald-500/10",
        sticky && "sticky top-0 z-50",
        compact ? "p-4" : "p-6",
        className
      )}
      role="region"
      aria-label="Deal decision summary"
    >
      {/* ─────────────────────────────────────────────────────────────
          VERDICT HERO
          ───────────────────────────────────────────────────────────── */}
      <div
        className="flex flex-col items-center mb-4"
        data-testid="verdict-hero"
      >
        {/* Verdict Badge */}
        <div
          className={cn(
            "flex items-center gap-3 px-6 py-3 rounded-xl border-2",
            config.borderColor,
            config.bgColor,
            isPursue && "shadow-lg shadow-emerald-500/20"
          )}
          data-testid="verdict-badge"
        >
          <span
            className={cn("text-3xl font-bold", config.color)}
            aria-hidden="true"
          >
            {config.icon}
          </span>
          <span
            className={cn("text-2xl font-bold tracking-wide", config.color)}
          >
            {config.label}
          </span>
        </div>

        {/* Rationale */}
        <p
          className="text-sm text-slate-400 mt-3 text-center max-w-md"
          data-testid="verdict-rationale"
        >
          {rationale}
        </p>

        {/* Blocking Factors (if PASS) */}
        {isPass && blockingFactors.length > 0 && (
          <div
            className="mt-2 text-xs text-red-400/80 text-center"
            data-testid="blocking-factors-summary"
          >
            {blockingFactors.length === 1
              ? `Blocked by: ${blockingFactors[0]}`
              : `Blocked by ${blockingFactors.length} factors`}
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          KEY METRICS TRIO
          ───────────────────────────────────────────────────────────── */}
      <div
        className="flex flex-wrap justify-center gap-3 mb-5"
        data-testid="metrics-trio"
        role="group"
        aria-label="Key deal metrics"
      >
        {/* Net Profit */}
        <MetricCard
          label="Net Profit"
          value={formatCurrency(bestNet)}
          subValue={
            bestExit !== "unknown"
              ? EXIT_LABELS[bestExit] || bestExit
              : undefined
          }
          variant={netVariant}
          testId="metric-net"
        />

        {/* ZOPA */}
        <MetricCard
          label="ZOPA"
          value={zopa}
          subValue={zopaExists ? `${pctOfArv} of ARV` : undefined}
          variant={zopaVariant}
          testId="metric-zopa"
        />

        {/* Risk Gates */}
        <MetricCard
          label="Risk Gates"
          value={gatesTotal > 0 ? `${gatesPass}/${gatesTotal}` : "—"}
          subValue={
            gatesBlocking > 0
              ? `${gatesBlocking} blocking`
              : gatesPass === gatesTotal && gatesTotal > 0
                ? "All clear"
                : undefined
          }
          variant={gatesVariant}
          testId="metric-gates"
        />
      </div>

      {/* ─────────────────────────────────────────────────────────────
          PRIMARY CTA
          ───────────────────────────────────────────────────────────── */}
      <div className="flex justify-center gap-3" data-testid="cta-section">
        <button
          type="button"
          onClick={onPrimaryAction}
          disabled={!onPrimaryAction || safeVerdict === "unknown"}
          className={cn(
            "flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-base",
            "transition-all duration-200",
            "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900",
            // PURSUE: Emerald solid button
            isPursue && "bg-emerald-600 text-white hover:bg-emerald-500 focus:ring-emerald-500 shadow-lg shadow-emerald-500/25",
            // NEEDS_EVIDENCE: Amber solid button
            isNeedsEvidence && "bg-amber-600 text-white hover:bg-amber-500 focus:ring-amber-500",
            // PASS: Slate outline button
            isPass && "bg-slate-700 text-slate-300 hover:bg-slate-600 focus:ring-slate-500",
            // Unknown/Loading: Disabled
            safeVerdict === "unknown" && "bg-slate-700 text-slate-500 cursor-not-allowed",
            // Disabled state
            !onPrimaryAction && "opacity-50 cursor-not-allowed"
          )}
          data-testid="cta-primary"
          aria-label={config.ctaLabel}
        >
          <span>{config.ctaLabel}</span>
          {config.ctaIcon && <span aria-hidden="true">{config.ctaIcon}</span>}
        </button>

        {/* Secondary action for NEEDS_EVIDENCE */}
        {isNeedsEvidence && onSecondaryAction && (
          <button
            type="button"
            onClick={onSecondaryAction}
            className={cn(
              "flex items-center gap-2 px-4 py-3 rounded-lg font-medium text-sm",
              "border border-slate-600 text-slate-400",
              "hover:bg-slate-700 hover:text-slate-300",
              "transition-all duration-200",
              "focus:outline-none focus:ring-2 focus:ring-slate-500"
            )}
            data-testid="cta-secondary"
          >
            Skip for Now
          </button>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          CONFIDENCE INDICATOR (subtle, bottom)
          ───────────────────────────────────────────────────────────── */}
      {confidencePct !== null && (
        <div
          className="mt-4 flex justify-center"
          data-testid="confidence-indicator"
        >
          <span className="text-xs text-slate-600">
            Confidence:{" "}
            <span
              className={cn(
                confidencePct >= 80
                  ? "text-emerald-500"
                  : confidencePct >= 50
                    ? "text-amber-500"
                    : "text-slate-500"
              )}
            >
              {Math.round(confidencePct)}%
            </span>
          </span>
        </div>
      )}
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────

export default TradingStrip;

// Re-export for testing
export {
  safeNumber,
  getSafeVerdict,
  formatCurrency,
  formatPercent,
  getBestNet,
  getGatesSummary,
  getZopaDisplay,
  getDefaultRationale,
  VERDICT_CONFIG,
  EXIT_LABELS,
  VALID_VERDICTS,
};
