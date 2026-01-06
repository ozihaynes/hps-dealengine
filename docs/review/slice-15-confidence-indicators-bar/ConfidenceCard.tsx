/**
 * ConfidenceCard — Slice 15 (Expandable Card)
 *
 * Reusable expandable card component with:
 * - Hover lift effect (4px translateY)
 * - Click to expand/collapse
 * - Animated height transition
 * - Icon + title header
 * - Summary view (collapsed) / Detail view (expanded)
 *
 * @defensive Handles null data with graceful fallback
 * @traced data-testid for debugging
 * @accessible ARIA expanded state, keyboard navigation
 *
 * @module components/dashboard/confidence/ConfidenceCard
 * @version 1.0.0 (Slice 15)
 */

"use client";

import { memo, type ReactNode } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { cn } from "@/components/ui";
import { TIMING, EASING } from "@/lib/animations/tokens";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

type IconType = "chart" | "document" | "trending" | "home";

export interface ConfidenceCardProps<T> {
  /** Unique card identifier */
  cardId: string;
  /** Card title */
  title: string;
  /** Icon type */
  icon: IconType;
  /** Data for this card */
  data: T | null | undefined;
  /** Whether card is expanded */
  isExpanded: boolean;
  /** Toggle expansion callback */
  onToggle: () => void;
  /** Whether showing demo data */
  isDemoMode?: boolean;
  /** Render function for collapsed summary */
  renderSummary: (data: T | null) => ReactNode;
  /** Render function for expanded content */
  renderExpanded: (data: T | null) => ReactNode;
  /** Additional CSS classes */
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// ANIMATION VARIANTS
// ═══════════════════════════════════════════════════════════════════════════

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
// ICON COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

function ChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path d="M18 20V10M12 20V4M6 20v-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DocumentIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="14 2 14 8 20 8" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="16" y1="13" x2="8" y2="13" strokeLinecap="round" />
      <line x1="16" y1="17" x2="8" y2="17" strokeLinecap="round" />
    </svg>
  );
}

function TrendingIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="17 6 23 6 23 12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="9 22 9 12 15 12 15 22" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CardIcon({ type, className }: { type: IconType; className?: string }) {
  switch (type) {
    case "chart": return <ChartIcon className={className} />;
    case "document": return <DocumentIcon className={className} />;
    case "trending": return <TrendingIcon className={className} />;
    case "home": return <HomeIcon className={className} />;
  }
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
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

function ConfidenceCardInner<T>({
  cardId,
  title,
  icon,
  data,
  isExpanded,
  onToggle,
  isDemoMode = false,
  renderSummary,
  renderExpanded,
  className,
}: ConfidenceCardProps<T>): JSX.Element {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      className={cn(
        // Base styles
        "relative rounded-xl border overflow-hidden",
        "bg-zinc-900/80 backdrop-blur-sm",
        "transition-all duration-200",
        // Border color
        "border-zinc-700/50",
        // Hover lift (when not expanded)
        !isExpanded && "hover:-translate-y-1 hover:shadow-lg hover:border-zinc-600/50",
        // Expanded state
        isExpanded && "shadow-xl border-zinc-600",
        className
      )}
      data-testid={`confidence-card-${cardId}`}
      data-expanded={isExpanded}
      layout={!prefersReducedMotion}
    >
      {/* ─────────────────────────────────────────────────────────────────
          CARD HEADER (always visible, clickable)
          ───────────────────────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "w-full flex items-center justify-between",
          "p-3 md:p-4",
          "text-left",
          "focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500",
          "transition-colors duration-150",
          "hover:bg-zinc-800/50"
        )}
        aria-expanded={isExpanded}
        aria-controls={`${cardId}-content`}
      >
        {/* Left: Icon + Title */}
        <div className="flex items-center gap-2">
          <CardIcon type={icon} className="w-4 h-4 text-zinc-400" />
          <span className="text-sm font-medium text-zinc-300">{title}</span>
        </div>

        {/* Right: Chevron */}
        <ChevronIcon className="w-4 h-4 text-zinc-500" isExpanded={isExpanded} />
      </button>

      {/* ─────────────────────────────────────────────────────────────────
          SUMMARY VIEW (collapsed state)
          ───────────────────────────────────────────────────────────────── */}
      {!isExpanded && (
        <div className="px-3 pb-3 md:px-4 md:pb-4">
          {renderSummary((data ?? null) as T | null)}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────
          EXPANDED CONTENT (animated)
          ───────────────────────────────────────────────────────────────── */}
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
            <div className="px-3 pb-3 md:px-4 md:pb-4 border-t border-zinc-700/50 pt-3">
              {renderExpanded((data ?? null) as T | null)}
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

export const ConfidenceCard = memo(ConfidenceCardInner) as <T>(props: ConfidenceCardProps<T>) => JSX.Element;

export default ConfidenceCard;
