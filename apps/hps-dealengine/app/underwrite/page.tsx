"use client";
export const dynamic = "force-dynamic";

import React, { useEffect, useState } from "react";
import type { Deal, EngineCalculations } from "@/types";
import UnderwriteTab from "@/components/underwrite/UnderwriteTab";
import sandboxDefaults from "@/constants/sandboxDefaults";
import { supabase } from "@/lib/supabaseClient";
import AnalyzeNowListener from "@/components/AnalyzeNowListener";
import AppTopNav from "@/components/AppTopNav";
import CalcKpis from "@/components/underwrite/CalcKpis";

/** Minimal initial Deal shape */
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
    adjKey: { perSqft: 0, perBed: 0, perBath: 0, perGarage: 0, perCond: 0, perPool: 0, perMonth: 0 },
    comps: [],
  },
};

/** Zero-safe initial calculations */
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

/** Deep immutable setter for "a.b.c" paths */
function setByPath<T extends object>(obj: T, path: string, value: any): T {
  const keys = path.split(".");
  const next: any = Array.isArray(obj) ? [...(obj as any)] : { ...(obj as any) };
  let cur: any = next;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i]!;
    const prev = cur[k];
    cur[k] = prev && typeof prev === "object" ? (Array.isArray(prev) ? [...prev] : { ...prev }) : {};
    cur = cur[k];
  }
  cur[keys[keys.length - 1]!] = value;
  return next;
}

export default function UnderwritePage() {
  const [hydrated, setHydrated] = useState(false);
  const [deal, setDeal] = useState<Deal>(initialDeal);
  const [calc, setCalc] = useState<EngineCalculations>(initialCalc);
  const [ping, setPing] = useState<{ status: "idle" | "ok" | "error"; user_id?: string; message?: string }>({ status: "idle" });

  useEffect(() => setHydrated(true), []);

  // Auto dev sign-in & authenticated ping (Edge Functions will get JWT automatically)
  useEffect(() => {
    const run = async () => {
      if (!hydrated) return;
      const { data: { session } } = await supabase.auth.getSession();
      let jwt = session?.access_token;
      if (!jwt) {
        const email = process.env.NEXT_PUBLIC_DEV_EMAIL!;
        const password = process.env.NEXT_PUBLIC_DEV_PASSWORD!;
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) { setPing({ status: "error", message: `sign-in failed: ${error.message}` }); return; }
        jwt = data.session?.access_token ?? undefined;
      }
      try {
        const { data } = await supabase.functions.invoke("v1-ping", { method: "GET" });
        setPing({ status: "ok", user_id: String((data as any)?.user_id ?? "") });
      } catch (e: any) {
        setPing({ status: "error", message: String(e?.message ?? e) });
      }
    };
    run();
  }, [hydrated]);

  if (!hydrated) return null;

  const sandbox: any = sandboxDefaults;
  const setDealValue = (path: string, value: any) => setDeal(prev => setByPath(prev, path, value));

  return (
    <div className="p-4 space-y-3">
      <AppTopNav />

      <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm">
        {ping.status === "idle" && <span>Connecting to Supabase…</span>}
        {ping.status === "ok" && <span className="text-green-400">Authenticated via Edge Functions · user_id: {ping.user_id}</span>}
        {ping.status === "error" && <span className="text-orange-400">Edge auth error: {ping.message}</span>}
      </div>

      <AnalyzeNowListener
        deal={deal}
        sandbox={sandbox}
        onResult={(o) => setCalc(prev => ({ ...prev, ...o.calculations }))}
      />

      <UnderwriteTab deal={deal} sandbox={sandbox} calc={calc} setDealValue={setDealValue} />

      <CalcKpis calc={calc} />
    </div>
  );
}