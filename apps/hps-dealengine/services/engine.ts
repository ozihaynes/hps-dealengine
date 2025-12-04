/**
 * Minimal, synchronous engine wrapper so the UI always has numbers.
 * This is a local stub; next slice will flip to Edge Function v1-analyze.
 */

export class HPSEngine {
  static runEngine(params: { deal: any }, sandbox: any) {
    const deal = params?.deal ?? {};
    const market = deal.market ?? {};
    const costs = deal.costs ?? {};
    const policy = deal.policy ?? {};

    const sandboxOptions = sandboxToAnalyzeOptions({
      sandbox,
      posture: (sandbox as any)?.posture ?? "base",
    });

    const asIs = Number(market.as_is_value ?? 0) || 0;
    const repairs = Number(costs.repairs_base ?? 0) || 0;
    const concessPct = Number(costs.concessions_pct ?? 0) || 0; // 0..1
    const capPct =
      typeof sandboxOptions?.valuation?.aivSafetyCapPercentage === "number"
        ? sandboxOptions.valuation.aivSafetyCapPercentage / 100
        : typeof sandbox?.aivSafetyCapPercentage === "number"
        ? sandbox.aivSafetyCapPercentage / 100
        : 1;

    const cappedAIV = asIs * capPct;
    const offer = Math.max(0, cappedAIV - repairs - cappedAIV * concessPct);

    // DoubleClose envelope from deal.costs.double_close (if present)
    const dcRaw = (costs.double_close ?? costs.doubleClose ?? null) as any;
    const dcCalcs: DoubleCloseCalcs | null = dcRaw
      ? DoubleClose.calculate(dcRaw)
      : null;

    const doubleCloseExtraClosingLoad =
      dcCalcs?.Extra_Closing_Load ?? 0;
    const doubleCloseNetSpreadAfterCarry =
      dcCalcs?.Net_Spread_After_Carry ?? 0;
    const doubleCloseFeeTargetCheck =
      dcCalcs?.Fee_Target_Check ?? "REVIEW";
    const doubleCloseSeasoningFlag =
      dcCalcs?.Seasoning_Flag ?? "OK";

    return {
      calculations: {
        // Existing stub corridor fields (unchanged)
        instantCashOffer: offer,
        netToSeller: offer,
        urgencyDays: Number(policy.manual_days_to_money ?? 0) || 0,

        // DoubleClose-driven projections for corridor/overview
        doubleCloseExtraClosingLoad,
        doubleCloseNetSpreadAfterCarry,
        doubleCloseFeeTargetCheck,
        doubleCloseSeasoningFlag,
        doubleClose: dcCalcs,
      },
    };
  }
}

/** Types for the Double Close calculator (UI expects these exact keys) */
export type DoubleCloseInput = {
  offer?: number; // buy price in the A->B leg
  resale?: number; // sell price in the B->C leg
  buySideCosts?: number; // title, stamps, etc. on buy side
  sellSideCosts?: number; // title, stamps, etc. on sell side
  assignmentFee?: number; // explicit modeling if fee overlaps
};

export type DoubleCloseCalcs = {
  // Canonical snake/label-style keys expected by OverviewTab & DoubleCloseCalculator
  Deed_Stamps_AB: number;
  Deed_Stamps_BC: number;
  Title_AB: number;
  Title_BC: number;
  Other_AB: number;
  Other_BC: number;
  TF_Points_$: number;
  DocStamps_Note: number;
  Intangible_Tax: number;
  Carry_Daily: number;
  Carry_Total: number;
  Extra_Closing_Load: number;

  Gross_Spread: number;
  Net_Spread_Before_Carry: number;
  Net_Spread_After_Carry: number;

  Fee_Target_Threshold: number;
  Fee_Target_Check: "YES" | "NO" | "REVIEW";
  Seasoning_Flag: string;

  // Also provide camelCase fields some components may read
  grossSpread: number;
  assignmentFee: number;
  buySideCosts: number;
  sellSideCosts: number;
  transactionCosts: number;

  notes: string[];
};

const toNum = (value: unknown): number => {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
};

const roundCurrency = (value: unknown): number => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
};

const boolish = (value: unknown): boolean => {
  const s = String(value ?? "").trim().toLowerCase();
  return value === true || s === "yes" || s === "y" || s === "true";
};

const deedRatePer100 = (isMiamiDade: boolean, propertyType: "SFR" | "OTHER"): number => {
  if (isMiamiDade) {
    return propertyType === "SFR" ? 0.60 : 1.05;
  }
  return 0.70;
};

const calcDeedDoc = (
  price: number,
  isMiamiDade: boolean,
  propertyType: "SFR" | "OTHER"
): number => {
  if (!Number.isFinite(price) || price <= 0) return 0;
  const blocks = Math.ceil(price / 100);
  return blocks * deedRatePer100(isMiamiDade, propertyType);
};

const recordingFee = (pagesRaw: unknown): number => {
  const pages = Math.max(1, Math.floor(toNum(pagesRaw) || 1));
  if (pages <= 1) return 10;
  return 10 + (pages - 1) * 8.5;
};

const titlePremium = (priceRaw: unknown): number => {
  const price = Math.max(0, toNum(priceRaw));
  if (price === 0) return 0;
  const base = Math.min(price, 100_000);
  const excess = Math.max(0, price - 100_000);
  const basePrem = (base / 1_000) * 5.75;
  const excessPrem = (excess / 1_000) * 5.0;
  return basePrem + excessPrem;
};

/**
 * Minimal DoubleClose API to satisfy OverviewTab and DoubleCloseCalculator.
 * We provide legacy aliases that your components call: computeDoubleClose() and autofill().
 */
export const DoubleClose = {
  calculate(raw: DoubleCloseInput | any): DoubleCloseCalcs {
    const dc: any = raw ?? {};

    // Location & property type
    const countyRaw = String(dc.county ?? "").toLowerCase();
    const isMiamiDade =
      countyRaw.includes("miami") ||
      countyRaw.includes("dade") ||
      countyRaw.includes("mdc");

    const rawType = String(dc.property_type ?? "SFR");

    const propertyType: "SFR" | "OTHER" =
      rawType === "Vacant land" ? "OTHER" : "SFR";

    // Core prices
    const pab = toNum(dc.pab ?? dc.offer); // A->B price
    const pbc = toNum(dc.pbc ?? dc.resale); // B->C price

    // Pages for recording
    const abPages = Math.max(1, Math.floor(toNum(dc.ab_pages) || 1));
    const bcPages = Math.max(1, Math.floor(toNum(dc.bc_pages) || 1));

    // Title and other closing items (user-supplied)
    const titleAbInput = toNum(dc.title_ab ?? dc.buySideCosts);
    const titleBcInput = toNum(dc.title_bc ?? dc.sellSideCosts);
    const otherAbInput = toNum(dc.other_ab);
    const otherBcInput = toNum(dc.other_bc);

    // HOA / Condo estoppel + rush
    const associationPresent = String(dc.association_present ?? "").toLowerCase();
    const hasAssociation = associationPresent.startsWith("yes");

    let hoaEstoppelBase = toNum(dc.estoppel_fee);
    if (!hasAssociation) {
      hoaEstoppelBase = 0;
    } else if (!Number.isFinite(hoaEstoppelBase) || hoaEstoppelBase <= 0) {
      // Default to statutory cap when association present but no amount entered
      hoaEstoppelBase = 299;
    }

    const hoaRush = String(dc.rush_estoppel ?? "").toLowerCase() === "yes" ? 119 : 0;
    const hoaTotal = hoaEstoppelBase + hoaRush;

    // Transactional funding (TF) principal, points, and extras
    const usingTF = boolish(dc.using_tf);

    const tfPrincipalRaw = toNum(dc.tf_principal);
    const tfPointsRateRaw = toNum(dc.tf_points_rate);
    const tfExtraRaw = toNum(dc.tf_extra_fees);

    const tfPrincipal = usingTF ? tfPrincipalRaw : 0;
    const tfPointsRate = usingTF ? tfPointsRateRaw : 0;
    const TF_Points_$ = usingTF ? roundCurrency(tfPrincipal * tfPointsRate) : 0;
    const tfExtraFees = usingTF ? roundCurrency(tfExtraRaw) : 0;

    // Note taxes (doc stamps + intangible) if TF note is executed in FL and secured by FL real property
    const noteExecutedFL = boolish(dc.tf_note_executed_fl);
    const noteSecured = boolish(dc.tf_secured);
    const noteTaxable = usingTF && noteExecutedFL && noteSecured && tfPrincipal > 0;

    let DocStamps_Note = 0;
    let Intangible_Tax = 0;

    if (noteTaxable) {
      const blocksNote = Math.ceil(tfPrincipal / 100);
      DocStamps_Note = roundCurrency(blocksNote * 0.35); // $0.35 per $100
      Intangible_Tax = roundCurrency(tfPrincipal * 0.002); // 0.2% intangible
    }

    // Deed doc stamps A->B and B->C
    const Deed_Stamps_AB = roundCurrency(calcDeedDoc(pab, isMiamiDade, propertyType));
    const Deed_Stamps_BC = roundCurrency(calcDeedDoc(pbc, isMiamiDade, propertyType));

    // Title premiums A->B and B->C (fallback to standard premium when user hasn't provided)
    const Title_AB = roundCurrency(
      titleAbInput > 0 ? titleAbInput : titlePremium(pab)
    );
    const Title_BC = roundCurrency(
      titleBcInput > 0 ? titleBcInput : titlePremium(pbc)
    );

    // Recording fees
    const recordingAB = roundCurrency(recordingFee(abPages));
    const recordingBC = roundCurrency(recordingFee(bcPages));

    // Other costs (HOA estoppel added into A->B side)
    const Other_AB = roundCurrency(otherAbInput + hoaTotal);
    const Other_BC = roundCurrency(otherBcInput);

    // Carry
    const daysHeld = Math.max(0, Math.floor(toNum(dc.days_held)));
    const carryBasis = String(dc.carry_basis ?? "day").toLowerCase();
    const carryAmount = toNum(dc.carry_amount);
    let carryDailyRaw: number;
    if (carryBasis === "month") {
      carryDailyRaw = carryAmount / 30;
    } else {
      carryDailyRaw = carryAmount;
    }
    const Carry_Daily = roundCurrency(carryDailyRaw);
    const Carry_Total = roundCurrency(Carry_Daily * daysHeld);

    // Aggregated buy/sell side costs
    const buySideCosts = roundCurrency(
      Deed_Stamps_AB +
        Title_AB +
        recordingAB +
        Other_AB +
        DocStamps_Note +
        Intangible_Tax +
        TF_Points_$ +
        tfExtraFees
    );

    const sellSideCosts = roundCurrency(
      Deed_Stamps_BC + Title_BC + recordingBC + Other_BC
    );

    const Extra_Closing_Load = roundCurrency(buySideCosts + sellSideCosts);

    // Spreads and assignment
    const assignment = roundCurrency(dc.assignmentFee ?? dc.assignment_fee ?? 0);
    const grossSpread = roundCurrency(pbc - pab);
    const Net_Spread_Before_Carry = roundCurrency(
      grossSpread - Extra_Closing_Load - assignment
    );
    const Net_Spread_After_Carry = roundCurrency(
      Net_Spread_Before_Carry - Carry_Total
    );

    // Fee target threshold from policy (fed into dc via autofill)
    const Fee_Target_Threshold = Math.max(
      0,
      toNum(dc.assignment_fee_target ?? dc.assignmentFeeTarget ?? 0)
    );

    let Fee_Target_Check: "YES" | "NO" | "REVIEW" = "REVIEW";
    const notes: string[] = [];

    if (!Number.isFinite(Net_Spread_After_Carry)) {
      notes.push("Net spread after carry is not finite; check inputs.");
      Fee_Target_Check = "REVIEW";
    } else if (Net_Spread_After_Carry < 0) {
      notes.push("Net spread after carry is negative; deal fails fee target.");
      Fee_Target_Check = "NO";
    } else if (Net_Spread_After_Carry >= Fee_Target_Threshold) {
      Fee_Target_Check = "YES";
    } else {
      notes.push(
        "Net spread after carry is positive but below the policy assignment fee target."
      );
      Fee_Target_Check = "REVIEW";
    }

    // Seasoning flag (simple 90-day heuristic)
    const Seasoning_Flag = daysHeld > 90 ? "FLAG_90D" : "OK";

    return {
      // Itemized taxes/fees
      Deed_Stamps_AB,
      Deed_Stamps_BC,
      Title_AB,
      Title_BC,
      Other_AB,
      Other_BC,
      TF_Points_$,
      DocStamps_Note,
      Intangible_Tax,

      // Carry & loads
      Carry_Daily,
      Carry_Total,
      Extra_Closing_Load,

      // Spread rollups
      Gross_Spread: grossSpread,
      Net_Spread_Before_Carry,
      Net_Spread_After_Carry,

      // Policy gates
      Fee_Target_Threshold,
      Fee_Target_Check,
      Seasoning_Flag,

      // CamelCase mirrors
      grossSpread,
      assignmentFee: assignment,
      buySideCosts,
      sellSideCosts,
      transactionCosts: Extra_Closing_Load,

      notes,
    };
  },

  // Modern aliases
  compute(input: DoubleCloseInput | any) {
    return this.calculate(input);
  },
  analyze(input: DoubleCloseInput | any) {
    return this.calculate(input);
  },

  // Back-compat aliases used by your components
  computeDoubleClose(input: any, _ctx?: { deal?: any }) {
    return this.calculate(input);
  },

  // Back-compat autofill: populate costs.double_close from the current deal / calc.
  autofill(input: any, ctx?: { deal?: any }, calc?: any) {
    const base: any = { ...(input || {}) };
    const deal = ctx?.deal ?? {};
    const market = deal.market ?? {};
    const property = deal.property ?? {};
    const policy = deal.policy ?? {};
    const timeline = deal.timeline ?? {};

    const arv = toNum(market.arv);
    const asIs = toNum(market.as_is_value);

    // Location / structure defaults
    if (!base.county) {
      base.county = property.county || "Orange";
    }
    if (!base.type) {
      base.type = "Same-day";
    }
    if (!base.carry_basis) {
      base.carry_basis = "day";
    }
    if (!base.property_type) {
      base.property_type = "SFR";
    }

    // Core prices: default A->B to the current Instant Cash Offer, B->C to ARV (or A->B as fallback)
    if (!Number.isFinite(Number(base.pab))) {
      base.pab = toNum(calc?.instantCashOffer || asIs);
    }
    if (!Number.isFinite(Number(base.pbc))) {
      base.pbc = arv > 0 ? arv : base.pab;
    }

    // Days held
    if (base.type === "Same-day") {
      base.days_held = 0;
    } else if (!Number.isFinite(Number(base.days_held))) {
      const days =
        toNum(policy.manual_days_to_money) ||
        toNum(timeline.days_to_sale_manual) ||
        30;
      base.days_held = days;
    }

    // Association / HOA defaults
    if (typeof base.association_present === "undefined") {
      base.association_present = "No";
    }

    // Fee-check ARV
    if (typeof base.arv_for_fee_check === "undefined") {
      base.arv_for_fee_check = arv || asIs || 0;
    }

    // Transactional funding defaults
    if (base.using_tf) {
      if (!Number.isFinite(Number(base.tf_principal))) {
        base.tf_principal = base.pab;
      }
      if (!Number.isFinite(Number(base.tf_points_rate))) {
        base.tf_points_rate = 0.02;
      }
    }

    // Policy fee target into double-close input
    if (typeof base.assignment_fee_target === "undefined") {
      base.assignment_fee_target = toNum(policy.assignment_fee_target);
    }

    // Output toggles default to ON so the user sees the math
    if (typeof base.show_items_math === "undefined") base.show_items_math = true;
    if (typeof base.show_fee_target === "undefined") base.show_fee_target = true;
    if (typeof base.show_90d_flag === "undefined") base.show_90d_flag = true;
    if (typeof base.show_notes === "undefined") base.show_notes = true;

    return base;
  },
};
import { sandboxToAnalyzeOptions } from "../lib/sandboxToAnalyzeOptions";
