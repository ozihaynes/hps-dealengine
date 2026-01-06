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
 * @version 2.1.1 (Remediated)
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

      {/* Exceptions skeleton */}
      <div className="h-48 rounded-xl bg-[color:var(--bg-secondary)]" />
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
          <h1 className="text-2xl font-semibold tracking-tight text-[color:var(--text-primary)]">
            Command Center
          </h1>
          <p className="text-sm mt-1 text-[color:var(--text-secondary)]">
            Real-time deal scoring, verdict analysis, and signal management
          </p>
        </div>
      </header>

      {/* Command Center Dashboard */}
      <Suspense fallback={<CommandCenterSkeleton />}>
        <CommandCenter />
      </Suspense>
    </div>
  );
}
