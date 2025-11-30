import { z } from "zod";

export const EvidenceSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  dealId: z.string().uuid(),
  runId: z.string().uuid().nullable(),
  kind: z.string(),
  storageKey: z.string(),
  filename: z.string(),
  mimeType: z.string(),
  bytes: z.number(),
  sha256: z.string(),
  createdBy: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Evidence = z.infer<typeof EvidenceSchema>;

export const EvidenceStartInputSchema = z.object({
  dealId: z.string().uuid(),
  runId: z.string().uuid().optional().nullable(),
  kind: z.string(),
  filename: z.string(),
  bytes: z.number(),
  sha256: z.string(),
  mimeType: z.string(),
});

export type EvidenceStartInput = z.infer<typeof EvidenceStartInputSchema>;

export const EvidenceStartResultSchema = z.union([
  z.object({
    ok: z.literal(true),
    evidence: EvidenceSchema,
    uploadUrl: z.string().nullable(),
    storageKey: z.string(),
  }),
  z.object({
    ok: z.literal(false),
    error: z.string(),
  }),
]);

export type EvidenceStartResult = z.infer<typeof EvidenceStartResultSchema>;

export const EvidenceUrlInputSchema = z.object({
  evidenceId: z.string().uuid(),
  expiresIn: z.number().int().positive().max(3600).optional(),
});

export type EvidenceUrlInput = z.infer<typeof EvidenceUrlInputSchema>;

export const EvidenceUrlResultSchema = z.union([
  z.object({
    ok: z.literal(true),
    url: z.string(),
    storageKey: z.string(),
    evidence: EvidenceSchema,
  }),
  z.object({
    ok: z.literal(false),
    error: z.string(),
  }),
]);

export type EvidenceUrlResult = z.infer<typeof EvidenceUrlResultSchema>;
