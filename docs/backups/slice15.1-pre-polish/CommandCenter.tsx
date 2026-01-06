/**
 * CommandCenter Component
 *
 * Main orchestrator for the Command Center V2.1 overview.
 * Assembles PulseBar, DecisionCanvas, ActionDock, and ExceptionsStack
 * into a cohesive decision-making interface.
 *
 * KEY BEHAVIOR: Dashboard is ALWAYS visible.
 * - Shows structure with placeholder values if no analysis
 * - "No Data" banner prompts user to run underwriting
 * - All components render regardless of data state
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
 * @version 1.1.0 (Remediated)
 */

"use client";

import React, { useState, useCallback } from "react";
import Link from "next/link";
import { cn } from "@/components/ui";
import {
  PulseBar,
  DecisionCanvas,
  ActionDock,
  ExceptionsStack,
  type Signal,
} from "@/components/command-center";
import { useOverviewData, generateTimelineEvents } from "./useOverviewData";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface CommandCenterProps {
  /** Additional className */
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// NO DATA BANNER (Inline notification, not blocking)
// ═══════════════════════════════════════════════════════════════════════════

function NoDataBanner({ dealId }: { dealId: string | null }) {
  const href = dealId ? `/underwrite?dealId=${dealId}` : "/underwrite";
  
  return (
    <div className="relative overflow-hidden rounded-xl border border-[color:var(--glass-border)] bg-[color:var(--glass-bg)] backdrop-blur">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-r from-[color:var(--accent-color)]/5 via-transparent to-[color:var(--accent-color)]/5 animate-pulse" />
      
      <div className="relative flex flex-col sm:flex-row items-center justify-between gap-4 px-5 py-4">
        <div className="flex items-center gap-4">
          {/* Icon with glow effect */}
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-[color:var(--accent-color)]/20 blur-md" />
            <div className="relative w-12 h-12 rounded-full bg-[color:var(--accent-color)]/10 border border-[color:var(--accent-color)]/30 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-[color:var(--accent-color)]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
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
              Analysis Required
            </h3>
            <p className="text-sm text-[color:var(--text-secondary)]">
              Run underwriting to populate metrics, scores, and recommendations
            </p>
          </div>
        </div>

        <Link
          href={href}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-white transition-all hover:scale-105 hover:shadow-lg bg-[color:var(--accent-color)] hover:bg-[color:var(--accent-color-hover,var(--accent-color))]"
        >
          Run Analysis
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </Link>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// LOADING STATE
// ═══════════════════════════════════════════════════════════════════════════

function CommandCenterLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* PulseBar skeleton */}
      <div className="p-5 rounded-xl border border-[color:var(--glass-border)] bg-[color:var(--glass-bg)]">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="flex flex-wrap items-center gap-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <div className="h-12 w-20 rounded-lg bg-[color:var(--bg-secondary)]" />
                <div className="h-3 w-16 rounded bg-[color:var(--bg-secondary)]" />
              </div>
            ))}
          </div>
          <div className="h-14 w-36 rounded-full bg-[color:var(--bg-secondary)]" />
        </div>
      </div>

      {/* Main content skeleton */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="h-40 rounded-xl bg-[color:var(--bg-secondary)]" />
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 rounded-xl bg-[color:var(--bg-secondary)]" />
            ))}
          </div>
        </div>
        <div className="lg:col-span-1">
          <div className="h-80 rounded-xl bg-[color:var(--bg-secondary)]" />
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function CommandCenter({ className }: CommandCenterProps) {
  const {
    snapshot,
    signals,
    isLoading,
    isStale,
    hasRealData,
    refresh,
    dealAddress,
    dealId,
    lastRunAt,
  } = useOverviewData();

  const [isProcessing, setIsProcessing] = useState(false);
  const [showFullStack, setShowFullStack] = useState(false);

  // ─────────────────────────────────────────────────────────────────────────
  // HANDLERS
  // ─────────────────────────────────────────────────────────────────────────

  const handleSignalAction = useCallback(
    async (actionId: string, signal: Signal, note?: string) => {
      setIsProcessing(true);
      console.log("[CommandCenter] Signal action:", {
        actionId,
        signalId: signal.id,
        signalCode: signal.code,
        note,
      });

      // Simulate API call for action processing
      await new Promise((resolve) => setTimeout(resolve, 800));

      setIsProcessing(false);
      // TODO: Integrate with actual signal resolution API
    },
    []
  );

  const handleSignalDismiss = useCallback((signal: Signal) => {
    console.log("[CommandCenter] Signal dismissed:", signal.id);
    // TODO: Integrate with signal dismissal API
  }, []);

  const handleResolveAll = useCallback(() => {
    setShowFullStack(true);
    // Smooth scroll to exceptions stack
    setTimeout(() => {
      document.getElementById("exceptions-stack")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
  }, []);

  const getTimelineEvents = useCallback(
    (signal: Signal) => generateTimelineEvents(signal),
    []
  );

  // ─────────────────────────────────────────────────────────────────────────
  // LOADING STATE
  // ─────────────────────────────────────────────────────────────────────────

  if (isLoading) {
    return <CommandCenterLoading />;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER - Dashboard ALWAYS visible
  // ─────────────────────────────────────────────────────────────────────────

  const activeSignalCount = signals.filter((s) => !s.acknowledged).length;
  const criticalSignalCount = signals.filter(
    (s) => !s.acknowledged && s.severity === "critical"
  ).length;

  return (
    <div className={cn("space-y-6", className)}>
      {/* ═══════════════════════════════════════════════════════════════════
          NO DATA BANNER (shown when no analysis exists)
          ═══════════════════════════════════════════════════════════════════ */}
      {!hasRealData && <NoDataBanner dealId={dealId} />}

      {/* ═══════════════════════════════════════════════════════════════════
          DEAL CONTEXT HEADER
          ═══════════════════════════════════════════════════════════════════ */}
      {dealAddress && (
        <div className="flex items-center justify-between px-4 py-3 rounded-lg border border-[color:var(--glass-border)] bg-[color:var(--glass-bg)] backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[color:var(--accent-color)]/10">
              <svg
                className="w-4 h-4 text-[color:var(--accent-color)]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
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
              {lastRunAt ? (
                <p className="text-xs text-[color:var(--text-secondary)]">
                  Last analyzed:{" "}
                  {new Date(lastRunAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
              ) : (
                <p className="text-xs text-[color:var(--text-secondary)]">
                  Not yet analyzed
                </p>
              )}
            </div>
          </div>

          {/* Signal summary */}
          {activeSignalCount > 0 && hasRealData && (
            <div className="flex items-center gap-2">
              {criticalSignalCount > 0 && (
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-500 dark:bg-red-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  {criticalSignalCount} Critical
                </span>
              )}
              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-[color:var(--bg-secondary)] text-[color:var(--text-secondary)]">
                {activeSignalCount} Total
              </span>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          PULSE BAR - Hero Metrics (ALWAYS VISIBLE)
          ═══════════════════════════════════════════════════════════════════ */}
      <section 
        aria-label="Deal Metrics"
        className={cn(!hasRealData && "opacity-60")}
      >
        <PulseBar
          snapshot={snapshot as any}
          isLoading={false}
          isStale={isStale}
        />
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          MAIN CONTENT - Two Column Layout (ALWAYS VISIBLE)
          ═══════════════════════════════════════════════════════════════════ */}
      <div className={cn(
        "grid gap-6 lg:grid-cols-3",
        !hasRealData && "opacity-60"
      )}>
        {/* Decision Canvas - 2/3 width */}
        <section
          aria-label="Decision Details"
          className="lg:col-span-2 min-w-0"
        >
          <DecisionCanvas snapshot={snapshot as any} isLoading={false} />
        </section>

        {/* Action Dock - 1/3 width */}
        <aside
          aria-label="Action Required"
          className="lg:col-span-1 lg:sticky lg:top-24 lg:self-start"
        >
          <ActionDock
            signals={signals}
            maxDisplay={4}
            showFilters={false}
            title="Action Required"
            onResolveAll={handleResolveAll}
            onSignalClick={() => setShowFullStack(true)}
            onSignalAction={(signal) =>
              handleSignalAction("resolve", signal)
            }
            onSignalDismiss={handleSignalDismiss}
            isLoading={false}
          />
        </aside>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          EXCEPTIONS STACK - Full Signal List (ALWAYS VISIBLE)
          ═══════════════════════════════════════════════════════════════════ */}
      <section
        id="exceptions-stack"
        aria-label="All Signals"
        className={cn(
          "transition-all duration-300",
          !showFullStack && "opacity-80",
          !hasRealData && "opacity-60"
        )}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[color:var(--text-primary)]">
            All Exceptions
          </h2>
          <button
            type="button"
            onClick={() => setShowFullStack(!showFullStack)}
            className="text-sm font-medium text-[color:var(--accent-color)] hover:underline transition-colors"
          >
            {showFullStack ? "Collapse" : "Expand All"}
          </button>
        </div>

        <ExceptionsStack
          signals={signals}
          showFilters={showFullStack}
          defaultExpandedCategories={showFullStack ? undefined : []}
          onSignalAction={handleSignalAction}
          onSignalDismiss={handleSignalDismiss}
          getTimelineEvents={getTimelineEvents}
          isLoading={false}
          isProcessing={isProcessing}
        />
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          REFRESH FAB (Floating Action Button)
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          type="button"
          onClick={refresh}
          className="group p-3.5 rounded-full shadow-lg transition-all hover:shadow-xl hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[color:var(--accent-color)] bg-[color:var(--accent-color)]"
          title="Refresh analysis"
          aria-label="Refresh analysis"
        >
          <svg
            className="w-5 h-5 text-white transition-transform duration-300 group-hover:rotate-180"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default CommandCenter;
