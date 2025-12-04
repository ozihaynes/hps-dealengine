import type { AnalyzeResult } from "@hps-internal/contracts";

import type { Deal, EngineCalculations } from "../types";
import { getDealHealth } from "../utils/helpers";

export type GuardrailsStatus = "ok" | "tight" | "broken" | "unknown";
export type RiskPosture = "pass" | "watch" | "fail" | "unknown";
export type ConfidenceGrade = "A" | "B" | "C" | "unknown";
export type WorkflowState = "needs_run" | "needs_review" | "ready_draft";

export type OverviewGuardrailsView = {
  floor: number | null;
  offer: number | null;
  ceiling: number | null;
  windowFloorToOffer: number | null;
  headroomOfferToCeiling: number | null;
  cushionVsPayoff: number | null;
  minSpread: number | null;
  spread: number | null;
  guardrailsStatus: GuardrailsStatus;
  riskPosture: RiskPosture;
  confidenceGrade: ConfidenceGrade;
  workflowState: WorkflowState;
};

const PRESENTATION_TIGHT_BAND = 5000; // UI-only tightness band; not a policy threshold.

const toNumberOrNull = (value: unknown): number | null => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const deriveMinSpread = (deal: Deal): number | null => {
  const policyMinSpread = toNumberOrNull((deal as any)?.policy?.min_spread);
  return policyMinSpread;
};

const mapHealthToRisk = (
  health: ReturnType<typeof getDealHealth>,
): RiskPosture => {
  switch (health.color) {
    case "green":
      return "pass";
    case "orange":
      return "watch";
    case "red":
      return "fail";
    default:
      return "unknown";
  }
};

export function buildOverviewGuardrailsView(params: {
  deal: Deal;
  lastAnalyzeResult: AnalyzeResult | null;
  calc: EngineCalculations | null;
}): OverviewGuardrailsView {
  const { deal, lastAnalyzeResult, calc } = params;

  const outputs = (lastAnalyzeResult as any)?.outputs ?? {};

  const floor =
    toNumberOrNull(outputs?.respect_floor) ??
    toNumberOrNull((calc as any)?.respectFloorPrice);
  const ceiling =
    toNumberOrNull(outputs?.buyer_ceiling) ??
    toNumberOrNull((calc as any)?.buyerCeiling);

  const offer =
    toNumberOrNull((calc as any)?.instantCashOffer) ??
    toNumberOrNull((calc as any)?.maoFinal) ??
    toNumberOrNull((calc as any)?.maoWholesale);

  const windowFromOutputs = toNumberOrNull(outputs?.window_floor_to_offer);
  const headroomFromOutputs = toNumberOrNull(
    outputs?.headroom_offer_to_ceiling,
  );
  const cushionVsPayoff = toNumberOrNull(outputs?.cushion_vs_payoff);

  const windowFloorToOffer =
    windowFromOutputs ??
    (offer != null && floor != null ? offer - floor : null);
  const headroomOfferToCeiling =
    headroomFromOutputs ??
    (offer != null && ceiling != null ? ceiling - offer : null);

  const minSpread = deriveMinSpread(deal);
  const spread =
    windowFloorToOffer != null ? windowFloorToOffer : toNumberOrNull((calc as any)?.dealSpread);

  let guardrailsStatus: GuardrailsStatus = "unknown";
  if (offer == null && floor == null && ceiling == null) {
    guardrailsStatus = "unknown";
  } else if (offer != null) {
    if (floor != null && offer < floor) {
      guardrailsStatus = "broken";
    } else if (ceiling != null && offer > ceiling) {
      guardrailsStatus = "broken";
    } else if (
      (windowFloorToOffer != null &&
        Math.abs(windowFloorToOffer) <= PRESENTATION_TIGHT_BAND) ||
      (headroomOfferToCeiling != null &&
        Math.abs(headroomOfferToCeiling) <= PRESENTATION_TIGHT_BAND)
    ) {
      guardrailsStatus = "tight";
    } else if (
      floor != null ||
      ceiling != null
    ) {
      guardrailsStatus = "ok";
    }
  }

  const riskHealth = getDealHealth(
    spread ?? Number.NaN,
    minSpread ?? 0,
  );
  const riskPosture = mapHealthToRisk(riskHealth);

  let confidenceGrade: ConfidenceGrade = "B";
  if (!lastAnalyzeResult || offer == null || (floor == null && ceiling == null)) {
    confidenceGrade = "C";
  }

  let workflowState: WorkflowState = "needs_run";
  if (!lastAnalyzeResult) {
    workflowState = "needs_run";
  } else if (offer == null || floor == null || ceiling == null) {
    workflowState = "needs_review";
  } else {
    workflowState = "ready_draft";
  }

  return {
    floor,
    offer,
    ceiling,
    windowFloorToOffer,
    headroomOfferToCeiling,
    cushionVsPayoff,
    minSpread,
    spread,
    guardrailsStatus,
    riskPosture,
    confidenceGrade,
    workflowState,
  };
}
