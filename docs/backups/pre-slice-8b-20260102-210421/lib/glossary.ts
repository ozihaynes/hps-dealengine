/**
 * In-app glossary (single source of truth).
 *
 * - This file is the ONLY place where in-app definitions / tooltip copy live.
 *   Do NOT hard-code explanation strings in components; always use a `helpKey`
 *   and `getGlossaryEntry`.
 * - Keys:
 *   - Must be stable, snake_case identifiers.
 *   - Should align with engine/policy/sandbox naming where possible.
 * - To add a new term:
 *   1. Add the key to `ALL_GLOSSARY_KEYS`.
 *   2. Add a matching entry to `GLOSSARY` with a 1–2 sentence description
 *      focused on “what it is” and “why it matters”.
 *   3. (Optional) Add the key to the glossary shortlist JSON if it should be
 *      part of the V1 tooltip set.
 *
 * Tests and scripts:
 * - `glossary.test.ts` enforces basic invariants (keys mapped, concise descriptions).
 * - `pnpm run check:glossary` ensures the JSON shortlist stays aligned with this file.
 */

export const ALL_GLOSSARY_KEYS = [
  "arv",
  "aiv",
  "aiv_safety_cap",
  "investor_floor",
  "payoff_floor",
  "respect_floor",
  "buyer_ceiling",
  "mao",
  "spread_ladder",
  "min_spread_by_arv_band",
  "cash_gate",
  "assignment_fee",
  "dtm",
  "carry_months",
  "zip_speed_band",
  "confidence_grade",
  "risk_gate",
  "evidence_freshness",
  "uninsurable",
  "fha_90_day_rule",
  "fema_50_percent_rule",
  "firpta",
  "pace_assessment",
  "condo_sirs_milestone",
  "scra_verification",
  "repair_class",
  "repairs_contingency",
  "quick_estimate",
  "psf",
  "big5_repairs",
  "sandbox_posture",
  "sandbox_preset",
  "calibration_freeze_switch",
] as const;

export type GlossaryKey = (typeof ALL_GLOSSARY_KEYS)[number];

export interface GlossaryEntry {
  /**
   * Human-readable term as displayed to users.
   * Example: "Respect Floor" or "DTM (Days-to-Money)".
   */
  term: string;
  /**
   * Optional shorter label if the full term is long or includes acronyms.
   * Example: "DTM" for "DTM (Days-to-Money)".
   */
  shortLabel?: string;
  /**
   * 1–2 sentence explanation focused on:
   * - what the concept is, and
   * - why it matters to the user.
   *
   * Avoid formulas; keep it readable inside a tooltip or (i) popover.
   */
  description: string;
  /**
   * Tags used to group terms by context or feature area.
   * Example: ["valuation", "floors"], ["risk", "compliance"], ["repairs"].
   */
  contextTags: string[];
}

/**
 * Master glossary map keyed by GlossaryKey.
 */
export const GLOSSARY: Record<GlossaryKey, GlossaryEntry> = {
  arv: {
    term: "ARV (After-Repair Value)",
    description:
      "Estimated value of the property once rehab is complete; anchors spreads, ceilings, and offer bands.",
    contextTags: ["valuation", "floors", "ceiling"],
  },
  aiv: {
    term: "AIV (As-Is Value)",
    description:
      "Current value of the property before any rehab; paired with ARV to bracket pricing and risk.",
    contextTags: ["valuation", "floors"],
  },
  aiv_safety_cap: {
    term: "AIV Safety Cap Percentage",
    description:
      "Policy clamp that limits the AIV used in underwriting, preventing optimistic as-is values from inflating offers.",
    contextTags: ["valuation", "floors", "policy"],
  },
  investor_floor: {
    term: "Investor Floor",
    description:
      "The minimum price your investor needs to meet required margin and costs; one of the foundations for the offer floor.",
    contextTags: ["valuation", "floors", "guardrails"],
  },
  payoff_floor: {
    term: "Payoff Floor",
    description:
      "The lowest offer that clears debt plus essentials for the seller, keeping offers respectful when liens are heavy.",
    contextTags: ["valuation", "floors", "guardrails"],
  },
  respect_floor: {
    term: "Respect Floor",
    description:
      "The lowest offer the system will recommend, based on the better of your investor floor or a payoff-plus-essentials scenario so you’re not ‘disrespecting’ the seller.",
    contextTags: ["valuation", "floors", "guardrails"],
  },
  buyer_ceiling: {
    term: "Buyer Ceiling",
    description:
      "The highest price your target buyer should reasonably pay for the deal after repairs, costs, and required margin, giving you a clear top of the negotiation range.",
    contextTags: ["valuation", "ceilings", "guardrails"],
  },
  mao: {
    term: "MAO (Max Allowable Offer)",
    description:
      "The maximum offer the system recommends after accounting for repairs, costs, and required profit; primary negotiation anchor.",
    contextTags: ["valuation", "offer", "guardrails"],
  },
  spread_ladder: {
    term: "Spread Ladder",
    description:
      "Policy table that sets the minimum required profit spread by ARV band, ensuring higher-value deals carry larger spreads.",
    contextTags: ["profit", "spread", "policy"],
  },
  min_spread_by_arv_band: {
    term: "Min Spread by ARV Band",
    description:
      "The ARV-band entries that feed the spread ladder, mapping price ranges to required minimum profit dollars.",
    contextTags: ["profit", "spread", "policy"],
  },
  cash_gate: {
    term: "Cash Presentation Gate",
    description:
      "Policy gate that decides if a deal can be presented as a cash offer based on meeting required spread thresholds.",
    contextTags: ["profit", "spread", "guardrails"],
  },
  assignment_fee: {
    term: "Assignment Fee",
    description:
      "The wholesale fee paid when assigning a contract to an end buyer; a key driver of wholesale profitability.",
    contextTags: ["profit", "spread", "wholesale"],
  },
  dtm: {
    term: "DTM (Days-to-Money)",
    shortLabel: "DTM",
    description:
      "The estimated number of days from today until you actually get paid on the deal, factoring in closing timelines and any extra buffers.",
    contextTags: ["timeline", "carry", "urgency"],
  },
  carry_months: {
    term: "Carry Months",
    description:
      "The policy-driven hold period (in months) used to model carrying costs until exit or payoff.",
    contextTags: ["timeline", "carry", "costs"],
  },
  zip_speed_band: {
    term: "ZIP Speed Band",
    description:
      "Market liquidity band for the ZIP (fast/neutral/slow) derived from DOM/MOI inputs and used in timeline/urgency math.",
    contextTags: ["timeline", "carry", "market"],
  },
  confidence_grade: {
    term: "Confidence Grade",
    description:
      "The A/B/C-style confidence label summarizing evidence quality and risk signals for the run.",
    contextTags: ["risk", "confidence", "evidence"],
  },
  risk_gate: {
    term: "Risk Gate",
    description:
      "A pass/watch/fail rule that can block or downgrade a deal when specific risk conditions are met.",
    contextTags: ["risk", "compliance"],
  },
  evidence_freshness: {
    term: "Evidence Freshness",
    description:
      "Whether comps, title, insurance, and other evidence are recent enough; stale or missing evidence can downgrade confidence or block offers.",
    contextTags: ["risk", "evidence", "confidence"],
  },
  uninsurable: {
    term: "Uninsurable",
    description:
      "A property condition where standard insurance carriers are unwilling to write a normal policy, often triggering extra hold costs, higher risk, or stricter exit options.",
    contextTags: ["risk", "insurance", "compliance"],
  },
  fha_90_day_rule: {
    term: "FHA 90-Day Resale Rule",
    description:
      "An FHA rule that can limit or scrutinize a resale if you buy and then resell the property within 90 days, especially on flip or wholetail exits.",
    contextTags: ["risk", "compliance", "disposition"],
  },
  fema_50_percent_rule: {
    term: "FEMA 50% Rule",
    description:
      "Flood-zone rule that can cap rehab spend at 50% of improvement value; exceeding it can trigger elevation or major compliance costs.",
    contextTags: ["risk", "compliance", "flood"],
  },
  firpta: {
    term: "FIRPTA Withholding",
    description:
      "U.S. tax withholding that applies when buying from certain foreign sellers; can affect proceeds and closing steps.",
    contextTags: ["risk", "compliance", "tax"],
  },
  pace_assessment: {
    term: "PACE Assessment",
    description:
      "A property-assessed clean energy lien that travels with the property and can complicate payoff, title, and insurance.",
    contextTags: ["risk", "compliance", "lien"],
  },
  condo_sirs_milestone: {
    term: "Condo SIRS/Milestone",
    description:
      "Florida condo structural inspection/repair requirements that can add special assessments or timing risk.",
    contextTags: ["risk", "compliance", "condo"],
  },
  scra_verification: {
    term: "SCRA Verification",
    description:
      "Servicemembers Civil Relief Act check that can restrict foreclosure or eviction timing for protected military members.",
    contextTags: ["risk", "compliance", "legal"],
  },
  repair_class: {
    term: "Repair Class",
    description:
      "Light, medium, heavy, or structural classification that determines contingency and repair posture for the deal.",
    contextTags: ["repairs", "contingency"],
  },
  repairs_contingency: {
    term: "Repairs Contingency",
    description:
      "Extra buffer applied to repairs to cover unknowns or riskier scopes; often driven by repair class or evidence gaps.",
    contextTags: ["repairs", "contingency"],
  },
  quick_estimate: {
    term: "QuickEstimate (PSF Repairs)",
    shortLabel: "QuickEstimate",
    description:
      "A fast per-square-foot repair estimate using rehab level and Big 5 toggles to set a starting repair budget.",
    contextTags: ["repairs", "estimator"],
  },
  psf: {
    term: "PSF (Per-Square-Foot) Repairs",
    description:
      "Per-square-foot repair estimates used in QuickEstimate and the detailed estimator to set baseline rehab budgets.",
    contextTags: ["repairs", "estimator"],
  },
  big5_repairs: {
    term: "Big 5 Repairs",
    description:
      "The five high-impact systems (roof, HVAC, repipe, electrical, foundation) that drive major repair costs.",
    contextTags: ["repairs"],
  },
  sandbox_posture: {
    term: "Underwriting Posture (Conservative/Base/Aggressive)",
    shortLabel: "Sandbox Posture",
    description:
      "Switches the policy posture between conservative, base, or aggressive, changing guardrails, spreads, and risk tolerances across the app.",
    contextTags: ["sandbox", "posture", "policy"],
  },
  sandbox_preset: {
    term: "Sandbox Preset",
    description:
      "A saved bundle of sandbox knobs for a given posture that can be reapplied or shared without editing policy JSON directly.",
    contextTags: ["sandbox", "configuration"],
  },
  calibration_freeze_switch: {
    term: "Calibration Freeze Switch",
    description:
      "Freeze stops publishing NEW calibration weight versions for this market_key (auto-calibration will skip with a frozen reason). Existing published weights can still be used during valuation runs. Unfreeze to resume publishing.",
    contextTags: ["valuation", "calibration", "ops"],
  },
};

/**
 * Convenience helper for reading glossary entries.
 */
export function getGlossaryEntry(key: GlossaryKey): GlossaryEntry {
  return GLOSSARY[key];
}
