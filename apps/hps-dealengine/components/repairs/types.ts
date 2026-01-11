// ============================================================================
// SHARED TYPES — Bidding Cockpit Domain Types
// ============================================================================
// Consolidates types used across multiple Slice G components
// ============================================================================

import type { EstimateStatus } from "./StatusBadge";

// Re-export for convenience
export type { EstimateStatus };

// ============================================================================
// LINE ITEM TYPES
// ============================================================================

export interface LineItem {
  id: string;
  description: string;
  quantity?: number;
  unit?: string;
  unitCost?: number;
  total: number;
}

// ============================================================================
// CATEGORY TYPES
// ============================================================================

export interface CategoryBreakdown {
  id: string;
  name: string;
  subtotal: number;
  itemCount: number;
  items?: LineItem[];
}

// ============================================================================
// ESTIMATE TYPES
// ============================================================================

export interface EstimateRequest {
  id: string;
  gc_name: string;
  gc_email?: string;
  status: EstimateStatus;
  submitted_at?: string;
  sent_at?: string;
  file_path?: string;
}

export interface EstimateData {
  baseEstimate: number;
  contingency: number;
  contingencyPercent: number;
  totalBudget: number;
  categories: CategoryBreakdown[];
  lastUpdated?: string;
}

// ============================================================================
// VELOCITY TYPES
// ============================================================================

export interface VelocityCounts {
  pending: number;
  sent: number;
  viewed: number;
  submitted: number;
  total: number;
}
