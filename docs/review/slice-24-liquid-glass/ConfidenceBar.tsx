/**
 * ConfidenceBar — Slice 15 (Container)
 *
 * Horizontal row of 4 expandable confidence indicator cards.
 * Provides at-a-glance validation of deal quality across key dimensions.
 *
 * Layout:
 * - Desktop (>1024px): 4 cards in a row
 * - Tablet (640-1024px): 4 cards in a row (smaller)
 * - Mobile (<640px): 2x2 grid
 *
 * Principles Applied:
 * - Miller's Law: 4 items is within cognitive limit (7±2)
 * - Gestalt Similarity: Consistent card styling
 * - Progressive Disclosure: Summary first, details on expand
 *
 * @defensive Handles null/undefined data gracefully
 * @traced data-testid for debugging and test selection
 * @accessible Full keyboard navigation, ARIA expanded states
 *
 * @module components/dashboard/confidence/ConfidenceBar
 * @version 1.0.0 (Slice 15)
 */

"use client";

import { memo, useState, useCallback } from "react";
import { motion, type Variants } from "framer-motion";
import type {
  CompQuality,
  EvidenceHealth,
  MarketVelocity,
} from "@hps-internal/contracts";
import type { ArvBand } from "@/components/dashboard/arv";
import { cn } from "@/components/ui";
import { TIMING, EASING } from "@/lib/animations/tokens";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";
import { safeNumber, formatCurrency } from "@/lib/utils/numbers";

// Sub-components
import { ConfidenceCard } from "./ConfidenceCard";
import { ScoreRing } from "./ScoreRing";
import { CompQualityContent } from "./cards/CompQualityContent";
import { EvidenceHealthContent } from "./cards/EvidenceHealthContent";
import { MarketVelocityContent } from "./cards/MarketVelocityContent";
import { ArvConfidenceContent } from "./cards/ArvConfidenceContent";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface ConfidenceBarProps {
  /** Comp quality data from engine */
  compQuality: CompQuality | null | undefined;
  /** Evidence health data from engine */
  evidenceHealth: EvidenceHealth | null | undefined;
  /** Market velocity data from engine */
  marketVelocity: MarketVelocity | null | undefined;
  /** ARV band data from engine */
  arvBand: ArvBand | null | undefined;
  /** Whether showing demo data */
  isDemoMode?: boolean;
  /** Additional CSS classes */
  className?: string;
}

type CardId = "comp" | "evidence" | "market" | "arv";

// ═══════════════════════════════════════════════════════════════════════════
// ANIMATION VARIANTS
// ═══════════════════════════════════════════════════════════════════════════

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: TIMING.standard,
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

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

// ═══════════════════════════════════════════════════════════════════════════
// SUMMARY COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

function CompQualitySummary({ data }: { data: CompQuality | null }) {
  if (!data) return <EmptySummary />;

  const score = safeNumber(data.quality_score) ?? 0;
  const band = data.quality_band ?? "—";

  return (
    <div className="flex flex-col items-center gap-1">
      <ScoreRing score={score} size="sm" />
      <span className="text-xs text-slate-400 capitalize">{band}</span>
    </div>
  );
}

function EvidenceHealthSummary({ data }: { data: EvidenceHealth | null }) {
  if (!data) return <EmptySummary />;

  const freshCount = data.fresh_count ?? 0;
  const total = data.items?.length ?? 5;
  const hasCriticalIssue = data.any_critical_missing || data.any_critical_stale;

  return (
    <div className="flex flex-col items-center">
      <span className={cn(
        "text-2xl font-bold",
        hasCriticalIssue ? "text-red-400" :
        freshCount === total ? "text-emerald-400" : "text-slate-100"
      )}>
        {freshCount}/{total}
      </span>
      {hasCriticalIssue && (
        <span className="text-xs text-red-400">Critical issues</span>
      )}
      {!hasCriticalIssue && freshCount === total && (
        <span className="text-xs text-emerald-400">All fresh</span>
      )}
      {!hasCriticalIssue && freshCount < total && (
        <span className="text-xs text-slate-400">
          {total - freshCount} need attention
        </span>
      )}
    </div>
  );
}

function MarketVelocitySummary({ data }: { data: MarketVelocity | null }) {
  if (!data) return <EmptySummary />;

  const band = data.velocity_band ?? "unknown";
  const dom = safeNumber(data.dom_zip_days);

  // SEMANTIC COLORS ONLY - no blue/cyan
  // Hot = good for sellers = emerald
  // Warm = moderate = amber
  // Balanced = neutral = slate
  // Cool = slowing = amber (transitional)
  // Cold = bad for sellers = slate (muted)
  const bandColors: Record<string, string> = {
    hot: "text-emerald-400",
    warm: "text-amber-400",
    balanced: "text-slate-300",
    cool: "text-amber-400",
    cold: "text-slate-400",
  };

  return (
    <div className="flex flex-col items-center">
      <span className={cn("text-lg font-bold uppercase", bandColors[band] ?? "text-slate-400")}>
        {band}
      </span>
      <span className="text-xs text-slate-400">
        {dom !== null ? `${Math.round(dom)} DOM` : "-"}
      </span>
    </div>
  );
}

function ArvConfidenceSummary({ data }: { data: ArvBand | null }) {
  if (!data) return <EmptySummary />;

  const confidence = data.confidence ?? "—";
  const mid = safeNumber(data.arv_mid);

  const confidenceColors: Record<string, string> = {
    high: "text-emerald-400",
    medium: "text-amber-400",
    low: "text-red-400",
  };

  return (
    <div className="flex flex-col items-center">
      <span className={cn(
        "text-lg font-bold uppercase",
        confidenceColors[confidence] ?? "text-slate-400"
      )}>
        {confidence}
      </span>
      <span className="text-xs text-slate-400">
        {mid !== null ? formatCurrency(mid) : "—"}
      </span>
    </div>
  );
}

function EmptySummary() {
  return (
    <div className="flex flex-col items-center">
      <span className="text-2xl font-bold text-slate-500">—</span>
      <span className="text-xs text-slate-500">No data</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export const ConfidenceBar = memo(function ConfidenceBar({
  compQuality,
  evidenceHealth,
  marketVelocity,
  arvBand,
  isDemoMode = false,
  className,
}: ConfidenceBarProps): JSX.Element {
  const prefersReducedMotion = useReducedMotion();

  // Track which card is expanded (only one at a time)
  const [expandedCard, setExpandedCard] = useState<CardId | null>(null);

  // Toggle card expansion
  const handleToggle = useCallback((cardId: CardId) => {
    setExpandedCard((prev) => (prev === cardId ? null : cardId));
  }, []);

  return (
    <motion.div
      className={cn(
        // Responsive grid layout
        "grid gap-3 md:gap-4",
        "grid-cols-2 lg:grid-cols-4", // 2x2 on mobile, 4x1 on desktop
        className
      )}
      variants={prefersReducedMotion ? undefined : containerVariants}
      initial={prefersReducedMotion ? false : "hidden"}
      animate="visible"
      data-testid="confidence-bar"
      role="region"
      aria-label="Deal confidence indicators"
    >
      {/* Card 1: Comp Quality */}
      <motion.div variants={prefersReducedMotion ? undefined : cardVariants}>
        <ConfidenceCard
          cardId="comp"
          title="Comp Quality"
          icon="chart"
          data={compQuality}
          isExpanded={expandedCard === "comp"}
          onToggle={() => handleToggle("comp")}
          isDemoMode={isDemoMode}
          renderSummary={(data) => <CompQualitySummary data={data} />}
          renderExpanded={(data) => <CompQualityContent data={data} />}
        />
      </motion.div>

      {/* Card 2: Evidence Health */}
      <motion.div variants={prefersReducedMotion ? undefined : cardVariants}>
        <ConfidenceCard
          cardId="evidence"
          title="Evidence"
          icon="document"
          data={evidenceHealth}
          isExpanded={expandedCard === "evidence"}
          onToggle={() => handleToggle("evidence")}
          isDemoMode={isDemoMode}
          renderSummary={(data) => <EvidenceHealthSummary data={data} />}
          renderExpanded={(data) => <EvidenceHealthContent data={data} />}
        />
      </motion.div>

      {/* Card 3: Market Velocity */}
      <motion.div variants={prefersReducedMotion ? undefined : cardVariants}>
        <ConfidenceCard
          cardId="market"
          title="Market"
          icon="trending"
          data={marketVelocity}
          isExpanded={expandedCard === "market"}
          onToggle={() => handleToggle("market")}
          isDemoMode={isDemoMode}
          renderSummary={(data) => <MarketVelocitySummary data={data} />}
          renderExpanded={(data) => <MarketVelocityContent data={data} />}
        />
      </motion.div>

      {/* Card 4: ARV Confidence */}
      <motion.div variants={prefersReducedMotion ? undefined : cardVariants}>
        <ConfidenceCard
          cardId="arv"
          title="ARV"
          icon="home"
          data={arvBand}
          isExpanded={expandedCard === "arv"}
          onToggle={() => handleToggle("arv")}
          isDemoMode={isDemoMode}
          renderSummary={(data) => <ArvConfidenceSummary data={data} />}
          renderExpanded={(data) => <ArvConfidenceContent data={data} />}
        />
      </motion.div>
    </motion.div>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

export default ConfidenceBar;
