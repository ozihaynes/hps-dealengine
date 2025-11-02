export type DealShape = any; // (keep loose for now; we can tighten later with Zod)

export const UI_DEFAULTS: DealShape = {
  property: {
    occupancy: 'owner', // owner | tenant | vacant
    county: '',
    is_foreclosure_sale: false,
    is_homestead: false,
    is_redemption_period_sale: false,
    old_roof_flag: false,
  },
  status: {
    insurability: 'bindable', // bindable | conditional | unbindable
    major_system_failure_flag: false,
    structural_or_permit_risk_flag: false,
  },
  confidence: {
    no_access_flag: false,
    reinstatement_proof_flag: false,
  },
  title: {
    cure_cost: 0, // $
    risk_pct: 0, // 0..1 (UI shows % via *100)
  },
  debt: {
    senior_principal: 0,
    senior_per_diem: 0,
    juniors: [], // [{ amount: number }]
    protective_advances: 0,
    payoff_is_confirmed: false,
    good_thru_date: '', // ISO string (UI input)
    hoa_estoppel_fee: 0,
  },
  costs: {
    list_commission_pct: 0, // 0..1
    concessions_pct: 0, // 0..1
    sell_close_pct: 0, // 0..1
    monthly: {
      interest: 0,
      taxes: 0,
      insurance: 0,
      hoa: 0,
      utilities: 0,
    },
  },
  legal: {
    case_no: '',
  },
  market: {
    aiv: 0,
    arv: 0,
    as_is_value: 0,
    dom_zip: 0,
    moi_zip: 0,
    local_discount_20th_pct: 0, // 0..1
  },
  policy: {
    assignment_fee_target: 0, // $
    costs_are_annual: false,
    manual_days_to_money: 0,
    min_spread: 0, // $
    planned_close_days: 0,
    safety_on_aiv_pct: 0, // 0..1
  },
  timeline: {
    auction_date: '', // ISO string
  },
};

// Deep merge that preserves arrays, clones defaults, and overlays overrides
export function deepMerge(base: any, override: any): any {
  if (override === undefined) return base;
  if (base === undefined) return override;
  if (Array.isArray(base) || Array.isArray(override)) {
    // For arrays we prefer the override entirely
    return override ?? base ?? [];
  }
  if (typeof base === 'object' && base && typeof override === 'object' && override) {
    const out: any = { ...base };
    for (const k of Object.keys(override)) {
      out[k] = deepMerge(base[k], override[k]);
    }
    return out;
  }
  return override ?? base;
}

export function seedDeal(partial: DealShape = {}): DealShape {
  // Clone defaults so we never mutate the exported object
  // (structuredClone is a safe, spec-defined deep copy)
  const cloned = structuredClone(UI_DEFAULTS);
  return deepMerge(cloned, partial);
}
