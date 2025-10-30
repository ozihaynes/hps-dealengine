// packages/engine/src/policy-defaults.ts

export type UnderwritePolicy = {
  /** Add X days to ZIP DOM for cash close runway */
  default_cash_close_add_days: number;
  /** Maximum months of carry we’ll consider in first-pass underwriting */
  carry_month_cap: number;
  /** Cap: MAO must be <= this % of AIV */
  mao_aiv_cap_pct: number;

  /** OPTIONAL investor discount policy (ZIP-level). If unknown, leave undefined. */
  investor_floor_p20_zip_pct?: number; // e.g., 0.20 means 20% discount from AIV
  investor_floor_typical_zip_pct?: number;

  /** Which cost fields are treated as annual and divided by 12 for “monthly” math */
  annual_cost_keys: Array<'taxes' | 'insurance'>;
};

export const UNDERWRITE_POLICY: UnderwritePolicy = {
  default_cash_close_add_days: 35,
  carry_month_cap: 5,
  mao_aiv_cap_pct: 0.97,
  // Leave investor discounts undefined until dataset is wired (SOT rules).
  investor_floor_p20_zip_pct: undefined,
  investor_floor_typical_zip_pct: undefined,
  annual_cost_keys: ['taxes', 'insurance'],
};
