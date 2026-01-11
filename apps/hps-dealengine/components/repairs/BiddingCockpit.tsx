// ============================================================================
// BIDDING COCKPIT — Master Container for Repairs UI
// ============================================================================
// Principles Applied:
// - uiux-art-director: Bento grid layout, clear visual hierarchy
// - behavioral-design-strategist: 60-second decision making enabled
// - component-architect: Atomic design, composed organisms
// - responsive-design-specialist: Mobile-first, adaptive layout
// - accessibility-champion: Full keyboard navigation, ARIA landmarks
// ============================================================================

"use client";

import { memo, useMemo } from "react";
import { motion } from "framer-motion";
import { AlertCircle, RefreshCw, Plus, ChevronDown } from "lucide-react";
import { EstimateSummaryCard } from "./EstimateSummaryCard";
import { RepairVelocityCard } from "./RepairVelocityCard";
import { GCEstimatesPanel } from "./GCEstimatesPanel";
import { EnhancedBreakdownPanel } from "./EnhancedBreakdownPanel";
import { SkeletonCockpit } from "./SkeletonCockpit";
import { EmptyCockpit } from "./EmptyCockpit";
import { EstimateStatus } from "./StatusBadge";
import { useMotion } from "./designTokens";

// ============================================================================
// TYPES
// ============================================================================

interface LineItem {
  id: string;
  description: string;
  quantity?: number;
  unit?: string;
  unitCost?: number;
  total: number;
}

interface CategoryBreakdown {
  id: string;
  name: string;
  subtotal: number;
  itemCount: number;
  items?: LineItem[];
}

interface EstimateRequest {
  id: string;
  gc_name: string;
  gc_email?: string;
  status: EstimateStatus;
  submitted_at?: string;
  sent_at?: string;
  file_path?: string;
}

interface EstimateData {
  baseEstimate: number;
  contingency: number;
  contingencyPercent: number;
  totalBudget: number;
  categories: CategoryBreakdown[];
  lastUpdated?: string;
}

interface BiddingCockpitProps {
  /** Repair estimate data */
  estimateData?: EstimateData | null;
  /** Estimate requests from contractors */
  estimateRequests: EstimateRequest[];
  /** Loading state */
  isLoading?: boolean;
  /** Demo mode (dashed borders, demo labels) */
  isDemoMode?: boolean;
  /** Callbacks for actions */
  onRequestEstimate?: () => void;
  onManualUpload?: () => void;
  onViewEstimate?: (id: string, filePath: string) => void;
  onDownloadEstimate?: (id: string, filePath: string) => void;
  /** Custom className */
  className?: string;
  // ═══════════════════════════════════════════════════════════
  // NEW PROPS — Slice 2: Hero Prominence & Trust
  // ═══════════════════════════════════════════════════════════
  /** After Repair Value for percentage context */
  arvValue?: number;
  /** Whether a GC estimate has been submitted */
  hasGCEstimate?: boolean;
  /** ISO timestamp of last estimate update */
  lastUpdated?: string;
  /** Error state from estimate loading */
  error?: Error | string | null;
}

// ============================================================================
// VELOCITY COUNTS HELPER
// ============================================================================

function computeVelocityCounts(requests: EstimateRequest[]) {
  const counts = {
    pending: 0,
    sent: 0,
    viewed: 0,
    submitted: 0,
    total: requests.length,
  };

  for (const req of requests) {
    switch (req.status) {
      case "pending":
        counts.pending++;
        break;
      case "sent":
        counts.sent++;
        break;
      case "viewed":
        counts.viewed++;
        break;
      case "submitted":
        counts.submitted++;
        break;
    }
  }

  return counts;
}

// ============================================================================
// CURRENCY FORMATTER
// ============================================================================

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

// ============================================================================
// COMPONENT
// ============================================================================

export const BiddingCockpit = memo(function BiddingCockpit({
  estimateData,
  estimateRequests,
  isLoading = false,
  isDemoMode = false,
  onRequestEstimate,
  onManualUpload,
  onViewEstimate,
  onDownloadEstimate,
  className = "",
  // Slice 2: Hero Prominence & Trust
  arvValue,
  hasGCEstimate = false,
  lastUpdated,
  error,
}: BiddingCockpitProps) {
  // Compute velocity counts
  const velocityCounts = useMemo(
    () => computeVelocityCounts(estimateRequests),
    [estimateRequests]
  );

  // Reduced motion preference (WCAG 2.1 compliance)
  const { isReduced } = useMotion();

  // ═══════════════════════════════════════════════════════════
  // ERROR STATE
  // Principle: Error Experience — helpful, recoverable moments
  // ═══════════════════════════════════════════════════════════
  if (error) {
    return (
      <div className={`bg-red-500/5 border border-red-500/20 rounded-xl p-6 ${className}`}>
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 p-2 bg-red-500/10 rounded-lg">
            <AlertCircle className="w-6 h-6 text-red-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-red-400 mb-1">
              Unable to Load Estimates
            </h3>
            <p className="text-sm text-slate-400 mb-4">
              {typeof error === "string"
                ? error
                : error.message || "An error occurred while loading repair estimates."}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-4 py-2
                         bg-red-500/10 hover:bg-red-500/20
                         border border-red-500/30 rounded-lg
                         text-sm font-medium text-red-400
                         transition-colors min-h-[44px]"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Check if we have any data
  const hasEstimateData =
    estimateData && estimateData.totalBudget > 0;
  const hasEstimateRequests = estimateRequests.length > 0;
  const isEmpty = !hasEstimateData && !hasEstimateRequests;

  // ============================================================================
  // LOADING STATE
  // ============================================================================

  if (isLoading) {
    return (
      <div
        className={className}
        aria-busy="true"
        role="region"
        aria-label="Loading repair estimates"
      >
        <span className="sr-only">Loading repair estimates, please wait...</span>
        <SkeletonCockpit />
      </div>
    );
  }

  // ============================================================================
  // EMPTY STATE
  // ============================================================================

  if (isEmpty) {
    return (
      <div className={className}>
        <EmptyCockpit
          hasRepairData={false}
          onRequestEstimate={onRequestEstimate}
          onManualUpload={onManualUpload}
        />
      </div>
    );
  }

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
  <>
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className={`space-y-6 ${className}`}
      role="region"
      aria-label="Bidding Cockpit"
    >
      {/* ----------------------------------------------------------------
          ROW 1: Summary Cards (Bento Grid Top)
          ---------------------------------------------------------------- */}
      <div className={`grid grid-cols-1 ${hasEstimateData ? 'md:grid-cols-2' : ''} gap-4 md:gap-6`}>
        {/* Estimate Summary Card */}
        {hasEstimateData && (
          <EstimateSummaryCard
            baseEstimate={estimateData.baseEstimate}
            contingency={estimateData.contingency}
            contingencyPercent={estimateData.contingencyPercent}
            totalBudget={estimateData.totalBudget}
            lastUpdated={lastUpdated ?? estimateData.lastUpdated}
            isDemoMode={isDemoMode}
            // ═══════════════════════════════════════════════════════════
            // NEW PROPS — Slice 2: Hero Prominence & Trust
            // ═══════════════════════════════════════════════════════════
            arvValue={arvValue}
            hasGCEstimate={hasGCEstimate}
          />
        )}

        {/* Repair Velocity Card */}
        <RepairVelocityCard
          counts={velocityCounts}
          isDemoMode={isDemoMode}
        />
      </div>

      {/* ----------------------------------------------------------------
          ROW 2: GC Estimates Gallery
          ---------------------------------------------------------------- */}
      <GCEstimatesPanel
        estimates={estimateRequests}
        onViewEstimate={onViewEstimate}
        onDownloadEstimate={onDownloadEstimate}
        isDemoMode={isDemoMode}
      />

      {/* ----------------------------------------------------------------
          ROW 3: Category Breakdown
          ---------------------------------------------------------------- */}

      {/* ═══════════════════════════════════════════════════════════════════════
          MOBILE BREAKDOWN SUMMARY

          Principle: Progressive Disclosure — summary first, expand for detail
          Principle: Thumb Zone — expand trigger easy to reach

          Visible only on mobile (lg:hidden)
          ═══════════════════════════════════════════════════════════════════════ */}
      {hasEstimateData && estimateData.categories.length > 0 && (
        <details className="lg:hidden bg-slate-900/50 rounded-xl border border-slate-800">
          <summary
            className="
              flex items-center justify-between p-4 cursor-pointer
              text-sm font-medium text-slate-300
              hover:bg-slate-800/50 rounded-xl transition-colors
              min-h-[44px]
              list-none [&::-webkit-details-marker]:hidden
            "
          >
            <span>Category Breakdown ({estimateData.categories.length})</span>
            <ChevronDown
              className="w-4 h-4 text-slate-400 transition-transform duration-200
                         [[open]>&]:rotate-180"
              aria-hidden="true"
            />
          </summary>

          <div className="px-4 pb-4 pt-2 border-t border-slate-800">
            <div className="space-y-3">
              {estimateData.categories.slice(0, 5).map((cat) => (
                <div key={cat.id} className="flex justify-between items-center">
                  <span className="text-sm text-slate-400 truncate mr-4">
                    {cat.name}
                  </span>
                  <span className="text-sm text-slate-200 tabular-nums font-medium flex-shrink-0">
                    {formatCurrency(cat.subtotal)}
                  </span>
                </div>
              ))}

              {estimateData.categories.length > 5 && (
                <p className="text-xs text-slate-500 pt-2 border-t border-slate-800/50">
                  +{estimateData.categories.length - 5} more categories
                </p>
              )}
            </div>
          </div>
        </details>
      )}

      {/* Desktop breakdown — hidden on mobile */}
      {hasEstimateData && estimateData.categories.length > 0 && (
        <div className="hidden lg:block">
          <EnhancedBreakdownPanel
            categories={estimateData.categories}
            totalBudget={estimateData.totalBudget}
            isDemoMode={isDemoMode}
          />
        </div>
      )}
    </motion.div>

    {/* ═══════════════════════════════════════════════════════════════════════
        FLOATING ACTION BUTTON (Mobile Only)

        Principle: Fitts's Law — Primary CTA in thumb zone (bottom-right)
        Principle: Thumb Zone — Natural reach without grip change

        Hidden on lg+ because header actions are visible on desktop
        ═══════════════════════════════════════════════════════════════════════ */}
    {onRequestEstimate && (
      <div className="fixed bottom-6 right-6 z-40 lg:hidden">
        <motion.button
          onClick={onRequestEstimate}
          className="
            flex items-center justify-center
            w-14 h-14 min-h-[44px] min-w-[44px]
            bg-emerald-600 hover:bg-emerald-500
            text-white rounded-full
            shadow-lg shadow-emerald-500/25
            focus:outline-none focus:ring-2 focus:ring-emerald-500
            focus:ring-offset-2 focus:ring-offset-slate-900
            active:scale-95 transition-transform
          "
          whileHover={isReduced ? undefined : { scale: 1.05 }}
          whileTap={isReduced ? undefined : { scale: 0.95 }}
          aria-label="Request GC Estimate"
        >
          <Plus className="w-6 h-6" aria-hidden="true" />
        </motion.button>
      </div>
    )}
  </>
  );
});

export default BiddingCockpit;
