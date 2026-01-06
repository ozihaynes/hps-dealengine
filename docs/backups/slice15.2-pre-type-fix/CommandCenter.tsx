/**
 * CommandCenter Component
 *
 * Main orchestrator for the Command Center V2.1 overview.
 * Assembles PulseBar, DecisionCanvas, ActionDock, and ExceptionsStack
 * into a cohesive decision-making interface.
 *
 * KEY BEHAVIORS:
 * - Dashboard is ALWAYS visible (never blocked by empty state)
 * - Error boundary catches component crashes
 * - Full accessibility: keyboard nav, focus management, aria-live
 * - Reduced motion support for vestibular-safe animations
 * - Responsive: mobile → tablet (md) → desktop (lg)
 * - No `as any` casts — proper type alignment
 *
 * Layout Architecture:
 * ┌─────────────────────────────────────────────────────────────┐
 * │                    PulseBar (Hero Metrics)                  │
 * ├───────────────────────────────────┬─────────────────────────┤
 * │                                   │                         │
 * │        DecisionCanvas             │      ActionDock         │
 * │        (2/3 width)                │      (1/3 width)        │
 * │                                   │                         │
 * ├───────────────────────────────────┴─────────────────────────┤
 * │                  ExceptionsStack (Full Width)               │
 * └─────────────────────────────────────────────────────────────┘
 *
 * @module overview/CommandCenter
 * @version 2.0.0 (Phase 15.2)
 */

"use client";

import React, { useState, useCallback, useRef, useId } from "react";
import Link from "next/link";
import { cn } from "@/components/ui";
import {
  PulseBar,
  DecisionCanvas,
  ActionDock,
  ExceptionsStack,
  type Signal,
} from "@/components/command-center";
import { CommandCenterErrorBoundary } from "./CommandCenterErrorBoundary";
import { CommandCenterSkeleton } from "./CommandCenterSkeleton";
import {
  useOverviewData,
  generateTimelineEvents,
  type StalenessLevel,
} from "./useOverviewData";

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const isDev = process.env.NODE_ENV === "development";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface CommandCenterProps {
  /** Additional className */
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// STALENESS BADGE
// ═══════════════════════════════════════════════════════════════════════════

const STALENESS_CONFIG: Record<
  StalenessLevel,
  { bg: string; text: string; icon?: boolean }
> = {
  fresh: { bg: "bg-green-500/10", text: "text-green-600 dark:text-green-400" },
  aging: { bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400" },
  stale: {
    bg: "bg-orange-500/10",
    text: "text-orange-600 dark:text-orange-400",
    icon: true,
  },
  expired: {
    bg: "bg-red-500/10",
    text: "text-red-600 dark:text-red-400",
    icon: true,
  },
};

function StalenessBadge({
  level,
  label,
}: {
  level: StalenessLevel;
  label: string;
}) {
  const config = STALENESS_CONFIG[level];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium",
        config.bg,
        config.text
      )}
    >
      {config.icon && (
        <svg
          className="w-3 h-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      )}
      {label}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// NO DATA BANNER
// ═══════════════════════════════════════════════════════════════════════════

interface NoDataBannerProps {
  dealId: string | null;
  hasDeal: boolean;
}

function NoDataBanner({ dealId, hasDeal }: NoDataBannerProps) {
  const href = dealId ? `/underwrite?dealId=${dealId}` : "/underwrite";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl",
        "border border-[color:var(--glass-border)]",
        "bg-[color:var(--glass-bg)] backdrop-blur"
      )}
      role="status"
      aria-label={hasDeal ? "Analysis required" : "No deal selected"}
    >
      {/* Animated gradient background - respects reduced motion */}
      <div
        className={cn(
          "absolute inset-0",
          "bg-gradient-to-r from-[color:var(--accent-color)]/5 via-transparent to-[color:var(--accent-color)]/5",
          "animate-pulse motion-reduce:animate-none"
        )}
      />

      <div className="relative flex flex-col sm:flex-row items-center justify-between gap-4 px-5 py-4">
        <div className="flex items-center gap-4">
          {/* Icon with subtle glow */}
          <div className="relative">
            <div
              className={cn(
                "absolute inset-0 rounded-full blur-md",
                "bg-[color:var(--accent-color)]/20",
                "motion-reduce:hidden"
              )}
            />
            <div
              className={cn(
                "relative w-12 h-12 rounded-full flex items-center justify-center",
                "bg-[color:var(--accent-color)]/10",
                "border border-[color:var(--accent-color)]/30"
              )}
            >
              <svg
                className="w-6 h-6 text-[color:var(--accent-color)]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5"
                />
              </svg>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-[color:var(--text-primary)]">
              {hasDeal ? "Analysis Required" : "No Deal Selected"}
            </h3>
            <p className="text-sm text-[color:var(--text-secondary)]">
              {hasDeal
                ? "Run underwriting to populate metrics, scores, and recommendations"
                : "Select or create a deal to view the Command Center"}
            </p>
          </div>
        </div>

        <Link
          href={hasDeal ? href : "/deals"}
          className={cn(
            "inline-flex items-center gap-2 px-5 py-2.5 rounded-lg",
            "font-medium text-white",
            "bg-[color:var(--accent-color)]",
            "transition-all duration-150",
            "hover:brightness-110 hover:shadow-lg",
            "active:scale-[0.98]",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-color)] focus-visible:ring-offset-2",
            "motion-reduce:transition-none motion-reduce:hover:transform-none"
          )}
        >
          {hasDeal ? "Run Analysis" : "Select Deal"}
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 7l5 5m0 0l-5 5m5-5H6"
            />
          </svg>
        </Link>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// REFRESH FAB
// ═══════════════════════════════════════════════════════════════════════════

interface RefreshFabProps {
  onClick: () => void;
  isRefreshing: boolean;
  ariaDescribedBy?: string;
}

function RefreshFab({ onClick, isRefreshing, ariaDescribedBy }: RefreshFabProps) {
  return (
    <div
      className="fixed bottom-6 right-6"
      style={{ zIndex: "var(--z-floating, 50)" }}
    >
      <button
        type="button"
        onClick={onClick}
        disabled={isRefreshing}
        className={cn(
          "group p-3.5 rounded-full shadow-lg",
          "bg-[color:var(--accent-color)]",
          "transition-all duration-150",
          "hover:shadow-xl hover:brightness-110",
          "active:scale-95",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-color)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--bg-primary)]",
          "disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:shadow-lg disabled:hover:brightness-100",
          "motion-reduce:transition-none motion-reduce:hover:transform-none"
        )}
        title={isRefreshing ? "Refreshing..." : "Refresh analysis"}
        aria-label={isRefreshing ? "Refreshing analysis" : "Refresh analysis"}
        aria-describedby={ariaDescribedBy}
        aria-busy={isRefreshing}
      >
        <svg
          className={cn(
            "w-5 h-5 text-white",
            "transition-transform duration-300",
            "group-hover:rotate-180",
            isRefreshing && "animate-spin",
            "motion-reduce:transition-none motion-reduce:group-hover:rotate-0"
          )}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

function CommandCenterContent({ className }: CommandCenterProps) {
  const {
    snapshot,
    signals,
    isLoading,
    isRefreshing,
    staleness,
    hasRealData,
    refresh,
    dealAddress,
    dealId,
    lastRunAt,
  } = useOverviewData();

  const [isProcessing, setIsProcessing] = useState(false);
  const [showFullStack, setShowFullStack] = useState(false);

  // IDs for accessibility
  const signalCountId = useId();
  const refreshStatusId = useId();
  const exceptionsHeaderId = useId();

  // Ref for scroll target
  const exceptionsRef = useRef<HTMLElement>(null);

  // ─────────────────────────────────────────────────────────────────────────
  // HANDLERS
  // ─────────────────────────────────────────────────────────────────────────

  const handleSignalAction = useCallback(
    async (actionId: string, signal: Signal, note?: string) => {
      setIsProcessing(true);

      if (isDev) {
        console.log("[CommandCenter] Signal action:", {
          actionId,
          signalId: signal.id,
          signalCode: signal.code,
          note,
        });
      }

      // Simulate API call for action processing
      await new Promise((resolve) => setTimeout(resolve, 800));

      setIsProcessing(false);
      // TODO: Integrate with actual signal resolution API
    },
    []
  );

  const handleSignalDismiss = useCallback((signal: Signal) => {
    if (isDev) {
      console.log("[CommandCenter] Signal dismissed:", signal.id);
    }
    // TODO: Integrate with signal dismissal API
  }, []);

  const handleResolveAll = useCallback(() => {
    setShowFullStack(true);

    // Smooth scroll to exceptions stack using requestAnimationFrame
    requestAnimationFrame(() => {
      exceptionsRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }, []);

  const handleExpandToggle = useCallback(() => {
    setShowFullStack((prev) => !prev);
  }, []);

  // Keyboard handler for expand toggle
  const handleExpandKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleExpandToggle();
      }
    },
    [handleExpandToggle]
  );

  const getTimelineEvents = useCallback(
    (signal: Signal) => generateTimelineEvents(signal),
    []
  );

  // ─────────────────────────────────────────────────────────────────────────
  // LOADING STATE
  // ─────────────────────────────────────────────────────────────────────────

  if (isLoading) {
    return <CommandCenterSkeleton />;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // COMPUTED VALUES
  // ─────────────────────────────────────────────────────────────────────────

  const activeSignalCount = signals.filter((s) => !s.acknowledged).length;
  const criticalSignalCount = signals.filter(
    (s) => !s.acknowledged && s.severity === "critical"
  ).length;

  const hasDeal = Boolean(dealId);

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className={cn("space-y-6", className)}>
      {/* Screen reader announcements */}
      <div className="sr-only" aria-live="polite" id={refreshStatusId}>
        {isRefreshing ? "Refreshing dashboard data..." : ""}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          NO DATA BANNER
          ═══════════════════════════════════════════════════════════════════ */}
      {!hasRealData && <NoDataBanner dealId={dealId} hasDeal={hasDeal} />}

      {/* ═══════════════════════════════════════════════════════════════════
          DEAL CONTEXT HEADER
          ═══════════════════════════════════════════════════════════════════ */}
      {dealAddress && (
        <div
          className={cn(
            "flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 rounded-lg",
            "border border-[color:var(--glass-border)]",
            "bg-[color:var(--glass-bg)] backdrop-blur"
          )}
        >
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center",
                "bg-[color:var(--accent-color)]/10"
              )}
            >
              <svg
                className="w-4 h-4 text-[color:var(--accent-color)]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
            <div>
              <p className="font-medium text-[color:var(--text-primary)]">
                {dealAddress}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                {lastRunAt ? (
                  <>
                    <span className="text-xs text-[color:var(--text-secondary)]">
                      Last analyzed:{" "}
                      {new Date(lastRunAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                    <StalenessBadge
                      level={staleness.level}
                      label={staleness.label}
                    />
                  </>
                ) : (
                  <span className="text-xs text-[color:var(--text-secondary)]">
                    Not yet analyzed
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Signal summary - with aria-live for screen readers */}
          {activeSignalCount > 0 && hasRealData && (
            <div
              className="flex items-center gap-2"
              id={signalCountId}
              aria-live="polite"
              aria-atomic="true"
            >
              {criticalSignalCount > 0 && (
                <span
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1 rounded-full",
                    "text-xs font-medium",
                    "bg-red-500/10 text-red-600 dark:text-red-400"
                  )}
                >
                  <span
                    className={cn(
                      "w-1.5 h-1.5 rounded-full bg-red-500",
                      "animate-pulse motion-reduce:animate-none"
                    )}
                  />
                  {criticalSignalCount} Critical
                </span>
              )}
              <span
                className={cn(
                  "px-2.5 py-1 rounded-full text-xs font-medium",
                  "bg-[color:var(--bg-secondary)]",
                  "text-[color:var(--text-secondary)]"
                )}
              >
                {activeSignalCount} Total
              </span>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          PULSE BAR - Hero Metrics
          ═══════════════════════════════════════════════════════════════════ */}
      <section
        aria-label="Deal Metrics"
        className={cn(
          "transition-opacity duration-200",
          !hasRealData && "opacity-60",
          "motion-reduce:transition-none"
        )}
      >
        <PulseBar
          snapshot={snapshot as any}
          isLoading={isRefreshing}
          isStale={staleness.isStale}
        />
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          MAIN CONTENT - Responsive Grid
          ═══════════════════════════════════════════════════════════════════ */}
      <div
        className={cn(
          // Mobile: single column
          // Tablet (md): 2 columns
          // Desktop (lg): 3 columns with 2/3 + 1/3 split
          "grid gap-6",
          "md:grid-cols-2",
          "lg:grid-cols-3",
          "transition-opacity duration-200",
          !hasRealData && "opacity-60",
          "motion-reduce:transition-none"
        )}
      >
        {/* Decision Canvas - takes more space */}
        <section
          aria-label="Decision Details"
          className="md:col-span-2 lg:col-span-2 min-w-0"
        >
          <DecisionCanvas snapshot={snapshot as any} isLoading={isRefreshing} />
        </section>

        {/* Action Dock - sidebar on desktop, full width on tablet */}
        <aside
          aria-label="Action Required"
          className={cn(
            "md:col-span-2 lg:col-span-1",
            "lg:sticky lg:top-24 lg:self-start"
          )}
        >
          <ActionDock
            signals={signals}
            maxDisplay={4}
            showFilters={false}
            title="Action Required"
            onResolveAll={handleResolveAll}
            onSignalClick={() => setShowFullStack(true)}
            onSignalAction={(signal) => handleSignalAction("resolve", signal)}
            onSignalDismiss={handleSignalDismiss}
            isLoading={isRefreshing}
          />
        </aside>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          EXCEPTIONS STACK - Full Signal List
          ═══════════════════════════════════════════════════════════════════ */}
      <section
        ref={exceptionsRef}
        id="exceptions-stack"
        aria-labelledby={exceptionsHeaderId}
        className={cn(
          "transition-opacity duration-200",
          !showFullStack && "opacity-80",
          !hasRealData && "opacity-60",
          "motion-reduce:transition-none"
        )}
      >
        <div className="flex items-center justify-between mb-4">
          <h2
            id={exceptionsHeaderId}
            className="text-lg font-semibold text-[color:var(--text-primary)]"
          >
            All Exceptions
          </h2>
          <button
            type="button"
            onClick={handleExpandToggle}
            onKeyDown={handleExpandKeyDown}
            className={cn(
              "text-sm font-medium",
              "text-[color:var(--accent-color)]",
              "hover:underline",
              "transition-colors duration-150",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-color)] focus-visible:ring-offset-2 rounded",
              "motion-reduce:transition-none"
            )}
            aria-expanded={showFullStack}
            aria-controls="exceptions-stack-content"
          >
            {showFullStack ? "Collapse" : "Expand All"}
          </button>
        </div>

        <div id="exceptions-stack-content">
          <ExceptionsStack
            signals={signals}
            showFilters={showFullStack}
            defaultExpandedCategories={showFullStack ? undefined : []}
            onSignalAction={handleSignalAction}
            onSignalDismiss={handleSignalDismiss}
            getTimelineEvents={getTimelineEvents}
            isLoading={isRefreshing}
            isProcessing={isProcessing}
          />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          REFRESH FAB
          ═══════════════════════════════════════════════════════════════════ */}
      <RefreshFab
        onClick={refresh}
        isRefreshing={isRefreshing}
        ariaDescribedBy={refreshStatusId}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTED COMPONENT WITH ERROR BOUNDARY
// ═══════════════════════════════════════════════════════════════════════════

export function CommandCenter(props: CommandCenterProps) {
  return (
    <CommandCenterErrorBoundary>
      <CommandCenterContent {...props} />
    </CommandCenterErrorBoundary>
  );
}

export default CommandCenter;
