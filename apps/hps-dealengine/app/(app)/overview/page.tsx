/**
 * Overview Page - V2.5 Dashboard
 *
 * The primary decision-making interface for deal operators.
 * Displays L2 scores, verdict, signals, and resolution actions
 * in a cohesive, breathtaking dashboard experience.
 *
 * Architecture (V2.5):
 * - V25EnhancementsZone is the sole dashboard renderer
 * - 11 rows of rich, animated components
 * - Demo data shows full UI when no analysis exists
 *
 * Layout:
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  ROW 0: Decision Hero (verdict reveal)                                  │
 * │  ROW 1: Score Analysis Bar (Closeability, Urgency, Buyer Demand)       │
 * │  ROW 2: Confidence Indicators Bar                                       │
 * │  ROW 3: Status Bar (Risk Gates + Evidence Health)                      │
 * │  ROW 4: Verdict Card                                                    │
 * │  ROW 5: Price Geometry Bar                                              │
 * │  ROW 6: Net Clearance Panel                                             │
 * │  ROW 7: Evidence + Risk Gates Strip                                     │
 * │  ROW 8: ARV + Market + Comp Quality                                     │
 * │  ROW 9: Liquidity & Buyer Fit                                           │
 * │  ROW 10: Decision Rationale                                             │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * @module app/overview
 * @version 3.0.0 (V25 Dashboard - CommandCenter removed)
 */

import { V25EnhancementsZone } from "@/components/v25";
import { FieldModeButton } from "./FieldModeButton";

// ═══════════════════════════════════════════════════════════════════════════
// METADATA
// ═══════════════════════════════════════════════════════════════════════════

export const metadata = {
  title: "Dashboard | HPS DealEngine",
  description:
    "Deal decision-making dashboard with L2 scores, verdict, and signals",
};

// Force dynamic rendering for real-time data
export const dynamic = "force-dynamic";

// ═══════════════════════════════════════════════════════════════════════════
// PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function OverviewPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <header className="space-y-1">
        {/* Title row with Field Mode button on mobile only */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight text-[color:var(--text-primary)]">
            Dashboard
          </h1>
          {/* Mobile-only Field Mode Button (hidden on sm+ screens) */}
          <FieldModeButton />
        </div>
        <p className="text-sm text-[color:var(--text-secondary)]">
          Real-time deal scoring, verdict analysis, and signal management
        </p>
      </header>

      {/* ════════════════════════════════════════════════════════════════
          V2.5 DASHBOARD
          ────────────────────────────────────────────────────────────────
          Principles Applied:
          - Peak-End Rule: Verdict Hero is the peak decision moment
          - Hick's Law: One clear decision (PURSUE/NEEDS_EVIDENCE/PASS)
          - Progressive Disclosure: Summary first, details on expand

          Demo data shown when no analysis exists.
          ════════════════════════════════════════════════════════════════ */}
      <V25EnhancementsZone />
    </div>
  );
}
