/**
 * Decision Hero Zone — Slice 14
 *
 * Premium verdict display components with stunning animations
 * and clear decision-making flow.
 *
 * Components:
 * - DecisionHero: Main container with verdict-based theming and glow
 * - VerdictReveal: Large verdict with blur-to-focus animation
 * - KeyMetricsTrio: Net/ZOPA/Gates summary cards
 * - PrimaryActionCTA: Verdict-contextual action button
 *
 * Usage:
 * ```tsx
 * import { DecisionHero } from "@/components/dashboard/hero";
 *
 * <DecisionHero
 *   verdict={verdict}
 *   priceGeometry={priceGeometry}
 *   netClearance={netClearance}
 *   riskSummary={riskSummary}
 *   onPrimaryAction={handleOffer}
 * />
 * ```
 *
 * @module components/dashboard/hero
 * @version 1.0.0 (Slice 14)
 */

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export { DecisionHero, type DecisionHeroProps } from "./DecisionHero";
export { default as DecisionHeroDefault } from "./DecisionHero";

// ═══════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

export { VerdictReveal, type VerdictRevealProps } from "./VerdictReveal";
export { KeyMetricsTrio, type KeyMetricsTrioProps } from "./KeyMetricsTrio";
export { PrimaryActionCTA, type PrimaryActionCTAProps } from "./PrimaryActionCTA";

// ═══════════════════════════════════════════════════════════════════════════
// INTERNAL EXPORTS (for testing)
// ═══════════════════════════════════════════════════════════════════════════

// From DecisionHero
export { getSafeVerdict, VERDICT_THEME, VALID_VERDICTS } from "./DecisionHero";

// From VerdictReveal
export {
  VERDICT_CONFIG,
  getConfidenceLevel,
  CONFIDENCE_COLORS,
} from "./VerdictReveal";

// From KeyMetricsTrio
export {
  getBestNet,
  getZopaDisplay,
  getGatesSummary,
  EXIT_LABELS,
  VARIANT_STYLES,
} from "./KeyMetricsTrio";

// From PrimaryActionCTA
export { CTA_CONFIG } from "./PrimaryActionCTA";

// ═══════════════════════════════════════════════════════════════════════════
// SHARED UTILITIES (from lib/utils/numbers)
// ═══════════════════════════════════════════════════════════════════════════

export { safeNumber, formatCurrency, formatPercent } from "@/lib/utils/numbers";
