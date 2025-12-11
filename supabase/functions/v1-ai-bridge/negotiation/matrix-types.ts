export type NegotiationModule = "competence" | "price_anchor" | "objection_pivot" | "negative_reverse";

export type ConditionBand = "light" | "medium" | "heavy" | "hazardous";
export type RepairsBand = "low" | "medium" | "high" | "extreme";
export type RepairEvidence = "bids_present" | "estimator_only" | "photos_only" | "none";
export type MotivationPrimary =
  | "avoid_auction"
  | "debt_relief"
  | "tired_landlord"
  | "relocation"
  | "inheritance"
  | "equity_cash_out"
  | "divorce"
  | "code_violations"
  | "other";
export type MotivationStrength = "low" | "medium" | "high";
export type TimelineUrgency = "emergency" | "critical" | "high" | "low";
export type TimelineTrigger = "auction" | "move_date" | "tax_sale" | "vacancy_burn" | "none";
export type ArrearsBand = "none" | "low" | "moderate" | "high" | "critical";
export type ShortfallVsPayoffBand = "big_cushion" | "thin" | "shortfall";
export type ZipSpeedBand = "fast" | "neutral" | "slow";
export type MarketTempLabel = "hot" | "warm" | "neutral" | "cool";
export type ConfidenceGrade = "A" | "B" | "C";
export type RiskFlag =
  | "uninsurable"
  | "condo_sirs"
  | "pace"
  | "solar_ucc"
  | "fha_90_day"
  | "flood_50pct"
  | "manufactured"
  | "firpta"
  | "scra"
  | "title_cloudy";
export type LeadChannel = "inbound_call" | "web_form" | "sms" | "ppc" | "referral" | "repeat_seller";
export type TrustLevel = "cold" | "lukewarm" | "warm" | "repeat_seller";

export interface NegotiationDealFacts {
  condition_band?: ConditionBand;
  repairs_band?: RepairsBand;
  repair_evidence?: RepairEvidence;
  has_big5_issues?: boolean;
  status_in_foreclosure?: boolean;
  seller_motivation_primary?: MotivationPrimary;
  motivation_strength?: MotivationStrength;
  timeline_urgency?: TimelineUrgency;
  timeline_trigger?: TimelineTrigger;
  arrears_band?: ArrearsBand;
  shortfall_vs_payoff_band?: ShortfallVsPayoffBand;
  zip_speed_band?: ZipSpeedBand;
  market_temp_label?: MarketTempLabel;
  confidence_grade?: ConfidenceGrade;
  risk_flags?: RiskFlag[];
  lead_channel?: LeadChannel;
  trust_level?: TrustLevel;
  [key: string]: unknown;
}

export interface NegotiationMatrixRow {
  id: string;
  module: NegotiationModule;
  scenario_label: string;
  deal_facts: NegotiationDealFacts;
  preemptive_objection?: string;
  trigger_timing?: string;
  competence_focus?: string | null;
  ackerman_stage?: string | null;
  pivot_focus?: string | null;
  motivation_context?: string | null;
  trigger_phrase: string;
  script_body: string;
  cushioning_statement?: string | null;
  followup_question?: string | null;
  notes_for_ai?: string | null;
  [key: string]: unknown;
}

export interface NegotiationMatrix {
  version: string;
  created_at: string;
  description?: string;
  rows: NegotiationMatrixRow[];
}

export interface NegotiationPlaybookSection {
  id: string;
  module: NegotiationModule;
  scenarioLabel: string;
  triggerPhrase: string;
  scriptBody: string;
  cushioningStatement?: string | null;
  followupQuestion?: string | null;
}

export interface NegotiationPlaybookResult {
  persona: "dealNegotiator";
  mode: "generate_playbook";
  runId: string;
  logicRowIds: string[];
  sections: {
    anchor?: NegotiationPlaybookSection | null;
    script?: NegotiationPlaybookSection | null;
    pivot?: NegotiationPlaybookSection | null;
    all: NegotiationPlaybookSection[];
  };
}

export interface NegotiatorChatResultMessage {
  role: "system" | "assistant" | "user";
  content: string;
}

export interface NegotiatorChatResult {
  persona: "dealNegotiator";
  mode: "chat";
  runId: string | null;
  logicRowIds: string[];
  messages: NegotiatorChatResultMessage[];
}
