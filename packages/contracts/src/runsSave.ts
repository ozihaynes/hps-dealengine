import { z } from "zod";
import {
  RunInputEnvelopeSchema,
  RunOutputEnvelopeSchema,
  RunTraceFrameSchema,
  type RunInputEnvelope,
  type RunOutputEnvelope,
  type PolicySnapshot,
  type RunTraceFrame,
  hashJson,
} from "./runs";

export const SaveRunArgsSchema = z.object({
  orgId: z.string().uuid(),
  dealId: z.string().uuid(),
  posture: z.string(),
  deal: z.unknown(),
  sandbox: z.unknown(),
  repairProfile: z.unknown().optional(),
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
  // We keep snapshot flexible for now; it will be validated upstream when we
  // crystallize the PolicySnapshot shape.
  policySnapshot: z.unknown().optional(),
});

export type SaveRunArgs = z.infer<typeof SaveRunArgsSchema>;

export type RunRowInsert = {
  org_id: string;
  posture: string;
  deal_id: string;
  input: RunInputEnvelope;
  output: RunOutputEnvelope;
  trace: RunTraceFrame[];
  policy_snapshot: PolicySnapshot | null;
  input_hash: string;
  output_hash: string;
  policy_hash: string | null;
};

export function buildRunEnvelopes(args: SaveRunArgs): {
  inputEnvelope: RunInputEnvelope;
  outputEnvelope: RunOutputEnvelope;
  policySnapshot: PolicySnapshot | null;
} {
  const parsed = SaveRunArgsSchema.parse(args);

  const inputEnvelope = RunInputEnvelopeSchema.parse({
    dealId: parsed.dealId,
    posture: parsed.posture,
    deal: parsed.deal,
    sandbox: parsed.sandbox,
    repairProfile: parsed.repairProfile,
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
    deal_id: args.dealId,
    input: inputEnvelope,
    output: outputEnvelope,
    trace: outputEnvelope.trace,
    policy_snapshot: policySnapshot,
    input_hash,
    output_hash,
    policy_hash,
  };
}

// Backwards-compat alias for existing engine tests
export function buildRunRowPayload(args: SaveRunArgs): RunRowInsert {
  return buildRunRow(args);
}
