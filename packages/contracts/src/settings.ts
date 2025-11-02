import { z } from 'zod';

/**
 * Token helper: accepts strings like "<AIV_CAP_PCT>" but doesn't hard-require the angle brackets.
 * We keep it permissive to avoid blocking UI while tokens are being wired.
 */
const token = z.string().min(1).describe('placeholder token string, e.g., <AIV_CAP_PCT>');

export const SettingsSchema = z.object({
  aiv: z
    .object({
      hard_max_token: token.optional(),
      hard_min_token: token.optional(),
      safety_cap_pct_token: token.optional(),
      soft_max_vs_arv_multiplier_token: token.optional(),
      soft_max_comps_age_days_token: token.optional(),
      soft_min_comps_token: token.optional(),
      soft_min_radius_miles_token: token.optional(),
      cap_override: z
        .object({
          approval_role: z.string().default('Owner'),
          requires_bindable_insurance: z.boolean().default(true),
        })
        .partial()
        .optional(),
    })
    .partial()
    .default({}),

  arv: z
    .object({
      // reserved for future knobs (tokens for ARV rules)
    })
    .partial()
    .default({}),

  carry: z
    .object({
      dom_add_days_default_token: token.optional(),
      months_cap_token: token.optional(),
    })
    .partial()
    .default({}),

  floors: z
    .object({
      respect_floor_enabled: z.boolean().default(true),
    })
    .partial()
    .default({}),

  fees: z
    .object({
      list_commission_pct_token: token.optional(),
      concessions_pct_token: token.optional(),
      sell_close_pct_token: token.optional(),
    })
    .partial()
    .default({}),

  evidence: z.record(z.string(), z.any()).default({}),
  sources: z.record(z.string(), z.any()).default({}),
});

export type Settings = z.infer<typeof SettingsSchema>;

/** No numbers; only structure + booleans and empty tokens. */
export const policyDefaults: Settings = SettingsSchema.parse({
  aiv: {},
  arv: {},
  carry: {},
  floors: { respect_floor_enabled: true },
  fees: {},
  evidence: {},
  sources: {},
});
