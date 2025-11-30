import { z } from "zod";
import { Postures } from "./posture";

const RangeSchema = z.object({
  min: z.number(),
  max: z.number(),
});

const SandboxConfigBaseSchema = z.object({
  arvRange: RangeSchema,
  repairBudgetRange: RangeSchema,
  discountRange: RangeSchema,
  flags: z.object({
    enableAggressiveUpside: z.boolean(),
    showRiskWarnings: z.boolean(),
  }),
});

export const SandboxConfigSchema = SandboxConfigBaseSchema.extend({
  postureConfigs: z
    .record(z.enum(Postures), z.record(z.string(), z.any()))
    .optional(),
  globalSettings: z.record(z.string(), z.any()).optional(),
}).passthrough();

export type SandboxConfigBase = z.infer<typeof SandboxConfigBaseSchema>;
export type SandboxConfig = z.infer<typeof SandboxConfigSchema>;

export const SandboxSettingsSchema = z.object({
  id: z.string().uuid().optional(),
  orgId: z.string().uuid(),
  posture: z.enum(Postures),
  config: SandboxConfigSchema,
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export type SandboxSettings = z.infer<typeof SandboxSettingsSchema>;

export const SandboxSettingsGetInputSchema = z.object({
  orgId: z.string().uuid().optional(),
  posture: z.enum(Postures).optional(),
});

export type SandboxSettingsGetInput = z.infer<
  typeof SandboxSettingsGetInputSchema
>;

export const SandboxSettingsGetResultSchema = z.union([
  z.object({
    ok: z.literal(true),
    settings: SandboxSettingsSchema.nullable(),
  }),
  z.object({
    ok: z.literal(false),
    error: z.string(),
  }),
]);

export type SandboxSettingsGetResult = z.infer<
  typeof SandboxSettingsGetResultSchema
>;

export const SandboxSettingsUpsertInputSchema = z
  .object({
    orgId: z.string().uuid().optional(),
    posture: z.enum(Postures).optional(),
    config: SandboxConfigSchema.optional(),
  })
  .refine(
    (val) => val.posture !== undefined || val.config !== undefined,
    {
      message: "At least one of posture or config must be provided.",
    },
  );

export type SandboxSettingsUpsertInput = z.infer<
  typeof SandboxSettingsUpsertInputSchema
>;

export const SandboxSettingsUpsertResultSchema = z.union([
  z.object({
    ok: z.literal(true),
    settings: SandboxSettingsSchema,
  }),
  z.object({
    ok: z.literal(false),
    error: z.string(),
  }),
]);

export type SandboxSettingsUpsertResult = z.infer<
  typeof SandboxSettingsUpsertResultSchema
>;

export type SandboxPreset = {
  id: string | number;
  orgId?: string;
  name: string;
  posture?: (typeof Postures)[number];
  settings: SandboxConfig;
  createdAt?: string;
  updatedAt?: string;
};
