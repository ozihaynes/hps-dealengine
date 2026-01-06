/**
 * CommandCenter Component
 *
 * Main orchestrator for the Command Center V2.1 overview.
 * Assembles PulseBar, DecisionCanvas, ActionDock, and ExceptionsStack
 * into a cohesive decision-making interface.
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
 * @version 1.0.0
 */

"use client";

import React, { useState, useCallback } from "react";
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
// NO DATA STATE
// ═══════════════════════════════════════════════════════════════════════════

function NoDataState() {
  return (
    <div
      className="p-12 rounded-xl text-center"
      style={{
        backgroundColor: "var(--surface-raised, #F8FAFC)",
        border: "1px solid var(--border-subtle, #E2E8F0)",
      }}
    >
      <div
        className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center"
        style={{ backgroundColor: "var(--color-brand-primary-soft, #DBEAFE)" }}
      >
        <svg
          className="w-8 h-8"
          style={{ color: "var(--color-brand-primary, #3B82F6)" }}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z"
          />
        </svg>
      </div>
      <h3
        className="text-xl font-semibold mb-2"
        style={{ color: "var(--text-primary, #0F172A)" }}
      >
        No Analysis Data
      </h3>
      <p
        className="text-sm max-w-md mx-auto mb-6"
        style={{ color: "var(--text-secondary, #475569)" }}
      >
        Run an analysis on the Underwrite tab to generate deal metrics, scores,
        and decision recommendations.
      </p>
      <a
        href="/underwrite"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-white transition-colors"
        style={{
          backgroundColor: "var(--color-brand-primary, #3B82F6)",
        }}
      >
        Go to Underwrite
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </a>
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
      <div
        className="p-5 rounded-xl"
        style={{
          backgroundColor: "var(--surface-raised, #F8FAFC)",
          border: "1px solid var(--border-subtle, #E2E8F0)",
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="flex flex-wrap items-center gap-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <div
                  className="h-12 w-20 rounded-lg"
                  style={{ backgroundColor: "var(--surface-sunken, #E2E8F0)" }}
                />
                <div
                  className="h-3 w-16 rounded"
                  style={{ backgroundColor: "var(--surface-sunken, #E2E8F0)" }}
                />
              </div>
            ))}
          </div>
          <div
            className="h-14 w-36 rounded-full"
            style={{ backgroundColor: "var(--surface-sunken, #E2E8F0)" }}
          />
        </div>
      </div>

      {/* Main content skeleton */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div
            className="h-40 rounded-xl"
            style={{ backgroundColor: "var(--surface-sunken, #E2E8F0)" }}
          />
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-28 rounded-xl"
                style={{ backgroundColor: "var(--surface-sunken, #E2E8F0)" }}
              />
            ))}
          </div>
        </div>
        <div className="lg:col-span-1">
          <div
            className="h-80 rounded-xl"
            style={{ backgroundColor: "var(--surface-sunken, #E2E8F0)" }}
          />
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
    refresh,
    dealAddress,
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

  const getTimelineEvents = useCallback((signal: Signal) => {
    return generateTimelineEvents(signal);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // LOADING STATE
  // ─────────────────────────────────────────────────────────────────────────

  if (isLoading) {
    return <CommandCenterLoading />;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // NO DATA STATE
  // ─────────────────────────────────────────────────────────────────────────

  if (!snapshot) {
    return <NoDataState />;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  const activeSignalCount = signals.filter((s) => !s.acknowledged).length;
  const criticalSignalCount = signals.filter(
    (s) => !s.acknowledged && s.severity === "critical"
  ).length;

  return (
    <div className={cn("space-y-6", className)}>
      {/* ═══════════════════════════════════════════════════════════════════
          DEAL CONTEXT HEADER
          ═══════════════════════════════════════════════════════════════════ */}
      {dealAddress && (
        <div
          className="flex items-center justify-between px-4 py-3 rounded-lg"
          style={{
            backgroundColor: "var(--surface-raised, #F8FAFC)",
            border: "1px solid var(--border-subtle, #E2E8F0)",
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: "var(--color-brand-primary-soft, #DBEAFE)" }}
            >
              <svg
                className="w-4 h-4"
                style={{ color: "var(--color-brand-primary, #3B82F6)" }}
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
              <p
                className="font-medium"
                style={{ color: "var(--text-primary, #0F172A)" }}
              >
                {dealAddress}
              </p>
              {lastRunAt && (
                <p
                  className="text-xs"
                  style={{ color: "var(--text-tertiary, #94A3B8)" }}
                >
                  Last analyzed:{" "}
                  {new Date(lastRunAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
              )}
            </div>
          </div>

          {/* Signal summary */}
          {activeSignalCount > 0 && (
            <div className="flex items-center gap-2">
              {criticalSignalCount > 0 && (
                <span
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                  style={{
                    backgroundColor: "var(--color-signal-critical-bg, #FEF2F2)",
                    color: "var(--color-signal-critical-text, #991B1B)",
                  }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full animate-pulse"
                    style={{ backgroundColor: "var(--color-signal-critical-icon, #DC2626)" }}
                  />
                  {criticalSignalCount} Critical
                </span>
              )}
              <span
                className="px-2.5 py-1 rounded-full text-xs font-medium"
                style={{
                  backgroundColor: "var(--surface-overlay, #F1F5F9)",
                  color: "var(--text-secondary, #475569)",
                }}
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
      <section aria-label="Deal Metrics">
        <PulseBar
          snapshot={snapshot as any}
          isLoading={false}
          isStale={isStale}
        />
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          MAIN CONTENT - Two Column Layout
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="grid gap-6 lg:grid-cols-3">
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
          EXCEPTIONS STACK - Full Signal List
          ═══════════════════════════════════════════════════════════════════ */}
      <section
        id="exceptions-stack"
        aria-label="All Signals"
        className={cn(
          "transition-all",
          !showFullStack && "opacity-80"
        )}
        style={{ transitionDuration: "var(--duration-slow, 300ms)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2
            className="text-lg font-semibold"
            style={{ color: "var(--text-primary, #0F172A)" }}
          >
            All Exceptions
          </h2>
          <button
            type="button"
            onClick={() => setShowFullStack(!showFullStack)}
            className="text-sm font-medium transition-colors"
            style={{ color: "var(--color-brand-primary, #3B82F6)" }}
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
      <div
        className="fixed bottom-6 right-6"
        style={{ zIndex: "var(--z-raised, 10)" }}
      >
        <button
          type="button"
          onClick={refresh}
          className="group p-3.5 rounded-full shadow-lg transition-all hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2"
          style={{
            backgroundColor: "var(--color-brand-primary, #3B82F6)",
            boxShadow: "var(--shadow-lg)",
          }}
          title="Refresh analysis"
          aria-label="Refresh analysis"
        >
          <svg
            className="w-5 h-5 text-white transition-transform group-hover:rotate-180"
            style={{ transitionDuration: "var(--duration-slow, 300ms)" }}
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
