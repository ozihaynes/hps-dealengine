import { z } from "zod";
import { Postures } from "./posture";

// Allow legacy values (dark/light/system) and the full app palette.
const ThemeOptions = ["system", "dark", "light", "navy", "burgundy", "green", "black", "white"] as const;

export const UserSettingsSchema = z.object({
  id: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  orgId: z.string().uuid(),
  defaultPosture: z.enum(Postures).default("base"),
  defaultMarket: z.string().min(1).default("ORL"),
  theme: z.enum(ThemeOptions).default("system"),
  uiPrefs: z.record(z.string(), z.unknown()).default({}),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export type UserSettings = z.infer<typeof UserSettingsSchema>;

export const UserSettingsGetInputSchema = z.object({
  orgId: z.string().uuid().optional(),
});

export type UserSettingsGetInput = z.infer<typeof UserSettingsGetInputSchema>;

export const UserSettingsGetResultSchema = z.object({
  ok: z.literal(true),
  settings: UserSettingsSchema.nullable(),
});

export type UserSettingsGetResult = z.infer<typeof UserSettingsGetResultSchema>;

export const UserSettingsUpsertInputSchema = z
  .object({
    orgId: z.string().uuid().optional(),
    defaultPosture: z.enum(Postures).optional(),
    defaultMarket: z.string().min(1).optional(),
    theme: z.enum(ThemeOptions).optional(),
    uiPrefs: z.record(z.string(), z.unknown()).optional(),
  })
  .refine(
    (val) =>
      val.defaultPosture !== undefined ||
      val.defaultMarket !== undefined ||
      val.theme !== undefined ||
      val.uiPrefs !== undefined,
    {
      message:
        "At least one of defaultPosture, defaultMarket, theme, or uiPrefs must be provided.",
    },
  );

export type UserSettingsUpsertInput = z.infer<
  typeof UserSettingsUpsertInputSchema
>;

export const UserSettingsUpsertResultSchema = z.object({
  ok: z.literal(true),
  settings: UserSettingsSchema,
});

export type UserSettingsUpsertResult = z.infer<
  typeof UserSettingsUpsertResultSchema
>;
