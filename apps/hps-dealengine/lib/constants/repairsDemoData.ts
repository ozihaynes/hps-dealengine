// ============================================================================
// REPAIRS DEMO DATA
// ============================================================================
// File: apps/hps-dealengine/lib/constants/repairsDemoData.ts
// Action: CREATE new file
// ============================================================================
// Per project standards:
// - Demo data in lib/constants/
// - Must match @hps-internal/contracts types exactly
// - Components receive isDemoMode prop
// - ALL 13 categories included
// ============================================================================

import type { EnhancedEstimatorState } from '@hps-internal/contracts';
import { createEmptyEnhancedState, updateLineItem, computeEnhancedTotals } from '../repairsMathEnhanced';

/**
 * Build demo enhanced estimator state
 *
 * Scenario: 1,500 SF home in Orlando, FL (Medium Rehab)
 * - Roof replacement (24 squares)
 * - Water heater replacement
 * - Interior paint (full house)
 * - LVP flooring (full house)
 *
 * Math verification:
 * - Roofing: 24 × 300 = $7,200
 * - Plumbing: 1 × 1,500 = $1,500
 * - Interior: 1,500 × 2.5 = $3,750
 * - Flooring: 1,500 × 6 = $9,000
 * - Grand Total: $21,450
 * - Contingency (15%): $3,218 (rounded)
 * - Total with Contingency: $24,668
 */
function buildDemoState(): EnhancedEstimatorState {
  // Start with empty state (all 13 categories, 64 items)
  let state = createEmptyEnhancedState();

  // --- ROOFING ---
  // Shingle install: 24 squares × $300/sq = $7,200
  state = updateLineItem(state, 'roofing', 'shingleInstall', {
    condition: 'replace',
    quantity: 24,
    unitCost: 300,
    isManualOverride: false,
  });

  // --- PLUMBING ---
  // Water heater: 1 × $1,500 = $1,500
  state = updateLineItem(state, 'plumbing', 'waterHeater', {
    condition: 'replace',
    quantity: 1,
    unitCost: 1500,
    isManualOverride: false,
  });

  // --- INTERIOR ---
  // Interior paint: 1,500 SF × $2.50/SF = $3,750
  state = updateLineItem(state, 'interior', 'interiorPaint', {
    condition: 'fair',
    quantity: 1500,
    unitCost: 2.5,
    isManualOverride: false,
  });

  // --- FLOORING ---
  // LVP flooring: 1,500 SF × $6/SF = $9,000
  state = updateLineItem(state, 'flooring', 'lvpFlooring', {
    condition: 'replace',
    quantity: 1500,
    unitCost: 6,
    isManualOverride: false,
  });

  // Recompute totals and return
  return computeEnhancedTotals(state);
}

/**
 * Demo enhanced estimator state
 * Pre-built with realistic Central FL rehab scenario
 *
 * Categories: 13 (all initialized)
 * Items with values: 4
 * Grand Total: $21,450
 * Total w/ Contingency: $24,668
 */
export const DEMO_ENHANCED_ESTIMATOR_STATE: EnhancedEstimatorState = buildDemoState();

/**
 * Demo PDF export configuration
 */
export const DEMO_PDF_CONFIG = {
  property: {
    address: '123 Demo Street',
    city: 'Orlando',
    state: 'FL',
    zip: '32801',
  },
  deal: {
    id: 'demo-deal-12345',
    sqft: 1500,
    rehabLevel: 'medium' as const,
  },
  profile: {
    name: 'ORL-Base',
    version: 'v2024.1',
    asOf: '2024-01-15',
    source: 'HPS Internal',
  },
  preparedBy: 'Demo User',
  date: new Date().toISOString().split('T')[0],
};

/**
 * Demo estimate requests for GC bidding (used in Slices D-F)
 */
export const DEMO_ESTIMATE_REQUESTS = [
  {
    id: 'demo-request-1',
    deal_id: 'demo-deal-12345',
    org_id: 'demo-org-001',
    gc_name: 'ABC Contractors',
    gc_email: 'bids@abccontractors.com',
    gc_company: 'ABC Contractors LLC',
    gc_phone: '407-555-1234',
    status: 'submitted' as const,
    estimate_file_name: 'ABC_Contractors_Estimate.pdf',
    estimate_file_size: 245000,
    submitted_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    sent_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'demo-request-2',
    deal_id: 'demo-deal-12345',
    org_id: 'demo-org-001',
    gc_name: 'Orlando Rehab Co',
    gc_email: 'estimates@orlandorehab.com',
    gc_company: 'Orlando Rehab Co',
    gc_phone: '407-555-5678',
    status: 'viewed' as const,
    estimate_file_name: null,
    estimate_file_size: null,
    submitted_at: null,
    sent_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    viewed_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), // 12 hours ago
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'demo-request-3',
    deal_id: 'demo-deal-12345',
    org_id: 'demo-org-001',
    gc_name: 'Quick Fix Pros',
    gc_email: 'quotes@quickfixpros.com',
    gc_company: 'Quick Fix Pros Inc',
    gc_phone: '407-555-9012',
    status: 'sent' as const,
    estimate_file_name: null,
    estimate_file_size: null,
    submitted_at: null,
    sent_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
    created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
  },
];

/**
 * Demo category summary for quick display
 * Pre-computed from DEMO_ENHANCED_ESTIMATOR_STATE
 */
export const DEMO_CATEGORY_SUMMARY = [
  { categoryKey: 'roofing', title: 'Roofing', subtotal: 7200, itemCount: 1 },
  { categoryKey: 'plumbing', title: 'Plumbing', subtotal: 1500, itemCount: 1 },
  { categoryKey: 'interior', title: 'Interior Finishes', subtotal: 3750, itemCount: 1 },
  { categoryKey: 'flooring', title: 'Flooring', subtotal: 9000, itemCount: 1 },
] as const;
