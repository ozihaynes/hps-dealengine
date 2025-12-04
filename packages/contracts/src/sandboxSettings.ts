import { z } from "zod";
import { Postures } from "./posture";
import {
  SANDBOX_META_BY_KEY,
  SANDBOX_SETTING_META,
  type SandboxSettingMeta,
  type SandboxSettingHome,
} from "./sandboxMeta.generated";

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

const SandboxValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.array(z.string()),
  z.array(z.number()),
  z.array(z.record(z.string(), z.any())),
  z.record(z.string(), z.any()),
  z.null(),
]);
export type SandboxValue = z.infer<typeof SandboxValueSchema>;

const SANDBOX_SETTING_KEYS = SANDBOX_SETTING_META.map((m) => m.key) as [
  string,
  ...string[],
];

export const SANDBOX_DEFAULTS: Record<
  SandboxSettingKey,
  SandboxSettingMeta["defaultValue"]
> = Object.fromEntries(
  SANDBOX_SETTING_META.map((m) => [m.key, m.defaultValue]),
) as Record<SandboxSettingKey, SandboxSettingMeta["defaultValue"]>;

// Legacy base ranges + flags that predate the 196 setting list.
export const SANDBOX_ROOT_DEFAULTS = {
  arvRange: { min: 150000, max: 450000 },
  repairBudgetRange: { min: 0, max: 80000 },
  discountRange: { min: 0, max: 0.3 },
  flags: {
    enableAggressiveUpside: false,
    showRiskWarnings: true,
  },
} as const;

export const SandboxSettingKeySchema = z.enum(SANDBOX_SETTING_KEYS);
export type SandboxSettingKey = z.infer<typeof SandboxSettingKeySchema>;
export const SandboxSettingMetaByKey: Record<
  SandboxSettingKey,
  SandboxSettingMeta
> = SANDBOX_META_BY_KEY as Record<SandboxSettingKey, SandboxSettingMeta>;

export type SandboxSettingHomeTarget = SandboxSettingHome;

export const SandboxConfigSchema = SandboxConfigBaseSchema.extend({
  postureConfigs: z
    .record(z.enum(Postures), z.record(z.string(), SandboxValueSchema))
    .optional(),
  globalSettings: z
    .record(SandboxSettingKeySchema, SandboxValueSchema)
    .optional(),
}).catchall(SandboxValueSchema);

export type SandboxConfigBase = z.infer<typeof SandboxConfigBaseSchema>;
export type SandboxConfig = z.infer<typeof SandboxConfigSchema>;
export const SANDBOX_CONFIG_DEFAULTS: SandboxConfig = {
  ...(SANDBOX_DEFAULTS as Record<string, SandboxValue>),
  ...SANDBOX_ROOT_DEFAULTS,
};

export function buildDefaultSandboxConfig(): SandboxConfig {
  return { ...SANDBOX_CONFIG_DEFAULTS };
}

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
