import { z } from "zod";
import { Postures } from "./posture";

export const AiBridgeInputSchema = z.object({
  dealId: z.string().uuid(),
  runId: z.string().uuid(),
  posture: z.enum(Postures),
  prompt: z.string().min(1),
});

export type AiBridgeInput = z.infer<typeof AiBridgeInputSchema>;

export const AiBridgeAnalysisSchema = z.object({
  summary: z.string(),
  strengths: z.array(z.string()).default([]),
  risks: z.array(z.string()).default([]),
  questions: z.array(z.string()).default([]),
  nextActions: z.array(z.string()).default([]),
});

export type AiBridgeAnalysis = z.infer<typeof AiBridgeAnalysisSchema>;

export const AiBridgeErrorSchema = z.object({
  ok: z.literal(false),
  errorCode: z.string(),
  message: z.string(),
  error: z.string().optional(),
  issues: z.array(z.unknown()).optional(),
});

export type AiBridgeError = z.infer<typeof AiBridgeErrorSchema>;

export const AiBridgeResultSchema = z.union([
  z.object({
    ok: z.literal(true),
    analysis: AiBridgeAnalysisSchema,
    guardrails: z.array(z.string()).optional(),
  }),
  AiBridgeErrorSchema,
]);

export type AiBridgeResult = z.infer<typeof AiBridgeResultSchema>;
