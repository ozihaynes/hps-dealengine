import type { AnalyzeOutputs } from "@hps-internal/contracts";

export type StrategyTrack =
  | "wholesale"
  | "flip"
  | "wholetail"
  | "as_is_cap"
  | "list_mls"
  | "unknown";

export type StrategyViewModel = {
  primaryTrack: StrategyTrack;
  primaryLabel: string;
  primaryMao: number | null;
  maoBundle: {
    wholesale: number | null;
    flip: number | null;
    wholetail: number | null;
    asIsCap: number | null;
  };
  payoffProjected: number | null;
  shortfallToPayoff: number | null;
  hasShortfall: boolean;
  bands: {
    sellerOfferBand: [number, number] | null;
    buyerAskBand: [number, number] | null;
    sweetSpot: number | null;
    gapFlag: boolean;
    rawSellerBand: "low" | "fair" | "high" | null;
    rawBuyerBand: "aggressive" | "balanced" | "generous" | null;
  };
  workflowState: "NeedsInfo" | "NeedsReview" | "ReadyForOffer" | "Unknown";
  workflowBadge: "green" | "orange" | "red" | "blue";
  confidenceGrade: "A" | "B" | "C" | "Unknown";
  confidenceBadge: "green" | "orange" | "red" | "blue";
  recommendation: string | null;
  notes: string[];
};

const trackLabel: Record<StrategyTrack, string> = {
  wholesale: "Cash / Wholesale",
  flip: "Flip / Retail Rehab",
  wholetail: "Wholetail",
  as_is_cap: "As-Is Cap",
  list_mls: "List / MLS",
  unknown: "Unknown",
};

const badgeForWorkflow = (
  wf: StrategyViewModel["workflowState"],
): StrategyViewModel["workflowBadge"] => {
  switch (wf) {
    case "ReadyForOffer":
      return "green";
    case "NeedsReview":
      return "orange";
    case "NeedsInfo":
      return "blue";
    default:
      return "blue";
  }
};

const badgeForConfidence = (
  grade: StrategyViewModel["confidenceGrade"],
): StrategyViewModel["confidenceBadge"] => {
  switch (grade) {
    case "A":
      return "green";
    case "B":
      return "blue";
    case "C":
      return "orange";
    default:
      return "blue";
  }
};

const mapTrack = (
  raw: AnalyzeOutputs["primary_offer_track"],
): StrategyTrack => {
  if (!raw) return "unknown";
  switch (raw) {
    case "wholesale":
    case "flip":
    case "wholetail":
    case "as_is_cap":
      return raw;
    default:
      return "unknown";
  }
};

export function buildStrategyViewModel(
  outputs: AnalyzeOutputs | null | undefined,
): StrategyViewModel {
  if (!outputs) {
    return {
      primaryTrack: "unknown",
      primaryLabel: trackLabel.unknown,
      primaryMao: null,
      maoBundle: {
        wholesale: null,
        flip: null,
        wholetail: null,
        asIsCap: null,
      },
      payoffProjected: null,
      shortfallToPayoff: null,
      hasShortfall: false,
      bands: {
        sellerOfferBand: null,
        buyerAskBand: null,
        sweetSpot: null,
        gapFlag: false,
        rawSellerBand: null,
        rawBuyerBand: null,
      },
      workflowState: "Unknown",
      workflowBadge: "blue",
      confidenceGrade: "Unknown",
      confidenceBadge: "blue",
      recommendation: null,
      notes: [],
    };
  }

  const primaryTrack = mapTrack(outputs.primary_offer_track);
  const maoBundle = {
    wholesale: outputs.mao_wholesale ?? null,
    flip: outputs.mao_flip ?? null,
    wholetail: outputs.mao_wholetail ?? null,
    asIsCap: outputs.mao_as_is_cap ?? null,
  };

  const primaryMao =
    outputs.primary_offer ??
    (primaryTrack === "wholesale"
      ? maoBundle.wholesale
      : primaryTrack === "flip"
      ? maoBundle.flip
      : primaryTrack === "wholetail"
      ? maoBundle.wholetail
      : primaryTrack === "as_is_cap"
      ? maoBundle.asIsCap
      : null);

  const payoffProjected = outputs.payoff_projected ?? null;
  const shortfallToPayoff = outputs.shortfall_vs_payoff ?? null;
  const hasShortfall =
    typeof shortfallToPayoff === "number" && shortfallToPayoff > 0;

  const workflowState =
    outputs.workflow_state ?? (outputs.primary_offer ? "ReadyForOffer" : "NeedsInfo");
  const confidenceGrade = outputs.confidence_grade ?? "Unknown";

  return {
    primaryTrack,
    primaryLabel: trackLabel[primaryTrack],
    primaryMao,
    maoBundle,
    payoffProjected,
    shortfallToPayoff,
    hasShortfall,
    bands: {
      sellerOfferBand: null,
      buyerAskBand: null,
      sweetSpot: outputs.sweet_spot_flag ? outputs.primary_offer ?? null : null,
      gapFlag: Boolean(outputs.gap_flag === "wide_gap" || outputs.gap_flag === "narrow_gap"),
      rawSellerBand: outputs.seller_offer_band ?? null,
      rawBuyerBand: outputs.buyer_ask_band ?? null,
    },
    workflowState:
      workflowState === "NeedsInfo" ||
      workflowState === "NeedsReview" ||
      workflowState === "ReadyForOffer"
        ? workflowState
        : "Unknown",
    workflowBadge: badgeForWorkflow(
      workflowState === "NeedsInfo" ||
        workflowState === "NeedsReview" ||
        workflowState === "ReadyForOffer"
        ? workflowState
        : "Unknown",
    ),
    confidenceGrade:
      confidenceGrade === "A" || confidenceGrade === "B" || confidenceGrade === "C"
        ? confidenceGrade
        : "Unknown",
    confidenceBadge: badgeForConfidence(
      confidenceGrade === "A" || confidenceGrade === "B" || confidenceGrade === "C"
        ? confidenceGrade
        : "Unknown",
    ),
    recommendation: outputs.strategy_recommendation ?? null,
    notes: [],
  };
}
