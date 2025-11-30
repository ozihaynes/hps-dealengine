import { z } from "zod";

export const PolicyOverrideRequestInputSchema = z.object({
  posture: z.string().min(1),
  tokenKey: z.string().min(1),
  newValue: z.any(),
  justification: z.string().min(1),
  runId: z.string().uuid().optional().nullable(),
});

export type PolicyOverrideRequestInput = z.infer<
  typeof PolicyOverrideRequestInputSchema
>;

export const PolicyOverrideRequestResultSchema = z.object({
  ok: z.literal(true),
  overrideId: z.string().uuid(),
  status: z.enum(["pending", "approved", "rejected"]),
});

export type PolicyOverrideRequestResult = z.infer<
  typeof PolicyOverrideRequestResultSchema
>;

export const PolicyOverrideApproveInputSchema = z.object({
  overrideId: z.string().uuid(),
  decision: z.enum(["approved", "rejected"]),
});

export type PolicyOverrideApproveInput = z.infer<
  typeof PolicyOverrideApproveInputSchema
>;

export const PolicyOverrideApproveResultSchema = z.object({
  ok: z.literal(true),
  overrideId: z.string().uuid(),
  status: z.enum(["approved", "rejected"]),
});

export type PolicyOverrideApproveResult = z.infer<
  typeof PolicyOverrideApproveResultSchema
>;
