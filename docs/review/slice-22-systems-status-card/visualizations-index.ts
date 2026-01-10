/**
 * Visualization Components Barrel Export
 * @module components/underwrite/visualizations
 * @slice 15-17 of 22
 *
 * This module exports visualization components for the underwriting page.
 * All visualizations are SVG-based with accessible semantics.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// MOTIVATION SCORE GAUGE (Slice 15)
// ═══════════════════════════════════════════════════════════════════════════════

export { MotivationScoreGauge } from './MotivationScoreGauge';
export type { MotivationScoreGaugeProps } from './MotivationScoreGauge';

// ═══════════════════════════════════════════════════════════════════════════════
// FORECLOSURE TIMELINE (Slice 16)
// ═══════════════════════════════════════════════════════════════════════════════

export { ForeclosureTimelineViz } from './ForeclosureTimelineViz';
export type { ForeclosureTimelineVizProps } from './ForeclosureTimelineViz';

// ═══════════════════════════════════════════════════════════════════════════════
// LIEN RISK SUMMARY (Slice 17)
// ═══════════════════════════════════════════════════════════════════════════════

export { LienRiskSummary } from './LienRiskSummary';
export type { LienRiskSummaryProps } from './LienRiskSummary';

// ═══════════════════════════════════════════════════════════════════════════════
// SYSTEMS STATUS (Slice 22)
// ═══════════════════════════════════════════════════════════════════════════════

export { SystemRULBar } from './SystemRULBar';
export type { SystemRULBarProps } from './SystemRULBar';

export { SystemsStatusCard } from './SystemsStatusCard';
export type { SystemsStatusCardProps } from './SystemsStatusCard';
