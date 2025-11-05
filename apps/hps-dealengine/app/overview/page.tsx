"use client";

import React, { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { Deal, EngineCalculations } from "@/types";
import sandboxDefaults from "@/constants/sandboxDefaults";

// IMPORTANT: dynamically import the OverviewTab (client-only UI)
const OverviewTab = dynamic(() => import("../../components/overview/OverviewTab"), { ssr: false }) as any;

/** Minimal-but-complete initial Deal shape that matches apps/hps-dealengine/types.ts */
const initialDeal: Deal = {
  market: {
    arv: "",
    as_is_value: "",
    dom_zip: 0,
    moi_zip: 0,
    "price-to-list-pct": 1,
    local_discount_20th_pct: 0,
    zip_discount_20pct: 0,
  },
  costs: {
    repairs_base: 0,
    contingency_pct: 0,
    monthly: { taxes: 0, insurance: 0, hoa: 0, utilities: 0, interest: 0 },
    sell_close_pct: 0,
    concessions_pct: 0,
    list_commission_pct: null,
    double_close: {},
  },
  debt: {
    senior_principal: "",
    senior_per_diem: "",
    good_thru_date: "",
    juniors: [],
    hoa_arrears: 0,
    muni_fines: 0,
    payoff_is_confirmed: false,
    protective_advances: 0,
    hoa_estoppel_fee: 0,
    pending_special_assessment: 0,
  },
  timeline: { days_to_sale_manual: 0, days_to_ready_list: 0, auction_date: "" },
  property: {
    occupancy: "owner",
    year_built: 0,
    seller_is_foreign_person: false,
    stories: 1,
    is_coastal: false,
    system_failures: { roof: false },
    forms_current: false,
    flood_zone: false,
    old_roof_flag: false,
    county: "",
    is_homestead: false,
    is_foreclosure_sale: false,
    is_redemption_period_sale: false,
  },
  status: {
    insurability: "bindable",
    open_permits_flag: false,
    major_system_failure_flag: false,
    structural_or_permit_risk_flag: false,
  },
  confidence: {
    score: "",
    notes: "",
    no_access_flag: false,
    reinstatement_proof_flag: false,
  },
  title: { cure_cost: 0, risk_pct: 0 },
  policy: {
    safety_on_aiv_pct: 0,
    min_spread: 0,
    planned_close_days: 0,
    costs_are_annual: false,
    manual_days_to_money: null,
    assignment_fee_target: 0,
  },
  legal: { case_no: "", auction_date: "" },
  cma: {
    subject: { sqft: 0, beds: 0, baths: 0, garage: 0, pool: 0 },
    adjKey: {
      perSqft: 0, perBed: 0, perBath: 0, perGarage: 0, perCond: 0, perPool: 0, perMonth: 0,
    },
    comps: [],
  },
};

const initialCalc: EngineCalculations = {
  instantCashOffer: 0,
  projectedPayoffClose: 0,
  netToSeller: 0,
  respectFloorPrice: 0,
  buyerCeiling: 0,
  dealSpread: 0,
  urgencyBand: "",
  urgencyDays: 0,
  listingAllowed: false,
  tenantBuffer: 0,
  displayMargin: 0,
  displayCont: 0,
  carryMonths: 0,
  maoFinal: 0,
  totalRepairs: 0,
  carryCosts: 0,
  resaleCosts: 0,
  repairs_with_contingency: 0,
  resale_costs_total: 0,
  commissionPct: 0,
  capAIV: 0,
  sellerNetRetail: 0,
  marketTemp: 0,
};

export default function Page() {
  const [deal, setDeal] = useState<Deal>(initialDeal);
  const [calc, setCalc] = useState<EngineCalculations>(initialCalc);
  const [hasUserInput, setHasUserInput] = useState(false);

  const sandbox = useMemo(() => sandboxDefaults as any, []);

  // Generic nested setter used by Overview UI
  const setDealValue = (path: string, value: any) => {
    const keys = path.split(".");
    const next: any = structuredClone(deal);
    let cur: any = next;
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i]!;
      cur[k] = (cur[k] && typeof cur[k] === "object") ? (Array.isArray(cur[k]) ? [...cur[k]] : { ...cur[k] }) : {};
      cur = cur[k];
    }
    cur[keys[keys.length - 1]!] = value;
    setDeal(next);
    setHasUserInput(true);
  };

  // Flags the Overview likes to read (safe defaults)
  const flags = { aivCapApplied: false, ready: true };

  // NOTE: OverviewTab’s exact prop shape varies; we pass all the common ones.
  // If OverviewTab defines more required props, TS stays happy because we cast as any
  // while we wire the real values in the next slice.
  return (
    <div className="px-2">
      <OverviewTab
        deal={deal}
        calc={calc}
        flags={flags}
        hasUserInput={hasUserInput}
        setHasUserInput={setHasUserInput}
        setDealValue={setDealValue}
        sandbox={sandbox}
      />
    </div>
  );
}