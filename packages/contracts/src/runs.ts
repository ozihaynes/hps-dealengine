import { z } from "zod";

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

/**
 * Deterministic canonical JSON: sorts object keys recursively, no extra whitespace.
 */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value: any): any {
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }
  if (value && typeof value === "object") {
    const sorted: Record<string, any> = {};
    for (const key of Object.keys(value).sort()) {
      sorted[key] = sortKeys(value[key]);
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
