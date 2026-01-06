/**
 * Dashboard Types for HPS DealEngine V2.5
 *
 * Shared type definitions for dashboard components and data layer.
 */

/**
 * Verdict type for Decision Hero
 */
export type VerdictType = 'PURSUE' | 'NEEDS_EVIDENCE' | 'PASS';

/**
 * Velocity band for market conditions
 */
export type VelocityBand = 'hot' | 'warm' | 'balanced' | 'cool' | 'cold';

/**
 * Gate status for risk assessment
 */
export type GateStatus = 'pass' | 'warning' | 'fail' | 'blocking';

/**
 * Complete dashboard data shape
 *
 * This is what useDealDashboard returns
 */
export interface DashboardData {
  // Core deal info
  dealId: string;
  propertyAddress: string;
  clientName: string | null;

  // Verdict (Slice 14)
  verdict: {
    recommendation: VerdictType;
    confidence: number;
    reason: string;
    blockingFactors: string[];
  };

  // Price Geometry (Slice 14)
  priceGeometry: {
    zopa: number | null;
    zopaPercent: number | null;
    mao: number | null;
    floor: number | null;
    ceiling: number | null;
    hasZopa: boolean;
  };

  // Net Clearance (Slice 14)
  netClearance: {
    bestStrategy: string;
    netAmount: number;
    strategies: Array<{
      name: string;
      net: number;
      isRecommended: boolean;
    }>;
  };

  // Confidence indicators (Slice 15)
  compQuality: {
    score: number;
    grade: string;
    compsCount: number;
  };

  evidence: {
    collected: number;
    total: number;
    criticalMissing: string[];
  };

  market: {
    velocityBand: VelocityBand;
    liquidityScore: number;
  };

  arvConfidence: {
    grade: string;
    range: { low: number; mid: number; high: number };
  };

  // Risk & Evidence Status (Slice 17)
  riskGates: {
    passed: number;
    total: number;
    blocking: number;
    gates: Array<{
      id: string;
      label: string;
      status: GateStatus;
    }>;
  };

  // Meta
  lastRunId: string | null;
  lastRunAt: string | null;
  isStale: boolean;
}

/**
 * Deal card data for Deals List (Slice 19)
 */
export interface DealCardData {
  id: string;
  address: string;
  city: string;
  state: string;
  verdict: VerdictType;
  netClearance: number | null;
  zopa: number | null;
  gatesPassed: number;
  gatesTotal: number;
  velocityBand: string;
  daysInPipeline: number;
  missingEvidence: string[];
}

/**
 * Pipeline summary for Deals List header
 */
export interface PipelineSummary {
  totalDeals: number;
  pursueCount: number;
  needsEvidenceCount: number;
  passCount: number;
  totalPipelineValue: number;
}

/**
 * Confidence indicator data
 */
export interface ConfidenceIndicator {
  id: string;
  label: string;
  score: number;
  grade: string;
  sublabel: string;
  color: 'emerald' | 'amber' | 'red' | 'zinc';
}
