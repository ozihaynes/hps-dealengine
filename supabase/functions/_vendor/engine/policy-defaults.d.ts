/** Investor discount inputs; values are proportions (0..1, e.g. 0.22 = 22%) */
export type InvestorDiscounts = {
  /** ZIP investor discount @ P20 (heavier discount; lower floor) */
  p20_zip?: number;
  /** ZIP typical investor discount (modal band) */
  typical_zip?: number;
};
/** Global underwriting policy (safe to import in server & tests) */
export type Policy = {
  /** SOT default: DOM + 35 when manual not provided (cash close timeline) */
  default_cash_close_add_days: number;
  /** Carry month cap per SOT */
  carry_month_cap: number;
  /** AIV clamp when presenting MAO (wired later) */
  mao_aiv_cap_pct: number;
  /** Investor discounts; if undefined, investor floors fall back to null */
  investor_discounts?: InvestorDiscounts;
  /** Placeholder for future min-spread checks, fees, etc. */
  min_spread?: number;
};
/** Default policy. You may override investor_discounts at runtime per ZIP. */
export declare const POLICY: Policy;
export type UnderwritePolicy = {
  default_cash_close_add_days: number;
  carry_month_cap: number;
  mao_aiv_cap_pct: number;
  investor_floor_p20_zip_pct?: number;
  investor_floor_typical_zip_pct?: number;
  annual_cost_keys: Array<'taxes' | 'insurance'>;
};
export declare const UNDERWRITE_POLICY: UnderwritePolicy;
