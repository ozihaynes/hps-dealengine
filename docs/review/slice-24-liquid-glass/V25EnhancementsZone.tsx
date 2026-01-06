/**
 * V25EnhancementsZone — Slice 13.3 + 14
 *
 * Enhancement zone that renders V2.5 components ABOVE the Command Center.
 * Does NOT replace CommandCenter — enhances it with:
 * - DecisionHero (Slice 14 — Stunning animated verdict with blur-to-focus reveal)
 * - VerdictCard (Detailed verdict view with blocking factors)
 * - PriceGeometryBar (Visual ZOPA)
 * - NetClearancePanel (Exit Strategies)
 * - LiquidityBuyerFitCard (Market Liquidity + Buyer Fit)
 * - CompsEvidencePack (Comparable Sales Evidence)
 *
 * DEMO MODE: When no analysis exists, uses DEMO_ENGINE_OUTPUTS from demoData.ts
 * so users see the FULL UI/UX with colorful, engaging visualizations.
 *
 * Each component handles its own null/empty state internally (defensive).
 *
 * Architecture:
 * - Uses useDealSession to get raw lastAnalyzeResult from engine
 * - Falls back to DEMO_ENGINE_OUTPUTS when no analysis exists
 * - Extracts contract-typed outputs (DealVerdict, PriceGeometry, etc.)
 * - Passes directly to Slice 9/14 components (no transformation needed)
 *
 * Principles Applied:
 * - Peak-End Rule: Verdict is the peak decision moment
 * - Hick's Law: One clear decision (PURSUE/NEEDS_EVIDENCE/PASS)
 * - Progressive Disclosure: Summary first, details on demand
 * - Doherty Threshold: Animations under 400ms feel instant
 *
 * @module components/v25/V25EnhancementsZone
 * @version 2.4.0 (Slice 17 — StatusBar Integration)
 */

"use client";

import { motion, type Variants } from "framer-motion";
import { cn } from "@/components/ui";
import { useDealSession } from "@/lib/dealSessionContext";
import { useFeatureFlag } from "@/lib/featureFlags";

// Demo Data (contract-compatible)
import { DEMO_ENGINE_OUTPUTS } from "@/lib/constants/demoData";

// Contract types from @hps-internal/contracts
import type {
  DealVerdict,
  PriceGeometry,
  NetClearance,
  EvidenceHealth,
  RiskGatesResult,
  MarketVelocity,
  CompQuality,
  EnhancedRiskSummary,
} from "@hps-internal/contracts";

// Slice 9 Components
import { VerdictCard } from "@/components/dashboard/verdict";
import { PriceGeometryBar, NetClearancePanel } from "@/components/dashboard/pricing";
import { EvidenceHealthStrip } from "@/components/dashboard/evidence";
import { RiskGatesStrip } from "@/components/dashboard/risk";
import { MarketVelocityPanel } from "@/components/dashboard/market";
import { CompQualityCard } from "@/components/dashboard/validation";
import { ArvBandWidget, type ArvBand } from "@/components/dashboard/arv";

// Orphaned Components (Slice 9.10, 9.11, 9.12) — now integrated
import { LiquidityBuyerFitCard, type BuyerFitTag } from "@/components/dashboard/liquidity";
import { CompsEvidencePack, type CompsEvidencePackData } from "@/components/dashboard/comps";

// Decision Hero Zone (Slice 14) — Replaces TradingStrip
import { DecisionHero } from "@/components/dashboard/hero";

// Confidence Indicators Bar (Slice 15)
import { ConfidenceBar } from "@/components/dashboard/confidence";

// Status Bar (Slice 17) — Risk Gates + Evidence Health
import { StatusBar } from "@/components/dashboard/status";

// ═══════════════════════════════════════════════════════════════════════════
// ANIMATION VARIANTS (Framer Motion compatible)
// ═══════════════════════════════════════════════════════════════════════════

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.05,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: "easeOut" },
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface V25EnhancementsZoneProps {
  /** Additional CSS classes */
  className?: string;
}

/**
 * Engine outputs structure (from lastAnalyzeResult)
 * These map directly to @hps-internal/contracts types
 */
interface EngineOutputs {
  verdict?: DealVerdict | null;
  price_geometry?: PriceGeometry | null;
  net_clearance?: NetClearance | null;
  evidence_health?: EvidenceHealth | null;
  risk_gates?: RiskGatesResult | null;
  market_velocity?: MarketVelocity | null;
  comp_quality?: CompQuality | null;
  arv_band?: ArvBand | null;
  // Extended outputs for orphaned components
  enhanced_risk_summary?: EnhancedRiskSummary | null;
  buyer_fit_tags?: BuyerFitTag[] | null;
  comps_evidence_pack?: CompsEvidencePackData | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// DEMO MODE BANNER
// ═══════════════════════════════════════════════════════════════════════════

function DemoModeBanner() {
  return (
    <motion.div
      variants={itemVariants}
      className={cn(
        "rounded-lg border border-blue-500/40 bg-blue-500/10 p-3",
        "flex items-center gap-3"
      )}
      data-testid="v25-demo-banner"
      role="status"
      aria-label="Preview mode active"
    >
      <span className="text-xl" aria-hidden="true">
        📊
      </span>
      <div>
        <p className="text-sm font-medium text-blue-400">
          Preview Mode — Run Analysis to See Real Results
        </p>
        <p className="text-xs text-blue-400/70">
          Sample data shown below. Run an analysis to populate with actual deal data.
        </p>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function V25EnhancementsZone({ className }: V25EnhancementsZoneProps) {
  // Feature flag check
  const isV25Enabled = useFeatureFlag("v25_dashboard");

  // Get raw engine result from deal session
  const { lastAnalyzeResult, isHydratingActiveDeal } = useDealSession();

  // ═══════════════════════════════════════════════════════════════════════════
  // DEMO MODE DETECTION (V2.5)
  // Check for V2.5 output PRESENCE, not just analysis existence.
  // This ensures demo data displays when:
  // 1. No analysis exists, OR
  // 2. Legacy analysis exists but lacks V2.5 outputs
  // ═══════════════════════════════════════════════════════════════════════════

  // Extract outputs from engine result (may be empty object for legacy runs)
  const rawOutputs: EngineOutputs = (lastAnalyzeResult as { outputs?: EngineOutputs } | null)?.outputs ?? {};

  // V2.5 outputs are present if ANY of the key fields exist
  const hasV25Outputs = !!(
    rawOutputs.verdict ||
    rawOutputs.price_geometry ||
    rawOutputs.net_clearance ||
    rawOutputs.enhanced_risk_summary
  );

  // Use demo data if no V2.5 outputs (regardless of legacy analysis)
  const isDemo = !hasV25Outputs;
  const outputs: EngineOutputs = isDemo ? DEMO_ENGINE_OUTPUTS : rawOutputs;

  // ─────────────────────────────────────────────────────────────────────
  // EARLY RETURNS
  // ─────────────────────────────────────────────────────────────────────

  // Don't render if V25 feature flag is disabled
  if (!isV25Enabled) {
    return null;
  }

  // Show skeleton during loading
  if (isHydratingActiveDeal) {
    return (
      <div className={cn("space-y-4 animate-pulse", className)}>
        <div className="h-32 bg-slate-800/50 rounded-xl border border-white/10 backdrop-blur-xl" />
        <div className="h-20 bg-slate-800/50 rounded-xl border border-white/10 backdrop-blur-xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="h-24 bg-slate-800/50 rounded-xl border border-white/10 backdrop-blur-xl" />
          <div className="h-24 bg-slate-800/50 rounded-xl border border-white/10 backdrop-blur-xl" />
          <div className="h-24 bg-slate-800/50 rounded-xl border border-white/10 backdrop-blur-xl" />
          <div className="h-24 bg-slate-800/50 rounded-xl border border-white/10 backdrop-blur-xl" />
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────
  // DATA EXTRACTION (From engine outputs OR demo data)
  // Components receive contract-typed data directly
  // ─────────────────────────────────────────────────────────────────────

  // Core V2.5 outputs
  const verdict = outputs.verdict ?? null;
  const priceGeometry = outputs.price_geometry ?? null;
  const netClearance = outputs.net_clearance ?? null;
  const evidenceHealth = outputs.evidence_health ?? null;
  const riskGates = outputs.risk_gates ?? null;
  const marketVelocity = outputs.market_velocity ?? null;
  const compQuality = outputs.comp_quality ?? null;
  const arvBand = outputs.arv_band ?? null;

  // Orphaned component outputs
  const enhancedRiskSummary = outputs.enhanced_risk_summary ?? null;
  const buyerFitTags = outputs.buyer_fit_tags ?? null;
  const compsEvidencePack = outputs.comps_evidence_pack ?? null;

  // ─────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────

  return (
    <motion.div
      className={cn("space-y-6", className)}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      data-testid="v25-enhancements-zone"
      data-state={isDemo ? "demo" : "live"}
    >
      {/* Demo Mode Banner */}
      {isDemo && <DemoModeBanner />}

      {/* ═══════════════════════════════════════════════════════════════════
          ROW 0: Decision Hero Zone (Slice 14 — Replaces TradingStrip)
          Stunning animated verdict display with blur-to-focus reveal
          ═══════════════════════════════════════════════════════════════════ */}
      <motion.div variants={itemVariants}>
        <DecisionHero
          verdict={verdict}
          priceGeometry={priceGeometry}
          netClearance={netClearance}
          riskSummary={enhancedRiskSummary}
          showConfidence={true}
          showRationale={true}
          compact={false}
        />
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════════════
          ROW 1: Confidence Indicators Bar (Slice 15)
          4 expandable cards: Comp Quality, Evidence, Market, ARV
          ═══════════════════════════════════════════════════════════════════ */}
      <motion.div variants={itemVariants}>
        <ConfidenceBar
          compQuality={compQuality}
          evidenceHealth={evidenceHealth}
          marketVelocity={marketVelocity}
          arvBand={arvBand}
          isDemoMode={isDemo}
        />
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════════════
          ROW 2: Status Bar (Slice 17) — Risk Gates + Evidence Health
          Horizontal strip showing gate status and evidence progress
          ═══════════════════════════════════════════════════════════════════ */}
      <motion.div variants={itemVariants}>
        <StatusBar
          riskSummary={enhancedRiskSummary}
          riskGates={riskGates}
          evidenceHealth={evidenceHealth}
          isDemoMode={isDemo}
        />
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════════════
          ROW 3: Verdict Card (Decision Hero — Detailed View)
          ═══════════════════════════════════════════════════════════════════ */}
      <motion.div variants={itemVariants}>
        <VerdictCard
          verdict={verdict}
          title="Deal Verdict"
          showBlockingFactors={true}
          showConfidence={true}
          className="bg-slate-800/80"
        />
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════════════
          ROW 4: Price Geometry Bar
          ═══════════════════════════════════════════════════════════════════ */}
      <motion.div variants={itemVariants}>
        <PriceGeometryBar
          priceGeometry={priceGeometry}
          showLabels={true}
          showLegend={true}
        />
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════════════
          ROW 5: Net Clearance Panel
          ═══════════════════════════════════════════════════════════════════ */}
      <motion.div variants={itemVariants}>
        <NetClearancePanel
          netClearance={netClearance}
          showReason={true}
        />
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════════════
          ROW 6: Evidence + Risk Gates Strip
          ═══════════════════════════════════════════════════════════════════ */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        {/* Evidence Health */}
        <EvidenceHealthStrip evidenceHealth={evidenceHealth} />

        {/* Risk Gates */}
        <RiskGatesStrip riskGates={riskGates} />
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════════════
          ROW 7: ARV + Market + Comp Quality
          ═══════════════════════════════════════════════════════════════════ */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        {/* ARV Band Widget */}
        <ArvBandWidget arvBand={arvBand} />

        {/* Market Velocity Panel */}
        <MarketVelocityPanel marketVelocity={marketVelocity} />

        {/* Comp Quality Card */}
        <CompQualityCard compQuality={compQuality} />
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════════════
          ROW 8: Liquidity & Buyer Fit
          ═══════════════════════════════════════════════════════════════════ */}
      <motion.div variants={itemVariants}>
        <LiquidityBuyerFitCard
          marketVelocity={marketVelocity}
          buyerFitTags={buyerFitTags}
          showBuyerFit={true}
        />
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════════════
          ROW 9: Comps Evidence Pack (Comparable Sales)
          ═══════════════════════════════════════════════════════════════════ */}
      <motion.div variants={itemVariants}>
        <CompsEvidencePack
          compsPack={compsEvidencePack}
          maxComps={6}
          showMap={false}
          showSummary={true}
        />
      </motion.div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

export default V25EnhancementsZone;
