/**
 * Overview Page - Command Center V2.1
 *
 * The primary decision-making interface for deal operators.
 * Displays L2 scores, verdict, signals, and resolution actions
 * in a cohesive, breathtaking dashboard experience.
 *
 * Architecture:
 * - Server component that wraps client CommandCenter
 * - Suspense boundary for smooth loading transitions
 * - Clean separation between page shell and interactive content
 *
 * @module app/overview
 * @version 2.1.0
 */

import { Suspense } from "react";
import { CommandCenter } from "./CommandCenter";

// ═══════════════════════════════════════════════════════════════════════════
// METADATA
// ═══════════════════════════════════════════════════════════════════════════

export const metadata = {
  title: "Command Center | HPS DealEngine",
  description:
    "Deal decision-making dashboard with L2 scores, verdict, and signals",
};

// Force dynamic rendering for real-time data
export const dynamic = "force-dynamic";

// ═══════════════════════════════════════════════════════════════════════════
// LOADING SKELETON
// ═══════════════════════════════════════════════════════════════════════════

function CommandCenterSkeleton() {
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

      {/* Exceptions skeleton */}
      <div
        className="h-48 rounded-xl"
        style={{ backgroundColor: "var(--surface-sunken, #E2E8F0)" }}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function OverviewPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-semibold tracking-tight"
            style={{ color: "var(--text-primary, #0F172A)" }}
          >
            Command Center
          </h1>
          <p
            className="text-sm mt-1"
            style={{ color: "var(--text-secondary, #475569)" }}
          >
            Real-time deal scoring, verdict analysis, and signal management
          </p>
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-2">
          <a
            href="/underwrite"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              backgroundColor: "var(--surface-overlay, #F1F5F9)",
              color: "var(--text-secondary, #475569)",
            }}
          >
            <svg
              className="w-4 h-4"
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
            Underwrite
          </a>
        </div>
      </header>

      {/* Command Center Dashboard */}
      <Suspense fallback={<CommandCenterSkeleton />}>
        <CommandCenter />
      </Suspense>
    </div>
  );
}
