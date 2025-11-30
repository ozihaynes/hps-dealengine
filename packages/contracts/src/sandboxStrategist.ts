import { z } from "zod";
import { Postures } from "./posture";
import { SandboxConfigSchema } from "./sandboxSettings";

export const SandboxStrategistRequestSchema = z.object({
  prompt: z.string().min(1),
  posture: z.enum(Postures).optional(),
  settings: SandboxConfigSchema,
});

export type SandboxStrategistRequest = z.infer<
  typeof SandboxStrategistRequestSchema
>;

export const SandboxStrategistResponseSchema = z.union([
  z.object({
    ok: z.literal(true),
    markdown: z.string(),
    provider: z.string(),
    model: z.string(),
  }),
  z.object({
    ok: z.literal(false),
    error: z.string(),
  }),
]);

export type SandboxStrategistResponse = z.infer<
  typeof SandboxStrategistResponseSchema
>;
