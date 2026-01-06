"use client";

import offerChecklistDefsJson from "../../../../config/offer-checklist.schema.json";

export type ImportanceTag =
  | "MUST_HAVE_FOR_MATH"
  | "MUST_HAVE_FOR_READY"
  | "RECOMMENDED_FOR_CONFIDENCE"
  | "CONDITIONAL";

export type ScenarioApplicabilityFlag = "required" | "recommended" | "conditional" | "optional";

export interface ScenarioApplicability {
  flip: ScenarioApplicabilityFlag;
  wholetail: ScenarioApplicabilityFlag;
  as_is: ScenarioApplicabilityFlag;
}

export interface OfferChecklistItemDefinition {
  item_id: string;
  label: string;
  importance_tag: ImportanceTag;
  scenario_applicability: ScenarioApplicability;
  fields: string[];
  policy_knobs: string[];
  placeholder_behavior: string;
  why_it_matters: string;
}

/**
 * Canonical in-memory representation of the Offer Checklist item definitions.
 *
 * Source of truth data lives in config/offer-checklist.schema.json.
 * This typed export is what the rest of the app should consume.
 */
export const OFFER_CHECKLIST_DEFS: OfferChecklistItemDefinition[] =
  offerChecklistDefsJson as OfferChecklistItemDefinition[];
