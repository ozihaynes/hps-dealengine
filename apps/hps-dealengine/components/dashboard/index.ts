/**
 * Dashboard Components — V2.5 Wholesaler Dashboard
 *
 * Top-level barrel export for all Slice 9 dashboard components.
 * Each sub-folder contains specialized components for specific dashboard zones.
 *
 * Component Categories:
 * - verdict: Deal verdict and decision display (VerdictChip, VerdictCard)
 * - pricing: Price geometry and net clearance (PriceGeometryBar, NetClearancePanel)
 * - evidence: Evidence health tracking (EvidenceHealthStrip)
 * - risk: Risk gates assessment (RiskGatesStrip)
 * - market: Market velocity and trends (MarketVelocityPanel)
 * - validation: Comp quality scoring (CompQualityCard)
 * - arv: ARV estimate display (ArvBandWidget)
 * - trading: Decision bar hero component (TradingStrip)
 * - liquidity: Market liquidity and buyer fit (LiquidityBuyerFitCard)
 * - comps: Comparable sales evidence (CompsEvidencePack)
 * - hero: Decision Hero Zone (DecisionHero, VerdictReveal, KeyMetricsTrio, PrimaryActionCTA)
 * - confidence: Confidence Indicators Bar (ConfidenceBar, ConfidenceCard, ScoreRing)
 *
 * @module components/dashboard
 * @version 1.2.0 (Slice 15)
 */

// ═══════════════════════════════════════════════════════════════════════════
// VERDICT COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

export { VerdictChip, type VerdictChipProps } from "./verdict";
export { VerdictCard, type VerdictCardProps } from "./verdict";

// ═══════════════════════════════════════════════════════════════════════════
// PRICING COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

export { PriceGeometryBar, type PriceGeometryBarProps } from "./pricing";
export { NetClearancePanel, type NetClearancePanelProps } from "./pricing";

// ═══════════════════════════════════════════════════════════════════════════
// EVIDENCE COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

export { EvidenceHealthStrip, type EvidenceHealthStripProps } from "./evidence";

// ═══════════════════════════════════════════════════════════════════════════
// RISK COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

export { RiskGatesStrip, type RiskGatesStripProps } from "./risk";

// ═══════════════════════════════════════════════════════════════════════════
// MARKET COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

export { MarketVelocityPanel, type MarketVelocityPanelProps } from "./market";

// ═══════════════════════════════════════════════════════════════════════════
// VALIDATION COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

export { CompQualityCard, type CompQualityCardProps } from "./validation";

// ═══════════════════════════════════════════════════════════════════════════
// ARV COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

export {
  ArvBandWidget,
  type ArvBandWidgetProps,
  type ArvBand,
  type ArvConfidence,
  type ArvSource,
} from "./arv";

// ═══════════════════════════════════════════════════════════════════════════
// TRADING COMPONENTS (Hero — Decision Bar)
// ═══════════════════════════════════════════════════════════════════════════

export { TradingStrip, type TradingStripProps } from "./trading";

// ═══════════════════════════════════════════════════════════════════════════
// LIQUIDITY COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

export {
  LiquidityBuyerFitCard,
  type LiquidityBuyerFitCardProps,
  type BuyerFitTag,
} from "./liquidity";

// ═══════════════════════════════════════════════════════════════════════════
// COMPS COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

export {
  CompsEvidencePack,
  type CompsEvidencePackProps,
  type CompsEvidencePackData,
} from "./comps";

// ═══════════════════════════════════════════════════════════════════════════
// HERO COMPONENTS (Decision Hero Zone — Slice 14)
// ═══════════════════════════════════════════════════════════════════════════

export {
  DecisionHero,
  type DecisionHeroProps,
  VerdictReveal,
  type VerdictRevealProps,
  KeyMetricsTrio,
  type KeyMetricsTrioProps,
  PrimaryActionCTA,
  type PrimaryActionCTAProps,
} from "./hero";

// ═══════════════════════════════════════════════════════════════════════════
// CONFIDENCE COMPONENTS (Slice 15 — Confidence Indicators Bar)
// ═══════════════════════════════════════════════════════════════════════════

export {
  ConfidenceBar,
  type ConfidenceBarProps,
  ConfidenceCard,
  type ConfidenceCardProps,
  ScoreRing,
  type ScoreRingProps,
} from "./confidence";
