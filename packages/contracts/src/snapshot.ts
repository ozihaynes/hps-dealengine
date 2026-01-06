/**
 * Command Center V2.1 - Dashboard Snapshot Types
 * @module snapshot
 * @version 1.0.0
 */

import { z } from "zod";

// ============================================================================
// ENUMS
// ============================================================================

export const VerdictSchema = z.enum([
  "GO",
  "PROCEED_WITH_CAUTION",
  "HOLD",
  "PASS"
]);
export type Verdict = z.infer<typeof VerdictSchema>;

export const UrgencyBandSchema = z.enum([
  "emergency",
  "critical",
  "active",
  "steady"
]);
export type UrgencyBand = z.infer<typeof UrgencyBandSchema>;

export const BuyerDemandBandSchema = z.enum(["hot", "warm", "cool", "cold"]);
export type BuyerDemandBand = z.infer<typeof BuyerDemandBandSchema>;

export const MarketTempBandSchema = z.enum(["hot", "warm", "cool", "cold"]);
export type MarketTempBand = z.infer<typeof MarketTempBandSchema>;

export const PayoffBufferBandSchema = z.enum(["safe", "warning", "shortfall"]);
export type PayoffBufferBand = z.infer<typeof PayoffBufferBandSchema>;

export const GateHealthBandSchema = z.enum(["healthy", "caution", "blocked"]);
export type GateHealthBand = z.infer<typeof GateHealthBandSchema>;

export const EvidenceGradeSchema = z.enum(["A", "B", "C"]);
export type EvidenceGrade = z.infer<typeof EvidenceGradeSchema>;

export const SignalSeveritySchema = z.enum(["critical", "warning", "info"]);
export type SignalSeverity = z.infer<typeof SignalSeveritySchema>;

export const SignalTypeSchema = z.enum([
  "EVIDENCE_MISSING",
  "EVIDENCE_STALE",
  "GATE_FAILED",
  "GATE_INFO_NEEDED",
  "SPREAD_SHORTFALL",
  "PAYOFF_SHORTFALL",
  "URGENCY_AUCTION",
  "URGENCY_DTM",
  "OCCUPANCY_RISK",
  "STRUCTURAL_FLAG",
  "FLOOD_RISK",
  "BORDERLINE_DEAL"
]);
export type SignalType = z.infer<typeof SignalTypeSchema>;

// ============================================================================
// SIGNAL SCHEMAS
// ============================================================================

export const SignalCTASchema = z.object({
  label: z.string().max(20),
  action: z.enum(["open_drawer", "navigate", "external"]),
  target: z.string(),
});
export type SignalCTA = z.infer<typeof SignalCTASchema>;

export const ExpectedImpactSchema = z.object({
  metric: z.enum(["closeability", "urgency", "spread", "verdict"]),
  delta: z.string(),
});
export type ExpectedImpact = z.infer<typeof ExpectedImpactSchema>;

export const ResolutionActionSchema = z.object({
  id: z.string(),
  label: z.string(),
  type: z.enum(["upload", "request", "override", "acknowledge"]),
  endpoint: z.string(),
  payload_template: z.record(z.unknown()),
});
export type ResolutionAction = z.infer<typeof ResolutionActionSchema>;

export const ActiveSignalSchema = z.object({
  id: z.string(),
  type: SignalTypeSchema,
  severity: SignalSeveritySchema,
  title: z.string().max(60),
  description: z.string().max(200),
  cta: SignalCTASchema,
  expected_impact: ExpectedImpactSchema,
  proof_ref: z.string().nullable(),
  resolution_actions: z.array(ResolutionActionSchema),
  created_at: z.string().datetime(),
});
export type ActiveSignal = z.infer<typeof ActiveSignalSchema>;

// ============================================================================
// SNAPSHOT SCHEMAS
// ============================================================================

export const DashboardSnapshotSchema = z.object({
  id: z.string().uuid(),
  org_id: z.string().uuid(),
  deal_id: z.string().uuid(),
  run_id: z.string().uuid(),

  closeability_index: z.number().int().min(0).max(100),
  urgency_score: z.number().int().min(0).max(100),
  risk_adjusted_spread: z.number().int(),
  buyer_demand_index: z.number().int().min(0).max(100),

  evidence_grade: EvidenceGradeSchema,
  payoff_buffer_pct: z.number().nullable(),
  gate_health_score: z.number().int().min(0).max(100),

  verdict: VerdictSchema,
  verdict_reasons: z.array(z.string()),

  urgency_band: UrgencyBandSchema,
  market_temp_band: MarketTempBandSchema,
  buyer_demand_band: BuyerDemandBandSchema,
  payoff_buffer_band: PayoffBufferBandSchema,
  gate_health_band: GateHealthBandSchema,

  active_signals: z.array(ActiveSignalSchema),
  signals_critical_count: z.number().int().min(0),
  signals_warning_count: z.number().int().min(0),
  signals_info_count: z.number().int().min(0),

  computation_trace: z.record(z.unknown()),

  as_of: z.string().datetime(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type DashboardSnapshot = z.infer<typeof DashboardSnapshotSchema>;

export const DashboardSnapshotSummarySchema = z.object({
  deal_id: z.string().uuid(),
  deal_address: z.string().optional(),
  closeability_index: z.number().int().min(0).max(100),
  urgency_score: z.number().int().min(0).max(100),
  risk_adjusted_spread: z.number().int(),
  buyer_demand_index: z.number().int().min(0).max(100),
  verdict: VerdictSchema,
  urgency_band: UrgencyBandSchema,
  signals_critical_count: z.number().int().min(0),
  as_of: z.string().datetime(),
});
export type DashboardSnapshotSummary = z.infer<typeof DashboardSnapshotSummarySchema>;

// ============================================================================
// API REQUEST/RESPONSE SCHEMAS
// ============================================================================

export const SnapshotGenerateRequestSchema = z.object({
  deal_id: z.string().uuid(),
  run_id: z.string().uuid().optional(),
  force_regenerate: z.boolean().optional().default(false),
});
export type SnapshotGenerateRequest = z.infer<typeof SnapshotGenerateRequestSchema>;

export const SnapshotGenerateResponseSchema = z.object({
  ok: z.literal(true),
  snapshot: DashboardSnapshotSchema,
  generated_at: z.string().datetime(),
  run_id: z.string().uuid(),
  was_regenerated: z.boolean(),
});
export type SnapshotGenerateResponse = z.infer<typeof SnapshotGenerateResponseSchema>;

export const SnapshotErrorResponseSchema = z.object({
  ok: z.literal(false),
  error: z.object({
    code: z.enum([
      "DEAL_NOT_FOUND",
      "RUN_NOT_FOUND",
      "UNAUTHORIZED",
      "INVALID_PAYLOAD",
      "COMPUTATION_ERROR",
      "DATABASE_ERROR",
      "POLICY_PARSE_ERROR"
    ]),
    message: z.string(),
  }),
});
export type SnapshotErrorResponse = z.infer<typeof SnapshotErrorResponseSchema>;

export const SnapshotGetRequestSchema = z.object({
  deal_id: z.string().uuid(),
  include_trace: z.boolean().optional().default(false),
});
export type SnapshotGetRequest = z.infer<typeof SnapshotGetRequestSchema>;

export const SnapshotGetResponseSchema = z.object({
  ok: z.literal(true),
  snapshot: DashboardSnapshotSchema.nullable(),
  as_of: z.string().datetime().nullable(),
  is_stale: z.boolean(),
  latest_run_id: z.string().uuid().nullable(),
  snapshot_run_id: z.string().uuid().nullable(),
});
export type SnapshotGetResponse = z.infer<typeof SnapshotGetResponseSchema>;

export const SnapshotListRequestSchema = z.object({
  verdict: VerdictSchema.optional(),
  urgency_band: UrgencyBandSchema.optional(),
  limit: z.number().int().min(1).max(100).optional().default(50),
  offset: z.number().int().min(0).optional().default(0),
  sort_by: z.enum([
    "urgency_score",
    "closeability_index",
    "risk_adjusted_spread",
    "as_of"
  ]).optional().default("urgency_score"),
  sort_order: z.enum(["asc", "desc"]).optional().default("desc"),
});
export type SnapshotListRequest = z.infer<typeof SnapshotListRequestSchema>;

export const SnapshotListResponseSchema = z.object({
  ok: z.literal(true),
  snapshots: z.array(DashboardSnapshotSummarySchema),
  total: z.number().int(),
  has_more: z.boolean(),
  aggregates: z.object({
    by_verdict: z.record(z.number().int()),
    by_urgency_band: z.record(z.number().int()),
    critical_signals_total: z.number().int(),
  }),
});
export type SnapshotListResponse = z.infer<typeof SnapshotListResponseSchema>;

// ============================================================================
// POLICY DEFAULTS SCHEMA
// ============================================================================

export const SnapshotPolicyDefaultsSchema = z.object({
  closeability_advance_threshold: z.number().int().default(85),
  closeability_caution_threshold: z.number().int().default(70),
  closeability_hold_threshold: z.number().int().default(50),
  payoff_safety_threshold_pct: z.number().default(10),
  payoff_warning_threshold_pct: z.number().default(5),
  risk_penalty_structural_pct: z.number().default(0.15),
  risk_penalty_flood_pct: z.number().default(0.10),
  risk_penalty_tenant_pct: z.number().default(0.08),
  risk_penalty_title_pct: z.number().default(0.12),
  risk_penalty_insurance_pct: z.number().default(0.10),
  risk_penalty_max_total_pct: z.number().default(0.50),
  urgency_emergency_threshold: z.number().int().default(85),
  urgency_critical_threshold: z.number().int().default(70),
  urgency_active_threshold: z.number().int().default(50),
  confidence_multiplier_a: z.number().default(1.00),
  confidence_multiplier_b: z.number().default(0.90),
  confidence_multiplier_c: z.number().default(0.75),
  verdict_min_spread: z.number().int().default(10000),
  evidence_freshness_limit_days: z.number().int().default(30),
  buyer_demand_hot_threshold: z.number().int().default(80),
  buyer_demand_warm_threshold: z.number().int().default(60),
  buyer_demand_cool_threshold: z.number().int().default(40),
});
export type SnapshotPolicyDefaults = z.infer<typeof SnapshotPolicyDefaultsSchema>;
