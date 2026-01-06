"use client";

import { OFFER_CHECKLIST_DEFS, type OfferChecklistItemDefinition } from "./schema";

export type ChecklistItemState = "PASS" | "FAIL" | "WARN_PLACEHOLDER" | "WARN_RECOMMENDED" | "NA";

export interface OfferChecklistItemVM extends OfferChecklistItemDefinition {
  state: ChecklistItemState;
  /**
   * True if this item blocks Offer Ready when it is FAIL.
   */
  isBlocking: boolean;
  /**
   * True if any of the underlying fields have been edited since the last run.
   */
  isEditedSinceRun: boolean;
  /**
   * Optional note / explanation we may surface in the UI.
   */
  notes?: string;
}

export type OfferChecklistOverallStatus = "NOT_COMPUTABLE" | "NOT_READY" | "READY";

export interface OfferChecklistViewModelGroup {
  groupId:
    | "valuation"
    | "repairs"
    | "debt"
    | "timeline"
    | "economics"
    | "risk_evidence"
    | "overall";
  groupLabel: string;
  items: OfferChecklistItemVM[];
}

export interface OfferChecklistViewModel {
  status: OfferChecklistOverallStatus;
  /**
   * Raw engine workflow state (e.g. 'NotComputable', 'NeedsInfo', 'NeedsReview', 'ReadyForOffer').
   */
  workflowState: string | null;
  /**
   * Optional workflow reason string from engine, if present.
   */
  workflowReason?: string | null;
  /**
   * All items grouped for UI.
   */
  itemsByGroup: OfferChecklistViewModelGroup[];
}

/**
 * Context used to derive the checklist from a saved Analyze run.
 */
export interface OfferChecklistContext<AnalyzeRun = any> {
  run: AnalyzeRun | null;
  scenario: "flip" | "wholetail" | "as_is";
  editedFieldsSinceRun: Set<string>;
}

/**
 * Mapping from item_id -> groupId for UI grouping.
 */
const ITEM_GROUP_MAP: Record<OfferChecklistItemDefinition["item_id"], OfferChecklistViewModelGroup["groupId"]> = {
  // Valuation
  valuation_arv_provided: "valuation",
  valuation_arv_evidence: "valuation",
  valuation_aiv_provided: "valuation",

  // Repairs
  repairs_estimated: "repairs",
  repairs_evidence: "repairs",

  // Debt & Payoff
  debt_senior_known: "debt",
  debt_payoff_evidence: "debt",
  debt_secondary_known: "debt",
  title_evidence: "debt",

  // Timeline & Carry
  timeline_set: "timeline",
  timeline_conflicts: "timeline",
  carry_inputs: "timeline",

  // Economics
  economics_spread: "economics",
  economics_cash_gate: "economics",
  economics_floor_ceiling: "economics",

  // Risk & Evidence
  risk_no_failures: "risk_evidence",
  risk_watch_resolved: "risk_evidence",
  risk_condo: "risk_evidence",
  risk_flood: "risk_evidence",
  risk_firpta: "risk_evidence",
  risk_scra: "risk_evidence",
  risk_bankruptcy: "risk_evidence",
  risk_pace: "risk_evidence",

  // Overall / Workflow
  workflow_confidence: "overall",
  workflow_run_saved: "overall",
};

function getGroupLabel(groupId: OfferChecklistViewModelGroup["groupId"]): string {
  switch (groupId) {
    case "valuation":
      return "Valuation";
    case "repairs":
      return "Repairs";
    case "debt":
      return "Debt & Payoff";
    case "timeline":
      return "Timeline & Carry";
    case "economics":
      return "Economics";
    case "risk_evidence":
      return "Risk & Evidence";
    case "overall":
      return "Overall Readiness";
    default:
      return groupId;
  }
}

/**
 * Shallow-safe getter with dotted path support on an arbitrary object.
 * We use this to read from engine outputs, evidence summaries, and policy_snapshot
 * without re-defining all those types here.
 */
function getByPath(root: any, path: string): any {
  if (!root || !path) return undefined;
  const segments = path.split(".");
  let current: any = root;
  for (const segment of segments) {
    if (current == null) return undefined;
    current = current[segment];
  }
  return current;
}

/**
 * Get a field from the run's outputs or input snapshot.
 *
 * Convention:
 * - If path includes a dot (e.g. 'risk_summary.failCount'), treat it as an output path.
 * - Otherwise, prefer outputs, then fall back to input_snapshot.
 */
function getRunField(run: any, path: string): any {
  if (!run) return undefined;
  const output = (run as any).output ?? (run as any).outputs ?? run ?? {};
  const inputSnapshot = (run as any).input_snapshot ?? (run as any).input ?? (run as any).inputs ?? {};

  if (path.includes(".")) {
    return getByPath(output, path);
  }

  if (Object.prototype.hasOwnProperty.call(output, path)) {
    return (output as any)[path];
  }

  if (Object.prototype.hasOwnProperty.call(inputSnapshot, path)) {
    return (inputSnapshot as any)[path];
  }

  return undefined;
}

/**
 * Get a policy knob value from the run's policy_snapshot, if present.
 */
function getPolicyValue(run: any, knobName: string): any {
  if (!run) return undefined;
  const policySnapshot = (run as any).policy_snapshot ?? (run as any).policy ?? (run as any).policySnapshot;
  if (!policySnapshot) return undefined;
  return getByPath(policySnapshot, knobName);
}

/**
 * Whether a CONDITIONAL item applies to this specific run/deal.
 */
function isConditionalApplicable(def: OfferChecklistItemDefinition, run: any): boolean {
  if (!run) return false;

  switch (def.item_id) {
    case "timeline_conflicts": {
      const isAuction = Boolean(getRunField(run, "isAuction"));
      const foreclosureDate = getRunField(run, "foreclosureDate");
      const boardApprovalRequired = Boolean(getRunField(run, "boardApprovalRequired"));
      return isAuction || Boolean(foreclosureDate) || boardApprovalRequired;
    }
    case "risk_watch_resolved": {
      const watchCount = Number(getRunField(run, "risk_summary.watchCount") ?? 0);
      return watchCount > 0;
    }
    case "risk_condo": {
      const isCondo = Boolean(getRunField(run, "isCondo"));
      return isCondo;
    }
    case "risk_flood": {
      const floodZone = getRunField(run, "floodZone");
      return Boolean(floodZone);
    }
    case "risk_firpta": {
      const residency = getRunField(run, "sellerResidencyStatus");
      return residency != null && String(residency).toLowerCase() !== "domestic";
    }
    case "risk_scra": {
      const isActiveDuty = Boolean(getRunField(run, "isActiveDuty"));
      return isActiveDuty;
    }
    case "risk_bankruptcy": {
      const bankruptcyStatus = getRunField(run, "bankruptcyStatus");
      return Boolean(bankruptcyStatus && bankruptcyStatus !== "none");
    }
    case "risk_pace": {
      const paceLienPresent = Boolean(getRunField(run, "paceLienPresent"));
      return paceLienPresent;
    }
    default:
      return true;
  }
}

/**
 * Derive the state of a single item from the run + policy.
 *
 * This function intentionally reads only from outputs + policy_snapshot;
 * it does not recompute any business logic.
 */
function evaluateItemState(def: OfferChecklistItemDefinition, run: any): ChecklistItemState {
  if (!run) {
    if (def.importance_tag === "MUST_HAVE_FOR_MATH") return "FAIL";
    return "NA";
  }

  const isConditionalItem = def.importance_tag === "CONDITIONAL";
  const applicable = isConditionalItem ? isConditionalApplicable(def, run) : true;

  if (!applicable) return "NA";

  const importance = def.importance_tag;

  switch (def.item_id) {
    case "valuation_arv_provided": {
      const arvEstimate =
        getRunField(run, "arvEstimate") ??
        getRunField(run, "arv") ??
        getRunField(run, "market.arv");
      const arvFinal = getRunField(run, "arv_final") ?? getRunField(run, "arvFinal");
      const hasArv = arvEstimate != null || arvFinal != null;
      return hasArv ? "PASS" : "FAIL";
    }
    case "valuation_arv_evidence": {
      const compCount = Number(getRunField(run, "arvCompCount") ?? 0);
      const evidence = Boolean(getRunField(run, "arvEvidencePresent"));
      const bpoPresent = Boolean(getRunField(run, "bpoAppraisalPresent"));

      if (evidence || bpoPresent || compCount > 0) {
        return "PASS";
      }

      return "WARN_RECOMMENDED";
    }
    case "valuation_aiv_provided": {
      const aivEstimate =
        getRunField(run, "aivEstimate") ??
        getRunField(run, "aiv") ??
        getRunField(run, "market.as_is_value");
      const aivFinal = getRunField(run, "aiv_final") ?? getRunField(run, "aivFinal");
      const hasAiv = aivEstimate != null || aivFinal != null;

      if (hasAiv) return "PASS";

      return importance === "MUST_HAVE_FOR_MATH" ? "FAIL" : "WARN_PLACEHOLDER";
    }

    case "repairs_estimated": {
      const repairsTotal =
        getRunField(run, "repairsTotal") ??
        getRunField(run, "repairs_total") ??
        getRunField(run, "repairs.total");
      const quickEstimateTotal =
        getRunField(run, "quickEstimateTotal") ??
        getRunField(run, "quickEstimate.total");
      const hasRepairs =
        (typeof repairsTotal === "number" && repairsTotal >= 0) ||
        (typeof quickEstimateTotal === "number" && quickEstimateTotal >= 0);

      if (hasRepairs) return "PASS";
      return "FAIL";
    }
    case "repairs_evidence": {
      const repairsEvidencePresent = Boolean(getRunField(run, "repairsEvidencePresent"));
      const repairClass = getRunField(run, "repairClass");

      if (repairsEvidencePresent) return "PASS";

      if (repairClass && String(repairClass).toLowerCase() === "heavy") {
        return "WARN_PLACEHOLDER";
      }

      return "WARN_RECOMMENDED";
    }

    case "debt_senior_known": {
      const seniorPrincipal =
        getRunField(run, "seniorPrincipal") ??
        getRunField(run, "debt.senior_principal") ??
        getRunField(run, "senior_principal");
      const hasSenior = seniorPrincipal != null && !Number.isNaN(Number(seniorPrincipal));
      if (hasSenior) return "PASS";
      return "FAIL";
    }
    case "debt_payoff_evidence": {
      const payoffLetterPresent = Boolean(getRunField(run, "payoffLetterPresent"));
      const goodThruDate = getRunField(run, "goodThruDate");
      if (payoffLetterPresent && goodThruDate) return "PASS";
      return "FAIL";
    }
    case "debt_secondary_known": {
      const disclosed = Boolean(getRunField(run, "juniorLiensDisclosed"));
      const juniorsTotal = getRunField(run, "juniorLiensTotal");
      const hoaArrears = getRunField(run, "hoaArrears");
      const taxDelinq = getRunField(run, "taxDelinquencies");

      const hasAnyNumeric = juniorsTotal != null || hoaArrears != null || taxDelinq != null;

      if (disclosed || hasAnyNumeric) return "PASS";

      return "FAIL";
    }
    case "title_evidence": {
      const titlePresent = Boolean(getRunField(run, "titleEvidence.isPresent"));
      const ageDays = Number(getRunField(run, "titleEvidence.ageDays") ?? 9999);

      if (!titlePresent) {
        return "WARN_RECOMMENDED";
      }

      if (ageDays > 90) {
        return "WARN_RECOMMENDED";
      }

      return "PASS";
    }

    case "timeline_set": {
      const targetDtm = getRunField(run, "targetDtm") ?? getRunField(run, "target_dtm");
      const desiredCloseDate = getRunField(run, "desiredCloseDate") ?? getRunField(run, "desired_close_date");
      const hasTimeline = Boolean(targetDtm || desiredCloseDate);
      return hasTimeline ? "PASS" : "FAIL";
    }
    case "timeline_conflicts": {
      const applicable = isConditionalApplicable(def, run);
      if (!applicable) return "NA";

      const isAuction = Boolean(getRunField(run, "isAuction"));
      const foreclosureDate = getRunField(run, "foreclosureDate");
      const boardApprovalRequired = Boolean(getRunField(run, "boardApprovalRequired"));

      const hasRiskyTimeline = isAuction || Boolean(foreclosureDate) || boardApprovalRequired;
      return hasRiskyTimeline ? "WARN_RECOMMENDED" : "PASS";
    }
    case "carry_inputs": {
      const taxes = getRunField(run, "taxes");
      const insurance = getRunField(run, "insurance");
      const hoa = getRunField(run, "hoa");

      const hasAny = taxes != null || insurance != null || hoa != null;

      if (hasAny) return "PASS";
      return "WARN_RECOMMENDED";
    }

    case "economics_spread": {
      const spreadCash = Number(getRunField(run, "spread_cash") ?? NaN);
      const minSpreadRequired = Number(
        getRunField(run, "min_spread_required") ?? getPolicyValue(run, "minSpreadPolicy") ?? NaN,
      );

      if (Number.isNaN(spreadCash) || Number.isNaN(minSpreadRequired)) {
        return "FAIL";
      }

      return spreadCash >= minSpreadRequired ? "PASS" : "FAIL";
    }
    case "economics_cash_gate": {
      const cashGateStatus = getRunField(run, "cash_gate_status");
      const statusStr = cashGateStatus ? String(cashGateStatus).toLowerCase() : "";

      if (!statusStr) return "FAIL";
      if (statusStr === "pass" || statusStr === "ok") return "PASS";

      return "FAIL";
    }
    case "economics_floor_ceiling": {
      const respectFloor = getRunField(run, "respect_floor");
      const floor = getRunField(run, "investor_floor");
      const ceiling = getRunField(run, "buyer_ceiling");

      if (respectFloor != null && typeof respectFloor === "boolean") {
        return respectFloor ? "PASS" : "FAIL";
      }

      if (floor != null && ceiling != null) {
        return "PASS";
      }

      return "FAIL";
    }

    case "risk_no_failures": {
      const failCount = Number(getRunField(run, "risk_summary.failCount") ?? 0);
      return failCount > 0 ? "FAIL" : "PASS";
    }
    case "risk_watch_resolved": {
      const applicable = isConditionalApplicable(def, run);
      if (!applicable) return "NA";

      const watchCount = Number(getRunField(run, "risk_summary.watchCount") ?? 0);
      return watchCount > 0 ? "WARN_RECOMMENDED" : "PASS";
    }
    case "risk_condo":
    case "risk_flood":
    case "risk_firpta":
    case "risk_scra":
    case "risk_bankruptcy":
    case "risk_pace": {
      const applicable = isConditionalApplicable(def, run);
      if (!applicable) return "NA";
      return "WARN_RECOMMENDED";
    }

    case "workflow_confidence": {
      const grade = getRunField(run, "confidence_grade");
      const minGrade = getPolicyValue(run, "minConfidenceGradePolicy");

      if (!grade) return "FAIL";
      if (!minGrade) {
        return "PASS";
      }

      const gradeStr = String(grade);
      const minStr = String(minGrade);

      if (gradeStr <= minStr) {
        return "FAIL";
      }

      return "PASS";
    }
    case "workflow_run_saved": {
      const runId = (run as any).id ?? (run as any).runId;
      const policySnapshot = (run as any).policy_snapshot ?? (run as any).policy;

      if (runId && policySnapshot) return "PASS";

      return "FAIL";
    }

    default: {
      if (def.fields.some((fieldKey) => getRunField(run, fieldKey) != null)) {
        return "PASS";
      }

      if (importance === "MUST_HAVE_FOR_MATH") return "FAIL";

      return importance === "RECOMMENDED_FOR_CONFIDENCE" ? "WARN_RECOMMENDED" : "NA";
    }
  }
}

/**
 * Primary entry point used by the UI.
 *
 * This function is deterministic and pure: given the same run/scenario/editedFields,
 * it will always return the same checklist view model.
 */
export function deriveOfferChecklist<AnalyzeRun = any>(
  ctx: OfferChecklistContext<AnalyzeRun>,
): OfferChecklistViewModel {
  const { run, editedFieldsSinceRun } = ctx;
  const hasRun = Boolean(run);

  const workflowState: string | null =
    run && (run as any).workflow_state ? (run as any).workflow_state : null;
  const workflowReason: string | null =
    run && (run as any).workflow_reason ? (run as any).workflow_reason : null;

  const status: OfferChecklistOverallStatus = !hasRun
    ? "NOT_COMPUTABLE"
    : workflowState === "NotComputable"
      ? "NOT_COMPUTABLE"
      : workflowState === "ReadyForOffer"
        ? "READY"
        : "NOT_READY";

  const baseItems: OfferChecklistItemVM[] = OFFER_CHECKLIST_DEFS.map((def) => {
    const itemState = evaluateItemState(def, run);
    const isBlocking =
      (def.importance_tag === "MUST_HAVE_FOR_MATH" || def.importance_tag === "MUST_HAVE_FOR_READY") &&
      itemState === "FAIL";

    const isEditedSinceRun =
      editedFieldsSinceRun.size > 0 && def.fields.some((fieldKey) => editedFieldsSinceRun.has(fieldKey));

    return {
      ...def,
      state: itemState,
      isBlocking,
      isEditedSinceRun,
    };
  });

  const grouped: Record<OfferChecklistViewModelGroup["groupId"], OfferChecklistItemVM[]> = {
    valuation: [],
    repairs: [],
    debt: [],
    timeline: [],
    economics: [],
    risk_evidence: [],
    overall: [],
  };

  for (const item of baseItems) {
    const groupId = ITEM_GROUP_MAP[item.item_id] ?? "overall";
    grouped[groupId].push(item);
  }

  const itemsByGroup: OfferChecklistViewModelGroup[] = (
    [
      "valuation",
      "repairs",
      "debt",
      "timeline",
      "economics",
      "risk_evidence",
      "overall",
    ] as OfferChecklistViewModelGroup["groupId"][]
  ).map((groupId) => ({
    groupId,
    groupLabel: getGroupLabel(groupId),
    items: grouped[groupId],
  }));

  return {
    status,
    workflowState,
    workflowReason,
    itemsByGroup,
  };
}
