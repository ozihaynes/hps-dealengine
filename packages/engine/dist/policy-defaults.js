/** Default policy. You may override investor_discounts at runtime per ZIP. */
export const POLICY = {
    default_cash_close_add_days: 35,
    carry_month_cap: 5,
    mao_aiv_cap_pct: 0.97,
    investor_discounts: undefined,
};
export const UNDERWRITE_POLICY = {
    default_cash_close_add_days: 35,
    carry_month_cap: 5,
    mao_aiv_cap_pct: 0.97,
    investor_floor_p20_zip_pct: undefined,
    investor_floor_typical_zip_pct: undefined,
    annual_cost_keys: [],
};
