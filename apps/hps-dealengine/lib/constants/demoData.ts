/**
 * Demo Data Constants — V2.5 Dashboard
 *
 * Realistic demo data for a distressed SFR deal in Central Florida.
 * All values follow actual engine formulas and market conditions.
 *
 * DEMO PROPERTY:
 * - Address: 4521 Edgewater Dr, Orlando, FL 32808 (Pine Hills area)
 * - Type: Single Family Residential
 * - Beds/Baths: 3BR / 2BA
 * - Sqft: 1,450 sqft
 * - Year Built: 1978
 * - Lot: 0.18 acres
 * - Condition: Fair (needs cosmetic rehab)
 * - Situation: Estate sale, motivated seller
 *
 * MARKET CONDITIONS (Central Florida Q1 2026):
 * - Median DOM (Orange County): 32 days
 * - Months of Inventory: 3.8
 * - Sale/List Ratio: 97.2%
 * - Investor Activity: Moderate-High
 *
 * @module lib/constants/demoData
 * @version 3.1.0 (Demo Fix — Realistic Central Florida Data)
 */

import type {
  DealVerdict,
  PriceGeometry,
  NetClearance,
  EvidenceHealth,
  RiskGatesResult,
  MarketVelocity,
  CompQuality,
  EnhancedRiskSummary,
} from "@hps-internal/contracts";

import type { ArvBand } from "@/components/dashboard/arv";
import type { BuyerFitTag } from "@/components/dashboard/liquidity";
import type { CompsEvidencePackData } from "@/components/dashboard/comps";

// ═══════════════════════════════════════════════════════════════════════════
// DEMO PROPERTY DETAILS
// ═══════════════════════════════════════════════════════════════════════════

export const DEMO_PROPERTY = {
  address: "4521 Edgewater Dr",
  city: "Orlando",
  state: "FL",
  zip: "32808",
  county: "Orange",
  beds: 3,
  baths: 2,
  sqft: 1450,
  lot_sqft: 7841, // 0.18 acres
  year_built: 1978,
  property_type: "SFR",
  condition: "fair",
  situation: "estate_sale",
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// DEMO VERDICT (Engine Decision Logic)
//
// Recommendation: PURSUE
// - ZOPA exists: ✅ ($34,600)
// - Net positive: ✅ ($48,690 wholetail)
// - Risk gates: 7/8 pass (1 watch)
// - Confidence: 84% (good comps, motivated seller, clear title)
// ═══════════════════════════════════════════════════════════════════════════

export const DEMO_VERDICT: DealVerdict = {
  recommendation: "pursue",
  confidence_pct: 84,
  rationale:
    "Strong deal with healthy ZOPA ($34.6K), motivated estate seller, and multiple profitable exits. Wholetail recommended for $48.7K net profit.",
  blocking_factors: [],
  primary_reason_code: "strong_fundamentals",
  spread_adequate: true,
  evidence_complete: true,
  risk_acceptable: true,
};

// ═══════════════════════════════════════════════════════════════════════════
// DEMO PRICE GEOMETRY (Engine Formula)
//
// Respect Floor = Payoff + Taxes + Minimum Margin
//               = $142,000 + $3,200 + $5,000 = $150,200
//
// Buyer Ceiling = ARV - Repairs - Holding - Buyer Profit Target
//               = $285,000 - $34,100 - $8,550 - $42,750 = $199,600
//
// ZOPA = Buyer Ceiling - Seller Strike
//      = $199,600 - $165,000 = $34,600
//
// Entry Point = Seller Strike + (ZOPA × 0.35)
//             = $165,000 + $12,110 = $177,110
// ═══════════════════════════════════════════════════════════════════════════

export const DEMO_PRICE_GEOMETRY: PriceGeometry = {
  respect_floor: 150200,
  dominant_floor: "payoff",
  floor_investor: 165350, // ARV × 0.70 - repairs = 199,500 - 34,100
  floor_payoff: 145200,
  buyer_ceiling: 199600,
  seller_strike: 165000,
  zopa: 34600,
  zopa_pct_of_arv: 12.1,
  zopa_exists: true,
  zopa_band: "moderate",
  entry_point: 177110,
  entry_point_pct_of_zopa: 35.0,
  entry_posture: "balanced",
};

// ═══════════════════════════════════════════════════════════════════════════
// DEMO NET CLEARANCE (Engine Formula)
//
// ASSIGNMENT:
//   Gross = MAO_wholesale - Entry = $185,000 - $177,110 = $7,890
//   Costs = Assignment admin = $500
//   Net = $7,390 | Margin = 93.7%
//
// DOUBLE CLOSE:
//   Buy at Entry = $177,110
//   Sell to Flipper at MAO_flip = $192,000
//   Gross = $14,890
//   Costs = Closing (2× $2,200) + Title = $5,400
//   Net = $9,490 | Margin = 63.7%
//
// WHOLETAIL:
//   Buy at Entry = $177,110
//   Light Rehab = $12,000 (paint + clean only)
//   Sell at ARV × 0.92 = $262,200
//   Gross = $262,200 - $177,110 - $12,000 = $73,090
//   Costs = Closing + Holding + Commissions = $24,400
//   Net = $48,690 | Margin = 66.6%
//
// RECOMMENDED EXIT: wholetail (highest net, acceptable timeline)
// ═══════════════════════════════════════════════════════════════════════════

export const DEMO_NET_CLEARANCE: NetClearance = {
  recommended_exit: "wholetail",
  recommendation_reason:
    "Wholetail offers highest net profit ($48.7K) with 60-90 day timeline. Light cosmetic work maximizes ARV capture.",
  wholetail_viable: true,
  min_spread_threshold: 15000,
  assignment: {
    gross: 7890,
    costs: 500,
    net: 7390,
    margin_pct: 93.7,
    cost_breakdown: {
      title_fees: 0,
      closing_costs: 0,
      transfer_tax: 0,
      carry_costs: 0,
      other: 500,
    },
  },
  double_close: {
    gross: 14890,
    costs: 5400,
    net: 9490,
    margin_pct: 63.7,
    cost_breakdown: {
      title_fees: 1000,
      closing_costs: 4400,
      transfer_tax: 0,
      carry_costs: 0,
      other: 0,
    },
  },
  wholetail: {
    gross: 73090,
    costs: 24400,
    net: 48690,
    margin_pct: 66.6,
    cost_breakdown: {
      title_fees: 1200,
      closing_costs: 3500,
      transfer_tax: 0,
      carry_costs: 5400,
      other: 14300, // Rehab $12K + commissions
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// DEMO EVIDENCE HEALTH (10/12 Collected)
// ═══════════════════════════════════════════════════════════════════════════

export const DEMO_EVIDENCE_HEALTH: EvidenceHealth = {
  items: [
    {
      evidence_type: "payoff_letter",
      label: "Payoff Statement",
      status: "fresh",
      obtained_date: "2026-01-02",
      age_days: 3,
      freshness_threshold_days: 30,
      days_until_stale: 27,
      is_critical: true,
    },
    {
      evidence_type: "title_commitment",
      label: "Title Commitment",
      status: "fresh",
      obtained_date: "2025-12-28",
      age_days: 8,
      freshness_threshold_days: 60,
      days_until_stale: 52,
      is_critical: true,
    },
    {
      evidence_type: "insurance_quote",
      label: "Insurance Quote",
      status: "fresh",
      obtained_date: "2026-01-01",
      age_days: 4,
      freshness_threshold_days: 30,
      days_until_stale: 26,
      is_critical: true,
    },
    {
      evidence_type: "four_point_inspection",
      label: "Four-Point Inspection",
      status: "fresh",
      obtained_date: "2025-12-20",
      age_days: 16,
      freshness_threshold_days: 90,
      days_until_stale: 74,
      is_critical: false,
    },
    {
      evidence_type: "repair_estimate",
      label: "Repair Estimate",
      status: "fresh",
      obtained_date: "2025-12-25",
      age_days: 11,
      freshness_threshold_days: 60,
      days_until_stale: 49,
      is_critical: true,
    },
  ],
  fresh_count: 5,
  stale_count: 0,
  missing_count: 0,
  health_score: 100,
  health_band: "excellent",
  any_critical_missing: false,
  any_critical_stale: false,
  missing_critical: [],
  stale_critical: [],
  recommended_action: "All critical evidence collected and verified fresh",
};

// ═══════════════════════════════════════════════════════════════════════════
// DEMO MARKET VELOCITY (Orlando Metro Q1 2026)
// ═══════════════════════════════════════════════════════════════════════════

export const DEMO_MARKET_VELOCITY: MarketVelocity = {
  dom_zip_days: 32,
  moi_zip_months: 3.8,
  absorption_rate: 4.2,
  sale_to_list_pct: 97.2,
  velocity_band: "warm",
  liquidity_score: 74,
  cash_buyer_share_pct: 28.5,
  data_age_days: 3,
  data_source: "MLS + Public Records",
  yoy_price_change_pct: 3.2,
  active_listings: 156,
};

// ═══════════════════════════════════════════════════════════════════════════
// DEMO COMP QUALITY (6 Comps, Fannie Mae Method)
// ═══════════════════════════════════════════════════════════════════════════

export const DEMO_COMP_QUALITY: CompQuality = {
  comp_count: 6,
  avg_distance_miles: 0.3,
  avg_age_days: 47,
  sqft_variance_pct: 5.8,
  quality_score: 82,
  quality_band: "good",
  scoring_method: "fannie_mae",
  meets_confidence_threshold: true,
  max_distance_miles: 0.5,
  max_age_days: 62,
  score_breakdown: {
    recency_score: 85,
    proximity_score: 92,
    similarity_score: 78,
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// DEMO RISK GATES (8-Gate Taxonomy)
//
// PASS (7): insurability, title, flood, bankruptcy, liens, condition, market
// WATCH (1): compliance (unpermitted sunroom)
// ═══════════════════════════════════════════════════════════════════════════

export const DEMO_RISK_GATES: RiskGatesResult = {
  gates: [
    {
      gate: "insurability",
      label: "Insurability",
      status: "pass",
      severity: null,
      is_blocking: false,
      reason: "Standard coverage available, no prior claims",
      score_contribution: 0,
    },
    {
      gate: "title",
      label: "Title",
      status: "pass",
      severity: null,
      is_blocking: false,
      reason: "Clear title confirmed, estate properly probated",
      score_contribution: 0,
    },
    {
      gate: "flood",
      label: "Flood Zone",
      status: "pass",
      severity: null,
      is_blocking: false,
      reason: "FEMA Zone X — minimal flood risk",
      score_contribution: 0,
    },
    {
      gate: "bankruptcy",
      label: "Bankruptcy",
      status: "pass",
      severity: null,
      is_blocking: false,
      reason: "No active bankruptcy proceedings",
      score_contribution: 0,
    },
    {
      gate: "liens",
      label: "Liens",
      status: "pass",
      severity: null,
      is_blocking: false,
      reason: "No liens beyond primary mortgage",
      score_contribution: 0,
    },
    {
      gate: "condition",
      label: "Property Condition",
      status: "pass",
      severity: null,
      is_blocking: false,
      reason: "Cosmetic repairs only, no structural issues",
      score_contribution: 0,
    },
    {
      gate: "market",
      label: "Market Risk",
      status: "pass",
      severity: null,
      is_blocking: false,
      reason: "DOM 32 days, MOI 3.8 — healthy market velocity",
      score_contribution: 0,
    },
    {
      gate: "compliance",
      label: "Compliance",
      status: "pass",
      severity: null,
      is_blocking: false,
      reason: "Unpermitted sunroom addition (circa 1985) — seller affidavit obtained",
      score_contribution: 0,
    },
  ],
  any_blocking: false,
  blocking_gates: [],
  pass_count: 8,
  fail_count: 0,
  unknown_count: 0,
  critical_count: 0,
  major_count: 0,
  minor_count: 0,
  max_severity: null,
  risk_score: 100,
  risk_band: "low",
  attention_gates: [],
  recommended_action: "All gates pass — proceed with confidence",
};

// ═══════════════════════════════════════════════════════════════════════════
// DEMO ENHANCED RISK SUMMARY (For DecisionHero)
// ═══════════════════════════════════════════════════════════════════════════

export const DEMO_ENHANCED_RISK_SUMMARY: EnhancedRiskSummary = {
  overall: "pass",
  gates: {
    insurability: {
      status: "pass",
      reason: "Standard coverage available, no prior claims",
      severity: null,
      resolution_action: null,
      is_blocking: false,
    },
    title: {
      status: "pass",
      reason: "Clear title confirmed, estate properly probated",
      severity: null,
      resolution_action: null,
      is_blocking: false,
    },
    flood: {
      status: "pass",
      reason: "FEMA Zone X — minimal flood risk",
      severity: null,
      resolution_action: null,
      is_blocking: false,
    },
    bankruptcy: {
      status: "pass",
      reason: "No active bankruptcy proceedings",
      severity: null,
      resolution_action: null,
      is_blocking: false,
    },
    liens: {
      status: "pass",
      reason: "No liens beyond primary mortgage",
      severity: null,
      resolution_action: null,
      is_blocking: false,
    },
    condition: {
      status: "pass",
      reason: "Cosmetic repairs only, no structural issues",
      severity: null,
      resolution_action: null,
      is_blocking: false,
    },
    market: {
      status: "pass",
      reason: "DOM 32 days, MOI 3.8 — healthy market velocity",
      severity: null,
      resolution_action: null,
      is_blocking: false,
    },
    compliance: {
      status: "pass",
      reason: "Unpermitted sunroom addition (circa 1985) — seller affidavit obtained",
      severity: null,
      resolution_action: null,
      is_blocking: false,
    },
  },
  any_blocking: false,
  fail_count: 0,
  watch_count: 0,
  blocking_gates: [],
  attention_gates: [],
  reasons: [],
  max_severity: null,
};

// ═══════════════════════════════════════════════════════════════════════════
// DEMO ARV BAND (Confidence Grading)
// ═══════════════════════════════════════════════════════════════════════════

export const DEMO_ARV_BAND: ArvBand = {
  arv_low: 268000,
  arv_mid: 285000,
  arv_high: 302000,
  confidence: "high",
  source: "comps",
  spread_amount: 34000,
  spread_pct: 11.9,
};

// ═══════════════════════════════════════════════════════════════════════════
// DEMO BUYER FIT TAGS
// ═══════════════════════════════════════════════════════════════════════════

export const DEMO_BUYER_FIT_TAGS: BuyerFitTag[] = [
  "flipper",
  "landlord",
  "brrrr",
];

// ═══════════════════════════════════════════════════════════════════════════
// DEMO COMPS EVIDENCE PACK
// ═══════════════════════════════════════════════════════════════════════════

export const DEMO_COMPS_EVIDENCE_PACK: CompsEvidencePackData = {
  comps: [
    {
      address: "4612 N Powers Dr, Orlando, FL 32808",
      sale_price: 295000,
      sale_date: "2025-11-21",
      sqft: 1520,
      beds: 3,
      baths: 2,
      year_built: 1982,
      lot_sqft: 8100,
      distance_miles: 0.3,
      age_days: 45,
      similarity_score: 88,
      adjustments: [
        { factor: "sqft", amount: -4200, description: "70 sqft larger" },
        { factor: "age", amount: 2800, description: "4 years newer" },
      ],
      total_adjustment: -1400,
      adjusted_price: 293600,
      photo_url: null,
      mls_number: "O6198745",
      property_type: "Single Family",
      manually_selected: false,
    },
    {
      address: "4718 Edgewater Dr, Orlando, FL 32808",
      sale_price: 285000,
      sale_date: "2025-11-03",
      sqft: 1380,
      beds: 3,
      baths: 2,
      year_built: 1975,
      lot_sqft: 7200,
      distance_miles: 0.1,
      age_days: 62,
      similarity_score: 92,
      adjustments: [
        { factor: "sqft", amount: 4200, description: "70 sqft smaller" },
        { factor: "age", amount: -2100, description: "3 years older" },
      ],
      total_adjustment: 2100,
      adjusted_price: 287100,
      photo_url: null,
      mls_number: "O6195823",
      property_type: "Single Family",
      manually_selected: false,
    },
    {
      address: "4403 N Pine Hills Rd, Orlando, FL 32808",
      sale_price: 278000,
      sale_date: "2025-12-08",
      sqft: 1410,
      beds: 3,
      baths: 2,
      year_built: 1980,
      lot_sqft: 6800,
      distance_miles: 0.5,
      age_days: 28,
      similarity_score: 85,
      adjustments: [
        { factor: "sqft", amount: 2400, description: "40 sqft smaller" },
        { factor: "age", amount: 1400, description: "2 years newer" },
        { factor: "location", amount: -3500, description: "Busier road" },
      ],
      total_adjustment: 300,
      adjusted_price: 278300,
      photo_url: null,
      mls_number: "O6201456",
      property_type: "Single Family",
      manually_selected: false,
    },
    {
      address: "4821 N Hastings St, Orlando, FL 32808",
      sale_price: 292000,
      sale_date: "2025-11-14",
      sqft: 1480,
      beds: 3,
      baths: 2,
      year_built: 1979,
      lot_sqft: 8400,
      distance_miles: 0.4,
      age_days: 51,
      similarity_score: 90,
      adjustments: [
        { factor: "sqft", amount: -1800, description: "30 sqft larger" },
        { factor: "lot", amount: 2500, description: "Larger lot" },
      ],
      total_adjustment: 700,
      adjusted_price: 292700,
      photo_url: null,
      mls_number: "O6197234",
      property_type: "Single Family",
      manually_selected: false,
    },
    {
      address: "4315 Edgewater Dr, Orlando, FL 32808",
      sale_price: 288000,
      sale_date: "2025-11-28",
      sqft: 1440,
      beds: 3,
      baths: 2,
      year_built: 1976,
      lot_sqft: 7500,
      distance_miles: 0.2,
      age_days: 38,
      similarity_score: 94,
      adjustments: [
        { factor: "sqft", amount: 600, description: "10 sqft smaller" },
        { factor: "age", amount: -1400, description: "2 years older" },
      ],
      total_adjustment: -800,
      adjusted_price: 287200,
      photo_url: null,
      mls_number: "O6199876",
      property_type: "Single Family",
      manually_selected: false,
    },
    {
      address: "4609 N Powers Dr, Orlando, FL 32808",
      sale_price: 282000,
      sale_date: "2025-11-10",
      sqft: 1395,
      beds: 3,
      baths: 2,
      year_built: 1977,
      lot_sqft: 7100,
      distance_miles: 0.3,
      age_days: 55,
      similarity_score: 86,
      adjustments: [
        { factor: "sqft", amount: 3300, description: "55 sqft smaller" },
        { factor: "age", amount: -700, description: "1 year older" },
      ],
      total_adjustment: 2600,
      adjusted_price: 284600,
      photo_url: null,
      mls_number: "O6196543",
      property_type: "Single Family",
      manually_selected: false,
    },
  ],
  subject_address: "4521 Edgewater Dr, Orlando, FL 32808",
  subject_sqft: 1450,
  avg_sale_price: 286667,
  avg_distance_miles: 0.3,
  avg_age_days: 47,
  comp_quality_score: 82,
};

// ═══════════════════════════════════════════════════════════════════════════
// DEMO HERO METRICS (Consolidated for DecisionHero)
// ═══════════════════════════════════════════════════════════════════════════

export const DEMO_HERO_METRICS = {
  /** Best net profit from recommended exit */
  bestNet: 48690,
  /** Recommended exit strategy */
  bestExit: "wholetail" as const,
  /** Zone of possible agreement */
  zopa: 34600,
  /** ZOPA as percentage of ARV */
  zopaPctOfArv: 12.1,
  /** Whether ZOPA exists */
  zopaExists: true,
  /** Number of risk gates passed */
  gatesPass: 8,
  /** Total number of risk gates */
  gatesTotal: 8,
  /** Number of blocking gates */
  gatesBlocking: 0,
  /** Verdict recommendation */
  recommendation: "pursue" as const,
  /** Confidence percentage */
  confidence: 84,
  /** Verdict rationale */
  rationale:
    "Strong deal with healthy ZOPA ($34.6K), motivated estate seller, and multiple profitable exits. Wholetail recommended for $48.7K net profit.",
  /** CTA label for this verdict */
  ctaLabel: "Generate Offer",
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// DEMO SCORE ANALYSIS (L2 Scores with Factor Breakdowns)
//
// Detailed score analysis matching the ScoreAnalysisData type.
// Scores are consistent with DEMO_L2_SCORES and demo property situation.
// ═══════════════════════════════════════════════════════════════════════════

export const DEMO_SCORE_ANALYSIS = {
  closeability: {
    score: 78,
    factors: [
      {
        name: "Equity Position",
        value: 25,
        impact: "positive" as const,
        detail: "Strong equity above payoff ($23K cushion)",
      },
      {
        name: "Title Status",
        value: 20,
        impact: "positive" as const,
        detail: "Clear title, estate properly probated",
      },
      {
        name: "Seller Motivation",
        value: 18,
        impact: "positive" as const,
        detail: "Estate sale — motivated to close quickly",
      },
      {
        name: "Payoff Clarity",
        value: 15,
        impact: "positive" as const,
        detail: "Fresh payoff statement obtained",
      },
      {
        name: "Timeline Feasibility",
        value: 12,
        impact: "neutral" as const,
        detail: "Standard 30-45 day close possible",
      },
    ],
  },
  urgency: {
    score: 65,
    factors: [
      {
        name: "Estate Timeline",
        value: 22,
        impact: "positive" as const,
        detail: "Estate needs resolution within 60 days",
      },
      {
        name: "Market Conditions",
        value: 18,
        impact: "positive" as const,
        detail: "Warm market favors quick action",
      },
      {
        name: "Holding Costs",
        value: 15,
        impact: "neutral" as const,
        detail: "Estate paying maintenance, taxes",
      },
      {
        name: "Competition Risk",
        value: 10,
        impact: "neutral" as const,
        detail: "Off-market, no competing offers",
      },
    ],
  },
  buyer_demand: {
    score: 72,
    factors: [
      {
        name: "Location Score",
        value: 28,
        impact: "positive" as const,
        detail: "Pine Hills — active investor area",
      },
      {
        name: "Property Condition",
        value: 22,
        impact: "positive" as const,
        detail: "Light cosmetic rehab only",
      },
      {
        name: "Price Point",
        value: 18,
        impact: "positive" as const,
        detail: "$177K entry fits flipper/BRRRR budgets",
      },
      {
        name: "Investor Activity",
        value: 16,
        impact: "positive" as const,
        detail: "28.5% cash buyer share in zip",
      },
    ],
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// DEMO ENGINE OUTPUTS (Complete Package for V25EnhancementsZone)
//
// This is the master object passed to V25EnhancementsZone when isDemo=true.
// All fields are populated with realistic, formula-based values.
// ═══════════════════════════════════════════════════════════════════════════

export const DEMO_ENGINE_OUTPUTS = {
  // Core V2.5 outputs
  verdict: DEMO_VERDICT,
  price_geometry: DEMO_PRICE_GEOMETRY,
  net_clearance: DEMO_NET_CLEARANCE,
  evidence_health: DEMO_EVIDENCE_HEALTH,
  risk_gates: DEMO_RISK_GATES,
  market_velocity: DEMO_MARKET_VELOCITY,
  comp_quality: DEMO_COMP_QUALITY,
  arv_band: DEMO_ARV_BAND,

  // Extended outputs for orphaned components
  enhanced_risk_summary: DEMO_ENHANCED_RISK_SUMMARY,
  buyer_fit_tags: DEMO_BUYER_FIT_TAGS,
  comps_evidence_pack: DEMO_COMPS_EVIDENCE_PACK,

  // Score analysis with factor breakdowns
  score_analysis: DEMO_SCORE_ANALYSIS,
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// LEGACY EXPORTS (Backward Compatibility)
// ═══════════════════════════════════════════════════════════════════════════

export const DEMO_L2_SCORES = {
  closeability: 78,
  urgency: 65,
  baSpread: 84,
  buyerDemand: 72,
};

export const DEMO_WHY_REASONS = [
  "Strong 12.1% ZOPA with $34,600 spread",
  "Motivated estate seller, clear title",
  "7/8 risk gates pass, 1 watch (minor)",
  "Warm market with 32-day average DOM",
];

export const DEMO_RATIONALE = [
  "PURSUE recommended with 84% confidence",
  "Wholetail exit: $48,690 net profit, 66.6% margin",
  "All critical evidence collected and fresh",
  "Low risk profile with healthy market conditions",
];

export const DEMO_GATES_LEGACY = [
  { key: "insurability", name: "Insurability", status: "passed" as const, message: "Standard coverage available" },
  { key: "title", name: "Title", status: "passed" as const, message: "Clear title confirmed" },
  { key: "flood", name: "Flood Zone", status: "passed" as const, message: "Zone X — minimal risk" },
  { key: "bankruptcy", name: "Bankruptcy", status: "passed" as const, message: "No filings found" },
  { key: "liens", name: "Liens", status: "passed" as const, message: "No outstanding liens" },
  { key: "condition", name: "Condition", status: "passed" as const, message: "Cosmetic only" },
  { key: "market", name: "Market", status: "passed" as const, message: "Warm market, 32-day DOM" },
  { key: "compliance", name: "Compliance", status: "watch" as const, message: "Unpermitted sunroom" },
];

export const DEMO_DASHBOARD_DATA = {
  verdict: DEMO_VERDICT,
  priceGeometry: DEMO_PRICE_GEOMETRY,
  netClearance: DEMO_NET_CLEARANCE,
  market: DEMO_MARKET_VELOCITY,
  compQuality: DEMO_COMP_QUALITY,
  arv: DEMO_ARV_BAND,
  evidence: DEMO_EVIDENCE_HEALTH,
  gates: DEMO_GATES_LEGACY,
  l2Scores: DEMO_L2_SCORES,
  whyReasons: DEMO_WHY_REASONS,
  rationale: DEMO_RATIONALE,
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// TYPE EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

export type DemoProperty = typeof DEMO_PROPERTY;
export type DemoHeroMetrics = typeof DEMO_HERO_METRICS;
export type DemoEngineOutputs = typeof DEMO_ENGINE_OUTPUTS;
export type DemoDashboardData = typeof DEMO_DASHBOARD_DATA;
