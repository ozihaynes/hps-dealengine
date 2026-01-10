/**
 * UnderwriteHero - Wrapper for DecisionHero with live updates
 * @module components/underwrite/hero/UnderwriteHero
 * @slice 05 of 22
 *
 * Principles Applied:
 * - Composition over duplication (wraps existing DecisionHero)
 * - Event subscription for live updates (analyzeBus)
 * - Graceful loading states (placeholder → hero transition)
 * - Reduced motion support via useMotion
 *
 * Safety Constraints:
 * - DO NOT duplicate DecisionHero logic
 * - DO NOT modify original DecisionHero
 * - MUST subscribe to analyzeBus for live updates
 */

'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type {
  AnalyzeResult,
  DealVerdict,
  PriceGeometry,
  NetClearance,
  EnhancedRiskSummary,
} from '@hps-internal/contracts';
import { DecisionHero } from '@/components/dashboard/hero/DecisionHero';
import {
  subscribeAnalyzeResult,
  getLastAnalyzeResult,
} from '@/lib/analyzeBus';
import { cn, useMotion } from '../utils';
import { HeroPlaceholder } from './HeroPlaceholder';

// ═══════════════════════════════════════════════════════════════════════════════
// PROPS INTERFACE
// ═══════════════════════════════════════════════════════════════════════════════

export interface UnderwriteHeroProps {
  /** Initial analyze result from page load (SSR or initial fetch) */
  initialResult?: AnalyzeResult | null;
  /** Optional className */
  className?: string;
  /** Whether to show in demo mode (no live updates) */
  isDemoMode?: boolean;
  /** Callback when user clicks primary action (Generate Offer) */
  onPrimaryAction?: () => void;
  /** Callback when user clicks secondary action (View Details) */
  onSecondaryAction?: () => void;
  /** Show confidence indicator */
  showConfidence?: boolean;
  /** Show rationale text */
  showRationale?: boolean;
  /** Compact mode for smaller displays */
  compact?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER: Extract outputs from analyze result
// ═══════════════════════════════════════════════════════════════════════════════

interface ExtractedOutputs {
  verdict: DealVerdict | null;
  priceGeometry: PriceGeometry | null;
  netClearance: NetClearance | null;
  riskSummary: EnhancedRiskSummary | null;
}

function extractOutputs(result: AnalyzeResult | null | undefined): ExtractedOutputs {
  if (!result?.outputs) {
    return {
      verdict: null,
      priceGeometry: null,
      netClearance: null,
      riskSummary: null,
    };
  }

  const { outputs } = result;

  return {
    verdict: outputs.verdict ?? null,
    priceGeometry: outputs.price_geometry ?? null,
    netClearance: outputs.net_clearance ?? null,
    // Use risk_gates_enhanced which is the EnhancedRiskSummary type that DecisionHero expects
    riskSummary: outputs.risk_gates_enhanced ?? null,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Wrapper for DecisionHero that subscribes to analyzeBus for live updates.
 * Shows placeholder before analysis, then transitions to full hero.
 *
 * CRITICAL: This component IMPORTS DecisionHero, it does NOT duplicate it.
 * The DecisionHero component already exists in dashboard/hero.
 *
 * @example
 * ```tsx
 * <UnderwriteHero
 *   initialResult={analyzeResult}
 *   onPrimaryAction={handleGenerateOffer}
 * />
 * ```
 */
export function UnderwriteHero({
  initialResult,
  className,
  isDemoMode = false,
  onPrimaryAction,
  onSecondaryAction,
  showConfidence = true,
  showRationale = true,
  compact = false,
}: UnderwriteHeroProps): React.JSX.Element {
  const { getDurationSeconds } = useMotion();

  // State for analyze result
  const [result, setResult] = React.useState<AnalyzeResult | null>(
    initialResult ?? null
  );

  // Track if we've done initial sync (to avoid double-setting on mount)
  const hasInitializedRef = React.useRef(false);

  // Subscribe to analyzeBus for live updates (skip in demo mode)
  React.useEffect(() => {
    if (isDemoMode) return;

    // One-time sync on mount: check if bus has newer result than our initial
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      const latest = getLastAnalyzeResult();
      if (latest) {
        setResult(latest);
      }
    }

    // Subscribe to future updates
    const unsubscribe = subscribeAnalyzeResult((newResult: AnalyzeResult) => {
      setResult(newResult);
    });

    return unsubscribe;
  }, [isDemoMode]); // ← FIXED: removed `result` from dependencies

  // Extract outputs from result
  const { verdict, priceGeometry, netClearance, riskSummary } = extractOutputs(result);

  // Determine if we have analysis data to show
  const hasAnalysisData = Boolean(verdict);

  return (
    <div
      className={cn('relative', className)}
      data-testid="underwrite-hero"
    >
      <AnimatePresence mode="wait">
        {!hasAnalysisData ? (
          <motion.div
            key="placeholder"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: getDurationSeconds(200) }}
          >
            <HeroPlaceholder />
          </motion.div>
        ) : (
          <motion.div
            key="hero"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: getDurationSeconds(300) }}
          >
            <DecisionHero
              verdict={verdict}
              priceGeometry={priceGeometry}
              netClearance={netClearance}
              riskSummary={riskSummary}
              onPrimaryAction={onPrimaryAction}
              onSecondaryAction={onSecondaryAction}
              showConfidence={showConfidence}
              showRationale={showRationale}
              compact={compact}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

UnderwriteHero.displayName = 'UnderwriteHero';
