// apps/hps-dealengine/types.ts
import type { MouseEvent, ReactNode } from "react";
import type { GlossaryKey } from "./lib/glossary";

/** Calculations used by Overview/Underwrite */
export interface EngineCalculations {
  instantCashOffer: number;
  netToSeller: number;
  urgencyDays: number;
  buyerCeiling: number;
  carryCosts: number;
  carryMonths: number;
  dealSpread: number;
  displayCont: number;
  displayMargin: number;
  listingAllowed: boolean;
  maoFinal: number;
  projectedPayoffClose: number;
  repairs_with_contingency: number;
  resaleCosts: number;
  respectFloorPrice: number;
  tenantBuffer: number;
  totalRepairs: number;
  urgencyBand: string;

  // Double-close envelope (optional until fully wired)
  doubleCloseExtraClosingLoad?: number;
  doubleCloseNetSpreadAfterCarry?: number;
  doubleCloseFeeTargetCheck?: "YES" | "NO" | "REVIEW";
  doubleCloseSeasoningFlag?: string;
  doubleClose?: unknown;
}

/** Repairs estimator primitives */
export interface EstimatorItem {
  label: string;
  isPerUnit?: boolean;
  unitName?: string;
  options: Record<string, number>;
}
export interface EstimatorSectionDef {
  id?: string; // constants don’t provide this; keep optional
  title: string;
  icon?: string;
  items: Record<string, EstimatorItem>;
}
export interface EstimatorState {
  costs: Record<
    string,
    Record<string, { condition?: string; cost: number; notes?: string }>
  >;
  quantities: Record<string, number>;
}

/** Icon + common UI props */
export interface IconProps {
  d?: string;
  size?: number;
  className?: string;
  name?: string;
}
export interface CardProps {
  size?: "md" | "lg" | "xl";
  className?: string;
  children?: ReactNode;
  title?: string;
  footer?: ReactNode;
}
export interface BadgeProps {
  color?: "green" | "blue" | "orange" | "red";
  className?: string;
  children?: ReactNode;
}
export interface ButtonProps {
  size?: "sm" | "md";
  variant?: "primary" | "danger" | "ghost" | "neutral";
  className?: string;
  type?: "button" | "submit" | "reset";
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  children?: ReactNode;
  disabled?: boolean;
}
export interface InputFieldProps {
  label?: string;
  value?: any;
  onChange?: (v: any) => void;
  type?: string;
  placeholder?: string;
  prefix?: ReactNode | string;
  suffix?: ReactNode | string;
  className?: string;
  description?: string;
  warning?: string | null;
  min?: number | string;
  max?: number | string;
  step?: number | string;
  disabled?: boolean;
  helpKey?: GlossaryKey;
}
export interface SelectFieldProps {
  label?: string;
  value?: any;
  onChange?: (v: any) => void;
  options?: { label: string; value: string | number }[];
  className?: string;
  description?: string;
  children?: ReactNode;
  helpKey?: GlossaryKey;
}

export interface ToggleSwitchProps {
  checked?: boolean;
  onChange?: (v: boolean) => void;
  label?: string;
  className?: string;
  description?: string;
}
export interface TabsContextType {
  activeTab?: string;
  setActiveTab?: (v: string) => void;
}

export interface ModalProps {
  isOpen?: boolean;
  open?: boolean;
  onClose?: () => void;
  title?: string;
  size?: "md" | "lg" | "xl"; // match sizeClasses keys in ui.tsx
  children?: ReactNode;
}

export interface MultiSelectChecklistProps {
  label?: string;
  className?: string;
  description?: string;
  options: string[];
  selected: string[];
  onChange: (newSelected: string[]) => void;
}

export interface DynamicBandEditorProps {
  label?: string;
  columns: {
    key: string;
    label: string;
    type?: "text" | "number" | "select";
    options?: string[];
  }[];
  data: any[];
  newRowDefaults: any;
  className?: string;
  description?: string;
  onChange: (rows: any[]) => void;
}

/** Compliance flags */
export interface Flag {
  active?: boolean;
  message?: string;
}
export type Flags = Record<string, Flag>;

/** Deal shapes (sub-objects present; fields inside optional) */
export interface JuniorLien {
  [key: string]: any; // dynamic edits in UI (type/balance/per_diem/good_thru)
  creditor?: string;
  principal?: number;
}

export interface Deal {
  market: {
    arv?: number;
    as_is_value?: number;
    contract_price?: number;
    contract_price_executed?: number;
    arv_source?: string | null;
    arv_as_of?: string | null;
    arv_override_reason?: string | null;
    arv_valuation_run_id?: string | null;
    as_is_value_source?: string | null;
    as_is_value_as_of?: string | null;
    as_is_value_override_reason?: string | null;
    as_is_value_valuation_run_id?: string | null;
    valuation_basis?: string;
    dom_zip?: number;
    moi_zip?: number;
    "price-to-list-pct"?: number;
    price_to_list_ratio?: number;
    local_discount_20th_pct?: number;
    local_discount_pct?: number;
    dom?: number;
    months_of_inventory?: number;
  };
  property: {
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    occupancy?: string;
    county?: string;
    old_roof_flag?: boolean;
    is_homestead?: boolean;
    is_foreclosure_sale?: boolean;
    is_redemption_period_sale?: boolean;
  };
  contact?: {
    name?: string;
    phone?: string;
    email?: string;
  };
  client?: {
    name?: string;
    phone?: string;
    email?: string;
  };
  status: {
    insurability?: string;
    structural_or_permit_risk_flag?: boolean;
    major_system_failure_flag?: boolean;
  };
  debt: {
    senior_principal?: number;
    senior_per_diem?: number;
    good_thru_date?: string;
    protective_advances?: number;
    juniors?: JuniorLien[];
    payoff_is_confirmed?: boolean;
    hoa_estoppel_fee?: number;
  };
  title: { cure_cost?: number; risk_pct?: number };
  policy: {
    assignment_fee_target?: number;
    safety_on_aiv_pct?: number;
    min_spread?: number;
    costs_are_annual?: boolean;
    planned_close_days?: number;
    manual_days_to_money?: number | "";
  };
  costs: {
    monthly: { interest?: number };
    double_close?: any;
    doubleClose?: any;
    repairs_base?: number;
    concessions_pct?: number;
    list_commission_pct?: number;
    sell_close_pct?: number;
  };
  legal: { case_no?: string };
  timeline: { auction_date?: string };
  cma: { subject: { sqft?: number } };
  confidence: {
    no_access_flag?: boolean;
    reinstatement_proof_flag?: boolean;
  };
}

// SandboxConfig from contracts represents the mutable sandbox settings blob.
export type SandboxConfig = import("@hps-internal/contracts").SandboxConfig;
