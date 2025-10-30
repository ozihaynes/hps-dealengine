export type Money = number;

export type EngineDeal = {
  market?: { aiv?: number; arv?: number; dom_zip?: number; moi_zip?: number };
  costs?: {
    repairs_base?: number;
    contingency_pct?: number;
    essentials_moveout_cash?: number;
    monthly?: { taxes?: number; insurance?: number; hoa?: number; utilities?: number };
  };
  debt?: { senior_principal?: number; juniors?: Array<{ label?: string; amount?: number }> };
  timeline?: { days_to_ready_list?: number; days_to_sale_manual?: number };
  status?: { insurance_bindable?: boolean };
};

export type DTMOut = {
  days: number;
  method: 'manual' | 'dom+add' | 'unknown';
  dom_zip?: number;
  add_days?: number;
  manual?: number;
};

export type CarryOut = {
  months: number;
  capped_months: number;
  cap: number;
  amount_monthly: Money;
  total: Money;
  note?: string;
};

export type FloorsOut = {
  payoff_plus_essentials: number;
  investor: {
    p20?: number | null;
    typical?: number | null;
    p20_floor?: number;
    typical_floor?: number;
  } | null; // <-- allow null (tests expect .toBeNull() when discounts missing)
  operational: number;
  notes: string[];
};

export type CeilingsOut = {
  chosen: Money | null;
  reason: string;
  mao_aiv_cap: Money;
  candidates: Array<{ label: string; value: Money; eligible: boolean; reason?: string }>;
  notes?: string[];
};

export type HeadlinesOut = {
  instant_cash_offer: Money | null;
  net_to_seller: Money | null;
  notes?: string[];
};

export type UnderwriteResult = {
  inputs: { deal: EngineDeal };
  policy: import('./policy-defaults').UnderwritePolicy;
  dtm: DTMOut;
  carry: CarryOut;
  floors: FloorsOut;
  ceilings: CeilingsOut;
  headlines: HeadlinesOut;
};
