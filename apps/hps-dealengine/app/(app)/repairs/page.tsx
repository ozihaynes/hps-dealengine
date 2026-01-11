// apps/hps-dealengine/app/repairs/page.tsx
'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Deal, EngineCalculations, EstimatorState } from '../../../types';
import RepairsTab from '@/components/repairs/RepairsTab';
import { useDealSession } from '@/lib/dealSessionContext';
import { estimatorSections } from '../../../lib/ui-v2-constants';
import type {
  RepairRates,
  EnhancedEstimatorState,
  EnhancedLineItem,
} from '@hps-internal/contracts';
import { createInitialEstimatorState } from '@/lib/repairsEstimator';
import { useUnsavedChanges } from '@/lib/useUnsavedChanges';
import { Button, GlassCard } from '@/components/ui';
import NumericInput from '@/components/ui/NumericInput';
import { Check, Mail, Upload } from 'lucide-react';
import { Tooltip } from '@/components/ui/tooltip';
import { computeSectionTotals } from '@/lib/repairsMath';
import { AutosaveIndicator } from '@/components/shared/AutosaveIndicator';
// ============================================================================
// ENHANCED REPAIRS IMPORTS (Slice C)
// ============================================================================
import { EnhancedRepairsSection } from '@/components/repairs';
import { getOrCreateEnhancedState } from '@/lib/repairsAdapter';
import {
  computeEnhancedTotals,
  updateLineItem,
  getContingencyPercent,
} from '@/lib/repairsMathEnhanced';
import { generateRepairsPdf, downloadPdf, generatePdfFilename } from '@/lib/repairsPdf';
import { DEMO_ENHANCED_ESTIMATOR_STATE, DEMO_PDF_CONFIG } from '@/lib/constants/repairsDemoData';
// ============================================================================
// ESTIMATE REQUEST IMPORTS (Slice D+E)
// ============================================================================
import { RequestEstimateModal, ManualUploadModal, BiddingCockpit } from '@/components/repairs';
import type { EstimateData, EstimateRequest as BiddingEstimateRequest } from '@/components/repairs';
import { useEstimateRequests } from '@/hooks';

/**
 * Safely set a nested property on the Deal by a dotted path, e.g. "market.arv".
 */
function setDealPath(prev: Deal, path: string, value: unknown): Deal {
  if (!prev || typeof prev !== 'object') return prev;

  const clone: any =
    typeof structuredClone === 'function'
      ? structuredClone(prev as any)
      : JSON.parse(JSON.stringify(prev));

  const parts = path.split('.');
  let cursor: any = clone;

  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    if (!cursor[key] || typeof cursor[key] !== 'object') {
      cursor[key] = {};
    }
    cursor = cursor[key];
  }

  cursor[parts[parts.length - 1]] = value;
  return clone as Deal;
}

/**
 * FIXED: Get current sqft from deal/calc
 */
function getCurrentSqft(deal: Deal, calc: EngineCalculations): number {
  const d = deal as any;
  const c = calc as any;

  const candidates = [
    c?.subject_sqft,
    c?.subject?.sqft,
    c?.property?.sqft,
    d?.property?.sqft,
    d?.subject?.sqft,
    d?.sqft,
  ];

  for (const cand of candidates) {
    if (typeof cand === 'number' && !isNaN(cand) && cand > 0) {
      return cand;
    }
    if (typeof cand === 'string' && cand.trim() !== '') {
      const n = Number(cand.replace(/[^\d.]/g, ''));
      if (!isNaN(n) && n > 0) {
        return n;
      }
    }
  }
  return 0;
}

function deriveMarketCode(deal: Deal): string {
  const market: any = (deal as any)?.market ?? {};
  return market.market_code || market.market || market.code || market.msa || 'ORL';
}

const USD_0 = new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const USD_2 = new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});

function fmtUsd0(value: number | null | undefined): string {
  if (value == null) return '—';
  return Number.isFinite(value) ? USD_0.format(value) : '—';
}

function fmtUsd2(value: number | null | undefined): string {
  if (value == null) return '—';
  return Number.isFinite(value) ? USD_2.format(value) : '—';
}

function fmtInt(value: number | null | undefined): string {
  if (value == null) return '-';
  return Number.isFinite(value) ? String(Math.round(value)) : '-';
}

export default function RepairsPage() {
  const {
    deal,
    setDeal,
    posture,
    refreshRepairRates,
    activeRepairProfile,
    activeRepairProfileId,
    lastAnalyzeResult,
    repairRates,
    repairRatesLoading,
    repairRatesError,
    dbDeal,
    autosaveStatus,
    saveWorkingStateNow,
  } = useDealSession();

  const [estimatorState, setEstimatorState] = useState<EstimatorState>(() =>
    createInitialEstimatorState()
  );
  const estimatorHydratedKeyRef = useRef<string | null>(null);

  // REF: Center column scroll container for scroll forwarding
  const centerScrollRef = useRef<HTMLDivElement>(null);

  const [localSqft, setLocalSqft] = useState<string>('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [sqftSaved, setSqftSaved] = useState(false);

  // ============================================================================
  // ENHANCED ESTIMATOR STATE (V2) - Slice C
  // ============================================================================

  // Demo mode detection
  const isDemoMode = useMemo(() => {
    return !dbDeal?.id || dbDeal?.id?.startsWith('demo');
  }, [dbDeal?.id]);

  // Current rehab level for contingency calculation
  const currentRehabLevel = (deal as any)?.repairs?.rehabLevel ?? 'medium';

  // Enhanced estimator state initialization
  const [enhancedEstimatorState, setEnhancedEstimatorState] = useState<EnhancedEstimatorState>(
    () => {
      const contingency = getContingencyPercent(currentRehabLevel);
      const existing = (deal as any)?.repairs?.enhancedEstimatorState;
      const legacy = (deal as any)?.repairs?.estimatorState;
      return getOrCreateEnhancedState(existing, legacy, contingency);
    }
  );

  // PDF export loading state
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Estimate request modal state (Slice D+E)
  const [isEstimateModalOpen, setIsEstimateModalOpen] = useState(false);
  const [isManualUploadOpen, setIsManualUploadOpen] = useState(false);

  // Estimate requests for current deal
  const dealId = dbDeal?.id ?? null;
  const orgId = dbDeal?.org_id ?? null;
  const propertyAddress = (deal as any)?.property?.address ?? '';
  const [estimateState] = useEstimateRequests(dealId);
  const pendingEstimates = estimateState.requests.filter(
    (r) => r.status === 'pending' || r.status === 'sent'
  ).length;

  useUnsavedChanges(hasUnsavedChanges);
  const sqftInputId = React.useId();

  const marketCode = deriveMarketCode(deal as Deal).toUpperCase();
  const rates: RepairRates | null = repairRates ?? null;
  const ratesStatus: 'idle' | 'loading' | 'loaded' | 'error' = repairRatesLoading
    ? 'loading'
    : repairRatesError
      ? 'error'
      : rates
        ? 'loaded'
        : 'idle';
  const repairMeta = rates
    ? {
        profileId: rates.profileId ?? null,
        profileName: rates.profileName ?? null,
        marketCode: rates.marketCode ?? marketCode,
        posture: rates.posture ?? posture,
        asOf: rates.asOf ?? undefined,
        source: rates.source ?? null,
        version: rates.version ?? undefined,
      }
    : activeRepairProfile
      ? {
          profileId: activeRepairProfile.id ?? null,
          profileName: activeRepairProfile.name ?? null,
          marketCode: activeRepairProfile.marketCode ?? marketCode,
          posture: activeRepairProfile.posture ?? posture,
          asOf: activeRepairProfile.asOf ?? undefined,
          source: activeRepairProfile.source ?? null,
          version: activeRepairProfile.version ?? undefined,
        }
      : null;
  const profileName = repairMeta?.profileName ?? activeRepairProfile?.name;
  const savedEstimator = (deal as any)?.repairs?.estimatorState;
  const savedProfileId = (deal as any)?.repairs?.estimatorProfileId ?? null;

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug('[RepairsPage] refreshing repair rates', {
        marketCode,
        posture,
        activeRepairProfileId,
      });
    }
    void refreshRepairRates({
      profileId: activeRepairProfileId,
      marketCode,
      posture,
    });
  }, [refreshRepairRates, activeRepairProfileId, marketCode, posture]);

  const calc: EngineCalculations = useMemo(() => {
    const persisted = lastAnalyzeResult as any;
    return {
      ...(persisted?.calculations ?? {}),
      ...(persisted?.outputs ?? {}),
    } as EngineCalculations;
  }, [lastAnalyzeResult]);

  useEffect(() => {
    const currentSqft = getCurrentSqft(deal as Deal, calc);
    if (currentSqft > 0 && !localSqft) {
      setLocalSqft(String(currentSqft));
    }
  }, [deal, calc, localSqft]);

  useEffect(() => {
    const currentProfile = rates?.profileId ?? activeRepairProfileId ?? 'default';
    const hydrationKey = `${dbDeal?.id ?? 'none'}|${currentProfile}`;
    if (estimatorHydratedKeyRef.current === hydrationKey) return;

    if (savedEstimator && savedProfileId === currentProfile) {
      setEstimatorState(savedEstimator as EstimatorState);
    } else {
      setEstimatorState(createInitialEstimatorState((rates?.lineItemRates as any) ?? undefined));
    }
    setHasUnsavedChanges(false);
    estimatorHydratedKeyRef.current = hydrationKey;
  }, [
    dbDeal?.id,
    rates?.profileId,
    rates?.marketCode,
    rates?.posture,
    rates?.lineItemRates,
    activeRepairProfileId,
    savedEstimator,
    savedProfileId,
  ]);

  const setDealValue = useCallback(
    (path: string, value: unknown) => {
      setDeal((prev) => setDealPath(prev as Deal, path, value));
      setHasUnsavedChanges(true);
    },
    [setDeal]
  );

  const handleCostChange = useCallback(
    (sectionKey: string, itemKey: string, field: string, value: any) => {
      setEstimatorState((prev) => {
        const next: any =
          typeof structuredClone === 'function'
            ? structuredClone(prev as any)
            : JSON.parse(JSON.stringify(prev));

        if (!next.costs) next.costs = {};
        if (!next.costs[sectionKey]) next.costs[sectionKey] = {};

        const item = (next.costs[sectionKey][itemKey] ?? {}) as any;
        item[field] = value;
        next.costs[sectionKey][itemKey] = item;

        return next;
      });
      setHasUnsavedChanges(true);
    },
    []
  );

  const handleQuantityChange = useCallback((itemKey: string, qty: number | null) => {
    setEstimatorState((prev) => {
      const next: any =
        typeof structuredClone === 'function'
          ? structuredClone(prev as any)
          : JSON.parse(JSON.stringify(prev));

      if (!next.quantities) next.quantities = {};
      next.quantities[itemKey] = qty;

      return next;
    });
    setHasUnsavedChanges(true);
  }, []);

  const handleReset = useCallback(() => {
    setEstimatorState(createInitialEstimatorState((rates?.lineItemRates as any) ?? undefined));
    setHasUnsavedChanges(false);
  }, [rates?.lineItemRates]);

  const isNoRepairsNeeded = Boolean((deal as any)?.meta?.noRepairsNeeded);

  const handleMarkNoRepairs = useCallback(() => {
    const next = !Boolean((deal as any)?.meta?.noRepairsNeeded);
    setDealValue('meta.noRepairsNeeded', next);
    if (next) {
      setDealValue('repairs.total', 0);
      setDealValue('repairs_total', 0);
      setDealValue('repairsTotal', 0);
      setDealValue('repairs.quickEstimate.total', 0);
    }
    setEstimatorState((prev) => {
      const next: any =
        typeof structuredClone === 'function'
          ? structuredClone(prev as any)
          : JSON.parse(JSON.stringify(prev));
      if (next) {
        next.costs = {};
        next.quantities = {};
      }
      return next;
    });
    setHasUnsavedChanges(true);
  }, [deal, setDealValue]);

  // ============================================================================
  // ENHANCED ESTIMATOR HANDLERS - Slice C
  // ============================================================================

  /**
   * Update a line item in the enhanced estimator state
   * Syncs to deal for downstream compatibility
   */
  const handleLineItemUpdate = useCallback(
    (categoryKey: string, itemKey: string, updates: Partial<EnhancedLineItem>) => {
      setEnhancedEstimatorState((prev) => {
        const newState = updateLineItem(prev, categoryKey, itemKey, updates);

        // Sync to deal for downstream compatibility (autosave)
        setDealValue('repairs.enhancedEstimatorState', newState);
        setDealValue('repairs.total', newState.totalWithContingency);
        setDealValue('costs.repairs_base', newState.totalWithContingency);

        return newState;
      });
      setHasUnsavedChanges(true);
    },
    [setDealValue, setHasUnsavedChanges]
  );

  /**
   * Sync contingency when rehab level changes
   */
  const expectedContingency = getContingencyPercent(currentRehabLevel);

  useEffect(() => {
    // Only update if contingency actually changed
    if (expectedContingency !== enhancedEstimatorState.contingencyPercent) {
      setEnhancedEstimatorState((prev) => {
        const updated = computeEnhancedTotals({
          ...prev,
          contingencyPercent: expectedContingency,
        });

        // Sync to deal
        setDealValue('repairs.enhancedEstimatorState', updated);
        setDealValue('repairs.total', updated.totalWithContingency);
        setDealValue('costs.repairs_base', updated.totalWithContingency);

        return updated;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expectedContingency]);

  /**
   * Export PDF handler with proper error handling
   */
  const handleExportPdf = useCallback(async () => {
    setIsExportingPdf(true);

    try {
      // Use demo data if in demo mode
      const state = isDemoMode ? DEMO_ENHANCED_ESTIMATOR_STATE : enhancedEstimatorState;

      const config = isDemoMode
        ? DEMO_PDF_CONFIG
        : {
            property: {
              address: (deal as any)?.property?.address ?? 'Unknown Address',
              city: (deal as any)?.property?.city ?? '',
              state: (deal as any)?.property?.state ?? 'FL',
              zip: (deal as any)?.property?.zip ?? '',
            },
            deal: {
              id: (deal as any)?.id ?? '',
              sqft: (deal as any)?.property?.sqft ?? 0,
              rehabLevel: currentRehabLevel,
            },
            profile: {
              name: 'Central Florida Default',
              version: 'v1.0',
              asOf: new Date().toISOString().split('T')[0],
            },
            preparedBy: 'HPS DealEngine',
            date: new Date().toISOString().split('T')[0],
          };

      // generateRepairsPdf returns { success, blob?, error? }
      const result = await generateRepairsPdf(state, config);

      if (result.success && result.blob) {
        const filename = generatePdfFilename(config.property.address, config.date);
        downloadPdf(result.blob, filename);
      } else {
        console.error('[handleExportPdf] PDF generation failed:', result.error);
        // TODO: Show toast notification when toast system available
      }
    } catch (error) {
      console.error('[handleExportPdf] Unexpected error:', error);
      // TODO: Show toast notification
    } finally {
      setIsExportingPdf(false);
    }
  }, [isDemoMode, enhancedEstimatorState, deal, currentRehabLevel]);

  const handleSqftChange = useCallback(
    (value: number | null) => {
      const nextText = value == null ? '' : String(value);
      setLocalSqft(nextText);
      if (value != null && Number.isFinite(value) && value > 0) {
        setDealValue('property.sqft', value);
        setHasUnsavedChanges(false);
        setSqftSaved(true);
      } else {
        setHasUnsavedChanges(true);
        setSqftSaved(false);
      }
    },
    [setDealValue]
  );

  const sqftInputValue = useMemo(() => {
    if (!localSqft || localSqft.trim() === '') return null;
    const parsed = Number(localSqft.replace(/[^\d.]/g, ''));
    return Number.isFinite(parsed) ? parsed : null;
  }, [localSqft]);

  const quickEstimateApplied = (deal as any)?.repairs?.quickEstimate?.total ?? null;

  const { sectionTotals, totalRepairCost } = useMemo(
    () =>
      computeSectionTotals(
        estimatorState.costs,
        estimatorState.quantities,
        (rates?.lineItemRates as any) ?? undefined
      ),
    [estimatorState, rates?.lineItemRates]
  );

  useEffect(() => {
    const profileIdToPersist = rates?.profileId ?? activeRepairProfileId ?? null;
    const appliedTotal =
      totalRepairCost > 0
        ? totalRepairCost
        : quickEstimateApplied != null
          ? Number(quickEstimateApplied)
          : 0;

    const currentApplied = (deal as any)?.costs?.repairs_base ?? null;
    const savedEstimator = (deal as any)?.repairs?.estimatorState;
    const savedProfileId = (deal as any)?.repairs?.estimatorProfileId ?? null;

    const estimatorChanged =
      JSON.stringify(savedEstimator ?? {}) !== JSON.stringify(estimatorState ?? {});
    const shouldUpdateTotals = currentApplied !== appliedTotal;
    const shouldUpdateProfile = savedProfileId !== profileIdToPersist;

    if (!(shouldUpdateTotals || estimatorChanged || shouldUpdateProfile)) {
      return;
    }

    setDealValue('repairs.estimatorState', estimatorState);
    setDealValue('repairs.estimatorProfileId', profileIdToPersist);
    setDealValue('repairs.total', appliedTotal);
    setDealValue('repairs_total', appliedTotal);
    setDealValue('repairsTotal', appliedTotal);
    setDealValue('costs.repairs_base', appliedTotal);
    setDealValue('costs.repairs', appliedTotal);
  }, [
    estimatorState,
    totalRepairCost,
    quickEstimateApplied,
    rates?.profileId,
    activeRepairProfileId,
    setDealValue,
    deal,
  ]);

  // ═══════════════════════════════════════════════════════════════════════════
  // SCROLL FORWARDING: Scroll center column when user scrolls on sidebars
  // ═══════════════════════════════════════════════════════════════════════════
  // UX Principle: Prevents "frozen app" feeling when scrolling on fixed sidebars
  // Behavioral Design: Fitts's Law - reduces motor effort, no cursor repositioning
  // Accessibility: Keyboard scroll (arrows, PgUp/Dn) unaffected - only wheel events
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    const centerEl = centerScrollRef.current;
    if (!centerEl) return;

    const handleWheelOnPage = (e: WheelEvent) => {
      // Only forward on desktop (lg breakpoint = 1024px)
      // Mobile/tablet uses normal page scroll
      if (window.innerWidth < 1024) return;

      // Check if the scroll target is already the center column or inside it
      const target = e.target as HTMLElement;
      if (centerEl.contains(target)) {
        // Already scrolling center column, let it happen naturally
        return;
      }

      // Forward the scroll to center column
      centerEl.scrollBy({
        top: e.deltaY,
        left: e.deltaX,
        behavior: 'auto',
      });

      // Prevent default to avoid any potential body scroll
      e.preventDefault();
    };

    // Attach to the repairs page container (cast to HTMLElement for wheel event support)
    const pageContainer = centerEl.closest('[data-repairs-page]') as HTMLElement | null;

    if (!pageContainer) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[RepairsPage] Scroll forwarding: Could not find [data-repairs-page] container');
      }
      return undefined;
    }

    // passive: false is REQUIRED to call preventDefault()
    pageContainer.addEventListener('wheel', handleWheelOnPage as EventListener, { passive: false });

    return () => {
      pageContainer.removeEventListener('wheel', handleWheelOnPage as EventListener);
    };
  }, []);

  const resolvedSqft = useMemo(() => {
    const base = getCurrentSqft(deal as Deal, calc);
    if (base > 0) return base;
    const n = Number(String(localSqft ?? '').replace(/[^\d.]/g, ''));
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [deal, calc, localSqft]);

  const appliedTotal = useMemo(() => {
    if (isNoRepairsNeeded) return 0;
    if (totalRepairCost > 0) return totalRepairCost;
    if (quickEstimateApplied != null) {
      const n = Number(quickEstimateApplied);
      return Number.isFinite(n) ? n : 0;
    }
    return 0;
  }, [isNoRepairsNeeded, totalRepairCost, quickEstimateApplied]);

  const repairsPerSqft = useMemo(() => {
    if (!resolvedSqft || resolvedSqft <= 0) return null;
    if (!appliedTotal || appliedTotal <= 0) return null;
    return appliedTotal / resolvedSqft;
  }, [appliedTotal, resolvedSqft]);

  const sectionBreakdown = useMemo(() => {
    const entries = Object.entries(sectionTotals)
      .map(([key, total]) => ({ key, total }))
      .filter((row) => Number.isFinite(row.total) && row.total > 0.5)
      .sort((a, b) => b.total - a.total);

    return entries;
  }, [sectionTotals]);

  // ============================================================================
  // BIDDING COCKPIT DATA (Slice G)
  // ============================================================================

  // Transform estimate requests for BiddingCockpit
  const biddingEstimateRequests = useMemo((): BiddingEstimateRequest[] => {
    return estimateState.requests.map((req) => ({
      id: req.id,
      gc_name: req.gc_name,
      gc_email: req.gc_email ?? undefined,
      status: req.status as 'pending' | 'sent' | 'viewed' | 'submitted',
      submitted_at: req.submitted_at ?? undefined,
      sent_at: req.sent_at ?? undefined,
      file_path: req.estimate_file_path ?? undefined,
    }));
  }, [estimateState.requests]);

  // Create estimate data from enhanced estimator state
  const biddingEstimateData = useMemo((): EstimateData | null => {
    if (!enhancedEstimatorState || enhancedEstimatorState.grandTotal === 0) {
      return null;
    }

    return {
      baseEstimate: enhancedEstimatorState.grandTotal,
      contingency: enhancedEstimatorState.contingencyAmount,
      contingencyPercent: enhancedEstimatorState.contingencyPercent,
      totalBudget: enhancedEstimatorState.totalWithContingency,
      categories: Object.entries(enhancedEstimatorState.categories).map(([key, category]) => ({
        id: key,
        name: category.title,
        subtotal: category.subtotal,
        itemCount: category.items.length,
        items: category.items.map((item) => ({
          id: item.itemKey,
          description: item.label,
          quantity: item.quantity ?? undefined,
          unit: item.unit ?? undefined,
          unitCost: item.unitCost ?? undefined,
          total: item.totalCost ?? 0,
        })),
      })),
      lastUpdated: new Date().toISOString(),
    };
  }, [enhancedEstimatorState]);

  // Handlers for viewing/downloading estimates
  const handleViewEstimate = useCallback((id: string, filePath: string) => {
    if (filePath) {
      window.open(filePath, '_blank', 'noopener,noreferrer');
    }
  }, []);

  const handleDownloadEstimate = useCallback((id: string, filePath: string) => {
    if (filePath) {
      const link = document.createElement('a');
      link.href = filePath;
      link.download = `estimate-${id}.pdf`;
      link.click();
    }
  }, []);

  return (
    <div
      data-repairs-page
      className="space-y-6 lg:h-full lg:overflow-hidden lg:flex lg:flex-col"
    >
      <div className="flex-shrink-0 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-white">Repairs</h1>
          <Tooltip
            content="Quick PSF tiers, Big 5 budget killers, and a detailed line-item estimator, all wired to the same deal session as Underwrite."
            side="top"
            align="start"
          >
            <button
              type="button"
              aria-label="Repairs info"
              className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-white/15 bg-white/10 text-[10px] font-semibold text-text-secondary transition hover:border-white/25 hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/60"
            >
              i
            </button>
          </Tooltip>
        </div>
        <div className="flex flex-col items-end gap-1">
          <AutosaveIndicator
            state={autosaveStatus.state}
            lastSavedAt={autosaveStatus.lastSavedAt}
            error={autosaveStatus.error}
          />
          <div className="flex items-center gap-2 mt-1">
            {/* Request Estimate Button (Slice D+E) */}
            <Button
              variant="secondary"
              size="sm"
              className="flex items-center gap-2"
              onClick={() => setIsEstimateModalOpen(true)}
              disabled={!dealId}
            >
              <Mail size={14} />
              Request Estimate
              {pendingEstimates > 0 && (
                <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500/20 px-1.5 text-[10px] font-semibold text-amber-400">
                  {pendingEstimates}
                </span>
              )}
            </Button>
            {/* Manual Upload Button (Slice F) */}
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center gap-2"
              onClick={() => setIsManualUploadOpen(true)}
              disabled={!dealId || !orgId}
            >
              <Upload size={14} />
              Manual Upload
            </Button>
            <Button
              variant={isNoRepairsNeeded ? 'primary' : 'neutral'}
              size="sm"
              className="flex items-center gap-2"
              onClick={handleMarkNoRepairs}
            >
              {isNoRepairsNeeded && <Check size={14} />}
              No Repairs Needed
            </Button>
          </div>
          {isNoRepairsNeeded && (
            <span className="text-[12px] text-emerald-200">Repairs are set to $0</span>
          )}
        </div>
      </div>

      <div className="space-y-6 lg:flex-1 lg:min-h-0 lg:grid lg:grid-cols-12 lg:gap-6 lg:space-y-0 lg:overflow-hidden">
        {/* Left rail (desktop): meta + key inputs/totals. Mobile/tablet remains unchanged. */}
        {/* Note: Left rail does NOT scroll - only center column scrolls */}
        <div className="lg:col-span-3 lg:h-full lg:overflow-hidden">
          <div className="space-y-6 lg:pb-4">
            <GlassCard className="p-4">
              <div className="flex items-center gap-3 lg:flex-col lg:items-start lg:gap-2">
                <label
                  htmlFor={sqftInputId}
                  className="flex items-center gap-2 text-sm font-medium text-white"
                >
                  <span>Property Square Footage</span>
                  <Tooltip
                    content="Square footage is required for Quick Estimate calculator. Please enter it above."
                    side="top"
                    align="start"
                  >
                    <button
                      type="button"
                      aria-label="Square footage info"
                      className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-white/15 bg-white/10 text-[10px] font-semibold text-text-secondary transition hover:border-white/25 hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/60"
                    >
                      i
                    </button>
                  </Tooltip>
                  {sqftSaved && <Check size={14} className="text-emerald-400" aria-hidden="true" />}
                </label>
                <NumericInput
                  id={sqftInputId}
                  value={sqftInputValue}
                  onValueChange={handleSqftChange}
                  placeholder="Enter sqft"
                  className="w-32"
                  style={{ borderColor: 'var(--accent-color)' }}
                />
              </div>

              <div className="mt-3 hidden lg:grid lg:grid-cols-2 lg:gap-3">
                <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                  <div className="text-[11px] uppercase tracking-wide text-text-secondary">
                    Applied total
                  </div>
                  <div className="mt-0.5 text-sm font-semibold text-text-primary">
                    {fmtUsd0(appliedTotal)}
                  </div>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                  <div className="text-[11px] uppercase tracking-wide text-text-secondary">
                    $ / sqft
                  </div>
                  <div className="mt-0.5 text-sm font-semibold text-text-primary">
                    {repairsPerSqft != null ? fmtUsd2(repairsPerSqft) : '—'}
                  </div>
                </div>
              </div>
            </GlassCard>

            {/* Desktop-only: keep the rail intentional + information-dense */}
            <div className="hidden lg:block space-y-6">
              <GlassCard className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs uppercase text-text-secondary">Rate profile</div>
                    <div className="mt-1 truncate text-sm font-semibold text-text-primary">
                      {profileName ?? 'Repair rates'}
                    </div>
                    <div className="mt-1 text-xs text-text-secondary">
                      {(repairMeta?.marketCode ?? marketCode).toUpperCase()} · posture{' '}
                      {(repairMeta?.posture ?? posture) || 'base'}
                    </div>
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                      ratesStatus === 'loaded'
                        ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200'
                        : ratesStatus === 'loading'
                          ? 'border-white/15 bg-white/5 text-text-secondary'
                          : ratesStatus === 'error'
                            ? 'border-red-400/30 bg-red-400/10 text-red-200'
                            : 'border-white/15 bg-white/5 text-text-secondary'
                    }`}
                  >
                    {ratesStatus === 'loaded'
                      ? 'Rates loaded'
                      : ratesStatus === 'loading'
                        ? 'Loading'
                        : ratesStatus === 'error'
                          ? 'Rates error'
                          : 'Rates idle'}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                    <div className="text-[11px] uppercase tracking-wide text-text-secondary">
                      As of
                    </div>
                    <div className="mt-0.5 text-xs text-text-primary">
                      {repairMeta?.asOf ?? '—'}
                    </div>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                    <div className="text-[11px] uppercase tracking-wide text-text-secondary">
                      Source
                    </div>
                    <div className="mt-0.5 truncate text-xs text-text-primary">
                      {repairMeta?.source ?? '—'}
                    </div>
                  </div>
                </div>

                {repairRatesError && (
                  <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                    {repairRatesError}
                  </div>
                )}
              </GlassCard>

              <GlassCard className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase text-text-secondary">Key totals</div>
                    <div className="mt-1 text-lg font-semibold text-text-primary">
                      {fmtUsd0(appliedTotal)}
                    </div>
                    <div className="mt-0.5 text-xs text-text-secondary">
                      Detailed estimator: {fmtUsd0(totalRepairCost)}
                      {quickEstimateApplied != null && totalRepairCost === 0
                        ? ` · Quick estimate: ${fmtUsd0(Number(quickEstimateApplied))}`
                        : ''}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs uppercase text-text-secondary">Sqft</div>
                    <div className="mt-1 text-sm font-semibold text-text-primary">
                      {resolvedSqft > 0 ? fmtInt(resolvedSqft) : '—'}
                    </div>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                    <div className="text-[11px] uppercase tracking-wide text-text-secondary">
                      Sections
                    </div>
                    <div className="mt-0.5 text-xs text-text-primary">
                      {sectionBreakdown.length}
                    </div>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                    <div className="text-[11px] uppercase tracking-wide text-text-secondary">
                      Status
                    </div>
                    <div className="mt-0.5 text-xs text-text-primary">
                      {isNoRepairsNeeded ? 'No repairs needed' : 'Estimator active'}
                    </div>
                  </div>
                </div>
              </GlassCard>
            </div>
          </div>
        </div>

        {/* CENTER RAIL: Primary Repairs Workflow — THIS IS THE ONLY SCROLLABLE AREA ON DESKTOP */}
        <div
          ref={centerScrollRef}
          className="lg:col-span-6 xl:col-span-7 space-y-6 lg:h-full lg:overflow-y-auto lg:min-h-0 lg:pb-6 lg:pr-2"
        >
          {/* ═══════════════════════════════════════════════════════════════════════
        SECTION 1: HERO — Budget & Estimates (MOVED TO TOP - Slice 2)
        Principle: F-Pattern — Hero at top-left of center rail
        ═══════════════════════════════════════════════════════════════════════ */}
          <section aria-labelledby="budget-estimates-heading">
            <h2 id="budget-estimates-heading" className="sr-only">
              Budget and Estimates
            </h2>
            <BiddingCockpit
              estimateData={biddingEstimateData}
              estimateRequests={biddingEstimateRequests}
              isLoading={estimateState.isLoading}
              isDemoMode={isDemoMode}
              onRequestEstimate={() => setIsEstimateModalOpen(true)}
              onManualUpload={() => setIsManualUploadOpen(true)}
              onViewEstimate={handleViewEstimate}
              onDownloadEstimate={handleDownloadEstimate}
              // ═══════════════════════════════════════════════════════════
              // NEW PROPS — Slice 2: Hero Prominence & Trust
              // ═══════════════════════════════════════════════════════════
              arvValue={lastAnalyzeResult?.outputs?.arv ?? (deal as any)?.arv}
              hasGCEstimate={estimateState.requests?.some((r) => r.status === 'submitted') ?? false}
              lastUpdated={biddingEstimateData?.lastUpdated}
              error={estimateState.error}
            />
          </section>

          {/* ═══════════════════════════════════════════════════════════════════════
        SECTION 2: Legacy Estimator (V1)
        ═══════════════════════════════════════════════════════════════════════ */}
          <section aria-labelledby="legacy-estimator-heading">
            <h2 id="legacy-estimator-heading" className="text-sm font-medium text-slate-400 mb-3">
              Category Inputs
            </h2>
            <RepairsTab
              key={rates?.profileId ?? 'repairs-tab'}
              deal={deal as Deal}
              setDealValue={setDealValue}
              calc={calc}
              estimatorState={estimatorState}
              onCostChange={handleCostChange}
              onQuantityChange={handleQuantityChange}
              onReset={handleReset}
              repairRates={rates ?? undefined}
              marketCode={repairMeta?.marketCode ?? marketCode}
              activeProfileName={repairMeta?.profileName ?? activeRepairProfile?.name ?? undefined}
              posture={repairMeta?.posture ?? posture}
              ratesStatus={ratesStatus}
              ratesError={repairRatesError ?? undefined}
              meta={repairMeta ?? undefined}
              onQuickApply={() => {
                void saveWorkingStateNow().catch(() => {
                  /* status indicator handles error */
                });
              }}
              onDetailedApply={() => {
                void saveWorkingStateNow().catch(() => {
                  /* status indicator handles error */
                });
              }}
            />
          </section>

          {/* ═══════════════════════════════════════════════════════════════════════
        SECTION 3: Enhanced Estimator (V2) - Slice C
        ═══════════════════════════════════════════════════════════════════════ */}
          <section aria-labelledby="enhanced-estimator-heading">
            <h2 id="enhanced-estimator-heading" className="text-sm font-medium text-slate-400 mb-3">
              Line Item Details
            </h2>
            <GlassCard className="p-6">
              <EnhancedRepairsSection
                enhancedEstimatorState={enhancedEstimatorState}
                onLineItemUpdate={handleLineItemUpdate}
                onExportPdf={handleExportPdf}
                isExportingPdf={isExportingPdf}
                rehabLevel={currentRehabLevel}
                isDemoMode={isDemoMode}
              />
            </GlassCard>
          </section>
        </div>

        {/* Right rail (desktop): breakdown + alerts */}
        {/* Note: Right rail does NOT scroll - only center column scrolls */}
        <div className="hidden lg:block lg:col-span-3 xl:col-span-2 lg:h-full lg:overflow-hidden">
          <div className="space-y-6 lg:pb-4">
            <GlassCard className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs uppercase text-text-secondary">Breakdown</div>
                  <div className="mt-1 text-sm font-semibold text-text-primary">By section</div>
                </div>
                <div className="text-right">
                  <div className="text-xs uppercase text-text-secondary">Total</div>
                  <div className="mt-1 text-sm font-semibold text-text-primary">
                    {fmtUsd0(totalRepairCost)}
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {sectionBreakdown.length === 0 && (
                  <div className="text-xs text-text-secondary">
                    No detailed line items yet. Use Quick Estimate or add costs to see a breakdown.
                  </div>
                )}

                {sectionBreakdown.slice(0, 8).map((row) => {
                  const section = (
                    estimatorSections as Record<string, { title?: string; label?: string }>
                  )[row.key];
                  const label = section?.title ?? section?.label ?? row.key.replace(/_/g, ' ');
                  const pct =
                    totalRepairCost > 0 ? Math.min(100, (row.total / totalRepairCost) * 100) : 0;

                  return (
                    <div key={row.key} className="space-y-1">
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <span className="truncate text-text-secondary">{label}</span>
                        <span className="shrink-0 font-medium text-text-primary">
                          {fmtUsd0(row.total)}
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-accent-blue/60"
                          style={{ width: `${pct}%` }}
                          aria-hidden="true"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </GlassCard>

            <GlassCard className="p-4">
              <div className="text-xs uppercase text-text-secondary">Alerts & sanity checks</div>
              <div className="mt-3 space-y-3 text-xs">
                {resolvedSqft <= 0 && (
                  <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-amber-200">
                    Add square footage to unlock accurate Quick Estimate PSF math.
                  </div>
                )}
                {ratesStatus === 'error' && (
                  <div className="rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-red-200">
                    Repair unit rates failed to load. You can still enter custom costs.
                  </div>
                )}
                {isNoRepairsNeeded && (
                  <div className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-emerald-200">
                    Repairs are marked as $0. Toggle off if you need line items.
                  </div>
                )}
                {!isNoRepairsNeeded && appliedTotal === 0 && (
                  <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-text-secondary">
                    Start with Quick Estimate (PSF tiers + Big 5) or add line items to compute
                    totals.
                  </div>
                )}
              </div>
            </GlassCard>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          REQUEST ESTIMATE MODAL (Slice D+E)
          ═══════════════════════════════════════════════════════════════════════ */}
      <RequestEstimateModal
        dealId={dealId ?? ''}
        propertyAddress={propertyAddress}
        isOpen={isEstimateModalOpen}
        onClose={() => setIsEstimateModalOpen(false)}
        onSuccess={() => {
          // Refresh estimate requests list after successful send
          setIsEstimateModalOpen(false);
        }}
      />

      {/* ═══════════════════════════════════════════════════════════════════════
          MANUAL UPLOAD MODAL (Slice F)
          ═══════════════════════════════════════════════════════════════════════ */}
      <ManualUploadModal
        isOpen={isManualUploadOpen}
        onClose={() => setIsManualUploadOpen(false)}
        dealId={dealId ?? ''}
        orgId={orgId ?? ''}
        propertyAddress={propertyAddress}
        onSuccess={() => {
          setIsManualUploadOpen(false);
        }}
      />
    </div>
  );
}
