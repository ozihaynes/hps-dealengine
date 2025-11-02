import type { ChangeEventHandler, ReactNode } from 'react';

/** Tabs context typing */
export type TabsContextType = {
  activeTab: string;
  setActiveTab: (v: string) => void;
};

/** Flags typing for Compliance banners */
export type Flag = { active?: boolean; message?: string };
export type Flags = Record<string, Flag>;

/** Estimator types */
export type EstimatorItem = {
  label: string;
  isPerUnit?: boolean;
  unitName?: string;
  options: Record<string, number>;
};
export type EstimatorSectionDef = {
  title: string;
  icon: string;
  items: Record<string, EstimatorItem>;
};
export type EstimatorCosts = Record<string, { condition: string; cost: number; notes: string }>;
export type EstimatorState = {
  costs: Record<string, EstimatorCosts>;
  quantities: Record<string, number>;
};

/** Engine stub types (visual only) */
export type EngineCalculations = {
  instantCashOffer: number;
  projectedPayoffClose: number;
  netToSeller: number;
  respectFloorPrice: number;
  buyerCeiling: number;
  dealSpread: number;
  urgencyBand: string;
  urgencyDays: number;
  listingAllowed: boolean;
  tenantBuffer: number;
  displayMargin: number;
  displayCont: number;
  carryMonths: number;
  maoFinal: number;
  totalRepairs: number;
  carryCosts: number;
  resaleCosts: number;
  repairs_with_contingency: number;
  resale_costs_total: number;
  commissionPct: number;
  capAIV: number;
  sellerNetRetail: number;
  marketTemp: number;
};
export type EngineResult = {
  calculations: EngineCalculations;
  flags: Flags;
  state: string;
  missingInfo: string[];
};

export type Deal = {
  market: {
    arv: string | number;
    as_is_value: string | number;
    dom_zip: number;
    moi_zip: number;
    'price-to-list-pct': number;
    local_discount_20th_pct: number;
    zip_discount_20pct: number;
  };
  costs: {
    repairs_base: number;
    contingency_pct: number;
    monthly: { taxes: number; insurance: number; hoa: number; utilities: number; interest: number };
    sell_close_pct: number;
    concessions_pct: number;
    list_commission_pct: number | null;
    double_close: any;
  };
  debt: {
    senior_principal: string | number;
    senior_per_diem: string | number;
    good_thru_date: string;
    juniors: any[];
    hoa_arrears: number;
    muni_fines: number;
    payoff_is_confirmed: boolean;
    protective_advances: number;
    hoa_estoppel_fee: number;
    pending_special_assessment: number;
  };
  timeline: { days_to_sale_manual: number; days_to_ready_list: number; auction_date: string };
  property: {
    occupancy: string;
    year_built: number;
    seller_is_foreign_person: boolean;
    stories: number;
    is_coastal: boolean;
    system_failures: { roof: boolean };
    forms_current: boolean;
    flood_zone: boolean;
    old_roof_flag: boolean;
    county: string;
    is_homestead: boolean;
    is_foreclosure_sale: boolean;
    is_redemption_period_sale: boolean;
  };
  status: {
    insurability: string;
    open_permits_flag: boolean;
    major_system_failure_flag: boolean;
    structural_or_permit_risk_flag: boolean;
  };
  confidence: {
    score: string;
    notes: string;
    no_access_flag: boolean;
    reinstatement_proof_flag: boolean;
  };
  title: { cure_cost: number; risk_pct: number };
  policy: {
    safety_on_aiv_pct: number;
    min_spread: number;
    planned_close_days: number;
    costs_are_annual: boolean;
    manual_days_to_money: number | null;
    assignment_fee_target: number;
  };
  legal: { case_no: string; auction_date: string };
  cma: {
    subject: { sqft: number; beds: number; baths: number; garage: number; pool: number };
    adjKey: {
      perSqft: number;
      perBed: number;
      perBath: number;
      perGarage: number;
      perCond: number;
      perPool: number;
      perMonth: number;
    };
    comps: any[];
  };
};

export type DealWrapper = { deal: Deal };

/** Small UI component prop types */
export type IconProps = { d: string; size?: number; className?: string };
// FIX: Made children optional to resolve a TypeScript error that appears to be from a configuration issue.
export type CardProps = { children?: ReactNode; className?: string };
export type BadgeProps = {
  color?: 'green' | 'blue' | 'orange' | 'red';
  // FIX: Made children optional to resolve a TypeScript error that appears to be from a configuration issue.
  children?: ReactNode;
};
export type ButtonProps = {
  // FIX: Made children optional to resolve a TypeScript error that appears to be from a configuration issue.
  children?: ReactNode;
  onClick?: (e?: any) => void;
  size?: 'sm' | 'md';
  variant?: 'primary' | 'danger' | 'ghost' | 'neutral';
  className?: string;
  disabled?: boolean;
};
export type SelectFieldProps = {
  label: string;
  value: any;
  onChange: ChangeEventHandler<HTMLSelectElement>;
  // FIX: Made children optional to resolve a TypeScript error that appears to be from a configuration issue.
  children?: ReactNode;
  className?: string;
  description?: string;
};
export type InputFieldProps = {
  label: string;
  type?: string;
  value: any;
  onChange: ChangeEventHandler<HTMLInputElement>;
  prefix?: string;
  suffix?: string;
  placeholder?: string;
  min?: number | string;
  max?: number | string;
  step?: number | string;
  disabled?: boolean;
  className?: string;
  description?: string;
  warning?: string | null;
};
export type ToggleSwitchProps = {
  label: string;
  checked: boolean;
  onChange: () => void;
  description?: string;
};
export type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  // FIX: Made children optional to resolve a TypeScript error that appears to be from a configuration issue.
  children?: ReactNode;
  size?: 'md' | 'lg' | 'xl';
};

export type MultiSelectChecklistProps = {
  label: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  className?: string;
  description?: string;
};

export type DynamicBandEditorColumn = {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select';
  options?: string[];
};

export type DynamicBandEditorProps = {
  label: string;
  columns: DynamicBandEditorColumn[];
  data: any[];
  onChange: (data: any[]) => void;
  newRowDefaults: any;
  className?: string;
  description?: string;
};

/** App Settings Types */
export type ProfileSettings = { name: string; email: string };
export type BusinessSettings = { name: string; logo: string | null }; // logo as base64 string
export type TeamMember = {
  id: number;
  name: string;
  email: string;
  role: 'Viewer' | 'Underwriter' | 'Admin';
};
export type DealPreset = { id: number; name: string; policy: Deal['policy']; costs: Deal['costs'] };
export type SandboxSettings = Record<string, any>; // Simplified for now, can be fully typed out for production
export type SandboxPreset = { id: number; name: string; settings: SandboxSettings };

export type AppSettings = {
  theme: 'dark' | 'original';
  profile: ProfileSettings;
  business: BusinessSettings;
  team: TeamMember[];
  sandboxLogic: string;
  dealPresets: DealPreset[];
  sandbox: SandboxSettings;
  sandboxPresets: SandboxPreset[];
};
