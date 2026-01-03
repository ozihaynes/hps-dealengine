/**
 * Enhanced Risk Gates Schema — V2.5 Wholesaler Dashboard
 *
 * 8-gate taxonomy with severity levels and resolution actions.
 * Extends existing risk gate structure.
 *
 * Trace Frame: RISK_GATES_POLICY (enhanced)
 */
import { z } from "zod";
// Import from pure schema module to avoid circular dependency with analyze.ts
import { GateStatusSchema } from "./schemas/gates";

/** Standard 8-gate taxonomy keys */
export const RiskGateKeySchema = z.enum([
  "insurability",
  "title",
  "flood",
  "bankruptcy",
  "liens",
  "condition",
  "market",
  "compliance",
]);

/** Severity classification for risk prioritization */
export const RiskGateSeveritySchema = z.enum([
  "critical", // Deal-killer, cannot proceed
  "major", // Significant risk, requires mitigation
  "minor", // Watch item, proceed with caution
]);

/** Enhanced individual gate assessment */
export const EnhancedRiskGateSchema = z
  .object({
    /** Gate status using existing GateStatusSchema */
    status: GateStatusSchema,

    /** Human-readable reason for status */
    reason: z.string().nullable().optional(),

    /** Severity level for prioritization */
    severity: RiskGateSeveritySchema.nullable().optional(),

    /** Suggested resolution action */
    resolution_action: z.string().nullable().optional(),

    /** Whether this gate blocks deal progression */
    is_blocking: z.boolean().nullable().optional(),

    /** Evidence kind that could resolve this gate */
    resolving_evidence_kind: z.string().nullable().optional(),

    /** Estimated days to resolve */
    estimated_resolution_days: z.number().int().nullable().optional(),
  })
  .strict();

/** Complete enhanced risk summary with 8-gate taxonomy */
export const EnhancedRiskSummarySchema = z
  .object({
    /** Overall risk status */
    overall: GateStatusSchema,

    /** Individual gate assessments keyed by gate name */
    gates: z.record(RiskGateKeySchema, EnhancedRiskGateSchema),

    /** Whether any gate is blocking */
    any_blocking: z.boolean().nullable().optional(),

    /** Count of fail/stop gates */
    fail_count: z.number().int().nullable().optional(),

    /** Count of watch gates */
    watch_count: z.number().int().nullable().optional(),

    /** List of blocking gate keys */
    blocking_gates: z.array(RiskGateKeySchema).nullable().optional(),

    /** List of gates requiring attention (watch or fail) */
    attention_gates: z.array(RiskGateKeySchema).nullable().optional(),

    /** Summary reasons array for display */
    reasons: z.array(z.string()).nullable().optional(),

    /** Highest severity among all gates */
    max_severity: RiskGateSeveritySchema.nullable().optional(),
  })
  .strict();

export type RiskGateKey = z.infer<typeof RiskGateKeySchema>;
export type RiskGateSeverity = z.infer<typeof RiskGateSeveritySchema>;
export type EnhancedRiskGate = z.infer<typeof EnhancedRiskGateSchema>;
export type EnhancedRiskSummary = z.infer<typeof EnhancedRiskSummarySchema>;
