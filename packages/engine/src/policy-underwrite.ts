/** Investor discount inputs; values are proportions (e.g., 0.22 = 22%) */
export type InvestorDiscounts = {
  /** ZIP investor discount @ P20 (heavier discount; lower floor) */
  p20_zip?: number;
  /** ZIP typical investor discount (modal band) */
  typical_zip?: number;
};

/** Global underwriting policy bag (safe to import on server & tests) */
export type UnderwritePolicy = {
  /** SOT default: DOM + 35 when manual not provided (cash close timeline) */
  default_cash_close_add_days: number;
  /** Carry month cap (SOT says 5.0 months) */
  carry_month_cap: number;
  /** AIV clamp when presenting MAO (wired later) */
  mao_aiv_cap_pct: number;
  /** Investor discounts; if undefined, investor floors fall back to null */
  investor_discounts?: InvestorDiscounts;
  /** Placeholder for future min-spread checks, fees, etc. */
  min_spread?: number;
};

/** Default underwriting policy (inject ZIP discounts at runtime later) */
export const UNDERWRITE_POLICY: UnderwritePolicy = {
  default_cash_close_add_days: 35,
  carry_month_cap: 5,
  mao_aiv_cap_pct: 0.97,
  investor_discounts: undefined
};

