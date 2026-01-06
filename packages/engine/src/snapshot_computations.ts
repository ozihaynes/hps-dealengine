/**
 * Command Center V2.1 - L2 Score Computation Engine
 *
 * ALL FUNCTIONS ARE PURE AND DETERMINISTIC.
 * Invariant: Same inputs → Identical outputs
 *
 * @module snapshot_computations
 * @version 1.0.0
 */

import type {
  Verdict,
  UrgencyBand,
  BuyerDemandBand,
  PayoffBufferBand,
  GateHealthBand,
  EvidenceGrade,
} from "@hps-internal/contracts";

import {
  SNAPSHOT_POLICY_DEFAULTS,
  mergeWithDefaults,
  type SnapshotPolicyDefaults,
} from "./snapshot_policy_defaults";

// ============================================================================
// INPUT TYPES (from L1 engine outputs)
// ============================================================================

interface AnalyzeOutputs {
  arv?: number | null;
  aiv?: number | null;
  primary_offer?: number | null;
  spread_cash?: number | null;
  min_spread_required?: number | null;
  cushion_vs_payoff?: number | null;
  shortfall_vs_payoff?: number | null;
  market_temp_score?: number | null;
  workflow_state?: 'NeedsInfo' | 'NeedsReview' | 'ReadyForOffer' | 'Blocked' | null;
  confidence_grade?: 'A' | 'B' | 'C' | null;
  borderline_flag?: boolean | null;
  timeline_summary?: TimelineSummary | null;
  risk_summary?: RiskSummary | null;
  evidence_summary?: EvidenceSummary | null;
}

interface TimelineSummary {
  dom_zip_days?: number | null;
  moi_zip_months?: number | null;
  days_to_money?: number | null;
  dtm_selected_days?: number | null;
  speed_band?: 'fast' | 'balanced' | 'slow' | null;
  urgency?: 'normal' | 'elevated' | 'critical' | null;
  auction_date_iso?: string | null;
  carry_months?: number | null;
}

interface RiskSummary {
  overall?: 'pass' | 'watch' | 'fail' | 'info_needed' | null;
  per_gate?: Record<string, GateInfo> | null;
  reasons?: string[] | null;
}

interface GateInfo {
  status?: 'pass' | 'watch' | 'fail' | 'info_needed' | null;
  enabled?: boolean;
  reasons?: string[];
}

interface EvidenceSummary {
  confidence_grade?: 'A' | 'B' | 'C' | null;
  confidence_reasons?: string[] | null;
  any_blocking_for_ready?: boolean | null;
  missing_required_kinds?: string[] | null;
  freshness_by_kind?: Record<string, { status?: string; age_days?: number }> | null;
}

interface DealRecord {
  id: string;
  occupancy_status?: 'owner_occupied' | 'vacant' | 'tenant_occupied' | 'squatter' | 'unknown' | null;
  structural_risk_flag?: boolean | null;
  flood_zone?: string | null;
  seller_motivation?: 'distressed' | 'relocating' | 'inherited' | 'unknown' | null;
  is_foreclosure?: boolean | null;
  is_pre_foreclosure?: boolean | null;
  payoff_delinquent?: boolean | null;
}

// ============================================================================
// CLOSEABILITY INDEX (0-100)
// Formula: evidence(30%) + payoff(25%) + gates(25%) + unknowns(20%)
// ============================================================================

export interface CloseabilityResult {
  finalScore: number;
  components: {
    evidence: { score: number; grade: EvidenceGrade; hasBlocking: boolean };
    payoff: { score: number; bufferPct: number; status: PayoffBufferBand };
    gates: { score: number; evaluated: number; passing: number; worstGate: string | null };
    unknowns: { score: number; list: string[] };
  };
}

export function computeCloseabilityIndex(
  outputs: AnalyzeOutputs,
  deal: DealRecord,
  policy: SnapshotPolicyDefaults = SNAPSHOT_POLICY_DEFAULTS
): CloseabilityResult {
  // Evidence (30%)
  const evidenceSummary = outputs?.evidence_summary;
  const grade = (evidenceSummary?.confidence_grade ?? outputs?.confidence_grade ?? 'C') as EvidenceGrade;
  const gradeMap: Record<EvidenceGrade, number> = { 'A': 100, 'B': 70, 'C': 30 };
  const baseEvidence = gradeMap[grade] ?? 30;
  const hasBlocking = evidenceSummary?.any_blocking_for_ready === true;
  const evidenceScore = Math.max(0, baseEvidence - (hasBlocking ? 30 : 0));

  // Payoff (25%)
  const cushion = outputs?.cushion_vs_payoff ?? 0;
  const primaryOffer = outputs?.primary_offer ?? 1;
  const bufferPct = primaryOffer > 0 ? (cushion / primaryOffer) * 100 : 0;
  let payoffScore: number;
  let payoffStatus: PayoffBufferBand;
  if (bufferPct >= policy.payoff_safety_threshold_pct) {
    payoffScore = 100; payoffStatus = 'safe';
  } else if (bufferPct >= policy.payoff_warning_threshold_pct) {
    payoffScore = 70; payoffStatus = 'warning';
  } else if (bufferPct > 0) {
    payoffScore = 40; payoffStatus = 'warning';
  } else {
    payoffScore = 0; payoffStatus = 'shortfall';
  }

  // Gates (25%)
  const perGate = outputs?.risk_summary?.per_gate ?? {};
  const gateKeys = Object.keys(perGate);
  let gateTotal = 0, gatesEvaluated = 0, gatesPassing = 0;
  let worstScore = 100, worstGate: string | null = null;
  const statusScore: Record<string, number> = { 'pass': 100, 'watch': 60, 'info_needed': 30, 'fail': 0 };

  for (const key of gateKeys) {
    const gate = perGate[key];
    if (gate?.enabled === false) continue;
    gatesEvaluated++;
    const status = gate?.status ?? 'info_needed';
    const score = statusScore[status] ?? 30;
    gateTotal += score;
    if (status === 'pass') gatesPassing++;
    if (score < worstScore) { worstScore = score; worstGate = key; }
  }
  const gateScore = gatesEvaluated > 0 ? Math.round(gateTotal / gatesEvaluated) : 50;

  // Unknowns (20%)
  const unknowns: string[] = [];
  if (!deal?.occupancy_status || deal.occupancy_status === 'unknown') unknowns.push('occupancy');
  if (deal?.structural_risk_flag == null) unknowns.push('structural');
  if (!deal?.flood_zone || deal.flood_zone === 'unknown') unknowns.push('flood_zone');
  if (perGate?.title?.status === 'info_needed') unknowns.push('title');
  if (perGate?.insurability?.status === 'info_needed') unknowns.push('insurance');
  const unknownsScore = Math.max(0, 100 - (unknowns.length * 20));

  // Weighted sum
  const rawScore = (evidenceScore * 0.30) + (payoffScore * 0.25) + (gateScore * 0.25) + (unknownsScore * 0.20);
  const finalScore = Math.round(Math.max(0, Math.min(100, rawScore)));

  return {
    finalScore,
    components: {
      evidence: { score: evidenceScore, grade, hasBlocking },
      payoff: { score: payoffScore, bufferPct, status: payoffStatus },
      gates: { score: gateScore, evaluated: gatesEvaluated, passing: gatesPassing, worstGate },
      unknowns: { score: unknownsScore, list: unknowns },
    },
  };
}

// ============================================================================
// URGENCY SCORE (0-100)
// Formula: dtm(40%) + market(25%) + seller(20%) + occupancy(15%)
// ============================================================================

export interface UrgencyResult {
  finalScore: number;
  band: UrgencyBand;
  components: {
    dtm: { score: number; days: number; urgencyLevel: string; hasAuction: boolean };
    market: { score: number; tempScore: number; speedBand: string };
    seller: { score: number; motivation: string | null; isForeclosure: boolean };
    occupancy: { score: number; status: string };
  };
}

export function computeUrgencyScore(
  outputs: AnalyzeOutputs,
  deal: DealRecord,
  policy: SnapshotPolicyDefaults = SNAPSHOT_POLICY_DEFAULTS
): UrgencyResult {
  const timeline = outputs?.timeline_summary;

  // DTM (40%)
  const dtmDays = timeline?.dtm_selected_days ?? timeline?.days_to_money ?? 90;
  const urgencyLevel = timeline?.urgency ?? 'normal';
  const hasAuction = timeline?.auction_date_iso != null;
  const urgencyMap: Record<string, number> = { 'critical': 100, 'elevated': 75, 'normal': 40 };
  let dtmScore = urgencyMap[urgencyLevel] ?? 40;
  if (hasAuction) dtmScore = Math.min(100, dtmScore + 15);

  // Market (25%)
  const tempScore = outputs?.market_temp_score ?? 50;
  const speedBand = timeline?.speed_band ?? 'balanced';
  const speedBoost: Record<string, number> = { 'fast': 20, 'balanced': 0, 'slow': -10 };
  const marketScore = Math.max(0, Math.min(100, tempScore + (speedBoost[speedBand] ?? 0)));

  // Seller (20%)
  let sellerScore = 50;
  const motivation = deal?.seller_motivation ?? null;
  if (motivation === 'distressed') sellerScore += 30;
  else if (motivation === 'relocating') sellerScore += 20;
  else if (motivation === 'inherited') sellerScore += 15;
  const isForeclosure = deal?.is_foreclosure === true || deal?.is_pre_foreclosure === true;
  if (deal?.is_foreclosure) sellerScore += 25;
  else if (deal?.is_pre_foreclosure) sellerScore += 20;
  if (deal?.payoff_delinquent) sellerScore += 15;
  sellerScore = Math.min(100, sellerScore);

  // Occupancy (15%)
  const occupancy = deal?.occupancy_status ?? 'unknown';
  const occupancyMap: Record<string, number> = {
    'owner_occupied': 40, 'vacant': 30, 'tenant_occupied': 70, 'squatter': 90, 'unknown': 50
  };
  const occupancyScore = occupancyMap[occupancy] ?? 50;

  // Weighted sum
  const rawScore = (dtmScore * 0.40) + (marketScore * 0.25) + (sellerScore * 0.20) + (occupancyScore * 0.15);
  const finalScore = Math.round(Math.max(0, Math.min(100, rawScore)));

  // Derive band
  let band: UrgencyBand = 'steady';
  if (finalScore >= policy.urgency_emergency_threshold) band = 'emergency';
  else if (finalScore >= policy.urgency_critical_threshold) band = 'critical';
  else if (finalScore >= policy.urgency_active_threshold) band = 'active';

  return {
    finalScore,
    band,
    components: {
      dtm: { score: dtmScore, days: dtmDays, urgencyLevel, hasAuction },
      market: { score: marketScore, tempScore, speedBand },
      seller: { score: sellerScore, motivation, isForeclosure },
      occupancy: { score: occupancyScore, status: occupancy },
    },
  };
}

// ============================================================================
// RISK-ADJUSTED SPREAD (USD)
// Formula: base_spread × (1 - penalties) × confidence_multiplier
// ============================================================================

export interface RiskAdjustedSpreadResult {
  value: number;
  baseSpread: number;
  penalties: Array<{ type: string; pct: number; dollars: number; reason: string }>;
  totalPenaltyPct: number;
  confidenceGrade: EvidenceGrade;
  confidenceMultiplier: number;
}

export function computeRiskAdjustedSpread(
  outputs: AnalyzeOutputs,
  deal: DealRecord,
  policy: SnapshotPolicyDefaults = SNAPSHOT_POLICY_DEFAULTS
): RiskAdjustedSpreadResult {
  const baseSpread = outputs?.spread_cash ?? 0;

  if (baseSpread <= 0) {
    return {
      value: 0, baseSpread: 0, penalties: [], totalPenaltyPct: 0,
      confidenceGrade: 'C', confidenceMultiplier: policy.confidence_multiplier_c,
    };
  }

  const penalties: RiskAdjustedSpreadResult['penalties'] = [];
  let totalPenaltyPct = 0;

  // Structural
  if (deal?.structural_risk_flag === true) {
    const pct = policy.risk_penalty_structural_pct;
    penalties.push({ type: 'structural', pct, dollars: Math.round(baseSpread * pct), reason: 'Structural concerns' });
    totalPenaltyPct += pct;
  }

  // Flood
  const highRiskFlood = ['AE', 'VE', 'A', 'V'];
  if (deal?.flood_zone && highRiskFlood.includes(deal.flood_zone)) {
    const pct = policy.risk_penalty_flood_pct;
    penalties.push({ type: 'flood', pct, dollars: Math.round(baseSpread * pct), reason: `Flood zone ${deal.flood_zone}` });
    totalPenaltyPct += pct;
  }

  // Tenant
  if (deal?.occupancy_status === 'tenant_occupied') {
    const pct = policy.risk_penalty_tenant_pct;
    penalties.push({ type: 'tenant', pct, dollars: Math.round(baseSpread * pct), reason: 'Tenant occupied' });
    totalPenaltyPct += pct;
  }

  // Title
  const titleStatus = outputs?.risk_summary?.per_gate?.title?.status;
  if (titleStatus === 'watch' || titleStatus === 'info_needed') {
    const pct = policy.risk_penalty_title_pct;
    penalties.push({ type: 'title', pct, dollars: Math.round(baseSpread * pct), reason: `Title status: ${titleStatus}` });
    totalPenaltyPct += pct;
  }

  // Insurance
  const insuranceStatus = outputs?.risk_summary?.per_gate?.insurability?.status;
  if (insuranceStatus === 'watch' || insuranceStatus === 'fail') {
    const pct = policy.risk_penalty_insurance_pct;
    penalties.push({ type: 'insurance', pct, dollars: Math.round(baseSpread * pct), reason: `Insurance status: ${insuranceStatus}` });
    totalPenaltyPct += pct;
  }

  // Cap total penalty
  totalPenaltyPct = Math.min(policy.risk_penalty_max_total_pct, totalPenaltyPct);

  // Confidence multiplier
  const grade = (outputs?.confidence_grade ?? 'C') as EvidenceGrade;
  const confidenceMultiplier =
    grade === 'A' ? policy.confidence_multiplier_a :
    grade === 'B' ? policy.confidence_multiplier_b :
    policy.confidence_multiplier_c;

  const value = Math.round(baseSpread * (1 - totalPenaltyPct) * confidenceMultiplier);

  return { value, baseSpread, penalties, totalPenaltyPct, confidenceGrade: grade, confidenceMultiplier };
}

// ============================================================================
// BUYER DEMAND INDEX (0-100)
// Formula: market(40%) + headroom(35%) + evidence(25%)
// ============================================================================

export interface BuyerDemandResult {
  finalScore: number;
  band: BuyerDemandBand;
  components: {
    market: { score: number; tempScore: number; speedBand: string };
    headroom: { score: number; spread: number; minRequired: number; ratio: number };
    evidence: { score: number; grade: EvidenceGrade };
  };
}

export function computeBuyerDemandIndex(
  outputs: AnalyzeOutputs,
  policy: SnapshotPolicyDefaults = SNAPSHOT_POLICY_DEFAULTS
): BuyerDemandResult {
  const timeline = outputs?.timeline_summary;

  // Market (40%)
  const tempScore = outputs?.market_temp_score ?? 50;
  const speedBand = timeline?.speed_band ?? 'balanced';
  const speedBoost: Record<string, number> = { 'fast': 15, 'balanced': 0, 'slow': -15 };
  const marketScore = Math.max(0, Math.min(100, tempScore + (speedBoost[speedBand] ?? 0)));

  // Headroom (35%)
  const spread = outputs?.spread_cash ?? 0;
  const minRequired = outputs?.min_spread_required ?? policy.verdict_min_spread;
  let headroomScore = 0;
  let ratio = 0;
  if (spread > 0 && minRequired > 0) {
    ratio = spread / minRequired;
    if (ratio >= 2.0) headroomScore = 100;
    else if (ratio >= 1.5) headroomScore = 85;
    else if (ratio >= 1.2) headroomScore = 70;
    else if (ratio >= 1.0) headroomScore = 50;
    else headroomScore = Math.round(ratio * 50);
  }

  // Evidence (25%)
  const grade = (outputs?.evidence_summary?.confidence_grade ?? outputs?.confidence_grade ?? 'C') as EvidenceGrade;
  const gradeMap: Record<EvidenceGrade, number> = { 'A': 100, 'B': 70, 'C': 40 };
  const evidenceScore = gradeMap[grade] ?? 40;

  // Weighted sum
  const rawScore = (marketScore * 0.40) + (headroomScore * 0.35) + (evidenceScore * 0.25);
  const finalScore = Math.round(Math.max(0, Math.min(100, rawScore)));

  // Derive band
  let band: BuyerDemandBand = 'cold';
  if (finalScore >= policy.buyer_demand_hot_threshold) band = 'hot';
  else if (finalScore >= policy.buyer_demand_warm_threshold) band = 'warm';
  else if (finalScore >= policy.buyer_demand_cool_threshold) band = 'cool';

  return {
    finalScore,
    band,
    components: {
      market: { score: marketScore, tempScore, speedBand },
      headroom: { score: headroomScore, spread, minRequired, ratio },
      evidence: { score: evidenceScore, grade },
    },
  };
}

// ============================================================================
// VERDICT DERIVATION
// ============================================================================

export interface VerdictResult {
  verdict: Verdict;
  reasons: string[];
  decisionPath: string[];
}

export function deriveVerdict(
  closeabilityIndex: number,
  urgencyScore: number,
  riskAdjustedSpread: number,
  workflowState: string | null | undefined,
  policy: SnapshotPolicyDefaults = SNAPSHOT_POLICY_DEFAULTS
): VerdictResult {
  const reasons: string[] = [];
  const decisionPath: string[] = [];

  // Hard stop: Blocked
  if (workflowState === 'Blocked') {
    decisionPath.push('CHECK_WORKFLOW → Blocked');
    return { verdict: 'PASS', reasons: ['Workflow state is Blocked'], decisionPath };
  }
  decisionPath.push('CHECK_WORKFLOW → Not Blocked');

  // Hard stop: Zero spread
  if (riskAdjustedSpread <= 0) {
    decisionPath.push('CHECK_SPREAD → Zero or negative');
    return { verdict: 'PASS', reasons: ['Risk-adjusted spread is zero or negative'], decisionPath };
  }
  decisionPath.push(`CHECK_SPREAD → $${riskAdjustedSpread.toLocaleString()}`);

  // Spread gate
  if (riskAdjustedSpread < policy.verdict_min_spread) {
    decisionPath.push(`SPREAD_GATE → Below minimum ($${policy.verdict_min_spread.toLocaleString()})`);
    reasons.push(`Spread $${riskAdjustedSpread.toLocaleString()} below minimum $${policy.verdict_min_spread.toLocaleString()}`);
    return { verdict: 'HOLD', reasons, decisionPath };
  }
  decisionPath.push('SPREAD_GATE → Passed');

  // Closeability thresholds
  if (closeabilityIndex >= policy.closeability_advance_threshold) {
    decisionPath.push(`CLOSEABILITY → ${closeabilityIndex} ≥ ${policy.closeability_advance_threshold}`);
    reasons.push(`Closeability ${closeabilityIndex} ≥ ${policy.closeability_advance_threshold} (advance threshold)`);
    if (urgencyScore >= 70) reasons.push(`High urgency (${urgencyScore})`);
    return { verdict: 'GO', reasons, decisionPath };
  }

  if (closeabilityIndex >= policy.closeability_caution_threshold) {
    decisionPath.push(`CLOSEABILITY → ${closeabilityIndex} in caution range`);
    reasons.push(`Closeability ${closeabilityIndex} in caution range (${policy.closeability_caution_threshold}-${policy.closeability_advance_threshold})`);
    if (urgencyScore >= 85) reasons.push('High urgency but moderate closeability');
    return { verdict: 'PROCEED_WITH_CAUTION', reasons, decisionPath };
  }

  if (closeabilityIndex >= policy.closeability_hold_threshold) {
    decisionPath.push(`CLOSEABILITY → ${closeabilityIndex} in hold range`);
    reasons.push(`Closeability ${closeabilityIndex} in hold range (${policy.closeability_hold_threshold}-${policy.closeability_caution_threshold})`);
    reasons.push('Resolve blockers before advancing');
    return { verdict: 'HOLD', reasons, decisionPath };
  }

  decisionPath.push(`CLOSEABILITY → ${closeabilityIndex} below hold threshold`);
  reasons.push(`Closeability ${closeabilityIndex} below hold threshold (${policy.closeability_hold_threshold})`);
  return { verdict: 'PASS', reasons, decisionPath };
}

// ============================================================================
// BAND DERIVATION UTILITIES
// ============================================================================

export function deriveGateHealthBand(gateHealthScore: number): GateHealthBand {
  if (gateHealthScore >= 80) return 'healthy';
  if (gateHealthScore >= 50) return 'caution';
  return 'blocked';
}

export function derivePayoffBufferBand(
  bufferPct: number,
  policy: SnapshotPolicyDefaults = SNAPSHOT_POLICY_DEFAULTS
): PayoffBufferBand {
  if (bufferPct >= policy.payoff_safety_threshold_pct) return 'safe';
  if (bufferPct >= policy.payoff_warning_threshold_pct) return 'warning';
  return 'shortfall';
}

// ============================================================================
// FULL SNAPSHOT COMPUTATION (Main Entry Point)
// ============================================================================

export interface ComputeSnapshotResult {
  closeability_index: number;
  urgency_score: number;
  risk_adjusted_spread: number;
  buyer_demand_index: number;
  evidence_grade: EvidenceGrade;
  payoff_buffer_pct: number;
  gate_health_score: number;
  verdict: Verdict;
  verdict_reasons: string[];
  urgency_band: UrgencyBand;
  market_temp_band: BuyerDemandBand;
  buyer_demand_band: BuyerDemandBand;
  payoff_buffer_band: PayoffBufferBand;
  gate_health_band: GateHealthBand;
  computation_trace: Record<string, unknown>;
}

export function computeFullSnapshot(
  outputs: AnalyzeOutputs,
  deal: DealRecord,
  policySnapshot: Record<string, unknown> | null = null
): ComputeSnapshotResult {
  const policy = mergeWithDefaults(policySnapshot);

  const closeabilityResult = computeCloseabilityIndex(outputs, deal, policy);
  const urgencyResult = computeUrgencyScore(outputs, deal, policy);
  const spreadResult = computeRiskAdjustedSpread(outputs, deal, policy);
  const demandResult = computeBuyerDemandIndex(outputs, policy);

  const verdictResult = deriveVerdict(
    closeabilityResult.finalScore,
    urgencyResult.finalScore,
    spreadResult.value,
    outputs?.workflow_state,
    policy
  );

  const evidenceGrade = closeabilityResult.components.evidence.grade;
  const payoffBufferPct = closeabilityResult.components.payoff.bufferPct;
  const gateHealthScore = closeabilityResult.components.gates.score;

  return {
    closeability_index: closeabilityResult.finalScore,
    urgency_score: urgencyResult.finalScore,
    risk_adjusted_spread: spreadResult.value,
    buyer_demand_index: demandResult.finalScore,
    evidence_grade: evidenceGrade,
    payoff_buffer_pct: payoffBufferPct,
    gate_health_score: gateHealthScore,
    verdict: verdictResult.verdict,
    verdict_reasons: verdictResult.reasons,
    urgency_band: urgencyResult.band,
    market_temp_band: demandResult.band,
    buyer_demand_band: demandResult.band,
    payoff_buffer_band: closeabilityResult.components.payoff.status,
    gate_health_band: deriveGateHealthBand(gateHealthScore),
    computation_trace: {
      closeability: closeabilityResult,
      urgency: urgencyResult,
      spread: spreadResult,
      demand: demandResult,
      verdict: verdictResult,
      policy_used: policy,
    },
  };
}

// Re-export policy defaults
export { SNAPSHOT_POLICY_DEFAULTS, mergeWithDefaults, type SnapshotPolicyDefaults };
