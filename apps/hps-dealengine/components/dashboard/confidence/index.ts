/**
 * Confidence Indicators — Slice 15
 *
 * Expandable confidence indicator cards for deal validation.
 *
 * Components:
 * - ConfidenceBar: Container for all 4 cards
 * - ConfidenceCard: Generic expandable card
 * - ScoreRing: Animated circular progress
 *
 * Usage:
 * ```tsx
 * import { ConfidenceBar } from "@/components/dashboard/confidence";
 *
 * <ConfidenceBar
 *   compQuality={compQuality}
 *   evidenceHealth={evidenceHealth}
 *   marketVelocity={marketVelocity}
 *   arvBand={arvBand}
 *   isDemoMode={isDemo}
 * />
 * ```
 *
 * @module components/dashboard/confidence
 * @version 1.0.0 (Slice 15)
 */

// Main components
export { ConfidenceBar, type ConfidenceBarProps } from "./ConfidenceBar";
export { ConfidenceCard, type ConfidenceCardProps } from "./ConfidenceCard";
export { ScoreRing, type ScoreRingProps } from "./ScoreRing";

// Content components (for customization)
export { CompQualityContent, type CompQualityContentProps } from "./cards/CompQualityContent";
export { EvidenceHealthContent, type EvidenceHealthContentProps } from "./cards/EvidenceHealthContent";
export { MarketVelocityContent, type MarketVelocityContentProps } from "./cards/MarketVelocityContent";
export { ArvConfidenceContent, type ArvConfidenceContentProps } from "./cards/ArvConfidenceContent";
