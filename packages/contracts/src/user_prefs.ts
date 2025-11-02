import { z } from 'zod';

export const UserPrefsSchema = z.object({
  theme: z.enum(['dark', 'light']).default('dark'),
  density: z.enum(['compact', 'cozy', 'comfortable']).default('cozy'),
  autorun_debounce_ms: z.number().int().nonnegative().default(400),
  default_tab: z
    .enum(['overview', 'repairs', 'underwrite', 'settings', 'sandbox'])
    .default('underwrite'),
  timezone_str: z.string().default('America/New_York'),
  currency_code: z.literal('USD').default('USD'),
  date_format: z.string().default('YYYY-MM-DD'),
});
export type UserPrefs = z.infer<typeof UserPrefsSchema>;
export const userPrefsDefaults: UserPrefs = UserPrefsSchema.parse({});
