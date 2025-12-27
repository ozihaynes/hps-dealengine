import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

export const RunTraceFrameSchema = z.object({
  key: z.string(),
  label: z.string(),
  details: z.unknown().optional(),
});

export type RunTraceFrame = z.infer<typeof RunTraceFrameSchema>;

export const RunInputEnvelopeSchema = z.object({
  posture: z.string(),
  deal: z.unknown(),
  sandbox: z.unknown(),
  meta: z
    .object({
      engineVersion: z.string().optional(),
      policyVersion: z.string().optional(),
      source: z.string().optional(),
    })
    .default({}),
});

export type RunInputEnvelope = z.infer<typeof RunInputEnvelopeSchema>;

export const RunOutputEnvelopeSchema = z.object({
  trace: z.array(RunTraceFrameSchema),
  meta: z
    .object({
      engineVersion: z.string().optional(),
      policyVersion: z.string().optional(),
      durationMs: z.number().optional(),
    })
    .default({}),
  outputs: z.unknown().optional(),
});

export type RunOutputEnvelope = z.infer<typeof RunOutputEnvelopeSchema>;

export const PolicySnapshotSchema = z.unknown();
export type PolicySnapshot = z.infer<typeof PolicySnapshotSchema>;

export const DealContractStatusSchema = z.enum([
  "under_contract",
  "closed",
  "cancelled",
]);

export type DealContractStatus = z.infer<typeof DealContractStatusSchema>;

export const DealContractUpsertInputSchema = z
  .object({
    deal_id: z.string().uuid(),
    status: DealContractStatusSchema,
    executed_contract_price: z.number().nullable().optional(),
    executed_contract_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable()
      .optional(),
    notes: z.string().nullable().optional(),
  })
  .refine(
    (val) => val.status !== "under_contract" || val.executed_contract_price != null,
    {
      message: "executed_contract_price is required when status is under_contract",
    },
  );

export type DealContractUpsertInput = z.infer<
  typeof DealContractUpsertInputSchema
>;

export const DealContractUpsertResultSchema = z.object({
  deal_contract_id: z.string().uuid(),
});

export type DealContractUpsertResult = z.infer<
  typeof DealContractUpsertResultSchema
>;

const DealAnalystInputSchema = z.object({
  persona: z.literal("dealAnalyst"),
  dealId: z.string().uuid(),
  runId: z.string().uuid(),
  posture: z.string().optional(),
  userPrompt: z.string().min(1),
  tone: z.enum(["neutral", "punchy", "visionary", "direct", "empathetic"]).optional(),
  isStale: z.boolean().optional(),
});

const DealStrategistInputSchema = z.object({
  persona: z.literal("dealStrategist"),
  userPrompt: z.string().min(1),
  posture: z.string().optional(),
  sandboxSettings: z.unknown().optional(),
  route: z.string().optional(),
  tone: z.enum(["neutral", "punchy", "visionary", "direct", "empathetic"]).optional(),
});

const DealNegotiatorInputSchema = z.object({
  persona: z.literal("dealNegotiator"),
  mode: z.enum(["generate_playbook", "chat"]),
  dealId: z.string().uuid(),
  runId: z.string().uuid().optional().nullable(),
  userMessage: z.string().optional(),
  logicRowIds: z.array(z.string()).optional(),
  tone: z.enum(["objective", "empathetic", "assertive"]).optional(),
});

export const AiBridgeInputSchema = z.discriminatedUnion("persona", [
  DealAnalystInputSchema,
  DealStrategistInputSchema,
  DealNegotiatorInputSchema,
]);

export type DealAnalystPayload = z.infer<typeof DealAnalystInputSchema>;
export type DealStrategistPayload = z.infer<typeof DealStrategistInputSchema>;
export type DealNegotiatorPayload = z.infer<typeof DealNegotiatorInputSchema>;
export type AiBridgeInput = DealAnalystPayload | DealStrategistPayload | DealNegotiatorPayload;

export const SaveRunArgsSchema = z.object({
  orgId: z.string().uuid(),
  posture: z.string(),
  deal: z.unknown(),
  sandbox: z.unknown(),
  outputs: z.unknown(),
  trace: z.array(RunTraceFrameSchema),
  meta: z
    .object({
      engineVersion: z.string().optional(),
      policyVersion: z.string().optional(),
      source: z.string().optional(),
      durationMs: z.number().optional(),
    })
    .default({}),
  policySnapshot: z.unknown().optional(),
});

export type SaveRunArgs = z.infer<typeof SaveRunArgsSchema>;

export type RunRowInsert = {
  org_id: string;
  posture: string;
  input: RunInputEnvelope;
  output: RunOutputEnvelope;
  policy_snapshot: PolicySnapshot | null;
  input_hash: string;
  output_hash: string;
  policy_hash: string | null;
};

/**
 * Deterministic canonical JSON: sorts object keys recursively, no extra whitespace.
 */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(obj).sort()) {
      sorted[key] = sortKeys(obj[key]);
    }
    return sorted;
  }
  return value;
}

/**
 * Deterministic string hash (djb2) over canonical JSON.
 * Not cryptographically secure, but good enough for dedupe + change detection.
 */
export function hashJson(value: unknown): string {
  const str = canonicalJson(value);
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  // unsigned 32-bit → hex
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function buildRunEnvelopes(args: SaveRunArgs): {
  inputEnvelope: RunInputEnvelope;
  outputEnvelope: RunOutputEnvelope;
  policySnapshot: PolicySnapshot | null;
} {
  const parsed = SaveRunArgsSchema.parse(args);

  const inputEnvelope = RunInputEnvelopeSchema.parse({
    posture: parsed.posture,
    deal: parsed.deal,
    sandbox: parsed.sandbox,
    meta: {
      engineVersion: parsed.meta.engineVersion,
      policyVersion: parsed.meta.policyVersion,
      source: parsed.meta.source ?? "unknown",
    },
  });

  const outputEnvelope = RunOutputEnvelopeSchema.parse({
    trace: parsed.trace,
    outputs: parsed.outputs,
    meta: {
      engineVersion: parsed.meta.engineVersion,
      policyVersion: parsed.meta.policyVersion,
      durationMs: parsed.meta.durationMs,
    },
  });

  const policySnapshot = (parsed.policySnapshot ?? null) as PolicySnapshot | null;

  return { inputEnvelope, outputEnvelope, policySnapshot };
}

export function buildRunRow(args: SaveRunArgs): RunRowInsert {
  const { inputEnvelope, outputEnvelope, policySnapshot } = buildRunEnvelopes(args);

  const input_hash = hashJson(inputEnvelope);
  const output_hash = hashJson(outputEnvelope);
  const policy_hash = policySnapshot ? hashJson(policySnapshot) : null;

  return {
    org_id: args.orgId,
    posture: args.posture,
    input: inputEnvelope,
    output: outputEnvelope,
    policy_snapshot: policySnapshot,
    input_hash,
    output_hash,
    policy_hash,
  };
}
