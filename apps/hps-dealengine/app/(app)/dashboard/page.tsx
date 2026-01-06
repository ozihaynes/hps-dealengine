/**
 * Portfolio Dashboard Page
 *
 * Multi-deal command center providing bird's-eye view of entire deal pipeline.
 * Aggregates metrics across all deals, identifies priorities, and enables
 * strategic resource allocation.
 *
 * @route /dashboard
 * @module dashboard/page
 * @version 1.0.0 (Slice 16 - Portfolio Dashboard)
 */

import { Suspense } from "react";
import { Metadata } from "next";
import { PortfolioDashboard } from "./PortfolioDashboard";
import { PortfolioSkeleton } from "./PortfolioSkeleton";

export const metadata: Metadata = {
  title: "Portfolio Dashboard | HPS DealEngine",
  description: "Multi-deal command center for pipeline management and strategic decision-making",
};

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-[var(--surface-0)]">
      <Suspense fallback={<PortfolioSkeleton />}>
        <PortfolioDashboard />
      </Suspense>
    </div>
  );
}
