import { z } from 'npm:zod';

/** Policy "posture" we support */
export const Posture = z.enum(['conservative', 'base', 'aggressive']);

export const SettingsSchema = z.object({
  tokens: z.record(z.any()).default({}),
  policy_json: z.record(z.any()).default({}),
});
export type Settings = z.infer<typeof SettingsSchema>;

export const PolicyPutPayload = z.object({
  posture: Posture.default('base'),
  policy: SettingsSchema,
});

export const PolicyGetPayload = z.object({
  posture: Posture.default('base'),
});

/** Deal subset used by the current analyzer */
export const DealSchema = z
  .object({
    market: z
      .object({
        as_is_value: z.number().optional().nullable(),
      })
      .partial()
      .default({}),
    costs: z
      .object({
        repairs_base: z.number().optional().nullable(),
        contingency_pct: z.number().optional().nullable(),
      })
      .partial()
      .default({}),
    debt: z
      .object({
        senior_principal: z.number().optional().nullable(),
        hoa_arrears: z.number().optional().nullable(),
        muni_fines: z.number().optional().nullable(),
        title: z
          .object({
            cure_cost: z.number().optional().nullable(),
          })
          .partial()
          .optional(),
      })
      .partial()
      .default({}),
    timeline: z
      .object({
        days_to_sale_manual: z.number().optional().nullable(),
      })
      .partial()
      .default({}),
  })
  .partial()
  .default({});

export type Deal = z.infer<typeof DealSchema>;

/** utils */
export function num(x: unknown): number {
  if (x == null) return 0;
  const s = String(x).replace(/[$,_\s]/g, '');
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}
