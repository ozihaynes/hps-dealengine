/**
 * Visualization Components Barrel Export
 * @module components/underwrite/visualizations
 * @slice 15-16 of 22
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
