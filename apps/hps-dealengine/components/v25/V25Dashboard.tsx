/**
 * V25Dashboard — Slice 13
 *
 * Main orchestrator for the V2.5 dashboard experience.
 * Composes all V2.5 components with Framer Motion animations.
 *
 * Visual Hierarchy (per design spec):
 * 1. Verdict Hero (largest, most prominent)
 * 2. Confidence + Key Metrics
 * 3. Risk/Evidence Status Strip
 * 4. Detailed Cards Grid
 *
 * @module V25Dashboard
 */

'use client';

import { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useDashboardData } from '@/lib/hooks/useDashboardData';
import { cn } from '@/components/ui';
import { VerdictChip } from '@/components/dashboard/verdict/VerdictChip';
import { formatCurrency, getVerdictConfig } from '@/lib/utils/display';
import {
  fadeInUp,
  verdictReveal,
  staggerContainer,
  cardLift,
} from '@/lib/animations';
import type { VerdictType, DashboardData } from '@/lib/types/dashboard';

// ─────────────────────────────────────────────────────────────────────
// DEMO DATA (Shown when no analysis has been run)
// ─────────────────────────────────────────────────────────────────────
// Principles Applied:
// - uiux-art-director: Show all visual components for familiarity
// - behavioral-design-strategist: Recognition over recall
// - frontend-polisher: All states polished with consistent styling

const DEMO_DASHBOARD_DATA: DashboardData = {
  dealId: 'demo-deal',
  propertyAddress: '123 Demo Street, Example City, FL 32789',
  clientName: 'Demo Client',

  verdict: {
    recommendation: 'NEEDS_EVIDENCE',
    confidence: 72,
    reason: 'Run an analysis to calculate the actual verdict based on your deal data.',
    blockingFactors: [],
  },

  priceGeometry: {
    zopa: 42000,
    zopaPercent: 14.8,
    mao: 168000,
    floor: 150000,
    ceiling: 192000,
    hasZopa: true,
  },

  netClearance: {
    bestStrategy: 'Assignment',
    netAmount: 18500,
    strategies: [
      { name: 'Assignment', net: 18500, isRecommended: true },
      { name: 'Double Close', net: 22000, isRecommended: false },
    ],
  },

  compQuality: {
    score: 82,
    grade: 'B+',
    compsCount: 6,
  },

  evidence: {
    collected: 8,
    total: 12,
    criticalMissing: ['Title Commitment'],
  },

  market: {
    velocityBand: 'warm',
    liquidityScore: 72,
  },

  arvConfidence: {
    grade: 'B+',
    range: { low: 260000, mid: 285000, high: 310000 },
  },

  riskGates: {
    passed: 6,
    total: 8,
    blocking: 0,
    gates: [
      { id: 'arv_confidence', label: 'ARV Confidence', status: 'pass' },
      { id: 'comp_quality', label: 'Comp Quality', status: 'pass' },
      { id: 'zopa_exists', label: 'ZOPA Exists', status: 'pass' },
      { id: 'net_positive', label: 'Net Positive', status: 'pass' },
      { id: 'title_clear', label: 'Title Clear', status: 'warning' },
      { id: 'insurability', label: 'Insurability', status: 'warning' },
      { id: 'liens_check', label: 'Liens Check', status: 'pass' },
      { id: 'occupancy', label: 'Occupancy', status: 'pass' },
    ],
  },

  lastRunId: null,
  lastRunAt: null,
  isStale: false,
};

// ─────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────

export interface V25DashboardProps {
  /** Additional CSS classes */
  className?: string;
  /** Show detailed cards section */
  showDetailedCards?: boolean;
  /** Compact mode for smaller viewports */
  compact?: boolean;
}

// ─────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────

/**
 * Map VerdictType to DealVerdictRecommendation for VerdictChip
 */
function mapVerdictToChipRecommendation(
  verdict: VerdictType
): 'pursue' | 'needs_evidence' | 'pass' | null {
  switch (verdict) {
    case 'PURSUE':
      return 'pursue';
    case 'NEEDS_EVIDENCE':
      return 'needs_evidence';
    case 'PASS':
      return 'pass';
    default:
      return null;
  }
}

/**
 * Get risk status color based on blocking count
 */
function getRiskStatusColor(
  blocking: number,
  passed: number,
  total: number
): { color: string; bgColor: string; borderColor: string } {
  if (blocking > 0) {
    return {
      color: 'text-red-400',
      bgColor: 'bg-red-500/20',
      borderColor: 'border-red-500/40',
    };
  }
  if (passed === total) {
    return {
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/20',
      borderColor: 'border-emerald-500/40',
    };
  }
  return {
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/20',
    borderColor: 'border-amber-500/40',
  };
}

/**
 * Get evidence status color based on collection progress
 */
function getEvidenceStatusColor(
  collected: number,
  total: number,
  criticalMissing: string[]
): { color: string; bgColor: string; borderColor: string } {
  if (criticalMissing.length > 0) {
    return {
      color: 'text-red-400',
      bgColor: 'bg-red-500/20',
      borderColor: 'border-red-500/40',
    };
  }
  if (collected === total) {
    return {
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/20',
      borderColor: 'border-emerald-500/40',
    };
  }
  if (collected / total >= 0.7) {
    return {
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/20',
      borderColor: 'border-amber-500/40',
    };
  }
  return {
    color: 'text-slate-400',
    bgColor: 'bg-slate-500/20',
    borderColor: 'border-slate-500/40',
  };
}

/**
 * Get velocity band display info
 */
function getVelocityBandInfo(band: string): { label: string; color: string } {
  const bands: Record<string, { label: string; color: string }> = {
    hot: { label: 'Hot Market', color: 'text-red-400' },
    warm: { label: 'Warm Market', color: 'text-orange-400' },
    balanced: { label: 'Balanced', color: 'text-blue-400' },
    cool: { label: 'Cool Market', color: 'text-cyan-400' },
    cold: { label: 'Cold Market', color: 'text-blue-600' },
  };
  return bands[band] ?? { label: 'Unknown', color: 'text-slate-400' };
}

// ─────────────────────────────────────────────────────────────────────
// SUB-COMPONENT: Verdict Hero Section
// ─────────────────────────────────────────────────────────────────────

interface VerdictHeroProps {
  verdict: DashboardData['verdict'];
  propertyAddress: string;
  compact?: boolean;
}

const VerdictHero = memo(function VerdictHero({
  verdict,
  propertyAddress,
  compact,
}: VerdictHeroProps) {
  const verdictConfig = getVerdictConfig(verdict.recommendation);

  return (
    <motion.div
      variants={verdictReveal}
      initial="initial"
      animate="animate"
      data-testid="v25-verdict-hero"
      className={cn(
        'rounded-xl border bg-[var(--card-bg-solid)] backdrop-blur-xl',
        'shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]',
        compact ? 'p-4' : 'p-6',
        verdictConfig.borderColor
      )}
    >
      {/* Property Address */}
      <p className="text-sm text-slate-400 mb-2 truncate" title={propertyAddress}>
        {propertyAddress}
      </p>

      {/* Verdict Display */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <span
            className={cn('text-3xl', verdictConfig.color)}
            aria-hidden="true"
          >
            {verdictConfig.icon}
          </span>
          <div>
            <h2 className={cn('text-2xl font-bold', verdictConfig.color)}>
              {verdictConfig.label}
            </h2>
            <p className="text-sm text-slate-500">{verdictConfig.description}</p>
          </div>
        </div>
        <VerdictChip
          recommendation={mapVerdictToChipRecommendation(verdict.recommendation)}
          confidencePct={verdict.confidence}
          size="lg"
        />
      </div>

      {/* Confidence Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-slate-500">Confidence</span>
          <span className={cn('font-medium', verdictConfig.color)}>
            {verdict.confidence}%
          </span>
        </div>
        <div className="h-2 bg-[var(--card-bg-solid)] rounded-full overflow-hidden">
          <motion.div
            className={cn('h-full rounded-full', verdictConfig.bgColor)}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, Math.max(0, verdict.confidence))}%` }}
            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
          />
        </div>
      </div>

      {/* Verdict Reason */}
      <p className="text-sm text-slate-400 leading-relaxed">{verdict.reason}</p>

      {/* Blocking Factors */}
      {verdict.blockingFactors.length > 0 && (
        <div className="mt-4 pt-4 border-t border-white/10">
          <h4 className="text-xs font-medium text-red-400 uppercase tracking-wide mb-2">
            Blocking Factors
          </h4>
          <ul className="space-y-1">
            {verdict.blockingFactors.map((factor, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2 text-sm text-red-300"
              >
                <span className="text-red-500 mt-0.5" aria-hidden="true">
                  •
                </span>
                {factor}
              </li>
            ))}
          </ul>
        </div>
      )}
    </motion.div>
  );
});

// ─────────────────────────────────────────────────────────────────────
// SUB-COMPONENT: Status Strip
// ─────────────────────────────────────────────────────────────────────

interface StatusStripProps {
  riskGates: DashboardData['riskGates'];
  evidence: DashboardData['evidence'];
  compact?: boolean;
}

const StatusStrip = memo(function StatusStrip({
  riskGates,
  evidence,
  compact,
}: StatusStripProps) {
  const riskColors = getRiskStatusColor(
    riskGates.blocking,
    riskGates.passed,
    riskGates.total
  );
  const evidenceColors = getEvidenceStatusColor(
    evidence.collected,
    evidence.total,
    evidence.criticalMissing
  );

  return (
    <motion.div
      variants={fadeInUp}
      initial="initial"
      animate="animate"
      data-testid="v25-status-strip"
      className={cn(
        'grid grid-cols-2 gap-3',
        compact && 'grid-cols-1'
      )}
    >
      {/* Risk Gates Status */}
      <div
        className={cn(
          'rounded-lg border p-3',
          riskColors.borderColor,
          riskColors.bgColor
        )}
        data-testid="v25-risk-status"
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-300">Risk Gates</span>
          <span
            className={cn(
              'text-xs font-medium px-2 py-0.5 rounded-full border',
              riskColors.color,
              riskColors.bgColor,
              riskColors.borderColor
            )}
          >
            {riskGates.passed}/{riskGates.total} passed
          </span>
        </div>
        {riskGates.blocking > 0 && (
          <p className="text-xs text-red-400 mt-1">
            {riskGates.blocking} blocking issue{riskGates.blocking !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Evidence Status */}
      <div
        className={cn(
          'rounded-lg border p-3',
          evidenceColors.borderColor,
          evidenceColors.bgColor
        )}
        data-testid="v25-evidence-status"
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-300">Evidence</span>
          <span
            className={cn(
              'text-xs font-medium px-2 py-0.5 rounded-full border',
              evidenceColors.color,
              evidenceColors.bgColor,
              evidenceColors.borderColor
            )}
          >
            {evidence.collected}/{evidence.total} collected
          </span>
        </div>
        {evidence.criticalMissing.length > 0 && (
          <p className="text-xs text-red-400 mt-1">
            Missing: {evidence.criticalMissing.slice(0, 2).join(', ')}
            {evidence.criticalMissing.length > 2 &&
              ` +${evidence.criticalMissing.length - 2} more`}
          </p>
        )}
      </div>
    </motion.div>
  );
});

// ─────────────────────────────────────────────────────────────────────
// SUB-COMPONENT: Key Metrics Grid
// ─────────────────────────────────────────────────────────────────────

interface KeyMetricsGridProps {
  priceGeometry: DashboardData['priceGeometry'];
  netClearance: DashboardData['netClearance'];
  market: DashboardData['market'];
  compQuality: DashboardData['compQuality'];
  compact?: boolean;
}

const KeyMetricsGrid = memo(function KeyMetricsGrid({
  priceGeometry,
  netClearance,
  market,
  compQuality,
  compact,
}: KeyMetricsGridProps) {
  const velocityInfo = getVelocityBandInfo(market.velocityBand);

  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      data-testid="v25-key-metrics"
      className={cn('grid gap-3', compact ? 'grid-cols-2' : 'grid-cols-4')}
    >
      {/* ZOPA */}
      <motion.div
        variants={cardLift}
        className="rounded-xl border border-white/10 bg-[var(--card-bg)] backdrop-blur-xl p-3"
        data-testid="v25-metric-zopa"
      >
        <span className="text-xs text-slate-500 uppercase tracking-wide">
          ZOPA
        </span>
        <p
          className={cn(
            'text-lg font-bold mt-1',
            priceGeometry.hasZopa ? 'text-emerald-400' : 'text-red-400'
          )}
        >
          {priceGeometry.hasZopa
            ? formatCurrency(priceGeometry.zopa ?? 0)
            : 'No ZOPA'}
        </p>
        {priceGeometry.zopaPercent !== null && priceGeometry.hasZopa && (
          <span className="text-xs text-slate-500">
            {priceGeometry.zopaPercent.toFixed(1)}% of ARV
          </span>
        )}
      </motion.div>

      {/* Net Clearance */}
      <motion.div
        variants={cardLift}
        className="rounded-xl border border-white/10 bg-[var(--card-bg)] backdrop-blur-xl p-3"
        data-testid="v25-metric-net"
      >
        <span className="text-xs text-slate-500 uppercase tracking-wide">
          Best Net ({netClearance.bestStrategy})
        </span>
        <p
          className={cn(
            'text-lg font-bold mt-1',
            netClearance.netAmount >= 0 ? 'text-emerald-400' : 'text-red-400'
          )}
        >
          {formatCurrency(netClearance.netAmount)}
        </p>
      </motion.div>

      {/* Market Velocity */}
      <motion.div
        variants={cardLift}
        className="rounded-xl border border-white/10 bg-[var(--card-bg)] backdrop-blur-xl p-3"
        data-testid="v25-metric-market"
      >
        <span className="text-xs text-slate-500 uppercase tracking-wide">
          Market
        </span>
        <p className={cn('text-lg font-bold mt-1', velocityInfo.color)}>
          {velocityInfo.label}
        </p>
        <span className="text-xs text-slate-500">
          Liquidity: {market.liquidityScore}%
        </span>
      </motion.div>

      {/* Comp Quality */}
      <motion.div
        variants={cardLift}
        className="rounded-xl border border-white/10 bg-[var(--card-bg)] backdrop-blur-xl p-3"
        data-testid="v25-metric-comps"
      >
        <span className="text-xs text-slate-500 uppercase tracking-wide">
          Comp Quality
        </span>
        <p className="text-lg font-bold mt-1 text-slate-300">
          {compQuality.grade.toUpperCase()}
        </p>
        <span className="text-xs text-slate-500">
          {compQuality.compsCount} comps • {compQuality.score}% score
        </span>
      </motion.div>
    </motion.div>
  );
});

// ─────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────

export const V25Dashboard = memo(function V25Dashboard({
  className,
  showDetailedCards = true,
  compact = false,
}: V25DashboardProps): JSX.Element {
  const { data, isLoading, hasRun } = useDashboardData();

  // ─────────────────────────────────────────────────────────────────
  // LOADING STATE
  // ─────────────────────────────────────────────────────────────────

  if (isLoading) {
    // Render skeleton from separate component
    return (
      <div
        data-testid="v25-dashboard"
        data-state="loading"
        className={cn('space-y-4', className)}
      >
        <div className="animate-pulse">
          <div className="h-48 bg-[var(--card-bg)] rounded-xl" />
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="h-16 bg-[var(--card-bg)] rounded-xl" />
            <div className="h-16 bg-[var(--card-bg)] rounded-xl" />
          </div>
          <div className="grid grid-cols-4 gap-3 mt-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-[var(--card-bg)] rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────
  // DEMO MODE: Show dashboard with placeholder data when no analysis
  // ─────────────────────────────────────────────────────────────────
  // Principles Applied:
  // - uiux-art-director: All visual components visible for familiarity
  // - behavioral-design-strategist: Recognition over recall
  // - frontend-polisher: Consistent styling with demo indicator

  const isDemo = !hasRun || !data;
  const displayData = isDemo ? DEMO_DASHBOARD_DATA : data;

  // ─────────────────────────────────────────────────────────────────
  // RENDER: Dashboard with real data OR demo data
  // ─────────────────────────────────────────────────────────────────

  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      data-testid="v25-dashboard"
      data-state={isDemo ? 'demo' : 'loaded'}
      data-verdict={displayData.verdict.recommendation}
      className={cn('space-y-4', className)}
    >
      {/* Demo Mode Banner */}
      {isDemo && (
        <motion.div
          variants={fadeInUp}
          className="rounded-lg border border-blue-500/40 bg-blue-500/10 p-3"
          data-testid="v25-demo-banner"
        >
          <div className="flex items-center gap-3">
            <span className="text-xl" aria-hidden="true">📊</span>
            <div>
              <p className="text-sm font-medium text-blue-400">
                Preview Mode — Sample Data Shown
              </p>
              <p className="text-xs text-blue-400/70">
                Run an analysis on your deal to see actual results
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* 1. Verdict Hero (Largest, Most Prominent) */}
      <VerdictHero
        verdict={displayData.verdict}
        propertyAddress={displayData.propertyAddress}
        compact={compact}
      />

      {/* 2. Risk/Evidence Status Strip */}
      <StatusStrip
        riskGates={displayData.riskGates}
        evidence={displayData.evidence}
        compact={compact}
      />

      {/* 3. Key Metrics Grid */}
      {showDetailedCards && (
        <KeyMetricsGrid
          priceGeometry={displayData.priceGeometry}
          netClearance={displayData.netClearance}
          market={displayData.market}
          compQuality={displayData.compQuality}
          compact={compact}
        />
      )}

      {/* Stale Data Warning */}
      {!isDemo && displayData.isStale && (
        <motion.div
          variants={fadeInUp}
          className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3"
          data-testid="v25-stale-warning"
        >
          <p className="text-sm text-amber-400">
            ⚠️ This analysis may be outdated. Consider re-running for fresh
            results.
          </p>
        </motion.div>
      )}
    </motion.div>
  );
});

// ─────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────

export default V25Dashboard;

export {
  VerdictHero,
  StatusStrip,
  KeyMetricsGrid,
  mapVerdictToChipRecommendation,
  getRiskStatusColor,
  getEvidenceStatusColor,
  getVelocityBandInfo,
};
