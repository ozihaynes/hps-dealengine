/**
 * ScoreAnalysisBar — Score Analysis Row
 *
 * Horizontal row of 3 expandable score cards matching ConfidenceBar design.
 * Displays Closeability, Urgency, and Buyer Demand scores with factor breakdowns.
 *
 * Layout:
 * - Desktop (>1024px): 3 cards in a row
 * - Mobile (<640px): Stacked vertically
 *
 * Principles Applied:
 * - Miller's Law: 3 items is well within cognitive limit
 * - Gestalt Similarity: Consistent card styling with ConfidenceBar
 * - Progressive Disclosure: Score summary first, factors on expand
 *
 * @defensive Handles null/undefined data gracefully
 * @traced data-testid for debugging and test selection
 * @accessible Full keyboard navigation, ARIA expanded states
 *
 * @module components/dashboard/scores/ScoreAnalysisBar
 * @version 1.0.0
 */

"use client";

import { memo, useState, useCallback } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { cn } from "@/components/ui";
import { TIMING, EASING } from "@/lib/animations/tokens";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface ScoreFactor {
  name: string;
  value: number;
  impact: "positive" | "negative" | "neutral";
  detail?: string;
}

export interface ScoreData {
  score: number;
  factors: ScoreFactor[];
}

export interface ScoreAnalysisData {
  closeability: ScoreData;
  urgency: ScoreData;
  buyer_demand: ScoreData;
}

export interface ScoreAnalysisBarProps {
  /** Score analysis data from engine */
  data: ScoreAnalysisData | null | undefined;
  /** Whether showing demo data */
  isDemoMode?: boolean;
  /** Additional CSS classes */
  className?: string;
}

type CardId = "closeability" | "urgency" | "buyer_demand";

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

const expandVariants: Variants = {
  collapsed: {
    height: 0,
    opacity: 0,
    transition: {
      height: { duration: TIMING.standard, ease: EASING.decelerate },
      opacity: { duration: TIMING.quick },
    },
  },
  expanded: {
    height: "auto",
    opacity: 1,
    transition: {
      height: { duration: TIMING.standard, ease: EASING.decelerate },
      opacity: { duration: TIMING.standard, delay: 0.1 },
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

function getScoreColor(score: number): string {
  if (score >= 80) return "text-emerald-400";
  if (score >= 60) return "text-amber-400";
  if (score >= 40) return "text-orange-400";
  return "text-red-400";
}

function getScoreBand(score: number): string {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Fair";
  return "Poor";
}

function getImpactStyles(impact: "positive" | "negative" | "neutral") {
  switch (impact) {
    case "positive":
      return {
        bg: "bg-emerald-500/10",
        text: "text-emerald-400",
        icon: "↑",
      };
    case "negative":
      return {
        bg: "bg-red-500/10",
        text: "text-red-400",
        icon: "↓",
      };
    default:
      return {
        bg: "bg-slate-500/10",
        text: "text-slate-400",
        icon: "→",
      };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ICON COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

function CloseabilityIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function UrgencyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BuyerDemandIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronIcon({ className, isExpanded }: { className?: string; isExpanded: boolean }) {
  return (
    <svg
      className={cn(className, "transition-transform duration-200", isExpanded && "rotate-180")}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <polyline points="6 9 12 15 18 9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SCORE CARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

interface ScoreCardProps {
  cardId: CardId;
  title: string;
  icon: React.ReactNode;
  data: ScoreData | null;
  isExpanded: boolean;
  onToggle: () => void;
  isDemoMode?: boolean;
}

function ScoreCard({
  cardId,
  title,
  icon,
  data,
  isExpanded,
  onToggle,
  isDemoMode = false,
}: ScoreCardProps) {
  const prefersReducedMotion = useReducedMotion();
  const score = data?.score ?? 0;
  const factors = data?.factors ?? [];

  return (
    <motion.div
      className={cn(
        // Base styles - matches Decision Hero Zone background
        "relative rounded-xl border overflow-hidden",
        "bg-blue-500/10 backdrop-blur-xl",
        "transition-all duration-200",
        "border-white/10",
        "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]",
        // Minimum height for uniform card sizing
        "min-h-[120px]",
        !isExpanded && "hover:-translate-y-1 hover:shadow-lg hover:border-white/15",
        isExpanded && "shadow-xl border-white/20"
      )}
      data-testid={`score-card-${cardId}`}
      data-expanded={isExpanded}
      layout={!prefersReducedMotion}
    >
      {/* Card Header */}
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "w-full flex items-center justify-between",
          "p-3 md:p-4",
          "text-left",
          "focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500",
          "transition-colors duration-150",
          "hover:bg-slate-700/50"
        )}
        aria-expanded={isExpanded}
        aria-controls={`${cardId}-content`}
      >
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 text-slate-400">{icon}</span>
          <span className="text-sm font-medium text-slate-300">{title}</span>
        </div>
        <ChevronIcon className="w-4 h-4 text-slate-500" isExpanded={isExpanded} />
      </button>

      {/* Summary View (collapsed) */}
      {!isExpanded && (
        <div className="px-3 pb-3 md:px-4 md:pb-4">
          <div className="flex flex-col items-center gap-1">
            <span className={cn("text-3xl font-bold tabular-nums", getScoreColor(score))}>
              {Math.round(score)}
            </span>
            <span className="text-xs text-slate-400">{getScoreBand(score)}</span>
          </div>
        </div>
      )}

      {/* Expanded Content */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            id={`${cardId}-content`}
            variants={prefersReducedMotion ? undefined : expandVariants}
            initial={prefersReducedMotion ? false : "collapsed"}
            animate="expanded"
            exit="collapsed"
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 md:px-4 md:pb-4 border-t border-white/10 pt-3">
              {/* Score Display */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className={cn("text-2xl font-bold tabular-nums", getScoreColor(score))}>
                    {Math.round(score)}
                  </span>
                  <span className="text-sm text-slate-400">/100</span>
                </div>
                <span className={cn("text-sm font-medium", getScoreColor(score))}>
                  {getScoreBand(score)}
                </span>
              </div>

              {/* Factors List */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Contributing Factors
                </p>
                {factors.length > 0 ? (
                  <div className="space-y-2">
                    {factors.map((factor, index) => {
                      const styles = getImpactStyles(factor.impact);
                      return (
                        <div
                          key={index}
                          className="flex items-start justify-between gap-2"
                        >
                          <div className="flex items-start gap-2 flex-1 min-w-0">
                            <span
                              className={cn(
                                "flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium",
                                styles.bg,
                                styles.text
                              )}
                            >
                              {styles.icon}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-slate-200">{factor.name}</p>
                              {factor.detail && (
                                <p className="text-xs text-slate-500 mt-0.5">{factor.detail}</p>
                              )}
                            </div>
                          </div>
                          <span className={cn("text-sm font-mono tabular-nums", styles.text)}>
                            {factor.impact === "negative" ? "-" : "+"}
                            {factor.value}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">No factors available</p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Demo mode indicator */}
      {isDemoMode && (
        <div className="absolute top-2 right-8 px-1.5 py-0.5 text-[10px] rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
          Demo
        </div>
      )}
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export const ScoreAnalysisBar = memo(function ScoreAnalysisBar({
  data,
  isDemoMode = false,
  className,
}: ScoreAnalysisBarProps): JSX.Element {
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
        "grid gap-3 md:gap-4",
        "grid-cols-1 sm:grid-cols-3", // Stack on mobile, 3-col on tablet+
        className
      )}
      variants={prefersReducedMotion ? undefined : containerVariants}
      initial={prefersReducedMotion ? false : "hidden"}
      animate="visible"
      data-testid="score-analysis-bar"
      role="region"
      aria-label="Score analysis indicators"
    >
      {/* Card 1: Closeability */}
      <motion.div variants={prefersReducedMotion ? undefined : cardVariants}>
        <ScoreCard
          cardId="closeability"
          title="Closeability"
          icon={<CloseabilityIcon className="w-4 h-4" />}
          data={data?.closeability ?? null}
          isExpanded={expandedCard === "closeability"}
          onToggle={() => handleToggle("closeability")}
          isDemoMode={isDemoMode}
        />
      </motion.div>

      {/* Card 2: Urgency */}
      <motion.div variants={prefersReducedMotion ? undefined : cardVariants}>
        <ScoreCard
          cardId="urgency"
          title="Urgency"
          icon={<UrgencyIcon className="w-4 h-4" />}
          data={data?.urgency ?? null}
          isExpanded={expandedCard === "urgency"}
          onToggle={() => handleToggle("urgency")}
          isDemoMode={isDemoMode}
        />
      </motion.div>

      {/* Card 3: Buyer Demand */}
      <motion.div variants={prefersReducedMotion ? undefined : cardVariants}>
        <ScoreCard
          cardId="buyer_demand"
          title="Buyer Demand"
          icon={<BuyerDemandIcon className="w-4 h-4" />}
          data={data?.buyer_demand ?? null}
          isExpanded={expandedCard === "buyer_demand"}
          onToggle={() => handleToggle("buyer_demand")}
          isDemoMode={isDemoMode}
        />
      </motion.div>
    </motion.div>
  );
});

export default ScoreAnalysisBar;
