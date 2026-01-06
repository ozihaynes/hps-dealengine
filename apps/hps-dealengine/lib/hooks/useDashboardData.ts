/**
 * Dashboard Data Transformation Hook
 *
 * Transforms raw `lastAnalyzeResult` from DealSessionContext into
 * strongly-typed props for V2.5 dashboard components.
 *
 * Principles Applied:
 * - Defensive programming (null checks, edge case handling)
 * - Type safety (no `any`, explicit return types)
 * - Memoization for performance
 * - Single source of truth (DealSessionContext)
 *
 * @module useDashboardData
 */

import { useMemo } from 'react';
import { useDealSession } from '@/lib/dealSessionContext';
import type { DashboardData, VerdictType } from '@/lib/types/dashboard';

/**
 * Safe number extraction with fallback
 * Handles: null, undefined, NaN, Infinity
 */
export function safeNumber(
  value: unknown,
  fallback: number | null = null
): number | null {
  if (value === null || value === undefined) return fallback;
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return num;
}

/**
 * Safe string extraction
 */
export function safeString(value: unknown, fallback: string = ''): string {
  if (value === null || value === undefined) return fallback;
  return String(value);
}

/**
 * Safe array extraction
 */
export function safeArray<T>(value: unknown, fallback: T[] = []): T[] {
  if (!Array.isArray(value)) return fallback;
  return value;
}

/**
 * Map engine verdict to V2.5 verdict type
 *
 * Engine outputs: workflow_state (NeedsInfo, Review, ReadyForOffer)
 * V2.5 expects: PURSUE, NEEDS_EVIDENCE, PASS
 */
export function mapVerdict(
  workflowState: string | null | undefined,
  riskSummary: { any_blocking?: boolean } | null | undefined,
  zopa: number | null
): VerdictType {
  // PASS conditions (deal-killers)
  if (riskSummary?.any_blocking) {
    return 'PASS';
  }
  if (zopa !== null && zopa <= 0) {
    return 'PASS';
  }

  // NEEDS_EVIDENCE conditions
  if (workflowState === 'NeedsInfo' || workflowState === 'Review') {
    return 'NEEDS_EVIDENCE';
  }

  // PURSUE
  if (workflowState === 'ReadyForOffer') {
    return 'PURSUE';
  }

  // Default to NEEDS_EVIDENCE if unclear
  return 'NEEDS_EVIDENCE';
}

/**
 * Map confidence grade to percentage
 */
export function gradeToPercent(grade: string | null | undefined): number {
  const gradeMap: Record<string, number> = {
    A: 95,
    'A-': 90,
    'B+': 85,
    B: 80,
    'B-': 75,
    'C+': 70,
    C: 65,
    'C-': 60,
    D: 50,
    F: 30,
  };
  return gradeMap[grade ?? ''] ?? 50;
}

/**
 * Extract velocity band from market data
 */
export function deriveVelocityBand(
  dom: number | null,
  moi: number | null
): 'hot' | 'warm' | 'balanced' | 'cool' | 'cold' {
  if (dom === null || moi === null) return 'balanced';

  if (dom <= 14 && moi <= 2) return 'hot';
  if (dom <= 30 && moi <= 4) return 'warm';
  if (dom <= 60 && moi <= 6) return 'balanced';
  if (dom <= 90 && moi <= 9) return 'cool';
  return 'cold';
}

/**
 * Transform lastAnalyzeResult into DashboardData
 *
 * @returns DashboardData | null if no analysis run
 */
export function useDashboardData(): {
  data: DashboardData | null;
  isLoading: boolean;
  hasRun: boolean;
  error: string | null;
} {
  const { deal, dbDeal, lastAnalyzeResult, lastRunId, isHydratingActiveDeal } =
    useDealSession();

  const data = useMemo<DashboardData | null>(() => {
    // No analysis run yet
    if (!lastAnalyzeResult) {
      return null;
    }

    // Type helper for extracting nested values safely
    const result = lastAnalyzeResult as Record<string, unknown>;
    const outputs: Record<string, unknown> =
      (result.outputs as Record<string, unknown>) ?? {};
    const calculations: Record<string, unknown> =
      (result.calculations as Record<string, unknown>) ?? {};

    // === Extract raw values with safety ===

    // Price Geometry
    const priceGeometry = (outputs.price_geometry ?? {}) as Record<
      string,
      unknown
    >;
    const zopa = safeNumber(priceGeometry.zopa);
    const zopaPercent = safeNumber(priceGeometry.zopa_pct_of_arv);
    const mao = safeNumber(
      priceGeometry.entry_point ??
        (calculations as Record<string, unknown>).mao_wholesale
    );
    const floor = safeNumber(
      priceGeometry.respect_floor ??
        (calculations as Record<string, unknown>).floor_price
    );
    const ceiling = safeNumber(
      priceGeometry.buyer_ceiling ??
        (calculations as Record<string, unknown>).arv_final
    );

    // Net Clearance
    const netClearance = (outputs.net_clearance ?? {}) as Record<
      string,
      unknown
    >;
    const strategies = [
      {
        name: 'Assignment',
        net:
          safeNumber(
            (netClearance.assignment as Record<string, unknown> | undefined)?.net
          ) ?? 0,
        isRecommended: netClearance.recommended_exit === 'assignment',
      },
      {
        name: 'Double Close',
        net:
          safeNumber(
            (netClearance.double_close as Record<string, unknown> | undefined)
              ?.net
          ) ?? 0,
        isRecommended: netClearance.recommended_exit === 'double_close',
      },
      ...((netClearance.wholetail as Record<string, unknown> | undefined)
        ? [
            {
              name: 'Wholetail',
              net:
                safeNumber(
                  (netClearance.wholetail as Record<string, unknown>)?.net
                ) ?? 0,
              isRecommended: netClearance.recommended_exit === 'wholetail',
            },
          ]
        : []),
    ];
    const bestStrategy =
      strategies.find((s) => s.isRecommended) ?? strategies[0];

    // Risk Gates
    const riskSummary = (outputs.risk_summary ?? {}) as Record<string, unknown>;
    const perGate = (riskSummary.per_gate ?? {}) as Record<
      string,
      Record<string, unknown>
    >;
    const gateKeys = Object.keys(perGate);
    const gates = gateKeys.map((key) => ({
      id: key,
      label: key
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase()),
      status: ((perGate[key]?.status as string) ?? 'unknown') as
        | 'pass'
        | 'warning'
        | 'fail'
        | 'blocking',
    }));
    const passedGates = gates.filter((g) => g.status === 'pass').length;
    const blockingGates = gates.filter(
      (g) => g.status === 'blocking' || g.status === 'fail'
    ).length;

    // Evidence
    const evidenceSummary = (outputs.evidence_summary ?? {}) as Record<
      string,
      unknown
    >;
    const freshnessByKind = (evidenceSummary.freshness_by_kind ?? {}) as Record<
      string,
      Record<string, unknown>
    >;
    const evidenceKeys = Object.keys(freshnessByKind);
    const collectedEvidence = evidenceKeys.filter(
      (k) =>
        freshnessByKind[k]?.status === 'fresh' ||
        freshnessByKind[k]?.status === 'stale'
    ).length;
    const criticalMissing = evidenceKeys
      .filter(
        (k) =>
          freshnessByKind[k]?.status === 'missing' &&
          freshnessByKind[k]?.blocking
      )
      .map((k) =>
        k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
      );

    // Comp Quality
    const compQuality = (outputs.comp_quality ?? {}) as Record<string, unknown>;
    const compScore = safeNumber(compQuality.quality_score) ?? 0;
    const compGrade = safeString(compQuality.quality_band, 'unknown');
    const compsCount = safeNumber(compQuality.comp_count) ?? 0;

    // Market Velocity
    const marketVelocity = (outputs.market_velocity ?? {}) as Record<
      string,
      unknown
    >;
    const dealRecord = deal as unknown as Record<string, unknown> | null;
    const dealMarket = (dealRecord?.market ?? {}) as Record<string, unknown>;
    const dom = safeNumber(
      marketVelocity.dom_zip_days ?? dealMarket?.dom_zip
    );
    const moi = safeNumber(
      marketVelocity.moi_zip_months ?? dealMarket?.moi_zip
    );
    const velocityBand = deriveVelocityBand(dom, moi);
    const liquidityScore = safeNumber(marketVelocity.liquidity_score) ?? 50;

    // Verdict derivation
    const workflowState = safeString(outputs.workflow_state as string);
    const confidenceGrade = safeString(
      outputs.confidence_grade as string,
      'C'
    );
    const verdict = (outputs.verdict ?? {}) as Record<string, unknown>;
    const verdictType =
      (verdict.recommendation as VerdictType) ??
      mapVerdict(workflowState, riskSummary as { any_blocking?: boolean }, zopa);

    // ARV Confidence
    const arvBand = ((outputs.arv_band ??
      (calculations as Record<string, unknown>).arv_band ??
      {}) as Record<string, unknown>);
    const arvRange = {
      low:
        safeNumber(
          arvBand.p25 ?? arvBand.low
        ) ?? 0,
      mid:
        safeNumber(
          arvBand.p50 ??
            arvBand.mid ??
            (calculations as Record<string, unknown>).arv_final
        ) ?? 0,
      high:
        safeNumber(
          arvBand.p75 ?? arvBand.high
        ) ?? 0,
    };

    // === Build DashboardData ===
    const dealAsRecord = deal as unknown as Record<string, unknown> | null;
    const dealProperty = dealAsRecord?.property as
      | Record<string, unknown>
      | undefined;
    const dbDealPayload = (dbDeal as Record<string, unknown> | null)
      ?.payload_json as Record<string, unknown> | undefined;
    const dbDealProperty = dbDealPayload?.property as
      | Record<string, unknown>
      | undefined;
    const dealClient = dealAsRecord?.client as
      | Record<string, unknown>
      | undefined;

    return {
      dealId: ((dbDeal as Record<string, unknown> | null)?.id as string) ?? '',
      propertyAddress: safeString(
        (dealProperty?.address as string) ??
          (dbDealProperty?.address as string) ??
          'Unknown Address'
      ),
      clientName: safeString(
        (dealClient?.name as string) ??
          ((dbDeal as Record<string, unknown> | null)?.client_name as string),
        ''
      ) || null,

      verdict: {
        recommendation: verdictType,
        confidence: gradeToPercent(confidenceGrade),
        reason: safeString(
          (verdict.rationale as string) ??
            (Array.isArray(outputs.confidence_reasons)
              ? (outputs.confidence_reasons as string[])[0]
              : '') ??
            `Workflow: ${workflowState}`
        ),
        blockingFactors: safeArray(verdict.blocking_factors as string[], []),
      },

      priceGeometry: {
        zopa,
        zopaPercent,
        mao,
        floor,
        ceiling,
        hasZopa: zopa !== null && zopa > 0,
      },

      netClearance: {
        bestStrategy: bestStrategy?.name ?? 'Assignment',
        netAmount: bestStrategy?.net ?? 0,
        strategies,
      },

      compQuality: {
        score: compScore,
        grade: compGrade,
        compsCount,
      },

      evidence: {
        collected: collectedEvidence,
        total: evidenceKeys.length || 12, // Default to 12 evidence types
        criticalMissing,
      },

      market: {
        velocityBand,
        liquidityScore,
      },

      arvConfidence: {
        grade: confidenceGrade,
        range: arvRange,
      },

      riskGates: {
        passed: passedGates,
        total: gates.length || 8, // Default to 8 gates
        blocking: blockingGates,
        gates,
      },

      lastRunId: lastRunId ?? null,
      lastRunAt:
        ((lastAnalyzeResult as Record<string, unknown>).created_at as string) ??
        null,
      isStale: false, // TODO: Implement staleness check
    };
  }, [lastAnalyzeResult, lastRunId, deal, dbDeal]);

  return {
    data,
    isLoading: isHydratingActiveDeal,
    hasRun: !!lastAnalyzeResult,
    error: null, // TODO: Implement error handling
  };
}
