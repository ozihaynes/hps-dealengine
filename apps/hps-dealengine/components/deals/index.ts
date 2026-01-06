/**
 * Deals List Components — Slice 19
 *
 * Card-based deals list with filtering, pipeline summary, and responsive grid.
 *
 * Features:
 * - DealCard: Individual deal with verdict accent
 * - DealsList: Responsive card grid (1-4 columns)
 * - DealsFilter: Filter by verdict, date, status, sort
 * - PipelineSummary: Portfolio stats by verdict
 * - EmptyDeals: Empty state with actions
 *
 * @module components/deals
 * @version 1.0.0 (Slice 19)
 */

// Main components
export { DealCard, type DealCardData, type DealCardProps } from "./DealCard";
export { DealsList, type DealsListProps } from "./DealsList";
export { DealsFilter, type DealsFilterProps } from "./DealsFilter";
export { PipelineSummary, type PipelineSummaryProps } from "./PipelineSummary";
export { EmptyDeals, type EmptyDealsProps } from "./EmptyDeals";

// Default export for convenience
export { default } from "./DealsList";
