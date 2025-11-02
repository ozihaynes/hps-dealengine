import { SettingsSchema, type Settings } from './settings';

/** Legacy → Current policy mapper (safe no-op baseline).
 *  Non-destructive: lifts a few known flat keys if present; otherwise parses as-is.
 */
export function legacyPolicyMap(input: unknown): Settings {
  const obj = (input ?? {}) as any;
  const candidate: any = { ...obj };

  // Example lift: older flat key "aiv_cap_pct" → aiv.cap_pct
  if (obj && obj.aiv_cap_pct != null) {
    candidate.aiv = { ...(candidate.aiv ?? {}), cap_pct: obj.aiv_cap_pct };
  }

  return SettingsSchema.parse(candidate);
}
