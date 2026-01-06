/**
 * Command Center V2.1 - Signal Generation Engine
 *
 * Generates actionable signals from L1 outputs and deal state.
 * Signals are sorted by severity and provide resolution pathways.
 *
 * @module signal_generator
 * @version 1.0.0
 */

import type {
  ActiveSignal,
  SignalType,
  SignalSeverity,
} from "@hps-internal/contracts";

import { SNAPSHOT_POLICY_DEFAULTS, type SnapshotPolicyDefaults } from "./snapshot_policy_defaults";

// ============================================================================
// INPUT TYPES
// ============================================================================

interface AnalyzeOutputs {
  spread_cash?: number | null;
  min_spread_required?: number | null;
  shortfall_vs_payoff?: number | null;
  workflow_state?: string | null;
  borderline_flag?: boolean | null;
  timeline_summary?: {
    dtm_selected_days?: number | null;
    urgency?: string | null;
    auction_date_iso?: string | null;
  } | null;
  risk_summary?: {
    per_gate?: Record<string, { status?: string; enabled?: boolean; reasons?: string[] }> | null;
  } | null;
  evidence_summary?: {
    missing_required_kinds?: string[] | null;
    freshness_by_kind?: Record<string, { status?: string; age_days?: number }> | null;
  } | null;
}

interface DealRecord {
  id: string;
  occupancy_status?: string | null;
  structural_risk_flag?: boolean | null;
  flood_zone?: string | null;
}

// ============================================================================
// DISPLAY NAME FORMATTERS
// ============================================================================

const GATE_DISPLAY_NAMES: Record<string, string> = {
  insurability: 'Insurance',
  title: 'Title',
  payoff: 'Payoff',
  fha_va_flip: 'FHA/VA Flip',
  firpta: 'FIRPTA',
  pace_solar_ucc: 'PACE/Solar/UCC',
  condo_sirs: 'Condo SIRS',
  manufactured: 'Manufactured',
  scra: 'SCRA',
  flood_50: 'Flood 50%',
  bankruptcy: 'Bankruptcy',
};

const EVIDENCE_DISPLAY_NAMES: Record<string, string> = {
  payoff: 'Payoff Statement',
  title: 'Title Report',
  insurance: 'Insurance Quote',
  repairs: 'Repair Estimate',
  comps: 'Comparable Sales',
  contract: 'Purchase Contract',
  inspection: 'Property Inspection',
  appraisal: 'Appraisal',
  hoa: 'HOA Documents',
  tax: 'Tax Records',
};

function formatGateName(key: string): string {
  return GATE_DISPLAY_NAMES[key] ?? key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function formatEvidenceKind(kind: string): string {
  return EVIDENCE_DISPLAY_NAMES[kind] ?? kind.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ============================================================================
// SIGNAL ID GENERATOR (Deterministic)
// ============================================================================

function generateSignalId(type: SignalType, dealId: string, index: number): string {
  return `sig_${type.toLowerCase()}_${dealId.slice(0, 8)}_${index}`;
}

// ============================================================================
// INDIVIDUAL SIGNAL GENERATORS
// ============================================================================

function generateEvidenceMissingSignals(
  outputs: AnalyzeOutputs,
  dealId: string,
  signalIndex: { current: number },
  timestamp: string
): ActiveSignal[] {
  const signals: ActiveSignal[] = [];
  const missingKinds = outputs?.evidence_summary?.missing_required_kinds ?? [];

  if (missingKinds.length === 0) return signals;

  const formattedKinds = missingKinds.slice(0, 3).map(formatEvidenceKind);
  const moreCount = missingKinds.length > 3 ? missingKinds.length - 3 : 0;

  signals.push({
    id: generateSignalId('EVIDENCE_MISSING', dealId, signalIndex.current++),
    type: 'EVIDENCE_MISSING',
    severity: 'critical',
    title: `Missing ${missingKinds.length} required evidence`,
    description: `Upload: ${formattedKinds.join(', ')}${moreCount > 0 ? ` +${moreCount} more` : ''}`,
    cta: { label: 'Upload', action: 'open_drawer', target: 'evidence_upload' },
    expected_impact: { metric: 'closeability', delta: `+${Math.min(25, missingKinds.length * 8)} pts` },
    proof_ref: 'trace://EVIDENCE_FRESHNESS_POLICY',
    resolution_actions: missingKinds.map(kind => ({
      id: `upload_${kind}`,
      label: `Upload ${formatEvidenceKind(kind)}`,
      type: 'upload' as const,
      endpoint: '/api/evidence/upload',
      payload_template: { kind, deal_id: dealId },
    })),
    created_at: timestamp,
  });

  return signals;
}

function generateEvidenceStaleSignals(
  outputs: AnalyzeOutputs,
  dealId: string,
  policy: SnapshotPolicyDefaults,
  signalIndex: { current: number },
  timestamp: string
): ActiveSignal[] {
  const signals: ActiveSignal[] = [];
  const freshnessByKind = outputs?.evidence_summary?.freshness_by_kind ?? {};

  const staleKinds: string[] = [];
  for (const [kind, freshness] of Object.entries(freshnessByKind)) {
    if (freshness?.status === 'stale' ||
        (freshness?.age_days != null && freshness.age_days > policy.evidence_freshness_limit_days)) {
      staleKinds.push(kind);
    }
  }

  if (staleKinds.length === 0) return signals;

  signals.push({
    id: generateSignalId('EVIDENCE_STALE', dealId, signalIndex.current++),
    type: 'EVIDENCE_STALE',
    severity: 'warning',
    title: `${staleKinds.length} evidence item(s) stale`,
    description: `Refresh: ${staleKinds.slice(0, 3).map(formatEvidenceKind).join(', ')}`,
    cta: { label: 'Refresh', action: 'open_drawer', target: 'evidence_refresh' },
    expected_impact: { metric: 'closeability', delta: `+${Math.min(15, staleKinds.length * 5)} pts` },
    proof_ref: 'trace://EVIDENCE_FRESHNESS_POLICY',
    resolution_actions: staleKinds.map(kind => ({
      id: `refresh_${kind}`,
      label: `Refresh ${formatEvidenceKind(kind)}`,
      type: 'upload' as const,
      endpoint: '/api/evidence/upload',
      payload_template: { kind, deal_id: dealId, replace: true },
    })),
    created_at: timestamp,
  });

  return signals;
}

function generateGateFailedSignals(
  outputs: AnalyzeOutputs,
  dealId: string,
  signalIndex: { current: number },
  timestamp: string
): ActiveSignal[] {
  const signals: ActiveSignal[] = [];
  const perGate = outputs?.risk_summary?.per_gate ?? {};

  for (const [key, gate] of Object.entries(perGate)) {
    if (gate?.status !== 'fail') continue;

    const gateName = formatGateName(key);
    const reason = gate.reasons?.[0] ?? 'Risk gate requires resolution';

    signals.push({
      id: generateSignalId('GATE_FAILED', dealId, signalIndex.current++),
      type: 'GATE_FAILED',
      severity: 'critical',
      title: `${gateName} gate failed`,
      description: reason.slice(0, 200),
      cta: { label: 'Review', action: 'open_drawer', target: `gate_${key}` },
      expected_impact: { metric: 'verdict', delta: '→ HOLD/PASS' },
      proof_ref: `trace://RISK_GATES_POLICY.${key}`,
      resolution_actions: [{
        id: `resolve_${key}`,
        label: 'Resolve Issue',
        type: 'upload',
        endpoint: '/api/gates/resolve',
        payload_template: { gate: key, deal_id: dealId },
      }],
      created_at: timestamp,
    });
  }

  return signals;
}

function generateGateInfoNeededSignals(
  outputs: AnalyzeOutputs,
  dealId: string,
  signalIndex: { current: number },
  timestamp: string
): ActiveSignal[] {
  const signals: ActiveSignal[] = [];
  const perGate = outputs?.risk_summary?.per_gate ?? {};

  const infoNeededGates: string[] = [];
  for (const [key, gate] of Object.entries(perGate)) {
    if (gate?.status === 'info_needed' && gate?.enabled !== false) {
      infoNeededGates.push(key);
    }
  }

  if (infoNeededGates.length === 0) return signals;

  signals.push({
    id: generateSignalId('GATE_INFO_NEEDED', dealId, signalIndex.current++),
    type: 'GATE_INFO_NEEDED',
    severity: 'warning',
    title: `${infoNeededGates.length} gate(s) need info`,
    description: `Provide: ${infoNeededGates.slice(0, 3).map(formatGateName).join(', ')}`,
    cta: { label: 'Provide Info', action: 'open_drawer', target: 'gate_info' },
    expected_impact: { metric: 'closeability', delta: `+${Math.min(20, infoNeededGates.length * 7)} pts` },
    proof_ref: 'trace://RISK_GATES_POLICY',
    resolution_actions: infoNeededGates.map(key => ({
      id: `provide_${key}`,
      label: `Provide ${formatGateName(key)} Info`,
      type: 'upload' as const,
      endpoint: '/api/gates/provide-info',
      payload_template: { gate: key, deal_id: dealId },
    })),
    created_at: timestamp,
  });

  return signals;
}

function generateSpreadShortfallSignal(
  outputs: AnalyzeOutputs,
  dealId: string,
  policy: SnapshotPolicyDefaults,
  signalIndex: { current: number },
  timestamp: string
): ActiveSignal | null {
  const spread = outputs?.spread_cash ?? 0;
  const minSpread = outputs?.min_spread_required ?? policy.verdict_min_spread;

  if (spread >= minSpread || spread <= 0) return null;

  const shortfall = minSpread - spread;

  return {
    id: generateSignalId('SPREAD_SHORTFALL', dealId, signalIndex.current++),
    type: 'SPREAD_SHORTFALL',
    severity: 'critical',
    title: `Spread $${shortfall.toLocaleString()} short`,
    description: `Current: $${spread.toLocaleString()}, Required: $${minSpread.toLocaleString()}`,
    cta: { label: 'Review Pricing', action: 'open_drawer', target: 'pricing_review' },
    expected_impact: { metric: 'verdict', delta: '→ HOLD' },
    proof_ref: 'trace://SPREAD_LADDER',
    resolution_actions: [{
      id: 'adjust_offer',
      label: 'Adjust Offer Price',
      type: 'override',
      endpoint: '/api/pricing/adjust',
      payload_template: { deal_id: dealId, target_spread: minSpread },
    }],
    created_at: timestamp,
  };
}

function generatePayoffShortfallSignal(
  outputs: AnalyzeOutputs,
  dealId: string,
  signalIndex: { current: number },
  timestamp: string
): ActiveSignal | null {
  const shortfall = outputs?.shortfall_vs_payoff ?? 0;
  if (shortfall <= 0) return null;

  return {
    id: generateSignalId('PAYOFF_SHORTFALL', dealId, signalIndex.current++),
    type: 'PAYOFF_SHORTFALL',
    severity: 'critical',
    title: `$${shortfall.toLocaleString()} payoff shortfall`,
    description: 'Offer below payoff. Requires seller contribution or price adjustment.',
    cta: { label: 'Review Payoff', action: 'open_drawer', target: 'payoff_review' },
    expected_impact: { metric: 'verdict', delta: '→ PASS' },
    proof_ref: 'trace://PAYOFF_POLICY',
    resolution_actions: [
      { id: 'verify_payoff', label: 'Verify Payoff', type: 'upload', endpoint: '/api/evidence/upload', payload_template: { kind: 'payoff', deal_id: dealId } },
      { id: 'request_contrib', label: 'Request Seller Contribution', type: 'request', endpoint: '/api/negotiations/seller-contribution', payload_template: { deal_id: dealId, shortfall } },
    ],
    created_at: timestamp,
  };
}

function generateAuctionUrgencySignal(
  outputs: AnalyzeOutputs,
  dealId: string,
  signalIndex: { current: number },
  timestamp: string,
  asOfDate: Date
): ActiveSignal | null {
  const auctionDateStr = outputs?.timeline_summary?.auction_date_iso;
  if (!auctionDateStr) return null;

  const auctionDate = new Date(auctionDateStr);
  const daysToAuction = Math.ceil((auctionDate.getTime() - asOfDate.getTime()) / (1000 * 60 * 60 * 24));

  if (daysToAuction > 14 || daysToAuction < 0) return null;

  return {
    id: generateSignalId('URGENCY_AUCTION', dealId, signalIndex.current++),
    type: 'URGENCY_AUCTION',
    severity: 'critical',
    title: `Auction in ${daysToAuction} day${daysToAuction !== 1 ? 's' : ''}`,
    description: `Auction: ${auctionDate.toLocaleDateString()}. Immediate action required.`,
    cta: { label: 'Prioritize', action: 'open_drawer', target: 'urgency_review' },
    expected_impact: { metric: 'urgency', delta: '→ emergency' },
    proof_ref: 'trace://DTM_URGENCY_POLICY',
    resolution_actions: [{ id: 'expedite', label: 'Mark Expedited', type: 'acknowledge', endpoint: '/api/deals/expedite', payload_template: { deal_id: dealId } }],
    created_at: timestamp,
  };
}

function generateDtmUrgencySignal(
  outputs: AnalyzeOutputs,
  dealId: string,
  signalIndex: { current: number },
  timestamp: string
): ActiveSignal | null {
  const dtmDays = outputs?.timeline_summary?.dtm_selected_days ?? 90;
  if (dtmDays >= 21 || outputs?.timeline_summary?.auction_date_iso) return null;

  return {
    id: generateSignalId('URGENCY_DTM', dealId, signalIndex.current++),
    type: 'URGENCY_DTM',
    severity: 'warning',
    title: `Tight timeline: ${dtmDays} days`,
    description: 'Short days-to-money requires accelerated processing.',
    cta: { label: 'Accelerate', action: 'open_drawer', target: 'timeline_review' },
    expected_impact: { metric: 'urgency', delta: '→ critical' },
    proof_ref: 'trace://DTM_URGENCY_POLICY',
    resolution_actions: [{ id: 'accelerate', label: 'Accelerate Timeline', type: 'acknowledge', endpoint: '/api/deals/accelerate', payload_template: { deal_id: dealId } }],
    created_at: timestamp,
  };
}

function generateOccupancyRiskSignal(
  deal: DealRecord,
  signalIndex: { current: number },
  timestamp: string
): ActiveSignal | null {
  const occupancy = deal?.occupancy_status;
  if (occupancy !== 'tenant_occupied' && occupancy !== 'squatter') return null;

  const isSquatter = occupancy === 'squatter';

  return {
    id: generateSignalId('OCCUPANCY_RISK', deal.id, signalIndex.current++),
    type: 'OCCUPANCY_RISK',
    severity: isSquatter ? 'critical' : 'warning',
    title: isSquatter ? 'Property has squatter' : 'Tenant-occupied property',
    description: isSquatter ? 'Squatter requires legal eviction. High risk.' : 'Tenant adds timeline risk. Verify lease terms.',
    cta: { label: 'Review', action: 'open_drawer', target: 'occupancy_review' },
    expected_impact: { metric: 'spread', delta: isSquatter ? '-15%' : '-8%' },
    proof_ref: null,
    resolution_actions: [{ id: 'verify_occupancy', label: 'Verify Occupancy', type: 'upload', endpoint: '/api/deals/update-occupancy', payload_template: { deal_id: deal.id } }],
    created_at: timestamp,
  };
}

function generateStructuralFlagSignal(
  deal: DealRecord,
  signalIndex: { current: number },
  timestamp: string
): ActiveSignal | null {
  if (deal?.structural_risk_flag !== true) return null;

  return {
    id: generateSignalId('STRUCTURAL_FLAG', deal.id, signalIndex.current++),
    type: 'STRUCTURAL_FLAG',
    severity: 'warning',
    title: 'Structural concerns flagged',
    description: 'Property has structural risk indicators. Verify with inspection.',
    cta: { label: 'Review', action: 'open_drawer', target: 'structural_review' },
    expected_impact: { metric: 'spread', delta: '-15%' },
    proof_ref: null,
    resolution_actions: [
      { id: 'upload_inspection', label: 'Upload Inspection', type: 'upload', endpoint: '/api/evidence/upload', payload_template: { kind: 'inspection', deal_id: deal.id } },
      { id: 'clear_flag', label: 'Clear Flag', type: 'override', endpoint: '/api/deals/clear-structural', payload_template: { deal_id: deal.id } },
    ],
    created_at: timestamp,
  };
}

function generateFloodRiskSignal(
  deal: DealRecord,
  signalIndex: { current: number },
  timestamp: string
): ActiveSignal | null {
  const floodZone = deal?.flood_zone;
  const highRiskZones = ['AE', 'VE', 'A', 'V'];
  if (!floodZone || !highRiskZones.includes(floodZone)) return null;

  return {
    id: generateSignalId('FLOOD_RISK', deal.id, signalIndex.current++),
    type: 'FLOOD_RISK',
    severity: 'warning',
    title: `High-risk flood zone: ${floodZone}`,
    description: 'Verify flood insurance availability and costs.',
    cta: { label: 'Review', action: 'open_drawer', target: 'flood_review' },
    expected_impact: { metric: 'spread', delta: '-10%' },
    proof_ref: null,
    resolution_actions: [{ id: 'upload_flood_cert', label: 'Upload Flood Cert', type: 'upload', endpoint: '/api/evidence/upload', payload_template: { kind: 'flood_cert', deal_id: deal.id } }],
    created_at: timestamp,
  };
}

function generateBorderlineSignal(
  outputs: AnalyzeOutputs,
  dealId: string,
  signalIndex: { current: number },
  timestamp: string
): ActiveSignal | null {
  if (outputs?.borderline_flag !== true) return null;

  return {
    id: generateSignalId('BORDERLINE_DEAL', dealId, signalIndex.current++),
    type: 'BORDERLINE_DEAL',
    severity: 'info',
    title: 'Deal is borderline',
    description: 'Near decision thresholds. Small changes could tip verdict.',
    cta: { label: 'Review', action: 'open_drawer', target: 'borderline_review' },
    expected_impact: { metric: 'verdict', delta: 'Review required' },
    proof_ref: 'trace://BORDERLINE',
    resolution_actions: [{ id: 'analyst_review', label: 'Request Review', type: 'request', endpoint: '/api/reviews/request', payload_template: { deal_id: dealId, type: 'borderline' } }],
    created_at: timestamp,
  };
}

// ============================================================================
// MAIN SIGNAL GENERATION FUNCTION
// ============================================================================

/**
 * Generate all active signals for a deal
 * Signals are sorted by severity (critical > warning > info)
 *
 * @param outputs - L1 engine outputs
 * @param deal - Deal record
 * @param policy - Policy defaults
 * @param asOfDate - Reference date for time-based calculations (for determinism)
 * @returns Array of ActiveSignal sorted by severity
 */
export function generateActiveSignals(
  outputs: AnalyzeOutputs,
  deal: DealRecord,
  policy: SnapshotPolicyDefaults = SNAPSHOT_POLICY_DEFAULTS,
  asOfDate: Date = new Date()
): ActiveSignal[] {
  const signals: ActiveSignal[] = [];
  const signalIndex = { current: 0 };
  const dealId = deal.id;
  const timestamp = asOfDate.toISOString();

  // Generate all signals
  signals.push(...generateEvidenceMissingSignals(outputs, dealId, signalIndex, timestamp));
  signals.push(...generateEvidenceStaleSignals(outputs, dealId, policy, signalIndex, timestamp));
  signals.push(...generateGateFailedSignals(outputs, dealId, signalIndex, timestamp));
  signals.push(...generateGateInfoNeededSignals(outputs, dealId, signalIndex, timestamp));

  const spreadSignal = generateSpreadShortfallSignal(outputs, dealId, policy, signalIndex, timestamp);
  if (spreadSignal) signals.push(spreadSignal);

  const payoffSignal = generatePayoffShortfallSignal(outputs, dealId, signalIndex, timestamp);
  if (payoffSignal) signals.push(payoffSignal);

  const auctionSignal = generateAuctionUrgencySignal(outputs, dealId, signalIndex, timestamp, asOfDate);
  if (auctionSignal) signals.push(auctionSignal);

  const dtmSignal = generateDtmUrgencySignal(outputs, dealId, signalIndex, timestamp);
  if (dtmSignal) signals.push(dtmSignal);

  const occupancySignal = generateOccupancyRiskSignal(deal, signalIndex, timestamp);
  if (occupancySignal) signals.push(occupancySignal);

  const structuralSignal = generateStructuralFlagSignal(deal, signalIndex, timestamp);
  if (structuralSignal) signals.push(structuralSignal);

  const floodSignal = generateFloodRiskSignal(deal, signalIndex, timestamp);
  if (floodSignal) signals.push(floodSignal);

  const borderlineSignal = generateBorderlineSignal(outputs, dealId, signalIndex, timestamp);
  if (borderlineSignal) signals.push(borderlineSignal);

  // Sort by severity
  const severityOrder: Record<SignalSeverity, number> = { 'critical': 0, 'warning': 1, 'info': 2 };
  signals.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return signals;
}

/**
 * Count signals by severity
 */
export function countSignalsBySeverity(
  signals: ActiveSignal[]
): { critical: number; warning: number; info: number } {
  const counts = { critical: 0, warning: 0, info: 0 };
  for (const signal of signals) {
    counts[signal.severity]++;
  }
  return counts;
}

/**
 * Get top N signals (for Action Dock)
 */
export function getTopSignals(signals: ActiveSignal[], n: number = 3): ActiveSignal[] {
  return signals.slice(0, n);
}

/**
 * Group signals by category
 */
export function groupSignalsByCategory(signals: ActiveSignal[]): Record<string, ActiveSignal[]> {
  const categories: Record<string, SignalType[]> = {
    'Evidence Issues': ['EVIDENCE_MISSING', 'EVIDENCE_STALE'],
    'Gate Failures': ['GATE_FAILED', 'GATE_INFO_NEEDED'],
    'Financial Gaps': ['SPREAD_SHORTFALL', 'PAYOFF_SHORTFALL'],
    'Timeline Alerts': ['URGENCY_AUCTION', 'URGENCY_DTM'],
    'Property Risks': ['OCCUPANCY_RISK', 'STRUCTURAL_FLAG', 'FLOOD_RISK'],
    'Review Required': ['BORDERLINE_DEAL'],
  };

  const grouped: Record<string, ActiveSignal[]> = {};
  for (const [category, types] of Object.entries(categories)) {
    const categorySignals = signals.filter(s => (types as string[]).includes(s.type));
    if (categorySignals.length > 0) {
      grouped[category] = categorySignals;
    }
  }
  return grouped;
}
