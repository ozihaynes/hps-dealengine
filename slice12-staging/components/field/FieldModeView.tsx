"use client";

import React from "react";
import { ArrowLeft, MoreVertical, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useFieldModeData } from "@/lib/hooks/useFieldModeData";
import { FieldVerdictHero } from "./FieldVerdictHero";
import { FieldPriceGeometry } from "./FieldPriceGeometry";
import { FieldRiskSummary } from "./FieldRiskSummary";
import { FieldNetClearance } from "./FieldNetClearance";
import { FieldModeSkeleton } from "./FieldModeSkeleton";
import { Button } from "@/components/ui";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FieldModeViewProps {
  dealId: string;
}

// ---------------------------------------------------------------------------
// Empty State Component
// ---------------------------------------------------------------------------

function FieldModeEmptyState({ onNavigateToAnalyze }: { onNavigateToAnalyze: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center min-h-[60vh]">
      <div className="w-16 h-16 rounded-full bg-surface-secondary/50 flex items-center justify-center mb-4">
        <RefreshCw className="w-8 h-8 text-text-tertiary" />
      </div>
      <h2 className="text-lg font-semibold text-text-primary mb-2">
        No Analysis Run
      </h2>
      <p className="text-sm text-text-secondary mb-6 max-w-xs">
        Run an analysis first to see the field view with verdict, pricing, and risks.
      </p>
      <Button
        onClick={onNavigateToAnalyze}
        className="min-h-[48px] px-6"
      >
        Go to Underwrite
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Error State Component
// ---------------------------------------------------------------------------

function FieldModeErrorState({
  error,
  onRetry,
}: {
  error: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center min-h-[60vh]">
      <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
        <span className="text-3xl">⚠️</span>
      </div>
      <h2 className="text-lg font-semibold text-text-primary mb-2">
        Something went wrong
      </h2>
      <p className="text-sm text-text-secondary mb-6 max-w-xs">
        {error}
      </p>
      <Button
        onClick={onRetry}
        className="min-h-[48px] px-6"
      >
        Try Again
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Header Component
// ---------------------------------------------------------------------------

function FieldModeHeader({
  address,
  onBack,
}: {
  address: string;
  onBack: () => void;
}) {
  return (
    <header
      className={`
        sticky top-0 z-10
        bg-surface-primary/80
        backdrop-blur-md
        border-b border-white/5
        px-4 py-3
        flex items-center gap-3
      `}
    >
      {/* Back Button - 48x48 touch target */}
      <button
        onClick={onBack}
        className={`
          flex items-center justify-center
          w-12 h-12
          rounded-lg
          bg-surface-secondary/50
          hover:bg-surface-secondary
          transition-colors
          -ml-2
        `}
        aria-label="Go back to dashboard"
      >
        <ArrowLeft className="w-5 h-5 text-text-primary" />
      </button>

      {/* Title */}
      <div className="flex-1 min-w-0">
        <h1 className="text-sm font-medium text-text-primary truncate">
          Field Mode
        </h1>
        <p className="text-xs text-text-tertiary truncate">
          {address}
        </p>
      </div>

      {/* Menu Button - 48x48 touch target */}
      <button
        className={`
          flex items-center justify-center
          w-12 h-12
          rounded-lg
          hover:bg-surface-secondary/50
          transition-colors
          -mr-2
        `}
        aria-label="More options"
      >
        <MoreVertical className="w-5 h-5 text-text-secondary" />
      </button>
    </header>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

/**
 * FieldModeView
 * 
 * Mobile-optimized view for in-the-field deal evaluation.
 * Shows only critical decision data: Verdict, Geometry, Risks, Clearance.
 * 
 * Design Philosophy:
 * - Answer "Should I pursue?" in 5 seconds
 * - All critical data visible without scroll on mobile
 * - Large touch targets (48px+) for one-thumb operation
 * 
 * Principles Applied:
 * - Hick's Law: Only 4 data zones to reduce cognitive load
 * - Miller's Law: Max 6-7 items visible (chunked into cards)
 * - Fitts's Law: All touch targets ≥48px
 * - Progressive Disclosure: Summary only; tap for full dashboard
 * - WCAG AA: Contrast ≥4.5:1, touch targets ≥44px
 */
export function FieldModeView({ dealId }: FieldModeViewProps) {
  const router = useRouter();
  const { data, isLoading, hasRun, error } = useFieldModeData();

  // Navigation handlers
  const handleBack = () => {
    // Navigate to overview/dashboard with dealId preserved
    router.push(`/overview?dealId=${dealId}`);
  };

  const handleNavigateToAnalyze = () => {
    router.push(`/underwrite?dealId=${dealId}`);
  };

  const handleViewFullDashboard = () => {
    router.push(`/overview?dealId=${dealId}`);
  };

  const handleRetry = () => {
    // Trigger a refresh by reloading the page
    window.location.reload();
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface-primary">
        <FieldModeHeader address="Loading..." onBack={handleBack} />
        <FieldModeSkeleton />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-surface-primary">
        <FieldModeHeader address="Error" onBack={handleBack} />
        <FieldModeErrorState error={error} onRetry={handleRetry} />
      </div>
    );
  }

  // No run state
  if (!hasRun || !data) {
    return (
      <div className="min-h-screen bg-surface-primary">
        <FieldModeHeader address="No Analysis" onBack={handleBack} />
        <FieldModeEmptyState onNavigateToAnalyze={handleNavigateToAnalyze} />
      </div>
    );
  }

  // Ready state - show all field mode data
  return (
    <div className="min-h-screen bg-surface-primary pb-20">
      <FieldModeHeader address={data.propertyAddress} onBack={handleBack} />

      <main className="flex flex-col gap-4 p-4">
        {/* ① Verdict Hero - Primary decision zone */}
        <FieldVerdictHero
          verdict={data.verdict}
          verdictReason={data.verdictReason}
          netClearance={data.netClearance}
          bestExit={data.bestExit}
        />

        {/* ② Price Geometry - ZOPA/MAO/Floor grid */}
        <FieldPriceGeometry geometry={data.priceGeometry} />

        {/* ③ Risk Summary - Top 3 non-passing gates */}
        <FieldRiskSummary
          risks={data.topRisks}
          gatesSummary={data.gatesSummary}
        />

        {/* ④ Net Clearance - Exit strategy comparison */}
        <FieldNetClearance exits={data.exits} />

        {/* ⑤ View Full Dashboard CTA */}
        <Button
          onClick={handleViewFullDashboard}
          variant="secondary"
          className={`
            w-full
            min-h-[48px]
            text-base
            font-medium
          `}
        >
          View Full Dashboard
        </Button>
      </main>
    </div>
  );
}
