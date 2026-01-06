/**
 * Status Bar — Slice 17
 *
 * Horizontal status strip showing risk gates and evidence health.
 *
 * Components:
 * - StatusBar: Container with two sections
 * - RiskStatusCard: Gates summary with icons
 * - EvidenceStatusCard: Progress bar with missing count
 * - GateIcon: Individual gate status icon
 *
 * Usage:
 * import { StatusBar } from "@/components/dashboard/status";
 *
 * @module components/dashboard/status
 * @version 1.0.0 (Slice 17)
 */

// Main components
export { StatusBar, type StatusBarProps } from "./StatusBar";
export { RiskStatusCard, type RiskStatusCardProps } from "./RiskStatusCard";
export { EvidenceStatusCard, type EvidenceStatusCardProps } from "./EvidenceStatusCard";
export { GateIcon, type GateIconProps, type GateStatus } from "./GateIcon";
