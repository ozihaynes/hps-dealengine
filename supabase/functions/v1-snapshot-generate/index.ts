/**
 * v1-snapshot-generate
 *
 * Generates or regenerates a dashboard snapshot for a deal.
 *
 * POST /functions/v1/v1-snapshot-generate
 *
 * Request: { deal_id: UUID, run_id?: UUID, force_regenerate?: boolean }
 * Response: { ok: true, snapshot: DashboardSnapshot, ... }
 *
 * Authentication: JWT required
 * RLS: Caller must have access to the deal via org membership
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

// ============================================================================
// CORS & RESPONSE HELPERS
// ============================================================================

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(code: string, message: string, status = 400): Response {
  return jsonResponse({ ok: false, error: { code, message } }, status);
}

// ============================================================================
// TYPES
// ============================================================================

interface SnapshotRequest {
  deal_id: string;
  run_id?: string;
  force_regenerate?: boolean;
}

interface DealRecord {
  id: string;
  org_id: string;
  occupancy_status?: string | null;
  structural_risk_flag?: boolean | null;
  flood_zone?: string | null;
  seller_motivation?: string | null;
  is_foreclosure?: boolean | null;
  is_pre_foreclosure?: boolean | null;
  payoff_delinquent?: boolean | null;
}

interface RunRecord {
  id: string;
  deal_id: string;
  org_id: string;
  posture: string;
  output: { outputs: Record<string, unknown> } | null;
  policy_snapshot: Record<string, unknown> | null;
  created_at: string;
}

// ============================================================================
// POLICY DEFAULTS
// ============================================================================

const POLICY_DEFAULTS = {
  closeability_advance_threshold: 85,
  closeability_caution_threshold: 70,
  closeability_hold_threshold: 50,
  payoff_safety_threshold_pct: 10,
  payoff_warning_threshold_pct: 5,
  risk_penalty_structural_pct: 0.15,
  risk_penalty_flood_pct: 0.10,
  risk_penalty_tenant_pct: 0.08,
  risk_penalty_title_pct: 0.12,
  risk_penalty_insurance_pct: 0.10,
  risk_penalty_max_total_pct: 0.50,
  urgency_emergency_threshold: 85,
  urgency_critical_threshold: 70,
  urgency_active_threshold: 50,
  confidence_multiplier_a: 1.00,
  confidence_multiplier_b: 0.90,
  confidence_multiplier_c: 0.75,
  verdict_min_spread: 10000,
  evidence_freshness_limit_days: 30,
  buyer_demand_hot_threshold: 80,
  buyer_demand_warm_threshold: 60,
  buyer_demand_cool_threshold: 40,
};

// ============================================================================
// L2 COMPUTATION FUNCTIONS (Inlined for Edge Function)
// ============================================================================

function computeCloseabilityIndex(outputs: Record<string, unknown>, deal: DealRecord) {
  const evidenceSummary = outputs?.evidence_summary as Record<string, unknown> | undefined;
  const grade = (evidenceSummary?.confidence_grade ?? outputs?.confidence_grade ?? 'C') as string;
  const gradeScore = grade === 'A' ? 100 : grade === 'B' ? 70 : 30;
  const hasBlocking = evidenceSummary?.any_blocking_for_ready === true;
  const evidenceScore = Math.max(0, gradeScore - (hasBlocking ? 30 : 0));

  const cushion = (outputs?.cushion_vs_payoff as number) ?? 0;
  const primaryOffer = (outputs?.primary_offer as number) ?? 1;
  const bufferPct = primaryOffer > 0 ? (cushion / primaryOffer) * 100 : 0;
  let payoffScore = 0, payoffStatus = 'shortfall';
  if (bufferPct >= POLICY_DEFAULTS.payoff_safety_threshold_pct) { payoffScore = 100; payoffStatus = 'safe'; }
  else if (bufferPct >= POLICY_DEFAULTS.payoff_warning_threshold_pct) { payoffScore = 70; payoffStatus = 'warning'; }
  else if (bufferPct > 0) { payoffScore = 40; payoffStatus = 'warning'; }

  const perGate = (outputs?.risk_summary as Record<string, unknown>)?.per_gate as Record<string, { status?: string; enabled?: boolean }> ?? {};
  let gateTotal = 0, gateCount = 0;
  for (const gate of Object.values(perGate)) {
    if (gate?.enabled === false) continue;
    gateCount++;
    const status = gate?.status ?? 'info_needed';
    gateTotal += status === 'pass' ? 100 : status === 'watch' ? 60 : status === 'info_needed' ? 30 : 0;
  }
  const gateScore = gateCount > 0 ? Math.round(gateTotal / gateCount) : 50;

  const unknowns: string[] = [];
  if (!deal?.occupancy_status || deal.occupancy_status === 'unknown') unknowns.push('occupancy');
  if (deal?.structural_risk_flag == null) unknowns.push('structural');
  if (!deal?.flood_zone || deal.flood_zone === 'unknown') unknowns.push('flood_zone');
  const unknownsScore = Math.max(0, 100 - (unknowns.length * 20));

  const finalScore = Math.round((evidenceScore * 0.30) + (payoffScore * 0.25) + (gateScore * 0.25) + (unknownsScore * 0.20));

  return {
    finalScore: Math.max(0, Math.min(100, finalScore)),
    evidenceGrade: grade as 'A' | 'B' | 'C',
    payoffBufferPct: bufferPct,
    payoffStatus,
    gateScore,
    unknowns,
  };
}

function computeUrgencyScore(outputs: Record<string, unknown>, deal: DealRecord) {
  const timeline = outputs?.timeline_summary as Record<string, unknown> | undefined;
  const urgency = (timeline?.urgency ?? 'normal') as string;
  const hasAuction = timeline?.auction_date_iso != null;
  let dtmScore = urgency === 'critical' ? 100 : urgency === 'elevated' ? 75 : 40;
  if (hasAuction) dtmScore = Math.min(100, dtmScore + 15);

  const tempScore = (outputs?.market_temp_score as number) ?? 50;
  const speedBand = (timeline?.speed_band ?? 'balanced') as string;
  const speedBoost = speedBand === 'fast' ? 20 : speedBand === 'slow' ? -10 : 0;
  const marketScore = Math.max(0, Math.min(100, tempScore + speedBoost));

  let sellerScore = 50;
  if (deal?.seller_motivation === 'distressed') sellerScore += 30;
  else if (deal?.seller_motivation === 'relocating') sellerScore += 20;
  if (deal?.is_foreclosure) sellerScore += 25;
  else if (deal?.is_pre_foreclosure) sellerScore += 20;
  sellerScore = Math.min(100, sellerScore);

  const occupancy = deal?.occupancy_status ?? 'unknown';
  const occupancyMap: Record<string, number> = { 'owner_occupied': 40, 'vacant': 30, 'tenant_occupied': 70, 'squatter': 90, 'unknown': 50 };
  const occupancyScore = occupancyMap[occupancy] ?? 50;

  const finalScore = Math.round((dtmScore * 0.40) + (marketScore * 0.25) + (sellerScore * 0.20) + (occupancyScore * 0.15));

  let band: 'emergency' | 'critical' | 'active' | 'steady' = 'steady';
  if (finalScore >= POLICY_DEFAULTS.urgency_emergency_threshold) band = 'emergency';
  else if (finalScore >= POLICY_DEFAULTS.urgency_critical_threshold) band = 'critical';
  else if (finalScore >= POLICY_DEFAULTS.urgency_active_threshold) band = 'active';

  return { finalScore: Math.max(0, Math.min(100, finalScore)), band };
}

function computeRiskAdjustedSpread(outputs: Record<string, unknown>, deal: DealRecord) {
  const baseSpread = (outputs?.spread_cash as number) ?? 0;
  if (baseSpread <= 0) return { value: 0, penalties: [], confidenceGrade: 'C' as const, confidenceMultiplier: POLICY_DEFAULTS.confidence_multiplier_c };

  const penalties: Array<{ type: string; pct: number; reason: string }> = [];
  let totalPenalty = 0;

  if (deal?.structural_risk_flag) {
    penalties.push({ type: 'structural', pct: POLICY_DEFAULTS.risk_penalty_structural_pct, reason: 'Structural concerns' });
    totalPenalty += POLICY_DEFAULTS.risk_penalty_structural_pct;
  }
  const highRiskFlood = ['AE', 'VE', 'A', 'V'];
  if (deal?.flood_zone && highRiskFlood.includes(deal.flood_zone)) {
    penalties.push({ type: 'flood', pct: POLICY_DEFAULTS.risk_penalty_flood_pct, reason: `Flood zone ${deal.flood_zone}` });
    totalPenalty += POLICY_DEFAULTS.risk_penalty_flood_pct;
  }
  if (deal?.occupancy_status === 'tenant_occupied') {
    penalties.push({ type: 'tenant', pct: POLICY_DEFAULTS.risk_penalty_tenant_pct, reason: 'Tenant occupied' });
    totalPenalty += POLICY_DEFAULTS.risk_penalty_tenant_pct;
  }

  totalPenalty = Math.min(POLICY_DEFAULTS.risk_penalty_max_total_pct, totalPenalty);
  const grade = (outputs?.confidence_grade ?? 'C') as string;
  const confMult = grade === 'A' ? POLICY_DEFAULTS.confidence_multiplier_a : grade === 'B' ? POLICY_DEFAULTS.confidence_multiplier_b : POLICY_DEFAULTS.confidence_multiplier_c;

  return { value: Math.round(baseSpread * (1 - totalPenalty) * confMult), penalties, confidenceGrade: grade as 'A' | 'B' | 'C', confidenceMultiplier: confMult };
}

function computeBuyerDemandIndex(outputs: Record<string, unknown>) {
  const timeline = outputs?.timeline_summary as Record<string, unknown> | undefined;
  const tempScore = (outputs?.market_temp_score as number) ?? 50;
  const speedBand = (timeline?.speed_band ?? 'balanced') as string;
  const speedBoost = speedBand === 'fast' ? 15 : speedBand === 'slow' ? -15 : 0;
  const marketScore = Math.max(0, Math.min(100, tempScore + speedBoost));

  const spread = (outputs?.spread_cash as number) ?? 0;
  const minRequired = (outputs?.min_spread_required as number) ?? POLICY_DEFAULTS.verdict_min_spread;
  let headroomScore = 0;
  if (spread > 0 && minRequired > 0) {
    const ratio = spread / minRequired;
    headroomScore = ratio >= 2 ? 100 : ratio >= 1.5 ? 85 : ratio >= 1.2 ? 70 : ratio >= 1 ? 50 : Math.round(ratio * 50);
  }

  const grade = ((outputs?.evidence_summary as Record<string, unknown>)?.confidence_grade ?? outputs?.confidence_grade ?? 'C') as string;
  const evidenceScore = grade === 'A' ? 100 : grade === 'B' ? 70 : 40;

  const finalScore = Math.round((marketScore * 0.40) + (headroomScore * 0.35) + (evidenceScore * 0.25));

  let band: 'hot' | 'warm' | 'cool' | 'cold' = 'cold';
  if (finalScore >= POLICY_DEFAULTS.buyer_demand_hot_threshold) band = 'hot';
  else if (finalScore >= POLICY_DEFAULTS.buyer_demand_warm_threshold) band = 'warm';
  else if (finalScore >= POLICY_DEFAULTS.buyer_demand_cool_threshold) band = 'cool';

  return { finalScore: Math.max(0, Math.min(100, finalScore)), band };
}

function deriveVerdict(closeability: number, spread: number, workflowState: string | null): { verdict: 'GO' | 'PROCEED_WITH_CAUTION' | 'HOLD' | 'PASS'; reasons: string[] } {
  const reasons: string[] = [];
  if (workflowState === 'Blocked') return { verdict: 'PASS', reasons: ['Workflow state is Blocked'] };
  if (spread <= 0) return { verdict: 'PASS', reasons: ['Risk-adjusted spread is zero or negative'] };
  if (spread < POLICY_DEFAULTS.verdict_min_spread) {
    reasons.push(`Spread $${spread.toLocaleString()} below minimum $${POLICY_DEFAULTS.verdict_min_spread.toLocaleString()}`);
    return { verdict: 'HOLD', reasons };
  }
  if (closeability >= POLICY_DEFAULTS.closeability_advance_threshold) {
    reasons.push(`Closeability ${closeability} ≥ ${POLICY_DEFAULTS.closeability_advance_threshold}`);
    return { verdict: 'GO', reasons };
  }
  if (closeability >= POLICY_DEFAULTS.closeability_caution_threshold) {
    reasons.push(`Closeability ${closeability} in caution range`);
    return { verdict: 'PROCEED_WITH_CAUTION', reasons };
  }
  if (closeability >= POLICY_DEFAULTS.closeability_hold_threshold) {
    reasons.push(`Closeability ${closeability} in hold range`);
    return { verdict: 'HOLD', reasons };
  }
  reasons.push(`Closeability ${closeability} below hold threshold`);
  return { verdict: 'PASS', reasons };
}

// ============================================================================
// SIGNAL GENERATION (Simplified)
// ============================================================================

function generateSignals(outputs: Record<string, unknown>, deal: DealRecord, timestamp: string): unknown[] {
  const signals: unknown[] = [];
  const dealId = deal.id;
  let idx = 0;

  // Evidence missing
  const evidenceSummary = outputs?.evidence_summary as Record<string, unknown> | undefined;
  const missingKinds = (evidenceSummary?.missing_required_kinds ?? []) as string[];
  if (missingKinds.length > 0) {
    signals.push({
      id: `sig_evidence_missing_${dealId.slice(0, 8)}_${idx++}`,
      type: 'EVIDENCE_MISSING', severity: 'critical',
      title: `Missing ${missingKinds.length} required evidence`,
      description: `Upload: ${missingKinds.slice(0, 3).join(', ')}`,
      cta: { label: 'Upload', action: 'open_drawer', target: 'evidence_upload' },
      expected_impact: { metric: 'closeability', delta: '+15 pts' },
      proof_ref: null,
      resolution_actions: missingKinds.map(k => ({ id: `upload_${k}`, label: `Upload ${k}`, type: 'upload', endpoint: '/api/evidence/upload', payload_template: { kind: k } })),
      created_at: timestamp,
    });
  }

  // Gate failures
  const perGate = (outputs?.risk_summary as Record<string, unknown>)?.per_gate as Record<string, { status?: string; reasons?: string[] }> ?? {};
  for (const [key, gate] of Object.entries(perGate)) {
    if (gate?.status === 'fail') {
      signals.push({
        id: `sig_gate_fail_${dealId.slice(0, 8)}_${idx++}`,
        type: 'GATE_FAILED', severity: 'critical',
        title: `${key} gate failed`,
        description: gate.reasons?.[0] ?? 'Gate requires resolution',
        cta: { label: 'Review', action: 'open_drawer', target: `gate_${key}` },
        expected_impact: { metric: 'verdict', delta: '→ HOLD' },
        proof_ref: `trace://RISK_GATES.${key}`,
        resolution_actions: [{ id: `resolve_${key}`, label: 'Resolve', type: 'upload', endpoint: '/api/gates/resolve', payload_template: { gate: key } }],
        created_at: timestamp,
      });
    }
  }

  // Occupancy risk
  if (deal?.occupancy_status === 'tenant_occupied' || deal?.occupancy_status === 'squatter') {
    const isSquatter = deal.occupancy_status === 'squatter';
    signals.push({
      id: `sig_occupancy_${dealId.slice(0, 8)}_${idx++}`,
      type: 'OCCUPANCY_RISK', severity: isSquatter ? 'critical' : 'warning',
      title: isSquatter ? 'Property has squatter' : 'Tenant-occupied',
      description: isSquatter ? 'Squatter requires eviction' : 'Tenant adds timeline risk',
      cta: { label: 'Review', action: 'open_drawer', target: 'occupancy_review' },
      expected_impact: { metric: 'spread', delta: isSquatter ? '-15%' : '-8%' },
      proof_ref: null,
      resolution_actions: [{ id: 'verify_occupancy', label: 'Verify', type: 'upload', endpoint: '/api/deals/update-occupancy', payload_template: { deal_id: dealId } }],
      created_at: timestamp,
    });
  }

  // Sort by severity
  const severityOrder: Record<string, number> = { critical: 0, warning: 1, info: 2 };
  signals.sort((a: unknown, b: unknown) => (severityOrder[(a as { severity: string }).severity] ?? 2) - (severityOrder[(b as { severity: string }).severity] ?? 2));

  return signals;
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return errorResponse("METHOD_NOT_ALLOWED", "Only POST requests accepted", 405);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return errorResponse("UNAUTHORIZED", "Missing or invalid authorization", 401);
    }
    const token = authHeader.replace("Bearer ", "");

    let body: SnapshotRequest;
    try {
      body = await req.json();
    } catch {
      return errorResponse("INVALID_PAYLOAD", "Invalid JSON body");
    }

    if (!body.deal_id || typeof body.deal_id !== "string") {
      return errorResponse("INVALID_PAYLOAD", "deal_id is required");
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(body.deal_id)) {
      return errorResponse("INVALID_PAYLOAD", "deal_id must be a valid UUID");
    }

    // Create Supabase client with user's JWT (RLS enforced)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    // Load deal (RLS enforces org access)
    const { data: deal, error: dealError } = await supabase
      .from("deals")
      .select("id, org_id, occupancy_status, structural_risk_flag, flood_zone, seller_motivation, is_foreclosure, is_pre_foreclosure, payoff_delinquent")
      .eq("id", body.deal_id)
      .single();

    if (dealError || !deal) {
      console.error("Deal load error:", dealError);
      return errorResponse("DEAL_NOT_FOUND", "Deal not found or access denied", 404);
    }

    // Load run (latest or specified)
    let runQuery = supabase
      .from("runs")
      .select("id, deal_id, org_id, posture, output, policy_snapshot, created_at")
      .eq("deal_id", body.deal_id)
      .order("created_at", { ascending: false });

    if (body.run_id) {
      runQuery = runQuery.eq("id", body.run_id);
    }

    const { data: runs, error: runError } = await runQuery.limit(1);

    if (runError || !runs?.length) {
      console.error("Run load error:", runError);
      return errorResponse("RUN_NOT_FOUND", "No analysis run found", 404);
    }

    const run = runs[0] as RunRecord;
    const outputs = (run.output?.outputs ?? {}) as Record<string, unknown>;

    // Compute L2 scores
    const now = new Date();
    const timestamp = now.toISOString();

    const closeabilityResult = computeCloseabilityIndex(outputs, deal as DealRecord);
    const urgencyResult = computeUrgencyScore(outputs, deal as DealRecord);
    const spreadResult = computeRiskAdjustedSpread(outputs, deal as DealRecord);
    const demandResult = computeBuyerDemandIndex(outputs);
    const verdictResult = deriveVerdict(closeabilityResult.finalScore, spreadResult.value, outputs?.workflow_state as string | null);

    // Generate signals
    const signals = generateSignals(outputs, deal as DealRecord, timestamp);
    const signalCounts = {
      critical: signals.filter((s: unknown) => (s as { severity: string }).severity === 'critical').length,
      warning: signals.filter((s: unknown) => (s as { severity: string }).severity === 'warning').length,
      info: signals.filter((s: unknown) => (s as { severity: string }).severity === 'info').length,
    };

    // Build snapshot
    const snapshot = {
      org_id: deal.org_id,
      deal_id: deal.id,
      run_id: run.id,
      closeability_index: closeabilityResult.finalScore,
      urgency_score: urgencyResult.finalScore,
      risk_adjusted_spread: spreadResult.value,
      buyer_demand_index: demandResult.finalScore,
      evidence_grade: closeabilityResult.evidenceGrade,
      payoff_buffer_pct: closeabilityResult.payoffBufferPct,
      gate_health_score: closeabilityResult.gateScore,
      verdict: verdictResult.verdict,
      verdict_reasons: verdictResult.reasons,
      urgency_band: urgencyResult.band,
      market_temp_band: demandResult.band,
      buyer_demand_band: demandResult.band,
      payoff_buffer_band: closeabilityResult.payoffStatus,
      gate_health_band: closeabilityResult.gateScore >= 80 ? 'healthy' : closeabilityResult.gateScore >= 50 ? 'caution' : 'blocked',
      active_signals: signals,
      signals_critical_count: signalCounts.critical,
      signals_warning_count: signalCounts.warning,
      signals_info_count: signalCounts.info,
      computation_trace: { closeability: closeabilityResult, urgency: urgencyResult, spread: spreadResult, demand: demandResult, verdict: verdictResult },
      as_of: timestamp,
    };

    // Upsert to database
    const { data: savedSnapshot, error: upsertError } = await supabase
      .from("dashboard_snapshots")
      .upsert(snapshot, { onConflict: "deal_id,run_id" })
      .select()
      .single();

    if (upsertError) {
      console.error("Upsert error:", upsertError);
      return errorResponse("DATABASE_ERROR", "Failed to save snapshot", 500);
    }

    return jsonResponse({
      ok: true,
      snapshot: savedSnapshot,
      generated_at: timestamp,
      run_id: run.id,
      was_regenerated: body.force_regenerate === true,
    });

  } catch (error) {
    console.error("Unexpected error:", error);
    return errorResponse("COMPUTATION_ERROR", "An unexpected error occurred", 500);
  }
});
