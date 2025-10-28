// packages/engine/src/compute_underwriting.ts
import { UNDERWRITE_POLICY, type UnderwritePolicy } from "./policy-defaults.js";
import type {
  EngineDeal,
  DTMOut,
  CarryOut,
  FloorsOut,
  CeilingsOut,
  HeadlinesOut,
  UnderwriteResult,
  Money,
} from "./types.js";

const n = (v: unknown, d = 0): number => {
  const x = Number(v);
  return Number.isFinite(x) ? x : d;
};
const sum = (arr: Array<number>) => arr.reduce((a, b) => a + b, 0);

export function computeDTM(
  deal: EngineDeal,
  policy: UnderwritePolicy = UNDERWRITE_POLICY
): DTMOut {
  const dom = n(deal.market?.dom_zip, NaN);
  const add = n(policy.default_cash_close_add_days, 35);
  const manual = n(deal.timeline?.days_to_sale_manual, NaN);
  const domBased = Number.isFinite(dom) ? Math.max(0, Math.round(dom + add)) : Infinity;
  const manualBased = Number.isFinite(manual) && manual > 0 ? manual : Infinity;

  if (!Number.isFinite(domBased) && !Number.isFinite(manualBased)) {
    return { days: 0, method: "unknown" };
  }
  if (manualBased <= domBased) {
    return { days: manualBased, method: "manual", manual };
  }
  return { days: domBased, method: "dom+add", dom_zip: dom, add_days: add };
}

export function computeCarry(
  deal: EngineDeal,
  dtm: DTMOut,
  policy: UnderwritePolicy = UNDERWRITE_POLICY
): CarryOut {
  const m = deal.costs?.monthly ?? {};
  const taxesMonthly = policy.annual_cost_keys.includes("taxes") ? n(m.taxes) / 12 : n(m.taxes);
  const insMonthly = policy.annual_cost_keys.includes("insurance") ? n(m.insurance) / 12 : n(m.insurance);
  const amountMonthly = Math.max(0, taxesMonthly + insMonthly + n(m.hoa) + n(m.utilities));

  const monthsRaw = Math.max(0, dtm.days / 30);
  const cap = n(policy.carry_month_cap, 5);
  const cappedMonths = Math.min(monthsRaw, cap);
  const total = +(amountMonthly * cappedMonths).toFixed(2);

  return {
    months: +monthsRaw.toFixed(3),
    capped_months: +cappedMonths.toFixed(3),
    cap,
    amount_monthly: +amountMonthly.toFixed(2),
    total,
    note: "Carry = monthly sum × min(DTM/30, cap). Taxes/insurance treated as annual ÷ 12.",
  };
}

/**
 * Respect Floor:
 * - payoff_plus_essentials = senior + Σ juniors + essentials_moveout_cash
 * - investor:
 *    • null when NO discounts present in policy (tests expect this)
 *    • otherwise { p20, typical, p20_floor?, typical_floor? } where floors are AIV*(1 - pct)
 * - operational = max(payoff_plus_essentials, max(investor floors)) if investor present, else payoff_plus_essentials
 */
export function computeRespectFloor(
  deal: EngineDeal,
  policy: UnderwritePolicy = UNDERWRITE_POLICY
): FloorsOut {
  // Payoff + essentials (include juniors exactly like your prior version)
  const senior = n(deal.debt?.senior_principal);
  const juniors = (deal.debt?.juniors ?? []).map((j) => n((j as any)?.amount));
  const essentials = n(deal.costs?.essentials_moveout_cash);
  const payoff_plus_essentials = Math.round(senior + sum(juniors) + essentials);

  // AIV and optional investor discounts drawn from policy
  const aiv = n(deal.market?.aiv);

  // Accept both the new nested shape and any legacy direct pct fields via a safe cast
  const inv = (policy as any)?.investor_discounts as
    | { p20_zip?: number; typical_zip?: number }
    | undefined;

  const p20Pct: number | null =
    typeof inv?.p20_zip === "number" ? inv!.p20_zip : null;
  const typicalPct: number | null =
    typeof inv?.typical_zip === "number" ? inv!.typical_zip : null;

  // If we have no discounts at all → investor must be null (to satisfy tests)
  let investor: FloorsOut["investor"] = null;

  let p20_floor: number | null = null;
  let typical_floor: number | null = null;

  if (Number.isFinite(aiv) && (p20Pct != null || typicalPct != null)) {
    if (p20Pct != null) p20_floor = Math.round(aiv * (1 - p20Pct));
    if (typicalPct != null) typical_floor = Math.round(aiv * (1 - typicalPct));

    // Build investor object including available pct(s) and floor(s)
    investor = {
      p20: p20Pct,
      typical: typicalPct,
      ...(p20_floor != null ? { p20_floor } : {}),
      ...(typical_floor != null ? { typical_floor } : {}),
    };
  }

  // Choose operational
  const floorsAvailable = [p20_floor, typical_floor].filter(
    (x): x is number => typeof x === "number"
  );
  const investorMax = floorsAvailable.length > 0 ? Math.max(...floorsAvailable) : null;

  const operational =
    investorMax == null
      ? payoff_plus_essentials
      : Math.max(payoff_plus_essentials, investorMax);

  // Notes: only add dataset note when investor is null
  const notes: string[] =
    investor == null
      ? [
          "[INFO NEEDED] ZIP investor discount dataset not wired; RF uses payoff+essentials if higher.",
        ]
      : [];

  return {
    payoff_plus_essentials,
    investor,
    operational: Math.round(operational),
    notes,
  };
}

export function computeBuyerCeiling(
  deal: EngineDeal,
  policy: UnderwritePolicy = UNDERWRITE_POLICY
): CeilingsOut {
  const aiv = n(deal.market?.aiv);
  const maoAivCap = +(aiv * n(policy.mao_aiv_cap_pct, 0.97)).toFixed(2);
  const candidates = [
    {
      label: "AIV cap",
      value: maoAivCap,
      eligible: Number.isFinite(maoAivCap),
      reason: "Presentation clamp (≤ cap × AIV).",
    },
  ];
  const chosen: Money | null = candidates.find((c) => c.eligible)?.value ?? null;
  return {
    chosen,
    reason: "cap_only",
    mao_aiv_cap: maoAivCap,
    candidates,
    notes: ["[INFO NEEDED] Full ceilings & gates to follow SOT."],
  };
}

export function composeHeadlines(
  deal: EngineDeal,
  floors: FloorsOut,
  ceilings: CeilingsOut,
  _carry: CarryOut
): HeadlinesOut {
  const instant = ceilings.chosen ?? null;
  const net: Money | null = floors.operational ?? null;
  const notes = [
    "Net to seller currently reflects Respect-Floor operational (payoff+essentials or investor floor).",
  ];
  if (instant == null)
    notes.unshift("[INFO NEEDED] Ceiling not determined; instant_cash_offer unavailable.");
  return { instant_cash_offer: instant, net_to_seller: net, notes };
}

export function computeUnderwriting(
  deal: EngineDeal,
  policy: UnderwritePolicy = UNDERWRITE_POLICY
): UnderwriteResult {
  const dtm = computeDTM(deal, policy);
  const carry = computeCarry(deal, dtm, policy);
  const floors = computeRespectFloor(deal, policy);
  const ceilings = computeBuyerCeiling(deal, policy);
  const headlines = composeHeadlines(deal, floors, ceilings, carry);
  return { inputs: { deal }, policy, dtm, carry, floors, ceilings, headlines };
}

