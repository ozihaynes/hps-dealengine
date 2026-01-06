/**
 * KeyMetricsTrio — Slice 14 (Metrics Summary)
 *
 * Three key metrics displayed as a responsive trio:
 * 1. Net Profit (from recommended exit strategy)
 * 2. ZOPA (spread as % of ARV)
 * 3. Risk Gates (pass/total with blocking indicator)
 *
 * Each metric card shows:
 * - Primary value (large, color-coded)
 * - Label
 * - Sub-value (context like exit type or "All clear")
 *
 * @defensive Handles null/undefined, NaN, negative values
 * @traced data-testid for debugging and test selection
 *
 * @module components/dashboard/hero/KeyMetricsTrio
 * @version 1.0.0 (Slice 14)
 */

"use client";

import { memo } from "react";
import { motion, type Variants } from "framer-motion";
import {
  type PriceGeometry,
  type NetClearance,
  type EnhancedRiskSummary,
} from "@hps-internal/contracts";
import { cn } from "@/components/ui";
import { TIMING, EASING } from "@/lib/animations/tokens";
import { safeNumber, formatCurrency, formatPercent } from "@/lib/utils/numbers";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface KeyMetricsTrioProps {
  /** Price geometry from engine (for ZOPA display) */
  priceGeometry: PriceGeometry | null | undefined;
  /** Net clearance from engine (for profit display) */
  netClearance: NetClearance | null | undefined;
  /** Risk summary from engine (for gates display) */
  riskSummary: EnhancedRiskSummary | null | undefined;
  /** Compact mode reduces size */
  compact?: boolean;
  /** Whether user prefers reduced motion (accessibility) */
  prefersReducedMotion?: boolean;
  /** Additional CSS classes */
  className?: string;
}

type MetricVariant = "positive" | "warning" | "neutral" | "negative";

interface MetricCardData {
  label: string;
  value: string;
  subValue?: string;
  variant: MetricVariant;
  icon: string;
  testId: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const EXIT_LABELS: Record<string, string> = {
  assignment: "Assignment",
  double_close: "Double Close",
  wholetail: "Wholetail",
} as const;

const VARIANT_STYLES: Record<
  MetricVariant,
  {
    border: string;
    bg: string;
    text: string;
    icon: string;
  }
> = {
  positive: {
    border: "border-emerald-500/30",
    bg: "bg-emerald-500/5",
    text: "text-emerald-400",
    icon: "text-emerald-400",
  },
  warning: {
    border: "border-amber-500/30",
    bg: "bg-amber-500/5",
    text: "text-amber-400",
    icon: "text-amber-400",
  },
  neutral: {
    border: "border-slate-600",
    bg: "bg-slate-800/50",
    text: "text-slate-300",
    icon: "text-slate-400",
  },
  negative: {
    border: "border-red-500/30",
    bg: "bg-red-500/5",
    text: "text-red-400",
    icon: "text-red-400",
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// ANIMATION VARIANTS
// ═══════════════════════════════════════════════════════════════════════════

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 15, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: TIMING.standard,
      ease: EASING.decelerate,
    },
  },
};

const countUpVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: TIMING.quick,
      delay: 0.2,
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// HELPER: Get best net from clearance
// ═══════════════════════════════════════════════════════════════════════════

function getBestNet(
  clearance: NetClearance | null | undefined
): { net: number | null; exit: string } {
  if (!clearance) return { net: null, exit: "unknown" };

  const recommendedExit = clearance.recommended_exit;

  // Try recommended exit first
  if (recommendedExit === "assignment" && clearance.assignment) {
    const net = safeNumber(clearance.assignment.net);
    if (net !== null) return { net, exit: "assignment" };
  } else if (recommendedExit === "double_close" && clearance.double_close) {
    const net = safeNumber(clearance.double_close.net);
    if (net !== null) return { net, exit: "double_close" };
  } else if (recommendedExit === "wholetail" && clearance.wholetail) {
    const net = safeNumber(clearance.wholetail.net);
    if (net !== null) return { net, exit: "wholetail" };
  }

  // Fallback: find highest valid net across all exit strategies
  const exits: Array<{ type: string; net: number | null }> = [
    { type: "assignment", net: safeNumber(clearance.assignment?.net) },
    { type: "double_close", net: safeNumber(clearance.double_close?.net) },
    { type: "wholetail", net: safeNumber(clearance.wholetail?.net) },
  ];

  // Filter to valid nets and find the maximum
  const validExits = exits.filter((e) => e.net !== null) as Array<{ type: string; net: number }>;

  if (validExits.length === 0) {
    return { net: null, exit: recommendedExit || "unknown" };
  }

  // Return the exit with highest net
  const bestExit = validExits.reduce((best, current) =>
    current.net > best.net ? current : best
  );

  return { net: bestExit.net, exit: bestExit.type };
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER: Get ZOPA display values
// ═══════════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════════
// HELPER: Get gates summary
// ═══════════════════════════════════════════════════════════════════════════

function getGatesSummary(
  riskSummary: EnhancedRiskSummary | null | undefined
): { pass: number; total: number; blocking: number } {
  if (!riskSummary) return { pass: 0, total: 0, blocking: 0 };

  const gates = riskSummary.gates;
  if (!gates || typeof gates !== "object") {
    return { pass: 0, total: 0, blocking: 0 };
  }

  const gateEntries = Object.values(gates);
  const total = gateEntries.length;
  const pass = gateEntries.filter((g) => g?.status === "pass").length;
  const blocking = gateEntries.filter((g) => g?.is_blocking === true).length;

  return {
    pass: Math.max(0, pass),
    total: Math.max(0, total),
    blocking: Math.max(0, blocking),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// ICON COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

function DollarIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

function TrendingUpIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// METRIC CARD SUB-COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

interface MetricCardProps {
  data: MetricCardData;
  compact?: boolean;
  prefersReducedMotion?: boolean;
  icon: React.ReactNode;
}

function MetricCard({ data, compact, prefersReducedMotion, icon }: MetricCardProps): JSX.Element {
  const styles = VARIANT_STYLES[data.variant];

  return (
    <motion.div
      variants={prefersReducedMotion ? undefined : cardVariants}
      className={cn(
        "flex flex-col items-center justify-center",
        "rounded-xl border",
        "transition-all duration-200",
        !prefersReducedMotion && "hover:scale-[1.02] hover:shadow-lg",
        styles.border,
        styles.bg,
        compact ? "p-3 min-w-[90px]" : "p-4 min-w-[120px]"
      )}
      data-testid={data.testId}
    >
      {/* Icon */}
      <div className={cn("mb-2", styles.icon)}>{icon}</div>

      {/* Value */}
      <motion.div
        variants={prefersReducedMotion ? undefined : countUpVariants}
        className={cn(
          "font-bold tracking-tight",
          styles.text,
          compact ? "text-xl" : "text-2xl md:text-3xl"
        )}
        data-testid={`${data.testId}-value`}
      >
        {data.value}
      </motion.div>

      {/* Label */}
      <span className={cn("text-slate-500", compact ? "text-xs" : "text-sm")}>
        {data.label}
      </span>

      {/* Sub-value (optional) */}
      {data.subValue && (
        <span
          className={cn(
            "mt-0.5",
            styles.text,
            compact ? "text-[10px]" : "text-xs"
          )}
          data-testid={`${data.testId}-subvalue`}
        >
          {data.subValue}
        </span>
      )}
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export const KeyMetricsTrio = memo(function KeyMetricsTrio({
  priceGeometry,
  netClearance,
  riskSummary,
  compact = false,
  prefersReducedMotion = false,
  className,
}: KeyMetricsTrioProps): JSX.Element {
  // ─────────────────────────────────────────────────────────────────────
  // EXTRACT VALUES (with defensive guards)
  // ─────────────────────────────────────────────────────────────────────

  const { net: bestNet, exit: bestExit } = getBestNet(netClearance);
  const { zopa, pctOfArv, exists: zopaExists } = getZopaDisplay(priceGeometry);
  const { pass: gatesPass, total: gatesTotal, blocking: gatesBlocking } =
    getGatesSummary(riskSummary);

  // ─────────────────────────────────────────────────────────────────────
  // DETERMINE VARIANTS
  // ─────────────────────────────────────────────────────────────────────

  const netVariant: MetricVariant =
    bestNet === null
      ? "neutral"
      : bestNet >= 15_000
        ? "positive"
        : bestNet >= 5_000
          ? "warning"
          : bestNet >= 0
            ? "neutral"
            : "negative";

  const zopaVariant: MetricVariant = !zopaExists
    ? "negative"
    : safeNumber(priceGeometry?.zopa) !== null &&
        safeNumber(priceGeometry?.zopa)! >= 30_000
      ? "positive"
      : "warning";

  const gatesVariant: MetricVariant =
    gatesBlocking > 0
      ? "negative"
      : gatesPass === gatesTotal && gatesTotal > 0
        ? "positive"
        : "warning";

  // ─────────────────────────────────────────────────────────────────────
  // BUILD METRICS DATA
  // ─────────────────────────────────────────────────────────────────────

  const metrics: MetricCardData[] = [
    {
      label: "Net Profit",
      value: formatCurrency(bestNet),
      subValue:
        bestExit !== "unknown"
          ? EXIT_LABELS[bestExit] || bestExit
          : undefined,
      variant: netVariant,
      icon: "dollar",
      testId: "metric-net",
    },
    {
      label: "ZOPA",
      value: zopa,
      subValue: zopaExists ? `${pctOfArv} of ARV` : undefined,
      variant: zopaVariant,
      icon: "trending",
      testId: "metric-zopa",
    },
    {
      label: "Risk Gates",
      value: gatesTotal > 0 ? `${gatesPass}/${gatesTotal}` : "—",
      subValue:
        gatesBlocking > 0
          ? `${gatesBlocking} blocking`
          : gatesPass === gatesTotal && gatesTotal > 0
            ? "All clear"
            : undefined,
      variant: gatesVariant,
      icon: "shield",
      testId: "metric-gates",
    },
  ];

  // ─────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────

  return (
    <div
      className={cn(
        "flex flex-wrap justify-center gap-3 md:gap-4",
        className
      )}
      data-testid="key-metrics-trio"
      role="group"
      aria-label="Key deal metrics"
    >
      {metrics.map((metric) => (
        <MetricCard
          key={metric.testId}
          data={metric}
          compact={compact}
          prefersReducedMotion={prefersReducedMotion}
          icon={
            metric.icon === "dollar" ? (
              <DollarIcon className={cn(compact ? "w-5 h-5" : "w-6 h-6")} />
            ) : metric.icon === "trending" ? (
              <TrendingUpIcon className={cn(compact ? "w-5 h-5" : "w-6 h-6")} />
            ) : (
              <ShieldIcon className={cn(compact ? "w-5 h-5" : "w-6 h-6")} />
            )
          }
        />
      ))}
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

export default KeyMetricsTrio;

// Re-export helpers for testing
export { getBestNet, getZopaDisplay, getGatesSummary, EXIT_LABELS, VARIANT_STYLES };

// Re-export from shared utils for backwards compatibility
export { safeNumber, formatCurrency, formatPercent } from "@/lib/utils/numbers";
