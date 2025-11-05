/**
 * Minimal, synchronous engine wrapper so the UI always has numbers.
 * This is a local stub; next slice will flip to Edge Function v1-analyze.
 */

export class HPSEngine {
  static runEngine(params: { deal: any }, sandbox: any) {
    const deal   = params?.deal ?? {};
    const market = deal.market ?? {};
    const costs  = deal.costs ?? {};
    const policy = deal.policy ?? {};

    const asIs       = Number(market.as_is_value ?? 0) || 0;
    const repairs    = Number(costs.repairs_base ?? 0) || 0;
    const concessPct = Number(costs.concessions_pct ?? 0) || 0; // 0..1
    const capPct =
      typeof sandbox?.aivSafetyCapPercentage === "number"
        ? sandbox.aivSafetyCapPercentage / 100
        : 1;

    const cappedAIV = asIs * capPct;
    const offer = Math.max(0, cappedAIV - repairs - cappedAIV * concessPct);

    return {
      calculations: {
        instantCashOffer: offer,
        netToSeller: offer,
        urgencyDays: Number(policy.manual_days_to_money ?? 0) || 0,
      },
    };
  }
}

/** Types for the Double Close calculator (UI expects these exact keys) */
export type DoubleCloseInput = {
  offer?: number;          // buy price in the A->B leg
  resale?: number;         // sell price in the B->C leg
  buySideCosts?: number;   // title, stamps, etc. on buy side
  sellSideCosts?: number;  // title, stamps, etc. on sell side
  assignmentFee?: number;  // explicit modeling if fee overlaps
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

/**
 * Minimal DoubleClose API to satisfy OverviewTab and DoubleCloseCalculator.
 * We provide legacy aliases that your components call: computeDoubleClose() and autofill().
 */
export const DoubleClose = {
  calculate(input: DoubleCloseInput): DoubleCloseCalcs {
    const offer      = Number(input?.offer ?? 0) || 0;
    const resale     = Number(input?.resale ?? 0) || 0;
    const buyCosts   = Number(input?.buySideCosts ?? 0) || 0;
    const sellCosts  = Number(input?.sellSideCosts ?? 0) || 0;
    const assignment = Number(input?.assignmentFee ?? 0) || 0;

    const grossSpread      = resale - offer;
    const transactionCosts = buyCosts + sellCosts;

    // Stub carry until policy-driven carry math is wired
    const Carry_Daily = 0;
    const Carry_Total = 0;

    // Map UI-expected composite values
    const Extra_Closing_Load       = transactionCosts;
    const Net_Spread_Before_Carry  = grossSpread - transactionCosts - assignment;
    const Net_Spread_After_Carry   = Net_Spread_Before_Carry - Carry_Total;

    const notes: string[] = [];
    if (!isFinite(Net_Spread_After_Carry)) notes.push("Inputs incomplete; showing zeroed math.");

    return {
      // Itemized taxes/fees (zero-safe placeholders for now)
      Deed_Stamps_AB: 0,
      Deed_Stamps_BC: 0,
      Title_AB: 0,
      Title_BC: 0,
      Other_AB: 0,
      Other_BC: 0,
      TF_Points_$: 0,
      DocStamps_Note: 0,
      Intangible_Tax: 0,

      // Carry & loads
      Carry_Daily,
      Carry_Total,
      Extra_Closing_Load,

      // Spread rollups
      Gross_Spread: grossSpread,
      Net_Spread_Before_Carry,
      Net_Spread_After_Carry,

      // Policy gates (placeholder)
      Fee_Target_Threshold: 0,
      Fee_Target_Check: "REVIEW",
      Seasoning_Flag: "OK",

      // Also expose camelCase used elsewhere
      grossSpread,
      assignmentFee: assignment,
      buySideCosts: buyCosts,
      sellSideCosts: sellCosts,
      transactionCosts,

      notes,
    };
  },

  // Modern alias
  compute(input: DoubleCloseInput) {
    return this.calculate(input);
  },
  analyze(input: DoubleCloseInput) {
    return this.calculate(input);
  },

  // Back-compat aliases used by your components
  computeDoubleClose(input: DoubleCloseInput, _ctx?: { deal?: any }) {
    return this.calculate(input);
  },

  // Back-compat no-op autofill (returns user input unchanged)
  autofill(input: DoubleCloseInput, _ctx?: { deal?: any }, _calc?: any) {
    return input;
  },
};